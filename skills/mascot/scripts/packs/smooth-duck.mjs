// Smooth-duck pack — first smooth pack (ADR 0001). Hand-authored vector art,
// no image generation: every frame is parametric SVG in a 512×512 canvas,
// rasterized to PNG by the pinned build-time rasterizer (smooth-engine.mjs).
//
// Same character as the pixel duck (packs/duck.mjs): chibi duckling, egg body,
// wide bill, mint scarf, stub wings, tuft.
//
// Gate-1 polish pass 1 (issue #3) — geometry measured against the approved
// prototype v6 duck (dayli-step-tracker `prototype/textless-shell`,
// prototype-merged-shell.html, 120×120 user space) and the re-fetched Habita
// references (get-habita.app Sprout/Lumi). Relationships applied (measured,
// no reference pixels copied):
//   · warm-brown outline #5B4634 on every shape (prototype stroke; Habita
//     outline ≈ 3% of character width)
//   · radial-gradient body, light top-left (prototype body fill)
//   · face low-set: eye line ≈ half-way down the head mass (Habita eyes sit
//     ~55–78% down the head), eye spacing ≈ 40% of head width
//   · blush round, below-outside the eyes (Habita: blush centers sit outside
//     by ~6% and below the eye line; prototype: 30 left/right, 40 below at
//     512 scale)
//   · scarf = smile-band snug under the face + hanging tail on the front-left
//     (prototype band + rotated-rect tail; Habita front-left hang)
//   · small rounded-rect feet tucked under the body (prototype 13×8.5 r4.2
//     → 55×36 r17 at 512 scale)
//   · tuft = one stroke curl (prototype), tail curl on the right (prototype)
//   · subtle shading: one soft belly ellipse, no heavy bottom bands
//
// Compose order: body → shading → wings → tail → feet → tuft → scarf band →
// scarf tail → blush → bill → eyes last (on top).

const C = {
  body: '#FFF6E3', // cream
  bodyHi: '#FFFAEE', // gradient core (top-left light)
  bodyLo: '#F3E7CE', // gradient edge (warm rim)
  soft: '#F2E2C4', // soft shade (wings, belly, tail)
  bill: '#F6A94C', // bill / feet
  billShade: '#D9832E', // bill / feet shade, mouth line
  blush: '#F5BFAE', // blush
  eye: '#40342B', // eyes / mouth interior
  glint: '#FFFFFF', // glints
  scarf: '#B7E0CC', // scarf mint
  scarfShade: '#8FCBB2', // scarf mint shade (hanging tail)
  o: '#5B4634', // outline, warm brown (prototype stroke color)
};

// Egg body — slightly narrower top, fuller bottom. Center (256, ~270).
const BODY =
  'M 256 98 C 318 98 368 140 392 204 C 414 262 404 330 360 382 ' +
  'C 322 424 292 440 256 440 C 220 440 190 424 152 382 ' +
  'C 108 330 98 262 120 204 C 144 140 194 98 256 98 Z';

// Prototype v6 tuft curl, mapped 120→512 (×4.267): one stroke flick.
const TUFT =
  'M 247 128 C 237 92 282 79 290 109 C 271 103 262 115 269 134';

// Prototype v6 tail curl, mapped: pokes out over the right hip.
const TAIL = 'M 358 307 C 397 316 405 358 375 388 C 354 371 346 333 358 307 Z';

const WING = {
  left:
    'M 176 300 C 148 300 128 318 128 342 C 128 362 146 374 166 368 ' +
    'C 180 363 186 348 182 330 C 179 316 180 302 176 300 Z',
  right:
    'M 336 300 C 364 300 384 318 384 342 C 384 362 366 374 346 368 ' +
    'C 332 363 326 348 330 330 C 333 316 332 302 336 300 Z',
};
// Happy: wings lift outward-up around the shoulder. SVG rotate() is clockwise
// in the y-down space, so the left wing takes the positive angle.
const WING_UP = {
  left: { transform: 'rotate(48 176 300)' },
  right: { transform: 'rotate(-48 336 300)' },
};
// Soft highlight along the top edge of each wing so it reads against the body.
const WING_HIGHLIGHT = {
  left: 'M 176 303 C 154 305 136 318 133 336 C 146 328 160 318 174 310 Z',
  right: 'M 336 303 C 358 305 376 318 379 336 C 366 328 352 318 338 310 Z',
};

// Feet: small rounded rects (prototype 13×8.5 rx4.2 → 55×36 rx17). Tucked
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
  // Smile-band snug under the face, mapped from the prototype band.
  band:
    'M 148 288 C 200 322 312 322 364 288 C 368 312 322 342 256 342 ' +
    'C 190 342 144 312 148 288 Z',
  // Hanging tail on the front-left: prototype rotated rect (44.8×68.3 r19.2,
  // rotate 6°) mapped — rounded, short, hangs over the belly not the wing.
  tailRect: { x: 160, y: 332, w: 46, h: 62, rx: 20, rot: 'rotate(6 183 363)' },
};

const BLUSH = [
  { cx: 170, cy: 240, rx: 20, ry: 13 },
  { cx: 342, cy: 240, rx: 20, ry: 13 },
];

