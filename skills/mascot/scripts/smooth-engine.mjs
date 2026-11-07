// smooth-engine — smooth-pack renderer: hand-authored SVG → PNG frames.
//
//   node smooth-engine.mjs <pack.mjs> [--out <dir>]
//
// A smooth pack is an ES module default-exporting:
//   {
//     kind: 'smooth', name, size,
//     sheet: { bg, scale, gap, pad },
//     frames: { <frameName>: object },   // opts passed to pack.frame
//     frame(opts): string,               // inner SVG in the pack's user space
//     silhouette(): string,              // union mask for the alpha gate
//   }
//
// Frames render through the pinned build-time rasterizer (@resvg/resvg-js,
// exact-pinned in package.json). No <text> elements and loadSystemFonts:false
// keep font metrics out of the pipeline, so output is byte-for-byte identical
// across machines for a given rasterizer version. Emits:
//   <name>_<frame>.png · contact_sheet.png · manifest.json
//
// Build-time only — this repo's dependency. Apps consume the PNG frames and
// manifest.json; nothing here ships to a consuming app.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);

export function rasterizerVersion() {
  return require('@resvg/resvg-js/package.json').version;
}

// Render one full SVG document. Deterministic: fixed options, no fonts.
export function renderSvg(inner, pack) {
  const size = pack.size;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}">${inner}</svg>`;
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'original' },
    font: { loadSystemFonts: false },
  });
  const png = resvg.render();
  return { png: Buffer.from(png.asPng()), width: png.width, height: png.height };
}

// Contact sheet: every frame side by side on the pack's sheet background.
export function renderSheet(framesInner, pack) {
  const { bg, scale, gap, pad } = pack.sheet;
  const size = pack.size;
  const cell = Math.round(size * scale);
  const cols = framesInner.length;
  const width = pad * 2 + cols * cell + (cols - 1) * gap;
  const height = pad * 2 + cell;
  const placed = framesInner
    .map(
      (inner, i) =>
        `<g transform="translate(${pad + i * (cell + gap)} ${pad}) scale(${scale})">${inner}</g>`
    )
    .join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${bg}"/>${placed}</svg>`;
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'original' },
    font: { loadSystemFonts: false },
  });
  const png = resvg.render();
  return { png: Buffer.from(png.asPng()), width, height };
}

export function renderManifest(pack, frames, sheet) {
  const manifest = {
    pack: pack.name,
    art: 'smooth',
    canvas: pack.size,
    frames, // [{ name, file, width, height }] in pack.frames key order
    sheet: { file: 'contact_sheet.png', width: sheet.width, height: sheet.height },
    rasterizer: { name: '@resvg/resvg-js', version: rasterizerVersion() },
    generator: 'smooth-engine.mjs',
  };
  return Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

export async function renderPack(packPath, { out } = {}) {
  const mod = await import(pathToFileURL(resolve(packPath)).href);
  const pack = mod.default;
  const outDir = resolve(out ?? dirname(resolve(packPath)));

  const frames = [];
  const written = [];
  mkdirSync(outDir, { recursive: true });
  for (const [frameName, opts] of Object.entries(pack.frames)) {
    const { png, width, height } = renderSvg(pack.frame(opts ?? {}), pack);
    const file = join(outDir, `${pack.name}_${frameName}.png`);
    writeFileSync(file, png);
    frames.push({ name: frameName, file: `${pack.name}_${frameName}.png`, width, height });
    written.push(file);
  }
  const sheet = renderSheet(
    Object.entries(pack.frames).map(([, opts]) => pack.frame(opts ?? {})),
    pack
  );
  const sheetFile = join(outDir, 'contact_sheet.png');
  writeFileSync(sheetFile, sheet.png);
  written.push(sheetFile);

  const manifestFile = join(outDir, 'manifest.json');
  const manifest = renderManifest(pack, frames, sheet);
  writeFileSync(manifestFile, manifest);
  written.push(manifestFile);

  return { pack, outDir, frames, written };
}

// CLI entry: node smooth-engine.mjs <pack.mjs> [--out dir]
if (process.argv[1] && resolve(process.argv[1]) === import.meta.url.replace('file://', '')) {
  const args = process.argv.slice(2);
  const packPath = args.find((a) => !a.startsWith('--'));
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  if (!packPath) {
    console.error('usage: node smooth-engine.mjs <pack.mjs> [--out dir]');
    process.exit(2);
  }
  renderPack(packPath, { out: get('--out') }).then(
    (r) => console.log(`Wrote ${r.written.length} files to ${r.outDir}`),
    (e) => {
      console.error(e);
      process.exit(1);
    }
  );
}
