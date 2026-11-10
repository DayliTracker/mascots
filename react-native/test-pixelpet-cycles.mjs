// QA tests for issue #20 — PixelPet cycle playback + behavior scheduler v2.
// Run: node react-native/test-pixelpet-cycles.mjs   (from the repo root)
//
// The component is React Native (JSX + native runtime), which this repo cannot
// execute headlessly, so the suite asserts the observable contract at the
// source level: exact scheduler constants vs the adopted motion spec (#17
// ruling on DayliTracker/mascots#17), the v1 180 ms swap fallback, the
// manifest-fps cycle stepping and its per-state render gate, Reduce Motion
// handling, and the fps clamp arithmetic. AC4 (typecheck) runs separately via
// tsc against real react/react-native types — see runs/issue-20-qa-v1/.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'PixelPet.tsx'), 'utf8');
const doc = readFileSync(
  join(here, '..', 'skills', 'mascot', 'references', 'app-integration.md'),
  'utf8'
);

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

/** Assert `needle` occurs exactly `n` times in `haystack` (0 = absent). */
function countOccurrences(haystack, needle) {
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n += 1;
    i = haystack.indexOf(needle, i + 1);
  }
  return n;
}

/** Pull a `const NAME = value;` literal out of the source and return the text. */
function constLiteral(name) {
  const m = src.match(new RegExp(`const ${name}[^\\n]*=\\s*([^;\\n]+);`));
  assert.ok(m, `expected \`const ${name}\` in PixelPet.tsx`);
  return m[1].trim();
}

// ---------------------------------------------------------------------------
// T1 — AC1: a v1 manifest consumes exactly as today (7 frames, unchanged paths)
// ---------------------------------------------------------------------------

console.log('\nT1  AC1 — v1 manifest contract unchanged');

check('T1.1 PixelPetFrames keeps the 7 camelCased engine frame names in order', () => {
  const m = src.match(/export type PixelPetFrames = \{([^}]*)\};/);
  assert.ok(m, 'PixelPetFrames type block not found');
  const keys = [...m[1].matchAll(/^\s{2}(\w+): ImageRequireSource;/gm)].map((x) => x[1]);
  assert.deepEqual(
    keys,
    ['idle', 'blink', 'look', 'walkA', 'walkB', 'happy', 'surprised'],
    'frame names/order drifted from the 7-frame contract'
  );
});

check('T1.2 cycles prop is optional (v1 packs omit it)', () => {
  assert.match(src, /cycles\?: PixelPetCycles;/, 'cycles must be `cycles?:`');
});