function billClosed() {
  return (
    `<path d="M 218 239 Q 256 222 294 239 Q 284 275 256 275 Q 228 275 218 239 Z" fill="${C.bill}" stroke="${C.o}" stroke-width="7" stroke-linejoin="round"/>` +
    `<path d="M 232 254 Q 256 264 280 254" stroke="${C.billShade}" stroke-width="6" stroke-linecap="round" fill="none"/>`
  );
}

function billSmile() {
  return (
    `<path d="M 222 237 Q 256 226 290 237 Q 282 288 256 288 Q 230 288 222 237 Z" fill="${C.bill}" stroke="${C.o}" stroke-width="7" stroke-linejoin="round"/>` +
    `<path d="M 235 262 Q 256 275 277 262" stroke="${C.billShade}" stroke-width="6" stroke-linecap="round" fill="none"/>`
  );
}

function billOpen() {
  // Small open "o" mouth (prototype surprised: outlined orange ellipse).
  return (
    `<ellipse cx="256" cy="258" rx="21" ry="24" fill="${C.bill}" stroke="${C.o}" stroke-width="7"/>` +
    `<ellipse cx="256" cy="262" rx="10" ry="12" fill="${C.billShade}"/>`
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
  const one = (ex) =>
    `<circle cx="${ex}" cy="200" r="26" fill="${C.glint}" stroke="${C.eye}" stroke-width="8"/>` +
    `<circle cx="${ex}" cy="202" r="10" fill="${C.eye}"/>` +
    `<circle cx="${ex - 4}" cy="196" r="3.5" fill="${C.glint}"/>`;
  return one(200) + one(312);
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
    const path = WING[side];
    const up = wings === 'up' ? ` transform="${WING_UP[side].transform}"` : '';
    return (
      `<path d="${path}"${up} fill="${C.soft}" stroke="${C.o}" stroke-width="9" stroke-linejoin="round"/>` +
      `<path d="${WING_HIGHLIGHT[side]}"${up} fill="${C.body}"/>`
    );
  };
  const feetSvg = feet
    .map(
      (f) =>
        `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="${f.rx}" fill="${C.bill}" stroke="${C.o}" stroke-width="7"/>`
    )
    .join('');

  return (
    // body: radial gradient, top-left light (prototype body fill) + outline
    `<defs><radialGradient id="dbody" cx="38%" cy="30%" r="78%">` +
    `<stop offset="0%" stop-color="${C.bodyHi}"/>` +
    `<stop offset="55%" stop-color="${C.body}"/>` +
    `<stop offset="100%" stop-color="${C.bodyLo}"/>` +
    `</radialGradient></defs>` +
    `<clipPath id="bclip"><path d="${BODY}"/></clipPath>` +
    `<path d="${BODY}" fill="url(#dbody)" stroke="${C.o}" stroke-width="11" stroke-linejoin="round"/>` +
    // subtle belly shade (one soft ellipse, prototype-mapped)
    `<g clip-path="url(#bclip)"><ellipse cx="256" cy="404" rx="82" ry="30" fill="${C.soft}"/></g>` +
    // wings → tail → feet → tuft
    wing('left') +
    wing('right') +
    `<path d="${TAIL}" fill="${C.soft}" stroke="${C.o}" stroke-width="9" stroke-linejoin="round"/>` +
    feetSvg +
    `<path d="${TUFT}" fill="none" stroke="${C.o}" stroke-width="9" stroke-linecap="round"/>` +
    // scarf: band clipped to the body (wraps), outline; tail hangs front-left
    `<g clip-path="url(#bclip)">` +
    `<path d="${SCARF.band}" fill="${C.scarf}" stroke="${C.o}" stroke-width="9" stroke-linejoin="round"/>` +
    `</g>` +
    (() => {
      const t = SCARF.tailRect;
      return (
        `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="${t.rx}" transform="${t.rot}" ` +
        `fill="${C.scarfShade}" stroke="${C.o}" stroke-width="8" stroke-linejoin="round"/>`
      );
    })() +
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
    TAIL,
    WING.left,
    WING.right,
    ...FEET.stand.concat(FEET.walkA, FEET.walkB).map(
      (f) => `M ${f.x} ${f.y} h ${f.w} v ${f.h} h ${-f.w} Z`
    ),
    SCARF.band,
    `M ${SCARF.tailRect.x} ${SCARF.tailRect.y} h ${SCARF.tailRect.w} v ${SCARF.tailRect.h} h ${-SCARF.tailRect.w} Z`,
    'M 218 239 Q 256 222 294 239 Q 284 275 256 275 Q 228 275 218 239 Z',
    'M 222 237 Q 256 226 290 237 Q 282 288 256 288 Q 230 288 222 237 Z',
    'M 232 254 Q 256 264 280 254',
    'M 235 262 Q 256 275 277 262',
    'M 235 258 a 21 24 0 1 0 42 0 a 21 24 0 1 0 -42 0 Z',
  ].filter((d) => typeof d === 'string');
  const paths = shapes.map((d) => `<path d="${d}"/>`).join('');
  // rotated up-wings: reuse the wing paths inside transformed groups
  const wingsUp =
    `<g transform="${WING_UP.left.transform}"><path d="${WING.left}"/></g>` +
    `<g transform="${WING_UP.right.transform}"><path d="${WING.right}"/></g>`;
  return `<g fill="#000" stroke="#000" stroke-width="16" stroke-linejoin="round" stroke-linecap="round">${paths}${wingsUp}</g>`;
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
