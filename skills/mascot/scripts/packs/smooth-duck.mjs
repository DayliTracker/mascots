// Smooth-duck pack — first smooth pack (ADR 0001). Hand-authored vector art,
// no image generation: every frame is parametric SVG in a 512×512 canvas,
// rasterized to PNG by the pinned build-time rasterizer (smooth-engine.mjs).
//
// Same character as the pixel duck (packs/duck.mjs): chibi duckling, egg body,
// wide bill, mint scarf, stub wings, tuft.
//
// Prototype-match pass (user verdict 2026-11-09, on PR #12): the shipped art
// must look like the approved prototype v6 strip (dayli-step-tracker
// `prototype/textless-shell`), re-measured pixel-by-pixel from the strip:
//   · NO outline anywhere — shapes read by color contrast only (the prototype
//     has no rim; the earlier Habita-derived #5B4634 stroke is gone)
//   · body: linear vertical gradient #FFF6E3 → #E4CD9F over y 98→440
//     (prototype top/bottom samples; the radial near-white blend was flat)
//   · collar: full-width smile-band snug under the bill (y≈263 top), light
//     mint #B7E0CC with a dark-mint #8FCBB2 strip along its lower edge
//   · scarf tail: slim two-tone drape (dark edge + light face) hanging
//     front-right below the collar — prototype hangs right, not left
//   · tuft: two filled leaf lobes (pale left, tan right), not a stroked curl
//   · wings: flat tan #E4CD9F, a step darker than the local body, no highlight
//   · belly: one soft #F2E2C4 ellipse centered ~y 337 under the collar
//   · no right-hip tail curl — the prototype's hip is plain gradient
//   · bills shortened to end y≈258-260, snug above the collar (prototype);
//     surprised mouth = orange upper + dark interior
//
// Compose order: body → belly → wings → feet → tuft → scarf tail → collar →
// blush → bill → eyes last (on top).

const C = {
  body: '#FFF6E3', // cream (gradient top)
  bodyLo: '#E4CD9F', // warm tan (gradient bottom, wings, tuft right lobe)
  soft: '#F2E2C4', // soft shade (belly patch, tuft left lobe)
  bill: '#F6A94C', // bill / feet
  billShade: '#D9832E', // bill / feet shade, mouth line
  blush: '#F5BFAE', // blush
  eye: '#40342B', // eyes / mouth interior
  glint: '#FFFFFF', // glints
  scarf: '#B7E0CC', // scarf mint (light face)
  scarfShade: '#8FCBB2', // scarf mint shade (lower strip, tail edge)
};

// Egg body — slightly narrower top, fuller bottom. Center (256, ~270).
const BODY =
  'M 256 98 C 318 98 368 140 392 204 C 414 262 404 330 360 382 ' +
  'C 322 424 292 440 256 440 C 220 440 190 424 152 382 ' +
  'C 108 330 98 262 120 204 C 144 140 194 98 256 98 Z';

// Tuft: teardrop sprout tilted right on a pinched stalk (prototype: pale
// face x≈251-268, tan right-shade x≈267-282, y 52-96), no outline.
const TUFT =
  'M 252 118 C 240 92 250 58 268 52 C 284 62 282 98 264 118 Z';
const TUFT_SHADE =
  'M 262 118 C 258 92 270 60 284 56 C 290 68 286 102 272 118 Z';

const WING = {
  left:
    'M 176 300 C 148 300 128 318 128 342 C 128 362 146 374 166 368 ' +
    'C 180 363 186 348 182 330 C 179 316 180 302 176 300 Z',
  right:
    'M 336 300 C 364 300 384 318 384 342 C 384 362 366 374 346 368 ' +
    'C 332 363 326 348 330 330 C 333 316 332 302 336 300 Z',
};
// Happy: dedicated horizontal wing lobes stretched out at collar height
// (prototype: tips reach ≈30px past the body edge, y≈280-330) — a rotated
// hanging wing reads as a lump on the similarly-tan body.
const WING_OUT = {
  left:
    'M 176 296 C 148 278 108 274 82 288 C 72 298 77 312 92 316 ' +
    'C 120 322 158 316 176 308 Z',
  right:
    'M 336 296 C 364 278 404 274 430 288 C 440 298 435 312 420 316 ' +
    'C 392 322 354 316 336 308 Z',
};

// Feet: small rounded rects (prototype 13×8.5 rx4.2 → 54×34 rx17). Tucked
// under the body; walk_a = left foot forward/down; walk_b = right foot.
function footRect(cx, cy) {
  return { x: cx - 27, y: cy - 17, w: 54, h: 34, rx: 17 };
}
const FEET = {
  stand: [footRect(206, 452), footRect(306, 452)],
  walkA: [footRect(198, 462), footRect(314, 444)],
  walkB: [footRect(198, 444), footRect(314, 462)],
};

