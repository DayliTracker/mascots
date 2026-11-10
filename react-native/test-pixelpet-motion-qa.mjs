// QA numeric sampler — issue #21 PixelPet perpetual motion layer.
// Run: node react-native/test-pixelpet-motion-qa.mjs   (from the repo root)
//
// Zero-dep complement to test-pixelpet-motion.mjs (source contract) and to the
// QA runtime harness (docs/super-board/runs/issue-21-qa-v1/): this suite
// composes the ACTUAL curve the source describes — legs, durations and easing
// parsed out of PixelPet.tsx, evaluated with react-native's own easing math —
// and checks it against the adopted motion spec's checkable numbers
// (research/motion-spec/SPEC.md, branch research/motion-spec @ 8e85bec):
//   A1 breath bounds + period · A2 volume · A3 sway bound · A12 never-static
//   A5/A4 constants · A13/A15 Reduce Motion + rest-reset (source rung)
// Expected values are the SPEC's numbers, hardcoded here as the independent
// oracle; the parsed constants come from the source, so either side drifting
// fails the suite.
//
// Easing math ported verbatim from react-native@0.88.1
// Libraries/Animated/Easing.js (sin = 1 - cos(pi*t/2), i.e. easeInSine;
// out(e) = 1 - e(1-t); inOut(e) = t<0.5 ? e(2t)/2 : 1 - e(2-2t)/2; cubic = t^3).
// R3 (PR #25 review): the oracle ports the per-leg sine combinations the source
// uses since the R1 rebuild — out(sin), inOut(sin), bare sin — so T1/T3 sample
// the corrected curve against the spec oracle. Closed forms:
// out(sin)(t) = 1 - sin(1-t) = cos((1-t)·pi/2); inOut(sin)(t) = (1 - cos(pi·t))/2.
// RN's TimingAnimation evaluates from + (to - from) * easing(elapsed/duration).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'PixelPet.tsx'), 'utf8');

let pass = 0;
let fail = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    pass += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    fail += 1;
    failures.push({ name, message: err instanceof Error ? err.message : String(err) });
    console.log(`FAIL  ${name}`);
    console.log(`      ${err instanceof Error ? err.message : String(err)}`);
  }
}

// --- RN easing (verbatim port, react-native@0.88.1 Easing.js) -------------------
const sin = (t) => 1 - Math.cos((t * Math.PI) / 2);
const cubic = (t) => t * t * t;
const out = (e) => (t) => 1 - e(1 - t);
const inOut = (e) => (t) => (t < 0.5 ? e(t * 2) / 2 : 1 - e((1 - t) * 2) / 2);
const EASINGS = {
  sin,
  'out(sin)': out(sin),
  'inOut(sin)': inOut(sin),
  'inOut(cubic)': inOut(cubic),
};

// --- parse the perpetual constants + legs out of the source ---------------------
function constNum(name) {
  const m = src.match(new RegExp(`const ${name} = ([0-9.]+);`));
  assert.ok(m, `const ${name} not found`);
  return Number(m[1]);
}
function constRange(name) {
  const m = src.match(new RegExp(`const ${name}[^\\n]*= \\[([0-9]+), ([0-9]+)\\]`));
  assert.ok(m, `const ${name} not found`);
  return [Number(m[1]), Number(m[2])];
}
function perpetualSection() {
  const a = src.indexOf('// --- perpetual layer');
  const b = src.indexOf('// --- poke');
  assert.notEqual(a, -1);
  assert.notEqual(b, -1);
  return src.slice(a, b);
}
/** Parse one loop's legs: `Animated.timing(<value>, { toValue: X, duration: Y, easing: Z ...` */
function legs(sectionText, valueName) {
  const re = new RegExp(
    `Animated\\.timing\\(${valueName}, \\{\\s*\\n\\s*toValue: ([^,\\n]+),\\s*\\n\\s*duration: ([^,\\n]+),\\s*\\n\\s*easing: ([^,\\n]+),`,
    'g'
  );
  const out = [];
  for (const m of sectionText.matchAll(re)) out.push({ to: m[1].trim(), duration: m[2].trim(), easing: m[3].trim() });
  return out;
}
function evalExpr(expr, consts) {
  // supports: NAME, -NAME, NUMBER, A / B
  const e = expr.trim();
  if (consts[e] !== undefined) return consts[e];
  const neg = e.match(/^-(\w+)$/);
  if (neg && consts[neg[1]] !== undefined) return -consts[neg[1]];
  const num = Number(e);
  if (!Number.isNaN(num)) return num;
  const div = e.match(/^(\w+|\d+) \/ (\w+|\d+)$/);
  if (div) return evalExpr(div[1], consts) / evalExpr(div[2], consts);
  throw new Error(`cannot eval leg expression: ${expr}`);
}
function evalEasing(name) {
  const e = name.trim().replace(/Easing\./g, '');
  if (EASINGS[e]) return EASINGS[e];
  throw new Error(`easing not modeled: ${name}`);
}

