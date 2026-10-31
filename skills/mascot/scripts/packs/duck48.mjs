// Duck pack, 48px class — the style-token reference implementation.
// Chibi duckling: pear body, wide bill, mint scarf, stub wings, tuft.
// Tones come from engine style tokens (see references/style-guide.md):
// warm-biased shadows, white-lifted highlight, dark warm selout outline.
// Compose order matters: body → highlight → wings → feet → tuft → scarf →
// blush → bill → eyes (eyes last, on top).

import { shadeTones } from '../engine.mjs';

const BODY = '#FFF6E3';
const BILL = '#F6A94C';
const SCARF = '#B7E0CC';

const B = shadeTones(BODY); // soft, deep, hi, out
const Y = shadeTones(BILL);
const M = shadeTones(SCARF);

const P = {
  o: '#5B4634', // fallback outline, warm brown
  g: '#DBCEBE', // ground shadow, pre-blended over cream canvas

  b: BODY,      // body cream
  t: B.soft,    // body soft shade
  s: B.deep,    // body deep shade
  H: B.hi,      // body highlight
  O: B.out,     // cream selout outline

  y: BILL,      // bill / feet
  Y: Y.soft,    // bill soft shade
  D: Y.deep,    // bill deep shade
  J: Y.hi,      // bill highlight
  Q: Y.out,     // bill selout outline

  m: SCARF,     // scarf mint
  M: M.soft,    // scarf soft shade
  N: M.deep,    // scarf deep shade
  R: M.out,     // scarf selout outline

  p: '#F5BFAE', // blush
  e: '#40342B', // eyes
  W: '#FFFFFF', // glints
  k: '#FFD65A', // sparkle yellow
  r: '#F28BA0', // heart pink
};

const EYE = {
  open: ['.eee.', 'Weeee', 'Weeee', 'eeeee', 'eeeee', '.eee.'],
  blink: ['eeeee'],
  wide: ['.eeee.', 'eeeeee', 'eWeeee', 'eWeeee', 'eeeeee', '.eeee.'],
  happy: ['ee.ee', '.e.e.', '..e..'],
};

const BEAK = {
  closed: ['.JyyyyyYY.', 'yyyyyyyyyy', '.DDDDDDDD.'],
  open: ['.JyyyyyYY.', 'yyyyyyyyyy', '.eeeeeeee.', '..DDDDDD..'],
  smile: ['yy......yy', 'yyyyyyyyyy', '.DDDDDDDD.'],
};

// grounded foot: 4 wide, 3 tall with a deep sole; lifted foot tucks 1 row up
const FOOT = ['.yy.', 'yyyy', 'DDDD'];
const FOOT_UP = ['.yy.', 'yyyy'];

export default {
  name: 'duck48',
  grid: 48,
  cx: 24,
  cy: 21,
  rx: 14,
  ry: 15,
  scale: 12,
  particleScale: 24,
  sheetScale: 8,
  sheetBg: '#FAF3E6',
  palette: P,
  seed: 20261031,

  style: {
    outline: 'selective',
    outlineFor: { b: 'O', t: 'O', s: 'O', H: 'O', y: 'Q', Y: 'Q', D: 'Q', m: 'R', M: 'R', N: 'R' },
    groundShadow: { rxScale: 1.18, rows: 2 },
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

    // wings — down = folded with feather notches, up/up2 = raised for cheer,
    // out = spread for surprise
    const wingDown = (flip) =>
      flip
        ? ['.ttttt.', 'tttttt.', 'ttttstt', 'ttssttt', '.tsstt.', '..tst..']
        : ['.ttttt.', '.tttttt', 'ttstttt', 'tttsstt', '.ttsst.', '..tst..'];
    const wingUp = (flip) => {
      return flip
        ? ['..ttt.', '.tttt.', 'tttst.', 'ttsst.']
        : ['.ttt..', '.tttt.', '.tsttt', '.tsstt'];
    };
    if ((opts.wings ?? 'down') === 'down') {
      stamp(canvas, wingDown(false), cy + 1, cx - 14);
      stamp(canvas, wingDown(true), cy + 1, cx + 7);
    } else if (opts.wings === 'up') {
      stamp(canvas, wingUp(false), cy - 7, cx - 13);
      stamp(canvas, wingUp(true), cy - 7, cx + 8);
    } else if (opts.wings === 'up2') {
      stamp(canvas, wingUp(false), cy - 9, cx - 14);
      stamp(canvas, wingUp(true), cy - 9, cx + 9);
    } else {
      stamp(canvas, wingDown(false), cy - 1, cx - 15);
      stamp(canvas, wingDown(true), cy - 1, cx + 8);
    }

    // feet — walk poses lift one foot and set the other forward
    if (opts.feet === 'walkA') {
      stamp(canvas, FOOT, 38, cx - 12); // left forward/down
      stamp(canvas, FOOT_UP, 37, cx + 2); // right lifted
    } else if (opts.feet === 'walkB') {
      stamp(canvas, FOOT_UP, 37, cx - 9); // left lifted
      stamp(canvas, FOOT, 38, cx + 4); // right forward/down
    } else {
      stamp(canvas, FOOT, 37, cx - 9);
      stamp(canvas, FOOT, 37, cx + 2);
    }

    // tuft — three cream flicks breaking the head silhouette
    stamp(canvas, ['.bb.bb', 'bbbbbb', '.b.bb.'], cy - this.ry - 4, cx - 3);

    // scarf: snug under the bill, knot on the duck's left, short tail
    for (let i = -7; i <= 7; i++) {
      canvas[cy + 1][cx + i] = i > 4 ? 'M' : 'm';
      canvas[cy + 2][cx + i] = i < -5 || i > 3 ? 'M' : 'm';
      canvas[cy + 3][cx + i] = i > 2 || i < -4 ? 'N' : 'M';
    }
    stamp(canvas, ['mm.', 'mMm', '.NN'], cy + 3, cx + 1);

    // blush just under the eyes' outer edge
    stamp(canvas, ['pp', 'pp.', 'pp.'], cy - 2, cx - 11);
    stamp(canvas, ['pp', '.pp', '.pp'], cy - 2, cx + 9);

    // bill
    stamp(canvas, BEAK[opts.beak ?? 'closed'], cy - 1, cx - 5);

    // eyes last. wide eyes sit one column further out to clear the bill.
    const eye = opts.eyes ?? 'open';
    const shift = opts.eyeShift ?? 0;
    const eyeTop = eye === 'blink' ? cy - 4 : eye === 'wide' ? cy - 9 : cy - 8;
    const leftCol = (eye === 'wide' ? cx - 9 : cx - 8) + shift;
    const rightCol = (eye === 'wide' ? cx + 4 : cx + 3) + shift;
    stamp(canvas, EYE[eye], eyeTop, leftCol);
    stamp(canvas, EYE[eye], eyeTop, rightCol);

    return canvas;
  },
};