const SCARF = {
  // Full-width smile-band snug under the bill (prototype: top y≈263 mid,
  // bottom y≈316 mid), drawn inside the body clip so it hugs the silhouette.
  // Flat runs + corner turns (rounded-rect logic): the sides stay a steady
  // light mint and the dark strip stays thin toward the edges.
  band:
    'M 96 272 C 160 258 352 258 416 272 L 416 302 ' +
    'C 372 316 330 316 256 316 C 182 316 140 316 96 302 Z',
  // Light face: same top edge, flat bottom at y≈304 with soft corners, so the
  // dark underside strip reads ≈5px at the sides, ≈12px mid-bottom.
  bandFace:
    'M 96 272 C 160 258 352 258 416 272 L 416 296 ' +
    'C 382 304 330 304 256 304 C 182 304 134 304 96 296 Z',
  // Slim two-tone drape hanging front-right below the collar (prototype:
  // dark edge x≈326-336, light face x≈338-348, tapering to a tip at y≈354).
  tailDark: 'M 324 308 L 338 308 L 335 344 L 329 354 Z',
  tailLight: 'M 337 308 L 351 308 L 347 342 L 341 352 Z',
};

const BLUSH = [
  { cx: 152, cy: 234, rx: 15, ry: 12 },
  { cx: 359, cy: 235, rx: 16, ry: 12 },
];

function billClosed() {
  return (
    `<path d="M 209 236 Q 256 200 303 236 Q 293 261 256 261 Q 219 261 209 236 Z" fill="${C.bill}"/>` +
    `<path d="M 224 249 Q 256 259 288 249" stroke="${C.billShade}" stroke-width="6" stroke-linecap="round" fill="none"/>`
  );
}

function billSmile() {
  return (
    `<path d="M 208 234 Q 256 204 304 234 Q 296 264 256 264 Q 216 264 208 234 Z" fill="${C.bill}"/>` +
    `<path d="M 222 252 Q 256 265 290 252" stroke="${C.billShade}" stroke-width="6" stroke-linecap="round" fill="none"/>`
  );
}

function billOpen() {
  // Surprised: slim orange upper band (corners only) + broad dark open mouth
  // that reaches y≈234 at center (prototype: orange x 214-294, dark ≈30×16).
  return (
    `<ellipse cx="256" cy="231" rx="40" ry="9" fill="${C.bill}"/>` +
    `<ellipse cx="256" cy="249" rx="30" ry="16" fill="${C.eye}"/>`
  );
}

const BILL = { closed: billClosed, smile: billSmile, open: billOpen };

// Eye pair at (200, 200) and (312, 200) — spacing 112 ≈ 40% of head width;
// `look` slides both sideways.
function eyesOpen(shift) {
  const s = shift ?? 0;
  const one = (ex) =>
    `<circle cx="${ex + s}" cy="200" r="16" fill="${C.eye}"/>` +
    `<circle cx="${ex + s - 6}" cy="194" r="4.5" fill="${C.glint}"/>` +
    `<circle cx="${ex + s + 5}" cy="205" r="2" fill="${C.glint}"/>`;
  return one(200) + one(312);
}

function eyesWide() {
  // Prototype shocked eyes: round rings (outer ≈ r24), pupil r11 nudged
  // toward the nose (measured ≈48×48 user units in the strip, both sides).
  const one = (ex, dir) =>
    `<circle cx="${ex}" cy="199" r="21" fill="${C.glint}" stroke="${C.eye}" stroke-width="6"/>` +
    `<circle cx="${ex + 5 * dir}" cy="202" r="11" fill="${C.eye}"/>` +
    `<circle cx="${ex + 5 * dir - 4}" cy="197" r="3" fill="${C.glint}"/>`;
  return one(200, 1) + one(312, -1);
}

// Lid arcs: blink = shallow downward lid (∪), happy = deeper upward arc (∩) —
// the two shapes the approved prototype uses for blink vs happy.
function eyesArc(dip, width) {
  const one = (ex) =>
    `<path d="M ${ex - 21} 200 Q ${ex} ${200 + dip} ${ex + 21} 200" stroke="${C.eye}" stroke-width="${width}" stroke-linecap="round" fill="none"/>`;
  return one(200) + one(312);
}

const EYES = {
  open: (o) => eyesOpen(o.eyeShift),
  blink: () => eyesArc(14, 10), // ∪ lid line
  happy: () => eyesArc(-28, 11), // ∩ smile arc
  wide: () => eyesWide(),
};

// --- frame composition --------------------------------------------------------

