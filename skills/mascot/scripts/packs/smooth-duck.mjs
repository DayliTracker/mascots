// Smooth-duck pack — first smooth pack (ADR 0001). Hand-authored vector art,
// no image generation: every frame is parametric SVG in a 512×512 canvas,
// rasterized to PNG by the pinned build-time rasterizer (smooth-engine.mjs).
//
// Same character as the pixel duck (packs/duck.mjs): chibi duckling, egg body,
// wide bill, mint scarf, stub wings, tuft. Smooth style per ADR 0001: soft
// rounded shapes, no cell grid, no hard outline, two-tone shading keyed to a
// top-left light.
//
// Compose order (matches pipeline.md): body → shading → wings → feet → tuft
// → scarf → blush → bill → eyes last (on top).

const C = {
  body: '#FFF6E3', // cream
  soft: '#F2E2C4', // soft shade
  deep: '#E4CD9F', // deep shade
  bill: '#F6A94C', // bill / feet
  billShade: '#D9832E', // bill / feet shade
  blush: '#F5BFAE', // blush
  eye: '#40342B', // eyes / mouth interior
  glint: '#FFFFFF', // glints
  scarf: '#B7E0CC', // scarf mint
  scarfShade: '#8FCBB2', // scarf mint shade
};

// Egg body — slightly narrower top, fuller bottom. Center (256, ~270).
const BODY =
  'M 256 98 C 318 98 368 140 392 204 C 414 262 404 330 360 382 ' +
  'C 322 424 292 440 256 440 C 220 440 190 424 152 382 ' +
  'C 108 330 98 262 120 204 C 144 140 194 98 256 98 Z';

const TUFT = [
  'M 246 98 C 238 76 246 60 260 62 C 272 64 276 78 268 90 C 262 98 254 100 246 98 Z',
  'M 262 64 C 268 50 284 50 288 60 C 291 70 282 80 270 84 C 264 78 260 70 262 64 Z',
];

const WING = {
  left:
    'M 152 292 C 120 296 102 322 108 354 C 114 376 142 384 164 372 ' +
    'C 180 362 184 340 176 318 C 170 302 162 292 152 292 Z',
  right:
    'M 360 292 C 392 296 410 322 404 354 C 398 376 370 384 348 372 ' +
    'C 332 362 328 340 336 318 C 342 302 350 292 360 292 Z',
};
// Happy: wings lift outward-up around the shoulder. SVG rotate() is clockwise
// in the y-down space, so the left wing takes the positive angle.
const WING_UP = {
  left: { transform: 'rotate(48 152 292)' },
  right: { transform: 'rotate(-48 360 292)' },
};
// Soft highlight along the top edge of each wing so it reads against the body.
const WING_HIGHLIGHT = {
  left: 'M 152 294 C 134 296 122 308 120 324 C 134 318 150 310 164 300 Z',
  right: 'M 360 294 C 378 296 390 308 392 324 C 378 318 362 310 348 300 Z',
};

function foot(cx, cy) {
  const mound =
    `M ${cx - 26} ${cy - 6} C ${cx - 26} ${cy - 20} ${cx - 14} ${cy - 28} ${cx} ${cy - 28} ` +
    `C ${cx + 14} ${cy - 28} ${cx + 26} ${cy - 20} ${cx + 26} ${cy - 6} ` +
    `C ${cx + 26} ${cy + 4} ${cx + 14} ${cy + 10} ${cx} ${cy + 10} ` +
    `C ${cx - 14} ${cy + 10} ${cx - 26} ${cy + 4} ${cx - 26} ${cy - 6} Z`;
  const toes =
    `M ${cx - 26} ${cy + 2} C ${cx - 14} ${cy + 8} ${cx + 14} ${cy + 8} ${cx + 26} ${cy + 2} ` +
    `C ${cx + 24} ${cy + 8} ${cx + 12} ${cy + 11} ${cx} ${cy + 11} ` +
    `C ${cx - 12} ${cy + 11} ${cx - 24} ${cy + 8} ${cx - 26} ${cy + 2} Z`;
  return { mound, toes };
}

// Feet: stand pair; walk_a = left foot forward/down; walk_b = right foot.
const FEET = {
  stand: [
    { ...foot(206, 452) },
    { ...foot(306, 452) },
  ],
  walkA: [{ ...foot(198, 462) }, { ...foot(314, 444) }],
  walkB: [{ ...foot(198, 444) }, { ...foot(314, 462) }],
};

const SCARF = {
  band:
    'M 118 272 C 200 258 312 258 394 272 L 394 302 C 312 316 200 316 118 302 Z',
  bandShade:
    'M 118 294 C 200 306 312 306 394 294 L 394 302 C 312 316 200 316 118 302 Z',
  tail:
    'M 346 296 C 356 324 348 350 328 358 C 322 342 324 314 334 296 Z',
  tailShade:
    'M 334 296 C 324 314 322 342 328 358 C 333 356 335 348 334 340 C 333 324 335 308 340 296 Z',
  knot: 'M 333 288 a 15 15 0 1 0 30 0 a 15 15 0 1 0 -30 0 Z',
  knotShade: 'M 336 293 a 12 8 0 0 0 24 0 Z',
};

const BLUSH = [
  { cx: 152, cy: 236, rx: 16, ry: 10 },
  { cx: 360, cy: 236, rx: 16, ry: 10 },
];