check('T1.3 no `cycles` → walk stays the unchanged 180 ms two-frame swap', () => {
  // The v1 branch must be keyed on the missing/empty cycle...
  assert.match(
    src,
    /if \(!walkCycle \|\| walkCycle\.frames\.length === 0\) \{/,
    'v1 fallback branch `!walkCycle || frames.length === 0` missing'
  );
  // ...and must still hold exactly one 180 ms walkA/walkB interval.
  const swap = src.match(
    /const swap = setInterval\(\s*\(\) => setWalkFrame\(\(f\) => \(f === 'walkA' \? 'walkB' : 'walkA'\)\),\s*(\d+)\s*\);/
  );
  assert.ok(swap, 'v1 two-frame swap interval not found');
  assert.equal(swap[1], '180', 'v1 walk swap interval changed from 180 ms');
  assert.equal(
    countOccurrences(src, 'setInterval('),
    2,
    'expected exactly two intervals (v1 swap + v2 cycle step)'
  );
});

check('T1.4 v1 render path unchanged: falls back to frames[frame]', () => {
  assert.match(src, /source=\{cycleSource \?\? frames\[frame\]\}/);
  const frame = src.match(
    /const frame: FrameName = poked\s*\?\s*'surprised'\s*:\s*mood === 'celebrate'\s*\?\s*'happy'\s*:\s*mood === 'walk'\s*\?\s*walkFrame\s*:\s*idleFrame;/
  );
  assert.ok(frame, 'frame selection ladder changed');
});

check('T1.5 app-integration.md v1 wiring untouched by this PR (additions-only diff)', () => {
  // Guarded here rather than shelling out to git so the suite stays runnable
  // from any checkout; the git-level numstat proof is recorded in the
  // QA report (t1-docs-numstat.log).
  assert.match(doc, /## PixelPet props/, 'v1 props doc section missing');
  assert.match(doc, /require\('\.\/assets\/mascots\/duck\/duck_idle\.png'\)/, 'v1 require example missing');
  assert.match(doc, /v1 packs just omit `cycles`[\s\S]*?behave exactly as before/);
});

// ---------------------------------------------------------------------------
// T2 — AC2: a v2 manifest plays its walk cycle at the manifest fps
// ---------------------------------------------------------------------------

console.log('\nT2  AC2 — manifest v2 walk cycle at manifest fps');

check('T2.1 step interval is derived from the manifest fps with a 16 ms floor', () => {
  assert.match(
    src,
    /const step = Math\.max\(16, Math\.round\(1000 \/ Math\.max\(1, walkCycle\.fps\)\)\);/,
    'step formula `Math.max(16, Math.round(1000 / Math.max(1, fps)))` missing'
  );
});

check('T2.2 step arithmetic: 10 fps → 100 ms, 1 fps → 1000 ms, 0 fps → 1000 ms, 100 fps → 16 ms', () => {
  const step = (fps) => Math.max(16, Math.round(1000 / Math.max(1, fps)));
  assert.equal(step(10), 100, 'smooth-duck spec: 8 frames @ 10 fps = 800 ms loop');
  assert.equal(step(1), 1000);
  assert.equal(step(0), 1000, 'fps <= 0 must clamp to 1 fps, not Infinity');
  assert.equal(step(-3), 1000, 'negative fps must clamp too');
  assert.equal(step(100), 16, 'very high fps must floor at 16 ms');
});

check('T2.3 walk entry resets the cycle to frame 0 and wraps modulo frame count', () => {
  assert.match(src, /setCycleIndex\(0\);/, 'cycleIndex must reset on walk entry');
  assert.match(
    src,
    /setCycleIndex\(\(i\) => \(i \+ 1\) % cycle\.frames\.length\);/,
    'cycle stepping must wrap modulo frames.length'
  );
});

check('T2.4 per-state render gate: cycle plays only in walk, not poked, with frames present', () => {
  const gate = src.match(
    /const cycleSource: ImageRequireSource \| null =\s*\n\s*!poked && mood === 'walk' && walkCycle && walkCycle\.frames\.length > 0\s*\n\s*\? walkCycle\.frames\[cycleIndex % walkCycle\.frames\.length\]\s*\n\s*: null;/
  );
  assert.ok(gate, 'cycleSource per-state gate changed');
  // and the gate is actually consumed by the Image source
  assert.match(src, /source=\{cycleSource \?\? frames\[frame\]\}/);
});

check('T2.5 interval reads the latest cycle (inline `cycles` objects do not restart playback)', () => {
  assert.match(src, /const walkCycleRef = useRef\(walkCycle\);/);
  assert.match(src, /const cycle = walkCycleRef\.current;/, 'interval must read walkCycleRef each tick');
});

// ---------------------------------------------------------------------------
// T3 — AC3: scheduler fires the spec'd behaviors with randomization; RM respected
// (adopted spec: qa ruling on DayliTracker/mascots#17, 2026-11-10)
// ---------------------------------------------------------------------------

console.log('\nT3  AC3 — behavior scheduler vs adopted motion spec #17 + Reduce Motion');

check('T3.1 blink: gap U[2600, 4800] ms, hold 140 ms', () => {
  assert.equal(constLiteral('BLINK_GAP_MS'), '[2600, 4800]');
  assert.equal(constLiteral('BLINK_HOLD_MS'), '140');
});

check('T3.2 look: gap U[6000, 10000] ms, hold U[600, 900] ms', () => {
  assert.equal(constLiteral('LOOK_GAP_MS'), '[6000, 10000]');
  assert.equal(constLiteral('LOOK_HOLD_MS'), '[600, 900]');
  assert.match(src, /playSequence\(\['look'\], rand\(LOOK_HOLD_MS\)/, 'look hold must be randomized');
});

check('T3.3 foot shuffle: p=0.35 after each look, delay U[1200, 4000], walk_a/b/a @ 300 ms, cooldown 8 s', () => {
  assert.equal(constLiteral('SHUFFLE_CHANCE'), '0.35');
  assert.equal(constLiteral('SHUFFLE_DELAY_MS'), '[1200, 4000]');
  assert.equal(constLiteral('SHUFFLE_HOLD_MS'), '300');
  assert.equal(constLiteral('SHUFFLE_COOLDOWN_MS'), '8000');
  assert.match(src, /playSequence\(\['walkA', 'walkB', 'walkA'\], SHUFFLE_HOLD_MS/, 'shuffle frame order');
  assert.match(src, /if \(Math\.random\(\) >= SHUFFLE_CHANCE\) return;/, 'shuffle probability roll missing');
  assert.match(
    src,
    /if \(Date\.now\(\) \+ delay < shuffledAt \+ SHUFFLE_COOLDOWN_MS\) return;/,
    'shuffle cooldown gate missing'
  );
  assert.match(src, /scheduleLook\(rand\(LOOK_GAP_MS\)\);\s*\n\s*maybeShuffle\(\);/, 'shuffle must roll after each look');
});

check('T3.4 randomization draws every gap/hold from the U ranges', () => {
  assert.match(src, /const rand = \(\[lo, hi\]: \[number, number\]\) => lo \+ Math\.random\(\) \* \(hi - lo\);/);
  // schedule entry + re-roll paths all use rand()
  assert.match(src, /scheduleBlink\(rand\(BLINK_GAP_MS\)\)/);
  assert.match(src, /scheduleLook\(rand\(LOOK_GAP_MS\)\)/);
  // blink: entry + both re-roll arms (busy / not busy); look: entry + busy re-roll + after-play re-roll
  assert.equal(countOccurrences(src, 'rand(BLINK_GAP_MS)'), 3, 'blink gap on entry and re-rolls');
  assert.equal(countOccurrences(src, 'rand(LOOK_GAP_MS)'), 3, 'look gap on entry and re-rolls');
  assert.match(src, /const delay = rand\(SHUFFLE_DELAY_MS\);/, 'shuffle delay must be randomized');
});

check('T3.5 behaviors are mutually exclusive — a timer firing mid-behavior re-rolls', () => {
  assert.match(src, /let busy = false;/);
  assert.match(src, /const playSequence = \(seq: FrameName\[\], holdMs: number, after\?: \(\) => void\) => \{\s*\n\s*busy = true;/);
  // blink re-rolls when busy; look re-rolls when busy; shuffle drops when busy
  assert.match(
    src,
    /if \(!busy\) playSequence\(\['blink'\], BLINK_HOLD_MS, \(\) => scheduleBlink\(rand\(BLINK_GAP_MS\)\)\);\s*\n\s*else scheduleBlink\(rand\(BLINK_GAP_MS\)\);/
  );
  assert.match(src, /if \(busy\) \{\s*\n\s*scheduleLook\(rand\(LOOK_GAP_MS\)\);\s*\n\s*return;\s*\n\s*\}/);
  assert.match(src, /if \(busy\) return;\s*\n\s*playSequence\(\['walkA', 'walkB', 'walkA'\]/);
  // sequence end resets to rest and releases the lock
  assert.match(src, /setIdleFrame\('idle'\);\s*\n\s*busy = false;/);
});

check('T3.6 idle behaviors are cleaned up on mood exit (no leaking timers)', () => {
  const cleanup = src.match(
    /return \(\) => \{\s*\n\s*clearTimeout\(blinkTimer\);\s*\n\s*clearTimeout\(lookTimer\);\s*\n\s*clearTimeout\(seqTimer\);\s*\n\s*clearTimeout\(shuffleTimer\);\s*\n\s*\};/
  );
  assert.ok(cleanup, 'scheduler cleanup must clear all four timers');
});

check('T3.7 Reduce Motion: transform loops freeze at rest', () => {
  assert.match(
    src,
    /if \(reduceMotion\) return; \/\/ transforms stay frozen at rest/,
    'motion driver must early-return under RM'
  );
  assert.match(
    src,
    /\}, \[mood, reduceMotion, bobY, tilt, squash\]\);/,
    'motion driver must re-run when reduceMotion changes'
  );
});

check('T3.8 Reduce Motion: bounded frame swaps still play (scheduler has no RM guard)', () => {
  const scheduler = src.slice(src.indexOf('// --- behavior scheduler'), src.indexOf('// --- motion drivers'));
  assert.ok(!scheduler.includes('reduceMotion'), 'scheduler must not gate on reduceMotion');
  const playback = src.slice(src.indexOf('// --- walk frame playback'), src.indexOf('// --- behavior scheduler'));
  assert.ok(!playback.includes('reduceMotion'), 'walk cycle playback must not gate on reduceMotion');
});

check('T3.9 Reduce Motion: poke gives opacity-only heart, no punch spring', () => {
  assert.match(src, /if \(!reduceMotion\) \{\s*\n\s*feedback\.push\(/, 'punch spring must be RM-gated');
  const heartBlock = src.slice(src.indexOf('key={heartKey}'), src.indexOf('<Animated.View'));
  assert.ok(heartBlock.includes('key={heartKey}'), 'heart block anchor not found');
  assert.match(
    heartBlock,
    /\.\.\.\(reduceMotion\s*\?\s*\{\}\s*:\s*\{\s*transform:/,
    'heart rise transform must be RM-omitted'
  );
  assert.ok(heartBlock.includes('opacity: heart.interpolate('), 'heart opacity feedback stays under RM');
});

check('T3.10 Reduce Motion: sparkles twinkle in place (no drift/rise transforms)', () => {
  const sparkleBlock = src.slice(src.indexOf('function Sparkles'));
  assert.ok(sparkleBlock.includes('function Sparkles'), 'sparkles block anchor not found');
  assert.match(
    sparkleBlock,
    /\.\.\.\(reduceMotion\s*\?\s*\{\}\s*:\s*\{\s*transform:/,
    'star drift transforms must be RM-omitted'
  );
  assert.match(sparkleBlock, /opacity: anim\.interpolate\(/, 'twinkle opacity stays under RM');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  for (const f of failures) console.log(`- ${f.name}: ${f.message}`);
  process.exit(1);
}