const C = {
  BREATH_PERIOD_MS: constNum('BREATH_PERIOD_MS'),
  BREATH_MIN: constNum('BREATH_MIN'),
  BREATH_MAX: constNum('BREATH_MAX'),
  SWAY_PERIOD_MS: constNum('SWAY_PERIOD_MS'),
  SWAY_DEG: constNum('SWAY_DEG'),
  SWAY_DRIFT_DEG: constNum('SWAY_DRIFT_DEG'),
  SWAY_DRIFT_GLIDE_MS: constNum('SWAY_DRIFT_GLIDE_MS'),
};
const [DRIFT_LO, DRIFT_HI] = constRange('SWAY_DRIFT_RANGE_MS');
const [WEIGHT_LO, WEIGHT_HI] = constRange('WEIGHT_INTERVAL_MS');

// --- SPEC.md oracle (adopted motion spec #17 @ 8e85bec) --------------------------
const SPEC = {
  breathPeriodMs: 2200, // loops table + A1 (±20 ms)
  breathMin: 0.995,
  breathMax: 1.015,
  volumeTol: 0.0005, // A2
  swayDeg: 0.6, // loops table
  driftDeg: 0.25,
  swayBoundDeg: 0.9, // A3 (0.6 base + 0.25 drift + compose margin)
  driftRetargetMs: [5000, 9000], // A4 / loops table
  weightRetargetMs: [4000, 7000], // A5 / loops table
  weightMoveMs: 550,
  neverStatic: { windowMs: 3000, samples: 30, minDeviating: 2, scaleY: 0.002, rotateDeg: 0.1 }, // A12
};