function billClosed() {
  return (
    `<path d="M 214 222 C 226 210 286 210 298 222 C 306 230 304 246 294 254 C 274 264 238 264 218 254 C 208 246 206 230 214 222 Z" fill="${C.bill}"/>` +
    `<path d="M 220 248 C 240 258 272 258 292 248 C 288 256 276 261 256 261 C 236 261 224 256 220 248 Z" fill="${C.billShade}"/>`
  );
}

function billSmile() {
  return (
    `<path d="M 206 230 C 222 212 290 212 306 230 C 300 248 282 256 256 256 C 230 256 212 248 206 230 Z" fill="${C.bill}"/>` +
    `<path d="M 230 234 Q 256 246 282 234" stroke="${C.billShade}" stroke-width="5" stroke-linecap="round" fill="none"/>` +
    `<path d="M 222 244 C 240 254 272 254 290 244 C 285 251 272 256 256 256 C 240 256 227 251 222 244 Z" fill="${C.billShade}"/>`
  );
}

function billOpen() {
  return (
    `<path d="M 212 218 C 230 206 282 206 300 218 C 305 225 302 233 292 238 C 272 244 240 244 220 238 C 210 233 207 225 212 218 Z" fill="${C.bill}"/>` +
    `<ellipse cx="256" cy="250" rx="32" ry="17" fill="${C.eye}"/>` +
    `<path d="M 226 256 C 238 266 274 266 286 256 C 280 262 270 265 256 265 C 242 265 232 262 226 256 Z" fill="${C.billShade}"/>`
  );
}

const BILL = { closed: billClosed, smile: billSmile, open: billOpen };

// Eye pair at (196, 186) and (316, 186); `look` slides both sideways.
function eyesOpen(shift) {
  const s = shift ?? 0;
  const one = (ex) =>
    `<ellipse cx="${ex + s}" cy="186" rx="15" ry="19" fill="${C.eye}"/>` +
    `<circle cx="${ex + s - 5}" cy="179" r="5" fill="${C.glint}"/>` +
    `<circle cx="${ex + s + 6}" cy="193" r="2.5" fill="${C.glint}"/>`;
  return one(196) + one(316);
}

function eyesWide() {
  const one = (ex) =>
    `<circle cx="${ex}" cy="186" r="21" fill="${C.glint}" stroke="${C.eye}" stroke-width="7"/>` +
    `<circle cx="${ex}" cy="188" r="8" fill="${C.eye}"/>` +
    `<circle cx="${ex - 3}" cy="185" r="3" fill="${C.glint}"/>`;
  return one(196) + one(316);
}

function eyesArc(d, width, top) {
  const one = (ex) =>
    `<path d="M ${ex - 18} 192 Q ${ex} ${top} ${ex + 18} 192" stroke="${C.eye}" stroke-width="${width}" stroke-linecap="round" fill="none"/>`;
  return one(196) + one(316);
}

const EYES = {
  open: (o) => eyesOpen(o.eyeShift),
  blink: () => eyesArc(7, 7, 178),
  happy: () => eyesArc(8, 8, 168),
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
      `<path d="${path}"${up} fill="${C.deep}"/>` +
      `<path d="${WING_HIGHLIGHT[side]}"${up} fill="${C.soft}"/>`
    );
  };
  const feetSvg = feet
    .map((f) => `<path d="${f.mound}" fill="${C.bill}"/><path d="${f.toes}" fill="${C.billShade}"/>`)
    .join('');

  return (
    // body + two-tone shading (clipped to the body silhouette)
    `<clipPath id="body"><path d="${BODY}"/></clipPath>` +
    `<path d="${BODY}" fill="${C.body}"/>` +
    `<g clip-path="url(#body)">` +
    `<ellipse cx="256" cy="352" rx="164" ry="96" fill="${C.soft}"/>` +
    `<ellipse cx="256" cy="416" rx="138" ry="60" fill="${C.deep}"/>` +
    `</g>` +
    // wings → feet → tuft → scarf → blush → bill → eyes (eyes last)
    wing('left') +
    wing('right') +
    feetSvg +
    TUFT.map((d, i) => `<path d="${d}" fill="${i === 0 ? C.soft : C.deep}"/>`).join('') +
    `<g clip-path="url(#body)">` +
    `<path d="${SCARF.band}" fill="${C.scarf}"/>` +
    `<path d="${SCARF.bandShade}" fill="${C.scarfShade}"/>` +
    `</g>` +
    `<path d="${SCARF.tail}" fill="${C.scarf}"/>` +
    `<path d="${SCARF.tailShade}" fill="${C.scarfShade}"/>` +
    `<path d="${SCARF.knot}" fill="${C.scarf}"/>` +
    `<path d="${SCARF.knotShade}" fill="${C.scarfShade}"/>` +
    BLUSH.map((b) => `<ellipse cx="${b.cx}" cy="${b.cy}" rx="${b.rx}" ry="${b.ry}" fill="${C.blush}"/>`).join('') +
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
    ...TUFT,
    WING.left,
    WING.right,
    ...FEET.stand.concat(FEET.walkA, FEET.walkB).map((f) => f.mound),
    SCARF.tail,
    SCARF.knot,
    'M 214 222 C 226 210 286 210 298 222 C 306 230 304 246 294 254 C 274 264 238 264 218 254 C 208 246 206 230 214 222 Z',
    'M 206 230 C 222 212 290 212 306 230 C 300 248 282 256 256 256 C 230 256 212 248 206 230 Z',
    'M 212 218 C 230 206 282 206 300 218 C 305 225 302 233 292 238 C 272 244 240 244 220 238 C 210 233 207 225 212 218 Z',
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
