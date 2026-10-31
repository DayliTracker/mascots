// new-pack — scaffold a starter pack for a new animal, wired to the style
// tokens. Zero dependencies.
//
//   node new-pack.mjs <animal> [grid]
//
// Writes skills/mascot/scripts/packs/<animal>.mjs. The starter passes
// validate-frames as-is; replace the TODO regions with real anatomy, then
// follow the /mascot pipeline (Gate 1 art approval before any component code).

import { writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2];
const gridArg = Number(process.argv[3] ?? 48);

if (!name || !/^[a-z][a-z0-9_]*$/.test(name)) {
  console.error('usage: node new-pack.mjs <animal> [grid=48]');
  process.exit(2);
}
const outPath = join(here, 'packs', `${name}.mjs`);
if (existsSync(outPath)) {
  console.error(`${outPath} already exists — pick another name`);
  process.exit(1);
}
const grid = gridArg === 25 ? 25 : 48;
const cx = Math.floor(grid / 2);
const cy = grid === 25 ? 11 : Math.floor(grid * 0.44);
const rx = grid === 25 ? 7.6 : Math.floor(grid * 0.29);
const ry = grid === 25 ? 8.4 : Math.floor(grid * 0.31);

const body = grid === 25 ? '#FFF6E3' : '#FFF6E3'; // swap for the animal's base
const template = `// ${name} pack — scaffolded by new-pack.mjs, wired to the style tokens
// (references/style-guide.md). Replace the TODO regions with real anatomy.

import { shadeTones } from '../engine.mjs';

const BODY = '${body}';
const ACCENT = '#F6A94C'; // TODO: bill / paws / inner-ear accent

const B = shadeTones(BODY);
const A = shadeTones(ACCENT);

const P = {
  o: '#5B4634', // fallback outline
  g: '#DBCEBE', // ground shadow, pre-blended over the app canvas
  b: BODY,
  t: B.soft,
  s: B.deep,
  O: B.out,
  a: ACCENT,
  u: A.soft,
  d: A.deep,
  Q: A.out,
  e: '#40342B', // eyes
  W: '#FFFFFF', // glints
  k: '#FFD65A', // sparkle yellow
  r: '#F28BA0', // heart pink
};

const EYE = {
  open: ['.eee.', 'Weeee', 'eeeee', 'eeeee', '.eee.'],
  blink: ['eee'],
  wide: ['.eeee.', 'eeeeee', 'eWeeee', 'eeeeee', '.eeee.'],
  happy: ['ee.ee', '.e.e.', '..e..'],
};

export default {
  name: '${name}',
  grid: ${grid},
  cx: ${cx},
  cy: ${cy},
  rx: ${rx},
  ry: ${ry},
  scale: ${grid === 25 ? 20 : 12},
  particleScale: 24,
  sheetScale: ${grid === 25 ? 8 : 8},
  sheetBg: '#FAF3E6',
  palette: P,
  seed: ${Math.floor(Date.now() / 1e7)},

  style: {
    outline: 'selective',
    outlineFor: { b: 'O', t: 'O', s: 'O', a: 'Q', u: 'Q', d: 'Q' },
    groundShadow: { rxScale: 1.18, rows: ${grid === 25 ? 1 : 2} },
  },

  particles: {
    star: ['..k..', '.kWk.', 'kkWkk', '.kWk.', '..k..'],
    heart: ['.rr.rr.', 'rWrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
  },

  frames: {
    idle: { eyes: 'open' },
    blink: { eyes: 'blink' },
    look: { eyes: 'open', eyeShift: 2 },
    walk_a: { feet: 'walkA' },
    walk_b: { feet: 'walkB' },
    happy: { eyes: 'happy', beak: 'smile', wings: 'up' },
    happy_alt: { eyes: 'happy', beak: 'open', wings: 'up2' },
    surprised: { eyes: 'wide', beak: 'open', wings: 'out' },
  },

  compose(c, opts = {}) {
    const { stamp } = c;
    const { cx, cy } = this;
    const canvas = c.bodyMask(this);
    c.paintBody(canvas, { cx, cy, ry: this.ry, rx: this.rx });

    // TODO: ears / horns / tail here — parts that break the silhouette

    // TODO: feet — copy the duck48 walk poses as a starting point

    // TODO: muzzle / belly patch / accessory here

    const eye = opts.eyes ?? 'open';
    const shift = opts.eyeShift ?? 0;
    const eyeTop = eye === 'blink' ? cy - 4 : eye === 'wide' ? cy - 9 : cy - 8;
    stamp(canvas, EYE[eye], eyeTop, cx - 8 + shift);
    stamp(canvas, EYE[eye], eyeTop, cx + 3 + shift);

    return canvas;
  },
};
`;

writeFileSync(outPath, template);
console.log(`Wrote ${resolve(outPath)}`);
console.log('Next: fill the TODO regions, then node engine.mjs packs/' + name + '.mjs --out /tmp/' + name);
