// Duck pack — the reference implementation. Chibi duckling: ellipse body,
// wide bill, mint scarf, stub wings, tuft. Compose order matters:
// body → wings → feet → tuft → scarf → blush → beak → eyes (eyes last, on top).

const P = {
  o: '#5B4634', // outline, warm brown
  b: '#FFF6E3', // body cream
  t: '#F2E2C4', // soft shade
  s: '#E4CD9F', // deep shade
  y: '#F6A94C', // bill / feet
  Y: '#D9832E', // bill / feet shade
  p: '#F5BFAE', // blush
  e: '#40342B', // eyes
  W: '#FFFFFF', // glints
  m: '#B7E0CC', // scarf mint
  M: '#8FCBB2', // scarf mint shade
  r: '#F28BA0', // heart pink
  k: '#FFD65A', // sparkle yellow
};

const EYE = {
  open: ['Wee', 'eee', 'eee'],
  blink: ['ooo'],
  side: ['Wee', 'eee', 'eee'],
  wide: ['.oo.', 'o..o', 'o..o', '.oo.'],
  happy: ['e.e', '.e.'],
};

const BEAK = {
  closed: ['.yyy.', 'yyyyy', 'YYYYY'],
  open: ['yyyyy', 'YeeeY', '.YYY.'],
  smile: ['y...y', 'yyyyy', 'YYYYY'],
};

const FEET = { stand: ['.yy.', '.Yy.'], step: ['.yy.', '.Yy.'] };

export default {
  name: 'duck',
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
  seed: 20261029,

  particles: {
    star: ['..k..', '..k..', 'kkWkk', '..k..', '..k..'],
    heart: ['.rr.rr.', 'rWrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
  },

  frames: {
    idle: { eyes: 'open' },
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

    // wings
    if ((opts.wings ?? 'down') === 'down') {
      stamp(canvas, ['ss', 'ss', 'ss'], cy + 1, cx - 7);
      stamp(canvas, ['ss', 'ss', 'ss'], cy + 1, cx + 6);
    } else {
      stamp(canvas, ['.ss', 'ss.', 's..'], cy - 4, cx - 8);
      stamp(canvas, ['ss.', '.ss', '..s'], cy - 4, cx + 6);
    }

    // feet
    if (opts.feet === 'walkA') {
      stamp(canvas, FEET.step, 21, cx - 6); // left foot forward/down
      stamp(canvas, FEET.step, 20, cx + 1);
    } else if (opts.feet === 'walkB') {
      stamp(canvas, FEET.step, 20, cx - 5);
      stamp(canvas, FEET.step, 21, cx + 1); // right foot forward/down
    } else {
      stamp(canvas, FEET.stand, 20, cx - 5);
      stamp(canvas, FEET.stand, 20, cx + 1);
    }

    // tuft — small cream flick
    stamp(canvas, ['bb', '.b'], 1, cx);

    // scarf snug under the face, tail on the duck's left
    for (let i = -5; i <= 5; i++) {
      canvas[cy + 2][cx + i] = 'm';
      canvas[cy + 3][cx + i] = i > 2 || i < -3 ? 'M' : 'm';
    }
    stamp(canvas, ['mm', 'mM', '.M'], cy + 4, cx + 2);

    // blush just under the eyes' outer edge
    stamp(canvas, ['pp', 'pp'], cy - 1, cx - 6);
    stamp(canvas, ['pp', 'pp'], cy - 1, cx + 5);

    // bill
    stamp(canvas, BEAK[opts.beak ?? 'closed'], cy - 1, cx - 2);

    // eyes last. wide eyes sit one column further out to clear the bill.
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
