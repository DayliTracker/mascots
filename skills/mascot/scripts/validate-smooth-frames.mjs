// validate-smooth-frames — delivery gate for smooth packs (ADR 0001).
//
//   node validate-smooth-frames.mjs <pack.mjs> [--out <dir>]
//
// With no --out and no frames in the pack's directory (a fresh checkout has
// only the pack source), validates a fresh render of the pack instead.
//
// Smooth packs have no cell grid, so the pixel rules adapt (ADR 0001):
// no palette lock; the contract is the frame set, the canvas size, and alpha.
// Checks (all must pass, exit 1 otherwise):
//   1. files: every frame + contact_sheet.png + manifest.json exists
//   2. manifest: names the pack, canvas, all frames in order, pinned rasterizer
//   3. dimensions: every frame PNG is the pack's canvas, square
//   4. alpha: every opaque pixel lies inside the pack's silhouette mask
//      (no stray pixels or artifacts outside the character)
//   5. silhouette: every frame has a substantial opaque body
//   6. registration: every frame differs from the base frame (same character,
//      not a duplicate render)
//   7. determinism: re-rendering the pack reproduces the files byte-for-byte

import { inflateSync } from 'node:zlib';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderPack, renderSvg, rasterizerVersion } from './smooth-engine.mjs';

// PNG reader: 8-bit RGBA, non-interlaced, all five scanline filters. Reads
// files this pipeline wrote (resvg) and any conforming RGBA PNG.
function decodePNG(buf) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(sig)) throw new Error('not a PNG file');
  let off = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (off + 12 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8) throw new Error('expected 8-bit depth PNG');
      if (data[9] !== 6) throw new Error('expected RGBA PNG');
      if (data[12] !== 0) throw new Error('interlaced PNG not supported');
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  if (raw.length !== height * (stride + 1)) throw new Error('unexpected decompressed size');
  const px = new Uint8Array(raw.length - height); // per-row: drop filter byte
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i];
      const left = i >= 4 ? px[dst + i - 4] : 0;
      const up = y > 0 ? px[dst - stride + i] : 0;
      const ul = y > 0 && i >= 4 ? px[dst - stride + i - 4] : 0;
      let v;
      if (filter === 0) v = x;
      else if (filter === 1) v = x + left;
      else if (filter === 2) v = x + up;
      else if (filter === 3) v = x + ((left + up) >> 1);
      else if (filter === 4) v = x + paeth(left, up, ul);
      else throw new Error(`unexpected filter ${filter} on row ${y}`);
      px[dst + i] = v & 0xff;
    }
  }
  return { width, height, pixels: px };
}

