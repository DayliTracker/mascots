// validate-frames — deterministic delivery gate for a generated pack.
//
//   node validate-frames.mjs <pack.mjs> [--out <dir>]
//
// Checks (all must pass, exit 1 otherwise):
//   1. files: every frame + particle + contact_sheet.png exists
//   2. dimensions: frame PNGs are square, exactly grid*scale
//   3. palette lock: every opaque pixel is a palette color (no drift)
//   4. silhouette: every frame has a substantial opaque body
//   5. registration: every frame shares enough opaque pixels with the base
//      frame to read as the same character, and every frame differs from it
//   6. determinism: re-rendering the pack reproduces the files byte-for-byte

import { inflateSync } from 'node:zlib';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderPack, hexToRgba } from './engine.mjs';

// Minimal PNG reader for files this engine wrote (RGBA, filter 0 per scanline).
function decodePNG(buf) {
  let off = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6) throw new Error('expected 8-bit RGBA PNG');
    } else if (type === 'IDAT') {
      idat.push(data);
    }
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const pixels = [];
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    if (filter !== 0) throw new Error(`unexpected filter ${filter} on row ${y}`);
    const row = [];
    for (let x = 0; x < width; x++) {
      const p = y * (stride + 1) + 1 + x * 4;
      row.push([raw[p], raw[p + 1], raw[p + 2], raw[p + 3]]);
    }
    pixels.push(row);
  }
  return { width, height, pixels };
}

async function main() {
  const args = process.argv.slice(2);
  const packPath = args.find((a) => !a.startsWith('--'));
  const outIdx = args.indexOf('--out');
  const packMod = await import(pathToFileURL(resolve(packPath)).href);
  const pack = packMod.default;
  const outDir = resolve(outIdx >= 0 ? args[outIdx + 1] : dirname(resolve(packPath)));
  const palette = Object.fromEntries(
    Object.entries(pack.palette).map(([k, v]) => [k, hexToRgba(v)])
  );

  const problems = [];
  const ok = (msg) => console.log(`  ✓ ${msg}`);
  const fail = (msg) => {
    problems.push(msg);
    console.log(`  ✗ ${msg}`);
  };

  const expected = [
    ...Object.keys(pack.frames).map((f) => `${pack.name}_${f}.png`),
    ...Object.keys(pack.particles ?? {}).map((p) => `particle_${p}.png`),
    'contact_sheet.png',
  ];
  console.log('files');
  for (const f of expected) {
    existsSync(join(outDir, f)) ? ok(f) : fail(`missing ${f}`);
  }

  console.log('dimensions + palette lock + silhouette + registration');
  const frameFiles = Object.keys(pack.frames).map((f) => `${pack.name}_${f}.png`);
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

    const want = pack.grid * pack.scale;
    if (img.width !== want || img.height !== want) {
      fail(`${f}: ${img.width}x${img.height}, expected ${want}x${want}`);
    } else {
      ok(`${f}: ${img.width}x${img.height}`);
    }

    const allowed = new Set(
      Object.values(palette).map((c) => c.join(','))
    );
    let opaque = 0;
    let foreign = 0;
    for (const row of img.pixels) {
      for (const [r, g, b, a] of row) {
        if (a === 0) continue;
        opaque++;
        if (!allowed.has(`${r},${g},${b},255`)) foreign++;
      }
    }
    if (foreign > 0) fail(`${f}: ${foreign} off-palette pixels`);
    if (opaque < want * want * 0.05) fail(`${f}: silhouette too small (${opaque} px)`);
  }

  const baseFile = frameFiles[0];
  const base = decoded[baseFile];
  if (base) {
    for (const f of frameFiles) {
      const img = decoded[f];
      if (!img || f === baseFile) continue;
      let shared = 0;
      let total = 0;
      for (let y = 0; y < base.height; y++) {
        for (let x = 0; x < base.width; x++) {
          const a = base.pixels[y][x].join(',');
          const b = img.pixels[y][x].join(',');
          if (a === '0,0,0,0' && b === '0,0,0,0') continue;
          total++;
          if (a === b) shared++;
        }
      }
      const similarity = shared / total;
      // a celebration frame changes eyes + mouth + wings at once; below ~80%
      // the frame stops reading as the same character.
      if (similarity < 0.8) {
        fail(`${f}: only ${(similarity * 100).toFixed(1)}% similar to ${baseFile} — same character?`);
      } else if (similarity === 1) {
        fail(`${f}: identical to ${baseFile} — no animation change`);
      } else {
        ok(`${f}: ${(similarity * 100).toFixed(1)}% shared with ${baseFile}`);
      }
    }
  }

  console.log('determinism (re-render byte-compare)');
  const tmp = mkdtempSync(join(tmpdir(), 'mascots-validate-'));
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

  console.log(`\n${problems.length === 0 ? 'PASS' : 'FAIL'} — ${problems.length} problem(s)`);
  process.exit(problems.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
