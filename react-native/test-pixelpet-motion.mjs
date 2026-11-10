// QA tests for issue #21 — PixelPet perpetual motion layer (breath, sway, shift).
// Run: node react-native/test-pixelpet-motion.mjs   (from the repo root)
//
// Same source-level contract style as test-pixelpet-cycles.mjs: the component
// is React Native and cannot run headlessly here, so the suite pins the
// observable contract against the adopted motion spec (#17,
// research/motion-spec/SPEC.md): breath/sway/weight periods and amplitudes,
// native-driver discipline, transform layering order, Reduce Motion fallback,
// and the rest reset on mood exit. Simulator-level assertions (A1–A15
// sampling) are QA's; this suite pins the source that must produce them.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'PixelPet.tsx'), 'utf8');

let pass = 0;
let fail = 0;
const failures = [];

/** @param {string} name @param {() => void} fn */
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

/** Pull a `const NAME = value;` literal out of the source and return the text. */
function constLiteral(name) {
  const m = src.match(new RegExp(`const ${name}[^\\n]*=\\s*([^;\\n]+);`));
  assert.ok(m, `expected \`const ${name}\` in PixelPet.tsx`);
  return m[1].trim();
}

/** Slice the source between two section markers. */
function section(startMarker, endMarker) {
  const a = src.indexOf(startMarker);
  assert.notEqual(a, -1, `section start marker not found: ${startMarker}`);
  const b = src.indexOf(endMarker, a + 1);
  assert.notEqual(b, -1, `section end marker not found: ${endMarker}`);
  return src.slice(a, b);
}

const breathSection = section(
  '// --- perpetual layer',
  '// --- poke'
);
const breathEffect = section(
  'Breath is an exact sine',
  '// Sway + weight shift are idle only'
);
const idleEffect = section(
  '// Sway + weight shift are idle only',
  '// --- poke'
);

/** The pet's transform array body: from the weight translateX entry to the array's closing `],`. */
function petTransformBody() {
  const a = src.indexOf('{ translateX: weightX }');
  assert.notEqual(a, -1, 'pet transform array (weight translateX entry) not found');
  // the array closes at `\n            ],\n          }}` — nested interpolate
  // arrays close earlier, so anchor on that terminator, not the first `],`
  const endMarker = '\n            ],\n          }}';
  const b = src.indexOf(endMarker, a);
  assert.notEqual(b, -1, 'pet transform array closing not found');
  return src.slice(a, b);
}

// ---------------------------------------------------------------------------
// T1 — AC1: breath runs in every mood at the spec's period/amplitude (A1, A2)
// ---------------------------------------------------------------------------

console.log('\nT1  AC1 — breath loop vs motion spec (A1 bounds/period, A2 volume)');

check('T1.1 spec constants: breath 2200 ms over [0.995, 1.015]', () => {
  assert.equal(constLiteral('BREATH_PERIOD_MS'), '2200');
  assert.equal(constLiteral('BREATH_MIN'), '0.995');
  assert.equal(constLiteral('BREATH_MAX'), '1.015');
});