async function main() {
  const args = process.argv.slice(2);
  const packPath = args.find((a) => !a.startsWith('--'));
  const outIdx = args.indexOf('--out');
  const packMod = await import(pathToFileURL(resolve(packPath)).href);
  const pack = packMod.default;
  if (pack.kind !== 'smooth') {
    console.error(`${packPath}: not a smooth pack (kind: 'smooth' missing)`);
    process.exit(2);
  }
  const packDir = dirname(resolve(packPath));
  let outDir = outIdx >= 0 ? resolve(args[outIdx + 1]) : packDir;
  const frameNames = Object.keys(pack.frames);
  const expected = [
    ...frameNames.map((f) => `${pack.name}_${f}.png`),
    'contact_sheet.png',
    'manifest.json',
  ];

  let renderTmp = null;
  if (outIdx < 0 && !expected.some((f) => existsSync(join(packDir, f)))) {
    renderTmp = mkdtempSync(join(tmpdir(), 'mascots-validate-smooth-'));
    await renderPack(packPath, { out: renderTmp });
    outDir = renderTmp;
    console.log(`no frames in ${packDir} — validating a fresh render of the pack\n`);
  }

  const problems = [];
  const ok = (msg) => console.log(`  ✓ ${msg}`);
  const fail = (msg) => {
    problems.push(msg);
    console.log(`  ✗ ${msg}`);
  };

  console.log('files');
  for (const f of expected) {
    existsSync(join(outDir, f)) ? ok(f) : fail(`missing ${f}`);
  }

  console.log('manifest');
  let manifest = null;
  const manifestPath = join(outDir, 'manifest.json');
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const frameFiles = frameNames.map((f) => `${pack.name}_${f}.png`);
      const gotFiles = (manifest.frames ?? []).map((fr) => fr.file);
      if (manifest.pack !== pack.name) fail(`manifest pack: ${manifest.pack}, expected ${pack.name}`);
      else ok(`pack: ${manifest.pack}`);
      if (manifest.canvas !== pack.size) fail(`manifest canvas: ${manifest.canvas}, expected ${pack.size}`);
      else ok(`canvas: ${manifest.canvas}`);
      if (JSON.stringify(gotFiles) !== JSON.stringify(frameFiles)) {
        fail(`manifest frames ${JSON.stringify(gotFiles)} do not match pack order ${JSON.stringify(frameFiles)}`);
      } else ok(`frames: ${frameFiles.length} in pack order`);
      const wantVersion = rasterizerVersion();
      const gotVersion = manifest.rasterizer?.version;
      if (manifest.rasterizer?.name !== '@resvg/resvg-js' || gotVersion !== wantVersion) {
        fail(`manifest rasterizer: ${manifest.rasterizer?.name}@${gotVersion}, expected @resvg/resvg-js@${wantVersion}`);
      } else ok(`rasterizer: @resvg/resvg-js@${gotVersion} (pinned)`);
    } catch (e) {
      fail(`manifest.json unreadable (${e.message})`);
    }
  }

  console.log('dimensions + alpha outside silhouette');
  // The pack's union silhouette, rendered at canvas size — the alpha gate.
  const mask = decodePNG(renderSvg(pack.silhouette(), pack).png);
  const frameFiles = frameNames.map((f) => `${pack.name}_${f}.png`);
  const decoded = {};
  for (const f of frameFiles) {
    const path = join(outDir, f);
    if (!existsSync(path)) continue;
    let img;
    try {
      img = decodePNG(readFileSync(path));
    } catch (e) {
      fail(`${f}: unreadable (${e.message})`);
      continue;
    }
    decoded[f] = img;

    const want = pack.size;
    if (img.width !== want || img.height !== want) {
      fail(`${f}: ${img.width}x${img.height}, expected ${want}x${want}`);
    } else {
      ok(`${f}: ${img.width}x${img.height}`);
    }

    let opaque = 0;
    let outside = 0;
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const i = (y * img.width + x) * 4 + 3;
        if (img.pixels[i] === 0) continue;
        opaque++;
        if (mask.pixels[i] === 0) outside++;
      }
    }
    if (opaque < want * want * 0.05) fail(`${f}: silhouette too small (${opaque} px)`);
    else if (outside > 0) fail(`${f}: ${outside} opaque pixels outside the silhouette`);
    else ok(`${f}: alpha inside silhouette (${opaque} opaque px)`);
  }

  console.log('registration (frames differ from the base frame)');
  const baseFile = frameFiles[0];
  const base = decoded[baseFile];
  if (base) {
    for (const f of frameFiles) {
      const img = decoded[f];
      if (!img || f === baseFile) continue;
      let differing = 0;
      for (let i = 0; i < base.pixels.length; i += 4) {
        if (
          base.pixels[i] !== img.pixels[i] ||
          base.pixels[i + 1] !== img.pixels[i + 1] ||
          base.pixels[i + 2] !== img.pixels[i + 2] ||
          base.pixels[i + 3] !== img.pixels[i + 3]
        ) {
          differing++;
        }
      }
      if (differing < 200) {
        fail(`${f}: only ${differing} px differ from ${baseFile} — no animation change?`);
      } else {
        ok(`${f}: ${differing} px differ from ${baseFile}`);
      }
    }
  }

  console.log('determinism (re-render byte-compare)');
  const tmp = mkdtempSync(join(tmpdir(), 'mascots-validate-smooth-'));
  const fresh = await renderPack(packPath, { out: tmp });
  let deterministic = true;
  for (const file of expected) {
    const a = existsSync(join(outDir, file)) ? readFileSync(join(outDir, file)) : null;
    const bPath = join(fresh.outDir, file);
    const b = existsSync(bPath) ? readFileSync(bPath) : null;
    if (!a || !b || !a.equals(b)) {
      deterministic = false;
      fail(`${file}: re-render does not match on disk`);
    }
  }
  if (deterministic) ok('all files reproduce byte-for-byte');
  rmSync(tmp, { recursive: true, force: true });
  if (renderTmp) rmSync(renderTmp, { recursive: true, force: true });

  console.log(`\n${problems.length === 0 ? 'PASS' : 'FAIL'} — ${problems.length} problem(s)`);
  process.exit(problems.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