// ============================================================================
console.log('\nT1  A1/A2 — breath curve vs spec (composed from parsed legs)');
{
  const section = perpetualSection();
  const breathEffect = section.slice(
    section.indexOf('Breath is an exact sine'),
    section.indexOf('// Sway + weight shift are idle only')
  );
  const breathLegs = legs(breathEffect, 'breathY');
  check('T1.1 three legs parsed: max leg, min leg, rest leg', () => {
    assert.equal(breathLegs.length, 3, `got ${breathLegs.length} legs`);
    assert.ok(breathLegs[0].to.includes('BREATH_MAX'), `leg1 targets ${breathLegs[0].to}`);
    assert.ok(breathLegs[1].to.includes('BREATH_MIN'), `leg2 targets ${breathLegs[1].to}`);
    assert.equal(breathLegs[2].to, '1', `leg3 targets ${breathLegs[2].to}`);
  });
  check('T1.2 spec numbers: period 2200 ± 20, bounds [0.995, 1.015] (A1)', () => {
    const total = breathLegs.reduce((acc, l) => acc + evalExpr(l.duration, C), 0);
    assert.ok(Math.abs(total - SPEC.breathPeriodMs) <= 20, `legs compose to ${total} ms (spec ${SPEC.breathPeriodMs} ± 20)`);
    assert.equal(C.BREATH_MIN, SPEC.breathMin, 'BREATH_MIN vs spec');
    assert.equal(C.BREATH_MAX, SPEC.breathMax, 'BREATH_MAX vs spec');
  });
  check('T1.3 sampled curve stays in [0.995, 1.015] and visits both extremes (A1)', () => {
    let mn = Infinity, mx = -Infinity;
    let prevEnd = 1;
    for (const leg of breathLegs) {
      const to = evalExpr(leg.to, C);
      const dur = evalExpr(leg.duration, C);
      const f = evalEasing(leg.easing);
      for (let s = 0; s <= dur; s += 5) {
        const v = prevEnd + (to - prevEnd) * f(Math.min(1, s / dur));
        mn = Math.min(mn, v); mx = Math.max(mx, v);
      }
      prevEnd = to;
    }
    assert.ok(mn >= SPEC.breathMin - 1e-9 && mx <= SPEC.breathMax + 1e-9, `curve range [${mn}, ${mx}]`);
    assert.ok(mx >= SPEC.breathMax - 1e-4 && mn <= SPEC.breathMin + 1e-4, 'curve must reach both extremes');
  });
  check('T1.4 volume preserved at EVERY 5 ms sample: |scaleX·scaleY − 1| ≤ 0.0005 (A2)', () => {
    // RN interpolation of the source's transform: inputRange [MIN, 1, MAX] →
    // output [1/MIN, 1, 1/MAX], piecewise linear (RN's default interpolator)
    const sx = (y) => {
      const lo = SPEC.breathMin, hi = SPEC.breathMax;
      if (y <= 1) { const f = (y - lo) / (1 - lo); return 1 / lo + f * (1 - 1 / lo); }
      const f = (y - 1) / (hi - 1); return 1 + f * (1 / hi - 1);
    };
    let worst = 0, worstAt = 0;
    let prevEnd = 1;
    for (const leg of breathLegs) {
      const to = evalExpr(leg.to, C);
      const dur = evalExpr(leg.duration, C);
      const f = evalEasing(leg.easing);
      for (let s = 0; s <= dur; s += 5) {
        const y = prevEnd + (to - prevEnd) * f(Math.min(1, s / dur));
        const err = Math.abs(sx(y) * y - 1);
        if (err > worst) { worst = err; worstAt = y; }
      }
      prevEnd = to;
    }
    assert.ok(worst <= SPEC.volumeTol, `worst ${worst.toExponential(3)} at scaleY=${worstAt.toFixed(4)} (tol ${SPEC.volumeTol})`);
  });
  // informational: velocity continuity of the composed curve (v1 finding F1,
  // fixed by the R1 rebuild's per-leg sine ports). Reported for the QA report;
  // bounds/period checks are unaffected. Gap = |exit velocity of one leg −
  // entry velocity of the next|, finite-differenced at ±0.2% of the leg.
  const vel = (leg, from, atEnd) => {
    const to = evalExpr(leg.to, C);
    const dur = evalExpr(leg.duration, C);
    const f = evalEasing(leg.easing);
    const eps = 0.002;
    const v = (x) => from + (to - from) * f(x);
    return Math.abs(v(atEnd ? 1 - eps : eps) - v(atEnd ? 1 : 0)) / (eps * dur);
  };
  let prevEnd = 1;
  let prevExit = null;
  const gaps = [];
  for (const leg of breathLegs) {
    if (prevExit !== null) gaps.push(Math.abs(vel(leg, prevEnd, false) - prevExit));
    prevExit = vel(leg, prevEnd, true);
    prevEnd = evalExpr(leg.to, C);
  }
  const seamGap = Math.abs(vel(breathLegs[0], 1, false) - prevExit);
  const worstExtreme = Math.max(...gaps);
  console.log(`      info: leg-boundary velocity gaps — extremes ≈ ${worstExtreme.toExponential(2)} (F1 cusps closed), rest seam ≈ ${seamGap.toExponential(2)} (rest-anchored quarter/half/quarter sweep)`);
}

