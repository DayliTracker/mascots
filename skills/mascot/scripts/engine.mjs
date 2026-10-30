// mascots engine — pixel-map sprite frames → PNG, zero dependencies.
//
//   node engine.mjs <pack.mjs> [--out <dir>] [--seed <n>]
//
// A pack is an ES module default-exporting:
//   {
//     name, grid, cx, cy, rx, ry, scale,
//     palette: { key: '#RRGGBB', ... },
//     particleScale, sheetScale, sheetBg,
//     particles: { <name>: string[] },            // small pixel maps
//     frames: { <frameName>: object },            // opts passed to pack.compose
//     compose(c, frameOpts, helpers): string[][]  // paints the body + parts (unoutlined)
//   }
// The engine applies the outline pass, renders each frame to <name>_<frame>.png,
// particles to particle_<name>.png, and a contact_sheet.png for review.

import { deflateSync, crc32 } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// --- deterministic RNG (mulberry32). Packs may use it for jitter; the same
// seed must always produce identical output.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexToRgba(hex, a = 255) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
    a,
  ];
}

// --- canvas + composition helpers -------------------------------------------

export function blank(grid) {
  return Array.from({ length: grid }, () => Array(grid).fill('.'));
}

export function stamp(canvas, art, atRow, atCol) {
  const grid = canvas.length;
  art.forEach((rowChars, r) => {
    rowChars.split('').forEach((ch, c) => {
      if (ch === '.') return;
      const y = atRow + r;
      const x = atCol + c;
      if (y >= 0 && y < grid && x >= 0 && x < grid) canvas[y][x] = ch;
    });
  });
}

export function bodyMask({ grid, cx, cy, rx, ry }) {
  const canvas = blank(grid);
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const dr = (r - cy) / ry;
      const dc = (c - cx) / rx;
      if (dr * dr + dc * dc <= 1) canvas[r][c] = 'b';
    }
  }
  return canvas;
}

// two-tone shading keyed to a top-left light: darker below, softer shade on the
// lower-left. `lowStart`/`lowDeep` are fractions of ry below cy.
export function paintBody(canvas, { cx, cy, ry, rx }, { lowStart = 0.42, lowDeep = 0.72, soft = 't', deep = 's' } = {}) {
  for (let r = 0; r < canvas.length; r++) {
    for (let c = 0; c < canvas[r].length; c++) {
      if (canvas[r][c] !== 'b') continue;
      const low = r > cy + lowStart * ry;
      const leftLow = c < cx - 0.35 * rx && r > cy - 1;
      if (low) canvas[r][c] = r > cy + lowDeep * ry ? deep : soft;
      else if (leftLow) canvas[r][c] = soft;
    }
  }
}

// 1px silhouette outline in palette key `color`. Runs last: wraps every part,
// including any that break the body silhouette (ears, wings, feet).
export function outline(canvas, color = 'o') {
  const grid = canvas.length;
  const result = canvas.map((row) => [...row]);
  const filledAt = (r, c) =>
    r >= 0 && r < grid && c >= 0 && c < grid && canvas[r][c] !== '.';
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      if (canvas[r][c] !== '.') continue;
      let touches = false;
      for (let dr = -1; dr <= 1 && !touches; dr++) {
        for (let dc = -1; dc <= 1 && !touches; dc++) {
          if ((dr || dc) && filledAt(r + dr, c + dc)) touches = true;
        }
      }
      if (touches) result[r][c] = color;
    }
  }
  return result;
}

export const helpers = { blank, stamp, bodyMask, paintBody, outline, makeRng };

// --- PNG encoder -------------------------------------------------------------

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

export function encodePNG(pixels, width, height = width) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const raw = Buffer.alloc(height * (width * 4 + 1));
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixels[y][x];
      raw[p++] = r; raw[p++] = g; raw[p++] = b; raw[p++] = a;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- rendering ---------------------------------------------------------------

export function render(map, palette, scale, bg = null) {
  const h = map.length;
  const w = map[0].length;
  const px = Array.from({ length: h * scale }, () =>
    Array(w * scale).fill(bg ?? [0, 0, 0, 0])
  );
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const ch = map[r][c];
      if (ch === '.') continue;
      const color = palette[ch];
      if (!color) throw new Error(`Palette key '${ch}' missing for pixel (${r},${c})`);
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          px[r * scale + dy][c * scale + dx] = color;
        }
      }
    }
  }
  return encodePNG(px, w * scale, h * scale);
}

export function contactSheet(frames, particles, palette, { scale = 8, bg = '#FAF3E6' }) {
  const maps = [...Object.values(frames), ...Object.values(particles)];
  const cols = maps.length;
  const cell = Math.max(...maps.map((m) => Math.max(m.length, m[0].length))) * scale;
  const sheet = Array.from({ length: cell }, () =>
    Array(cell * cols).fill(hexToRgba(bg))
  );
  maps.forEach((map, i) => {
    const off = i * cell + Math.floor((cell - map[0].length * scale) / 2);
    for (let r = 0; r < map.length; r++) {
      for (let c = 0; c < map[r].length; c++) {
        const ch = map[r][c];
        if (ch === '.') continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            sheet[r * scale + dy][off + c * scale + dx] = palette[ch];
          }
        }
      }
    }
  });
  return encodePNG(sheet, cell * cols, cell);
}

// --- pack runner --------------------------------------------------------------

export async function renderPack(packPath, { out, seed } = {}) {
  const mod = await import(pathToFileURL(resolve(packPath)).href);
  const pack = mod.default;
  const outDir = resolve(out ?? dirname(resolve(packPath)));
  const palette = Object.fromEntries(
    Object.entries(pack.palette).map(([k, v]) => [k, hexToRgba(v)])
  );

  const maps = {};
  for (const [frameName, opts] of Object.entries(pack.frames)) {
    const canvas = pack.compose({ ...helpers, grid: pack.grid }, opts ?? {}, pack);
    maps[frameName] = outline(canvas, pack.outlineKey ?? 'o');
  }

  mkdirSync(outDir, { recursive: true });
  const written = [];
  for (const [frameName, map] of Object.entries(maps)) {
    const file = join(outDir, `${pack.name}_${frameName}.png`);
    writeFileSync(file, render(map, palette, pack.scale));
    written.push(file);
  }
  for (const [partName, map] of Object.entries(pack.particles ?? {})) {
    const file = join(outDir, `particle_${partName}.png`);
    writeFileSync(file, render(map, palette, pack.particleScale ?? 24));
    written.push(file);
  }
  const sheet = join(outDir, 'contact_sheet.png');
  writeFileSync(
    sheet,
    contactSheet(maps, pack.particles ?? {}, palette, {
      scale: pack.sheetScale ?? 8,
      bg: pack.sheetBg ?? '#FAF3E6',
    })
  );
  written.push(sheet);
  return { pack, outDir, frames: maps, written };
}

// CLI entry: node engine.mjs <pack.mjs> [--out dir] [--seed n]
if (process.argv[1] && resolve(process.argv[1]) === import.meta.url.replace('file://', '')) {
  const args = process.argv.slice(2);
  const packPath = args.find((a) => !a.startsWith('--'));
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  if (!packPath) {
    console.error('usage: node engine.mjs <pack.mjs> [--out dir] [--seed n]');
    process.exit(2);
  }
  renderPack(packPath, { out: get('--out'), seed: Number(get('--seed') ?? 0) }).then(
    (r) => console.log(`Wrote ${r.written.length} files to ${r.outDir}`),
    (e) => {
      console.error(e);
      process.exit(1);
    }
  );
}