function frameSvg(o = {}) {
  const wings = o.wings ?? 'down';
  const feet = FEET[o.feet ?? 'stand'];
  const wing = (side) => {
    const path = wings === 'up' ? WING_OUT[side] : WING[side];
    return `<path d="${path}" fill="${C.bodyLo}"/>`;
  };
  const feetSvg = feet
    .map((f) => `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="${f.rx}" fill="${C.bill}"/>`)
    .join('');

  return (
    // body: linear vertical gradient, cream top → warm tan bottom (prototype)
    `<defs><linearGradient id="dbody" gradientUnits="userSpaceOnUse" ` +
    `x1="256" y1="98" x2="256" y2="440">` +
    `<stop offset="0%" stop-color="${C.body}"/>` +
    `<stop offset="100%" stop-color="${C.bodyLo}"/>` +
    `</linearGradient></defs>` +
    `<clipPath id="bclip"><path d="${BODY}"/></clipPath>` +
    `<path d="${BODY}" fill="url(#dbody)"/>` +
    // soft belly patch under the collar (prototype-mapped)
    `<g clip-path="url(#bclip)"><ellipse cx="256" cy="337" rx="82" ry="22" fill="${C.soft}"/></g>` +
    // wings → feet → tuft
    wing('left') +
    wing('right') +
    feetSvg +
    `<path d="${TUFT}" fill="${C.soft}"/>` +
    `<path d="${TUFT_SHADE}" fill="${C.bodyLo}"/>` +
    // scarf tail (under the collar), then collar: dark band + light face
    `<g clip-path="url(#bclip)">` +
    `<path d="${SCARF.tailDark}" fill="${C.scarfShade}"/>` +
    `<path d="${SCARF.tailLight}" fill="${C.scarf}"/>` +
    `<path d="${SCARF.band}" fill="${C.scarfShade}"/>` +
    `<path d="${SCARF.bandFace}" fill="${C.scarf}"/>` +
    `</g>` +
    BLUSH.map(
      (b) =>
        `<ellipse cx="${b.cx}" cy="${b.cy}" rx="${b.rx}" ry="${b.ry}" fill="${C.blush}"/>`
    ).join('') +
    BILL[o.beak ?? 'closed']() +
    EYES[o.eyes ?? 'open'](o)
  );
}

// Silhouette mask: every shape any frame can draw, inflated by a 16px round
// stroke (~8px outward pad) so anti-aliased edges stay inside the mask. Wings
// appear in both poses, feet in all three pairs, bill in all three states.
function silhouetteSvg() {
  const shapes = [
    BODY,
    TUFT,
    TUFT_SHADE,
    WING.left,
    WING.right,
    WING_OUT.left,
    WING_OUT.right,
    ...FEET.stand.concat(FEET.walkA, FEET.walkB).map(
      (f) => `M ${f.x} ${f.y} h ${f.w} v ${f.h} h ${-f.w} Z`
    ),
    SCARF.band,
    SCARF.tailDark,
    SCARF.tailLight,
    'M 209 236 Q 256 200 303 236 Q 293 261 256 261 Q 219 261 209 236 Z',
    'M 208 234 Q 256 204 304 234 Q 296 264 256 264 Q 216 264 208 234 Z',
    'M 224 249 Q 256 259 288 249',
    'M 222 252 Q 256 265 290 252',
    'M 216 231 a 40 9 0 1 0 80 0 a 40 9 0 1 0 -80 0 Z',
    'M 226 249 a 30 16 0 1 0 60 0 a 30 16 0 1 0 -60 0 Z',
  ].filter((d) => typeof d === 'string');
  const paths = shapes.map((d) => `<path d="${d}"/>`).join('');
  return `<g fill="#000" stroke="#000" stroke-width="16" stroke-linejoin="round" stroke-linecap="round">${paths}</g>`;
}

export default {
  kind: 'smooth',
  name: 'smooth-duck',
  size: 512, // frame canvas: square, transparent outside the silhouette
  sheet: { bg: '#FAF3E6', scale: 0.44, gap: 20, pad: 28 },

  frames: {
    idle: {},
    blink: { eyes: 'blink' },
    look: { eyes: 'open', eyeShift: 16 },
    walk_a: { feet: 'walkA' },
    walk_b: { feet: 'walkB' },
    happy: { eyes: 'happy', beak: 'smile', wings: 'up' },
    surprised: { eyes: 'wide', beak: 'open' },
  },

  // One frame's inner SVG, positioned in the pack's 512×512 user space.
  frame(opts) {
    return frameSvg(opts ?? {});
  },

  // Union silhouette used by the alpha gate (validate-smooth-frames.mjs).
  silhouette() {
    return silhouetteSvg();
  },
};
