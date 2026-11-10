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
import {
  renderPack,
  renderSvg,
  rasterizerVersion,
  TWEENS,
  cycleSampleName,
} from './smooth-engine.mjs';

// Cycle adjacent-frame registration (contract #18): consecutive cycle samples
// (including last→first) must differ by at least MIN pixels (a visible
// in-between, not a duplicate) and at most RATIO × the base frame's opaque
// pixels (a small delta, not a keyframe jump). Calibrated on smooth-duck's
// walk cycle: adjacent deltas measure 830–1466 px against a base frame of
// 83,078 opaque px (max 12,461) — far inside both bounds.
const MIN_CYCLE_DELTA = 50;
const MAX_CYCLE_DELTA_RATIO = 0.15;

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
  const frameFiles = frameNames.map((f) => `${pack.name}_${f}.png`);
  // Cycles (contract #18): schema is checked in its own section below; the
  // sample file list here drives files/manifest/alpha/registration/determinism.
  const cycles = pack.cycles ?? {};
  const hasCycles = Object.keys(cycles).length > 0;
  const cycleFiles = {}; // cycle name -> [file, ...] in engine order
  for (const [name, c] of Object.entries(cycles)) {
    cycleFiles[name] = Array.from(
      { length: (c.keys?.length ?? 0) * (c.steps ?? 0) },
      (_, i) => `${pack.name}_${cycleSampleName(name, i)}.png`
    );
  }
  const allPngs = [...frameFiles, ...Object.values(cycleFiles).flat()];
  const expected = [...allPngs, 'contact_sheet.png', 'manifest.json'];

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

  console.log('cycles (schema)');
  for (const [name, c] of Object.entries(cycles)) {
    const where = `cycle ${name}`;
    if (!Number.isInteger(c.fps) || c.fps < 1 || c.fps > 30) {
      fail(`${where}: fps ${JSON.stringify(c.fps)}, expected integer 1..30`);
    } else ok(`${where}: fps ${c.fps}`);
    if (
      !Array.isArray(c.keys) ||
      c.keys.length < 2 ||
      !c.keys.every((k) => k && typeof k === 'object')
    ) {
      fail(`${where}: keys ${JSON.stringify(c.keys)}, expected >= 2 param objects`);
    } else ok(`${where}: ${c.keys.length} keys`);
    if (!Number.isInteger(c.steps) || c.steps < 1) {
      fail(`${where}: steps ${JSON.stringify(c.steps)}, expected integer >= 1`);
    } else ok(`${where}: steps ${c.steps}`);
    const tween = c.tween ?? 'linear';
    if (!(tween in TWEENS)) {
      fail(`${where}: tween '${tween}' not in the engine table (${Object.keys(TWEENS).join(', ')})`);
    } else ok(`${where}: tween ${tween}`);
  }
  if (!hasCycles) ok('none declared — manifest must stay v1');

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
      // Manifest v2 (contract #18): `cycles` + `version` only when the pack
      // declares cycles; cycle frames never enter `frames` (enforced above by
      // the exact-match check, which allows exactly the canonical frames).
      if (hasCycles) {
        if (manifest.version !== 2) {
          fail(`manifest version: ${JSON.stringify(manifest.version)}, expected 2 when cycles are declared`);
        } else ok('version: 2 (v2 with cycles)');
        for (const [name, files] of Object.entries(cycleFiles)) {
          const mc = manifest.cycles?.[name];
          if (!mc) {
            fail(`manifest cycles.${name} missing`);
            continue;
          }
          if (mc.fps !== cycles[name].fps) {
            fail(`manifest cycles.${name}.fps ${JSON.stringify(mc.fps)}, expected ${cycles[name].fps}`);
          } else ok(`cycles.${name}: fps ${mc.fps}`);
          const gotCycleFiles = (mc.frames ?? []).map((fr) => fr.file);
          if (JSON.stringify(gotCycleFiles) !== JSON.stringify(files)) {
            fail(`manifest cycles.${name} frames ${JSON.stringify(gotCycleFiles)} do not match engine order ${JSON.stringify(files)}`);
          } else ok(`cycles.${name}: ${files.length} frames in engine order`);
        }
      } else if (manifest.cycles !== undefined || manifest.version !== undefined) {
        fail('pack declares no cycles but manifest carries cycles/version — v1 must stay v1');
      } else ok('v1 manifest (no cycles/version keys)');
    } catch (e) {
      fail(`manifest.json unreadable (${e.message})`);
    }
  }

  console.log('dimensions + alpha outside silhouette');
  // The pack's union silhouette, rendered at canvas size — the alpha gate.
  // Cycle frames sit inside it too: the silhouette must sweep the whole
  // interpolated pose range (contract #18), so a mid-phase pose poking out
  // fails here.
  const mask = decodePNG(renderSvg(pack.silhouette(), pack).png);
  const decoded = {};
  const opaqueCounts = {};
  for (const f of allPngs) {
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
    opaqueCounts[f] = opaque;
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

  // Cycle frames replace the base-frame rule with adjacent-pair registration
  // (contract #18): each consecutive sample — including last→first — must be
  // a visible but small step, proving order and tween coverage.
  if (hasCycles) {
    console.log('registration (cycle samples move smoothly around the loop)');
    const baseOpaque = opaqueCounts[baseFile];
    const maxDelta = baseOpaque == null ? null : Math.floor(baseOpaque * MAX_CYCLE_DELTA_RATIO);
    for (const [name, files] of Object.entries(cycleFiles)) {
      const imgs = files.map((f) => decoded[f]);
      if (imgs.some((img) => !img)) continue; // missing/unreadable files already failed above
      for (let i = 0; i < imgs.length; i++) {
        const a = imgs[i];
        const b = imgs[(i + 1) % imgs.length];
        let differing = 0;
        for (let p = 0; p < a.pixels.length; p += 4) {
          if (
            a.pixels[p] !== b.pixels[p] ||
            a.pixels[p + 1] !== b.pixels[p + 1] ||
            a.pixels[p + 2] !== b.pixels[p + 2] ||
            a.pixels[p + 3] !== b.pixels[p + 3]
          ) {
            differing++;
          }
        }
        const label = `cycles.${name} ${String(i).padStart(3, '0')}→${String((i + 1) % imgs.length).padStart(3, '0')}${i === imgs.length - 1 ? ' (wrap)' : ''}`;
        if (differing < MIN_CYCLE_DELTA) {
          fail(`${label}: only ${differing} px differ — not a visible in-between`);
        } else if (maxDelta != null && differing > maxDelta) {
          fail(`${label}: ${differing} px differ — keyframe jump, not a tween step (max ${maxDelta})`);
        } else {
          ok(`${label}: ${differing} px`);
        }
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
