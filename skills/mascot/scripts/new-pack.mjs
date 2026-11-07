// new-pack — scaffold a starter pack for a new animal, in either pack kind
// (ADR 0001). Zero dependencies beyond node: builtins.
//
//   node new-pack.mjs <animal> [--kind smooth|pixel]
//
// kind 'smooth' (default): hand-authored SVG per frame, rendered by
//   smooth-engine.mjs in THIS repo (build-time rasterizer); apps consume
//   the PNG frames. Reference: packs/smooth-duck.mjs.
// kind 'pixel': pixel-map pack rendered by engine.mjs — zero deps, vendored
//   into the app repo. Reference: packs/duck.mjs.
//
// Writes packs/<animal>.mjs. The starter passes the kind's validator as-is;
// replace the TODO regions with real anatomy, then follow the /mascot
// pipeline (Gate 1 art approval before any component code).

import { writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const usage = `usage: node new-pack.mjs <animal> [--kind smooth|pixel]

  --kind smooth  SVG starter for smooth-engine.mjs (default — flagship per ADR 0001)
  --kind pixel   pixel-map starter for engine.mjs (zero-dep, vendored into apps)`;

const name = process.argv[2];
const kindIdx = process.argv.indexOf('--kind');
const kind = kindIdx >= 0 ? process.argv[kindIdx + 1] : 'smooth';

if (!name || !/^[a-z][a-z0-9_-]*$/.test(name) || (kind !== 'smooth' && kind !== 'pixel')) {
  console.error(usage);
  process.exit(2);
}
const outPath = join(here, 'packs', name + '.mjs');
if (existsSync(outPath)) {
  console.error(outPath + ' already exists — pick another name');
  process.exit(1);
}

// Deterministic per-name seed: scaffolding the same animal twice yields the
// same starter (never Math.random(), never Date.now()).
const seed =
  Number.parseInt(createHash('sha256').update(name).digest('hex').slice(0, 8), 16) % 1e9;

const template = kind === 'smooth' ? smoothTemplate(name, seed) : pixelTemplate(name, seed);
writeFileSync(outPath, template);

const engine = kind === 'smooth' ? 'smooth-engine.mjs' : 'engine.mjs';
const validator = kind === 'smooth' ? 'validate-smooth-frames.mjs' : 'validate-frames.mjs';
console.log('Wrote ' + resolve(outPath));
console.log('Next: node ' + engine + ' packs/' + name + '.mjs --out /tmp/' + name);
console.log('Then: node ' + validator + ' packs/' + name + '.mjs --out /tmp/' + name);

// --- pixel starter --------------------------------------------------------------
// Geometry mirrors packs/duck.mjs (grid 25 — the pixel class that stays
// supported; the 48px class is shelved). Every frame genuinely differs from
// idle so the validator's registration gate passes as-is.

function pixelTemplate(name, seed) {
  return `// ${name} pack — scaffolded by new-pack.mjs (--kind pixel). Replace the
// TODO regions with real anatomy; the starter passes validate-frames as-is.
// Reference: packs/duck.mjs.

const P = {
  o: '#5B4634', // outline, warm brown
  b: '#FFF6E3', // body cream
  t: '#F2E2C4', // soft shade
  s: '#E4CD9F', // deep shade
  a: '#F6A94C', // bill / feet accent
  A: '#D9832E', // accent shade
  p: '#F5BFAE', // blush
  e: '#40342B', // eyes
  W: '#FFFFFF', // glints
  r: '#F28BA0', // heart pink
  k: '#FFD65A', // sparkle yellow
};

const EYE = {
  open: ['Wee', 'eee', 'eee'],
  blink: ['ooo'],
  wide: ['.oo.', 'o..o', 'o..o', '.oo.'],
  happy: ['e.e', '.e.'],
};

const BEAK = {
  closed: ['.aaa.', 'aaAaa', 'AAAAA'],
  open: ['aaaaa', 'AeeeA', '.AAA.'],
  smile: ['a...a', 'aaaaa', 'AAAAA'],
};

const FEET = { stand: ['.aa.', '.Aa.'] };

export default {
  name: '${name}',
  grid: 25,
  cx: 12,
  cy: 11,
  rx: 7.6,
  ry: 8.4,
  scale: 20,
  particleScale: 24,
  sheetScale: 8,
  sheetBg: '#FAF3E6',
  palette: P,
  seed: ${seed},

  particles: {
    star: ['..k..', '..k..', 'kkWkk', '..k..', '..k..'],
    heart: ['.rr.rr.', 'rWrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
  },

  frames: {
    idle: {},
    blink: { eyes: 'blink' },
    look: { eyes: 'open', eyeShift: 1 },
    walk_a: { feet: 'walkA' },
    walk_b: { feet: 'walkB' },
    happy: { eyes: 'happy', beak: 'smile', wings: 'up' },
    surprised: { eyes: 'wide', beak: 'open' },
  },

  compose(c, opts = {}) {
    const { stamp } = c;
    const { cx, cy } = this;
    const canvas = c.bodyMask(this);

    c.paintBody(canvas, { cx, cy, ry: this.ry, rx: this.rx });

    // TODO: ears / tail / horns here — parts that break the silhouette; the
    // engine's outline pass wraps whatever you stamp (references/animal-recipes.md)

    // wings — up pair sits higher for the celebrate frame
    if ((opts.wings ?? 'down') === 'up') {
      stamp(canvas, ['.ss', 'ss.', 's..'], cy - 4, cx - 8);
      stamp(canvas, ['ss.', '.ss', '..s'], cy - 4, cx + 6);
    } else {
      stamp(canvas, ['ss', 'ss', 'ss'], cy + 1, cx - 7);
      stamp(canvas, ['ss', 'ss', 'ss'], cy + 1, cx + 6);
    }

    // feet — one foot drops each walk frame (walk_a: left, walk_b: right)
    if (opts.feet === 'walkA') {
      stamp(canvas, FEET.stand, 21, cx - 6);
      stamp(canvas, FEET.stand, 20, cx + 1);
    } else if (opts.feet === 'walkB') {
      stamp(canvas, FEET.stand, 20, cx - 5);
      stamp(canvas, FEET.stand, 21, cx + 1);
    } else {
      stamp(canvas, FEET.stand, 20, cx - 5);
      stamp(canvas, FEET.stand, 20, cx + 1);
    }

    // TODO: accessory (scarf / hat) here — palette-lock every color it uses

    // blush just under the eyes' outer edge
    stamp(canvas, ['pp', 'pp'], cy - 1, cx - 7);
    stamp(canvas, ['pp', 'pp'], cy - 1, cx + 6);

    // beak / muzzle
    stamp(canvas, BEAK[opts.beak ?? 'closed'], cy - 1, cx - 2);

    // eyes last. wide eyes sit one column further out to clear the beak.
    const eye = opts.eyes ?? 'open';
    const shift = opts.eyeShift ?? 0;
    const eyeTop = eye === 'blink' ? cy - 2 : eye === 'happy' ? cy - 3 : cy - 4;
    const leftCol = (eye === 'wide' ? cx - 6 : cx - 5) + shift;
    const rightCol = (eye === 'wide' ? cx + 2 : cx + 3) + shift;
    stamp(canvas, EYE[eye], eyeTop, leftCol);
    stamp(canvas, EYE[eye], eyeTop, rightCol);

    return canvas;
  },
};
`;
}

// --- smooth starter ---------------------------------------------------------------
// Shapes stay inside the body ellipse so the union silhouette() is just the
// inflated body — the alpha gate passes as-is. Extend silhouette() before
// drawing anything that breaks the body edge.

function smoothTemplate(name, seed) {
  return `// ${name} pack — scaffolded by new-pack.mjs (--kind smooth, ADR 0001).
// Hand-authored vector art, no image generation: every frame is parametric
// SVG in a 512x512 canvas, rasterized to PNG by the pinned build-time
// rasterizer (smooth-engine.mjs). Replace the TODO regions with real anatomy;
// the starter passes validate-smooth-frames as-is. Reference:
// packs/smooth-duck.mjs.

const C = {
  body: '#FFF6E3', // cream — swap for the animal's base
  soft: '#F2E2C4', // soft shade
  deep: '#E4CD9F', // deep shade
  accent: '#F6A94C', // feet / bill / paws
  accentShade: '#D9832E', // accent shade
  blush: '#F5BFAE', // blush
  eye: '#40342B', // eyes / mouth interior
  glint: '#FFFFFF', // glints
};

// Egg body, center (256, 270). TODO: reshape into the animal's silhouette —
// and add any silhouette-breaking part (ears, tail, wings) to silhouette()
// too, or the alpha gate fails on pixels outside the union mask.
const BODY = '<ellipse cx="256" cy="270" rx="150" ry="180"/>';
const BODY_FILL = '<ellipse cx="256" cy="270" rx="150" ry="180" fill="' + C.body + '"/>';

// TODO: ears / tail / wings as path constants here.

// Feet stay inside the body edge so the starter mask needs only the body.
const FEET = {
  stand: [[220, 420], [292, 420]],
  walkA: [[206, 424], [306, 416]],
  walkB: [[206, 416], [306, 424]],
};

function feetSvg(pair) {
  return pair
    .map(([fx, fy]) => '<ellipse cx="' + fx + '" cy="' + fy + '" rx="26" ry="14" fill="' + C.accent + '"/>')
    .join('');
}

// Eye pair at (196, 186) and (316, 186); 'look' slides both sideways.
function eyesOpen(shift) {
  const s = shift || 0;
  const one = (ex) =>
    '<ellipse cx="' + (ex + s) + '" cy="186" rx="15" ry="19" fill="' + C.eye + '"/>' +
    '<circle cx="' + (ex + s - 5) + '" cy="179" r="5" fill="' + C.glint + '"/>';
  return one(196) + one(316);
}

function eyesWide() {
  const one = (ex) =>
    '<circle cx="' + ex + '" cy="186" r="21" fill="' + C.glint + '" stroke="' + C.eye + '" stroke-width="7"/>' +
    '<circle cx="' + ex + '" cy="188" r="8" fill="' + C.eye + '"/>' +
    '<circle cx="' + (ex - 3) + '" cy="185" r="3" fill="' + C.glint + '"/>';
  return one(196) + one(316);
}

function eyesArc(top) {
  const one = (ex) =>
    '<path d="M ' + (ex - 18) + ' 192 Q ' + ex + ' ' + top + ' ' + (ex + 18) + ' 192" stroke="' + C.eye +
    '" stroke-width="7" stroke-linecap="round" fill="none"/>';
  return one(196) + one(316);
}

const EYES = {
  open: (o) => eyesOpen(o.eyeShift),
  blink: () => eyesArc(178),
  happy: () => eyesArc(168),
  wide: () => eyesWide(),
};

function mouth(kind) {
  if (kind === 'smile') {
    return '<path d="M 230 244 Q 256 262 282 244" stroke="' + C.eye +
      '" stroke-width="6" stroke-linecap="round" fill="none"/>';
  }
  if (kind === 'open') {
    return (
      '<ellipse cx="256" cy="252" rx="24" ry="14" fill="' + C.eye + '"/>' +
      '<path d="M 234 258 Q 256 268 278 258" stroke="' + C.accentShade +
      '" stroke-width="5" stroke-linecap="round" fill="none"/>'
    );
  }
  // closed — a small accent bill / nose stub
  return '<ellipse cx="256" cy="246" rx="20" ry="12" fill="' + C.accent + '"/>';
}

// --- frame composition --------------------------------------------------------

function frameSvg(o = {}) {
  return (
    // body + two-tone shading (clipped to the body silhouette, top-left light)
    '<clipPath id="body">' + BODY + '</clipPath>' +
    BODY_FILL +
    '<g clip-path="url(#body)">' +
    '<ellipse cx="256" cy="352" rx="164" ry="96" fill="' + C.soft + '"/>' +
    '<ellipse cx="256" cy="416" rx="138" ry="60" fill="' + C.deep + '"/>' +
    '</g>' +
    // TODO: wings / ears / tail — between feet and blush, like the duck
    feetSvg(FEET[o.feet || 'stand']) +
    '<ellipse cx="152" cy="236" rx="16" ry="10" fill="' + C.blush + '"/>' +
    '<ellipse cx="360" cy="236" rx="16" ry="10" fill="' + C.blush + '"/>' +
    mouth(o.mouth || 'closed') +
    EYES[o.eyes || 'open'](o)
  );
}

export default {
  kind: 'smooth',
  name: '${name}',
  size: 512, // frame canvas: square, transparent outside the silhouette
  seed: ${seed}, // reserved for deterministic jitter; never Math.random()
  sheet: { bg: '#FAF3E6', scale: 0.44, gap: 20, pad: 28 },

  frames: {
    idle: {},
    blink: { eyes: 'blink' },
    look: { eyes: 'open', eyeShift: 16 },
    walk_a: { feet: 'walkA' },
    walk_b: { feet: 'walkB' },
    happy: { eyes: 'happy', mouth: 'smile' },
    surprised: { eyes: 'wide', mouth: 'open' },
  },

  // One frame's inner SVG, positioned in the pack's 512x512 user space.
  frame(opts) {
    return frameSvg(opts || {});
  },

  // Union silhouette used by the alpha gate (validate-smooth-frames.mjs).
  // Inflate with a round stroke so anti-aliased edges stay inside the mask;
  // widen it (or add shapes) when anatomy breaks the body edge.
  silhouette() {
    return (
      '<g fill="#000" stroke="#000" stroke-width="16" stroke-linejoin="round" stroke-linecap="round">' +
      BODY +
      '</g>'
    );
  },
};
`;
}