// ============================================================================
console.log('\nT2  A3/A4/A5 — sway + drift + weight constants and bounds vs spec');
{
  const section = perpetualSection();
  const idleEffect = section.slice(
    section.indexOf('// Sway + weight shift are idle only'),
    section.indexOf('// --- poke')
  );
  const swayLegs = legs(idleEffect, 'sway');
  check('T2.1 sway legs compose to 3400 ms; base amplitude 0.6° (A3/loops table)', () => {
    assert.equal(swayLegs.length, 3, `got ${swayLegs.length} legs`);
    const total = swayLegs.reduce((acc, l) => acc + evalExpr(l.duration, C), 0);
    assert.ok(Math.abs(total - C.SWAY_PERIOD_MS) <= 20, `sway legs compose to ${total} ms`);
    assert.equal(C.SWAY_PERIOD_MS, 3400, 'SWAY_PERIOD_MS vs spec');
    assert.equal(C.SWAY_DEG, SPEC.swayDeg, 'SWAY_DEG vs spec');
  });
  check('T2.2 composed rotation bound: SWAY_DEG + SWAY_DRIFT_DEG ≤ 0.9° (A3)', () => {
    assert.ok(C.SWAY_DEG + C.SWAY_DRIFT_DEG <= SPEC.swayBoundDeg, `${C.SWAY_DEG} + ${C.SWAY_DRIFT_DEG} > ${SPEC.swayBoundDeg}`);
  });
  check('T2.3 drift: ±0.25° target, 2 s cubic inOut glide, retarget cadence 5–9 s (A4)', () => {
    assert.equal(C.SWAY_DRIFT_DEG, SPEC.driftDeg, 'SWAY_DRIFT_DEG vs spec');
    assert.equal(C.SWAY_DRIFT_GLIDE_MS, 2000, 'glide duration vs spec');
    assert.deepEqual([DRIFT_LO, DRIFT_HI], SPEC.driftRetargetMs, 'retarget cadence vs spec');
    assert.match(idleEffect, /toValue: \(Math\.random\(\) \* 2 - 1\) \* SWAY_DRIFT_DEG/);
    assert.match(idleEffect, /easing: Easing\.inOut\(Easing\.cubic\)/);
  });
  check('T2.4 weight shift: 4–7 s cadence, 550 ms move, tilt sign follows slot, slot never repeats (A5)', () => {
    assert.deepEqual([WEIGHT_LO, WEIGHT_HI], SPEC.weightRetargetMs, 'weight cadence vs spec');
    assert.equal(constNum('WEIGHT_MOVE_MS'), SPEC.weightMoveMs, 'WEIGHT_MOVE_MS vs spec (550 ms)');
    assert.match(idleEffect, /duration: WEIGHT_MOVE_MS,/);
    assert.equal(constNum('WEIGHT_PX'), 2.5, '±2.5 px at 170 pt (±1.5% of size)');
    assert.equal(constNum('WEIGHT_TILT_DEG'), 0.35, 'linked tilt ±0.35°');
    assert.match(idleEffect, /toValue: weightSlot \* \(WEIGHT_PX \/ 170\) \* size/, 'translate scales with size');
    assert.match(idleEffect, /toValue: weightSlot \* WEIGHT_TILT_DEG/, 'tilt follows slot sign');
    assert.match(idleEffect, /const options = \[-1, 0, 1\]\.filter\(\(s\) => s !== weightSlot\);/, 'next slot never equals current');
  });
}