check('T1.2 breath legs port the sine slice-by-slice: quarter + half + quarter = 2200 ms', () => {
  // RN's Easing.sin is easeInSine, 1 - Math.cos((t * Math.PI) / 2): leg 1
  // wraps it in out() to decelerate into the peak, leg 2 in inOut() for zero
  // velocity at both extremes, leg 3 stays bare sin so the min→rest climb
  // accelerates into the next loop's fast start.
  assert.match(
    breathEffect,
    /Animated\.loop\(\s*\n\s*Animated\.sequence\(\[\s*\n\s*Animated\.timing\(breathY, \{\s*\n\s*toValue: BREATH_MAX,\s*\n\s*duration: BREATH_PERIOD_MS \/ 4,\s*\n\s*easing: Easing\.out\(Easing\.sin\),/
  );
  assert.match(breathEffect, /toValue: BREATH_MIN,\s*\n\s*duration: BREATH_PERIOD_MS \/ 2,\s*\n\s*easing: Easing\.inOut\(Easing\.sin\),/);
  assert.match(breathEffect, /toValue: 1,\s*\n\s*duration: BREATH_PERIOD_MS \/ 4,\s*\n\s*easing: Easing\.sin,/);
  // (0.995 + 1.015) / 2 = 1.005 mid per spec — the sine sweeps symmetric bounds
  assert.equal((0.995 + 1.015) / 2, 1.005);
});

check('T1.3 breath runs in EVERY mood — its effect never gates on mood value', () => {
  // The effect re-runs on mood exit to reset+restart (A15), but the body has
  // no mood-specific branch: no `mood ===` gate inside the breath effect.
  assert.ok(!breathEffect.includes("mood ==="), 'breath body must not branch on mood');
  assert.match(breathEffect, /breathLoop\.start\(\);/);
});

check('T1.4 breath volume preserved: scaleX is the reciprocal through the exact-1 anchor (A2 ≤ 0.0005)', () => {
  assert.match(
    src,
    /scaleX: breathY\.interpolate\(\{\s*\n\s*inputRange: \[BREATH_MIN, 1, BREATH_MAX\],\s*\n\s*outputRange: \[1 \/ BREATH_MIN, 1, 1 \/ BREATH_MAX\],/,
    'reciprocal interpolation with the exact scaleY=1 anchor missing'
  );
  // worst-case linear-vs-reciprocal error inside each segment, sampled
  const err = (y) => {
    const lo = 0.995, hi = 1.015;
    if (y <= 1) {
      const f = (y - lo) / (1 - lo);
      return Math.abs((1 / lo + f * (1 - 1 / lo)) * y - 1);
    }
    const f = (y - 1) / (hi - 1);
    return Math.abs((1 + f * (1 / hi - 1)) * y - 1);
  };
  for (const y of [0.995, 0.9975, 1.0, 1.0025, 1.005, 1.01, 1.015]) {
    assert.ok(err(y) <= 0.0005, `A2 violated at scaleY=${y}: |sx*sy-1|=${err(y)}`);
  }
  assert.ok(err(0.9975) <= 0.0001, 'piecewise anchor should keep error ≤ 1e-4');
});

check('T1.5 breath holds scaleY directly — rest value 1 renders exactly scale 1 (A13)', () => {
  assert.match(src, /\{ scaleY: breathY \},/, 'scaleY must read the breath value directly');
  assert.match(src, /const breathY = useRef\(new Animated\.Value\(1\)\)\.current;/);
});

// ---------------------------------------------------------------------------
// T2 — AC1: sway (A3, A4) and weight shift (A5) idle only
// ---------------------------------------------------------------------------

console.log('\nT2  AC1 — sway + weight shift vs motion spec (A3–A5)');

check('T2.1 sway constants: 3400 ms, ±0.6° base, drift ±0.25° gliding 2 s on a 5–9 s cadence', () => {
  assert.equal(constLiteral('SWAY_PERIOD_MS'), '3400');
  assert.equal(constLiteral('SWAY_DEG'), '0.6');
  assert.equal(constLiteral('SWAY_DRIFT_DEG'), '0.25');
  assert.equal(constLiteral('SWAY_DRIFT_GLIDE_MS'), '2000');
  assert.equal(constLiteral('SWAY_DRIFT_RANGE_MS'), '[5000, 9000]');
});

check('T2.2 sway loop is sine 0 → +0.6 → −0.6 → 0, ported per leg (quarter/half/quarter = 3400 ms)', () => {
  assert.match(idleEffect, /Animated\.timing\(sway, \{\s*\n\s*toValue: SWAY_DEG,\s*\n\s*duration: SWAY_PERIOD_MS \/ 4,\s*\n\s*easing: Easing\.out\(Easing\.sin\),/);
  assert.match(idleEffect, /toValue: -SWAY_DEG,\s*\n\s*duration: SWAY_PERIOD_MS \/ 2,\s*\n\s*easing: Easing\.inOut\(Easing\.sin\),/);
  assert.match(idleEffect, /toValue: 0,\s*\n\s*duration: SWAY_PERIOD_MS \/ 4,\s*\n\s*easing: Easing\.sin,/);
});

check('T2.3 drift is not a pure sine: cubic-glide retargets chained on a 5–9 s timer (A4)', () => {
  assert.match(
    idleEffect,
    /const retargetDrift = \(\) => \{\s*\n\s*driftAnim = Animated\.timing\(swayDrift, \{\s*\n\s*toValue: \(Math\.random\(\) \* 2 - 1\) \* SWAY_DRIFT_DEG,/
  );
  assert.match(idleEffect, /easing: Easing\.inOut\(Easing\.cubic\),/);
  // cadence measured from retarget start, so target changes land 5–9 s apart
  assert.match(idleEffect, /driftTimer = setTimeout\(retargetDrift, rand\(SWAY_DRIFT_RANGE_MS\)\);/);
});

check('T2.4 weight shift constants: 4–7 s cadence, 550 ms move, ±2.5 px @170, tilt ±0.35°', () => {
  assert.equal(constLiteral('WEIGHT_INTERVAL_MS'), '[4000, 7000]');
  assert.equal(constLiteral('WEIGHT_MOVE_MS'), '550');
  assert.equal(constLiteral('WEIGHT_PX'), '2.5');
  assert.equal(constLiteral('WEIGHT_TILT_DEG'), '0.35');
  assert.match(idleEffect, /toValue: weightSlot \* \(WEIGHT_PX \/ 170\) \* size,/, 'weight amplitude must scale with size');
  assert.match(idleEffect, /toValue: weightSlot \* WEIGHT_TILT_DEG,/, 'tilt sign must follow the slot sign');
});

check('T2.5 weight moves are always visible: next slot never equals the current one (A5)', () => {
  assert.match(
    idleEffect,
    /const options = \[-1, 0, 1\]\.filter\(\(s\) => s !== weightSlot\);/
  );
});

check('T2.6 sway + weight are idle only — suspended during walk moods (loops table)', () => {
  assert.match(idleEffect, /if \(mood !== 'idle' \|\| reduceMotion\) return;/);
});

// ---------------------------------------------------------------------------
// T3 — AC2: native Animated only; loops compose with the existing transforms
// ---------------------------------------------------------------------------

console.log('\nT3  AC2 — native-driver discipline + transform composition');

check('T3.1 no JS frame ticks: no requestAnimationFrame, no per-frame JS loop in the layer', () => {
  assert.ok(!src.includes('requestAnimationFrame'), 'no rAF ticks');
  assert.ok(!/setInterval\(\s*\(\)\s*=>\s*\{[^}]*setValue/.test(src), 'no JS interval drives a transform');
});

check('T3.2 every new Animated.timing uses the native driver', () => {
  const timings = [...breathSection.matchAll(/Animated\.timing\(/g)].length;
  const native = [...breathSection.matchAll(/useNativeDriver: true/g)].length;
  assert.equal(native, timings, `each timing must opt into the native driver (${native}/${timings})`);
  assert.equal(breathSection.includes('useNativeDriver: false'), false);
});

check('T3.3 layering order (outer → inner): weight translate → rotations → mood scale → breath scale', () => {
  const body = petTransformBody();
  const order = [
    ['weight translateX', /translateX: weightX/],
    ['bob translateY', /translateY: bobY/],
    ['walk tilt rotate', /rotate: tilt\.interpolate/],
    ['sway rotate', /rotate: sway\.interpolate/],
    ['drift rotate', /rotate: swayDrift\.interpolate/],
    ['weight tilt rotate', /rotate: weightTilt\.interpolate/],
    ['poke scale', /scale: pokePunch/],
    ['squash scaleX', /scaleX: squash \}/],
    ['squash scaleY', /scaleY: squash\.interpolate/],
    ['breath scaleX', /scaleX: breathY\.interpolate/],
    ['breath scaleY', /scaleY: breathY \}/],
  ];
  let last = -1;
  for (const [label, re] of order) {
    const at = body.search(re);
    assert.notEqual(at, -1, `layer missing: ${label}`);
    assert.ok(at > last, `layer out of order: ${label}`);
    last = at;
  }
});

check('T3.4 existing mood transforms unchanged: bob -5/-7/-18, tilt ±4, squash 1.12 stay as they were', () => {
  assert.match(src, /toValue: -5,\s*\n\s*duration: 1100,/); // idle bob
  assert.match(src, /toValue: -7,\s*\n\s*duration: 200,/); // walk bob
  assert.match(src, /toValue: -18,\s*\n\s*duration: 260,/); // celebrate hop
  assert.match(src, /inputRange: \[-4, 4\], outputRange: \['-4deg', '4deg'\]/);
  assert.match(src, /inputRange: \[1, 1.12\], outputRange: \[1, 0.9\]/);
});

check('T3.5 one animated value per motion source — each perpetual value appears exactly once per transform array', () => {
  const body = petTransformBody();
  for (const v of ['weightX', 'sway', 'swayDrift', 'weightTilt', 'breathY']) {
    const n = [...body.matchAll(new RegExp(`\\b${v}\\b`, 'g'))].length;
    assert.ok(n >= 1 && n <= 2, `${v} expected once or twice (scale pair), found ${n}`);
  }
});

// ---------------------------------------------------------------------------
// T4 — AC3: Reduce Motion shows the spec's fallback (A13)
// ---------------------------------------------------------------------------

console.log('\nT4  AC3 — Reduce Motion: full static transforms, bounded swaps still play');

check('T4.1 breath never starts under RM and pins to rest exactly (scale 1)', () => {
  assert.match(breathEffect, /if \(reduceMotion\) return; \/\/ transforms stay frozen at rest/);
  assert.match(breathEffect, /breathLoop\.stop\(\);\s*\n\s*breathY\.setValue\(1\);/);
});

check('T4.2 sway/weight never start under RM and reset to rest on any exit (A13, A15)', () => {
  assert.match(idleEffect, /if \(mood !== 'idle' \|\| reduceMotion\) return;/);
  assert.match(
    idleEffect,
    /sway\.setValue\(0\);\s*\n\s*swayDrift\.setValue\(0\);\s*\n\s*weightX\.setValue\(0\);\s*\n\s*weightTilt\.setValue\(0\);/
  );
});

check('T4.3 RM effect re-runs when the OS flag flips (cleanup pins rest mid-loop)', () => {
  assert.match(breathEffect, /\}, \[mood, reduceMotion, breathY\]\);/);
  assert.match(idleEffect, /\}, \[mood, reduceMotion, size, sway, swayDrift, weightX, weightTilt\]\);/);
});

check('T4.4 bounded swaps still play under RM: scheduler and walk playback stay RM-free', () => {
  const scheduler = src.slice(src.indexOf('// --- behavior scheduler'), src.indexOf('// --- motion drivers'));
  assert.ok(!scheduler.includes('reduceMotion'));
  const playback = src.slice(src.indexOf('// --- walk frame playback'), src.indexOf('// --- behavior scheduler'));
  assert.ok(!playback.includes('reduceMotion'));
});

// ---------------------------------------------------------------------------
// T5 — AC4-adjacent: rest reset on mood exit, no loop restart on re-render (A15)
// ---------------------------------------------------------------------------

console.log('\nT5  A15 — mood exit resets; re-renders never restart a loop');

check('T5.1 the original mood-drivers effect and its deps line are untouched', () => {
  assert.match(src, /if \(reduceMotion\) return; \/\/ transforms stay frozen at rest/);
  assert.match(src, /\}, \[mood, reduceMotion, bobY, tilt, squash\]\);/);
  assert.match(src, /animations\.forEach\(\(a\) => a\.stop\(\)\);\s*\n\s*bobY\.setValue\(0\);\s*\n\s*tilt\.setValue\(0\);\s*\n\s*squash\.setValue\(1\);/);
});

check('T5.2 loops are keyed on mood/RM/size and refs only — never restart on an unrelated re-render', () => {
  for (const deps of ['[mood, reduceMotion, breathY]', '[mood, reduceMotion, size, sway, swayDrift, weightX, weightTilt]']) {
    assert.match(src, new RegExp(`\\}, ${deps.replace(/[[\]]/g, '\\$&')}\\);`));
  }
  const perpetual = src.slice(src.indexOf('// --- perpetual layer'), src.indexOf('// --- poke'));
  assert.ok(!/\}, \[[^\]]*(frames|particles|progress|cycles)[^\]]*\]\);/.test(perpetual), 'render-scope props must not key perpetual loops');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  for (const f of failures) console.log(`- ${f.name}: ${f.message}`);
  process.exit(1);
}