// ============================================================================
console.log('\nT3  A12 — never-static: worst 3 s idle window (composed curve, drift at 0)');
{
  const section = perpetualSection();
  const breathEffect = section.slice(
    section.indexOf('Breath is an exact sine'),
    section.indexOf('// Sway + weight shift are idle only')
  );
  const idleEffect = section.slice(
    section.indexOf('// Sway + weight shift are idle only'),
    section.indexOf('// --- poke')
  );
  const breathLegs = legs(breathEffect, 'breathY');
  const swayLegs = legs(idleEffect, 'sway');
  check('T3.1 every 3 s window has ≥2 of 30 samples deviating ≥0.2% scaleY or ≥0.1° (A12)', () => {
    // compose 10 s at 100 ms; drift held at 0 (conservative: drift only adds
    // rotation deviation, so a 0 drift is the worst case for A12)
    const sample = (legsArr, t) => {
      let acc = 0, prev = legsArr === breathLegs ? 1 : 0;
      for (const leg of legsArr) {
        const dur = evalExpr(leg.duration, C);
        if (t < acc + dur) {
          const to = evalExpr(leg.to, C);
          const f = evalEasing(leg.easing);
          return prev + (to - prev) * f((t - acc) / dur);
        }
        acc += dur;
        prev = evalExpr(leg.to, C);
      }
      return prev;
    };
    const breathAt = (t) => sample(breathLegs, t % 2200);
    const swayAt = (t) => sample(swayLegs, t % 3400);
    const win = SPEC.neverStatic;
    let worst = win.samples;
    for (let w = 0; w + win.windowMs <= 10000; w += 100) {
      let dev = 0;
      for (let i = 0; i < win.samples; i++) {
        const t = w + i * (win.windowMs / win.samples);
        if (Math.abs(breathAt(t) - 1) >= win.scaleY || Math.abs(swayAt(t)) >= win.rotateDeg) dev++;
      }
      worst = Math.min(worst, dev);
    }
    assert.ok(worst >= win.minDeviating, `worst window had ${worst}/${win.samples} deviating samples`);
    console.log(`      worst 3 s window: ${worst}/30 samples deviating`);
  });
}

// ============================================================================
console.log('\nT4  A13 — Reduce Motion fallback (source rung) + T5 A15 rest reset');
{
  const section = perpetualSection();
  const breathEffect = section.slice(
    section.indexOf('Breath is an exact sine'),
    section.indexOf('// Sway + weight shift are idle only')
  );
  const idleEffect = section.slice(
    section.indexOf('// Sway + weight shift are idle only'),
    section.indexOf('// --- poke')
  );
  check('T4.1 breath effect gates on reduceMotion before anything starts; cleanup pins scale exactly 1', () => {
    assert.match(breathEffect, /if \(reduceMotion\) return;/, 'first gate');
    assert.match(breathEffect, /breathLoop\.stop\(\);\s*\n\s*breathY\.setValue\(1\);/, 'cleanup rest');
  });
  check('T4.2 idle effect gates on mood+reduceMotion; cleanup pins sway/drift/weight to exact 0', () => {
    assert.match(idleEffect, /if \(mood !== 'idle' \|\| reduceMotion\) return;/);
    assert.match(
      idleEffect,
      /sway\.setValue\(0\);\s*\n\s*swayDrift\.setValue\(0\);\s*\n\s*weightX\.setValue\(0\);\s*\n\s*weightTilt\.setValue\(0\);/
    );
  });
  check('T4.3 both effects re-run when the OS flag flips (reduceMotion in deps)', () => {
    assert.match(src, /\}, \[mood, reduceMotion, breathY\]\);/);
    assert.match(src, /\}, \[mood, reduceMotion, size, sway, swayDrift, weightX, weightTilt\]\);/);
  });
  check('T4.4 bounded swaps still play under RM: scheduler and walk playback are RM-free', () => {
    const scheduler = src.slice(src.indexOf('// --- behavior scheduler'), src.indexOf('// --- motion drivers'));
    assert.ok(!scheduler.includes('reduceMotion'), 'scheduler must not gate on RM');
    const playback = src.slice(src.indexOf('// --- walk frame playback'), src.indexOf('// --- behavior scheduler'));
    assert.ok(!playback.includes('reduceMotion'), 'walk playback must not gate on RM');
  });
}

// ============================================================================
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  for (const f of failures) console.log(`- ${f.name}: ${f.message}`);
  process.exit(1);
}
