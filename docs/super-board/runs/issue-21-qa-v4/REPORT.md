# QA v4 — issue #21 pixelpet: perpetual motion layer (rebuild round 4)

Tester evidence for PR #25 @ `006d7d6` (size split) + follow-up PR #26 @ `a332385`.
Rebuild round 4 executed the orchestrator's size-split plan: the QA oracle
`test-pixelpet-motion-qa.mjs` (346 lines) moved out of PR #25 into PR #26,
leaving #25 at 511 gate-counted lines (199 `PixelPet.tsx` + 307
`test-pixelpet-motion.mjs` + 5 `app-integration.md`; `docs/super-board/runs/**`
is excluded by config `size_exclude`). The R4 review thread was resolved. No
component or suite change was claimed, so v4 verifies the split rather than
re-reviewing behaviour — plus a full re-run of the v3 plan.

## Split integrity (what actually changed v3 → v4)

- `git diff 7355b74..006d7d6 -- react-native/PixelPet.tsx react-native/test-pixelpet-motion.mjs`
  → **empty** (component and unit suite byte-identical to the reviewed v3 head).
- `git diff 7355b74:react-native/test-pixelpet-motion-qa.mjs a332385:react-native/test-pixelpet-motion-qa.mjs`
  → **empty** (PR #26's copy is byte-identical to the reviewed sampler).
- PR #25 changed files = 23, additions 1176 total, gate-counted 511 (runs/** excluded).
- PR #26 = exactly one file, `react-native/test-pixelpet-motion-qa.mjs`, +346.

## What ran (all from this worktree @ `006d7d6` unless noted)

| Check | Command | Result |
|---|---|---|
| Split integrity | `git diff 7355b74..006d7d6 -- react-native/PixelPet.tsx react-native/test-pixelpet-motion.mjs` and `git diff 7355b74:a/…qa.mjs a332385:a/…qa.mjs` | both empty |
| Builder suite (motion) | `node react-native/test-pixelpet-motion.mjs` | 22/22 pass |
| Builder suite (cycles, regression) | `node react-native/test-pixelpet-cycles.mjs` | 20/20 pass |
| QA numeric sampler — PR #26's copy against PR #25's component | `git show a332385:react-native/test-pixelpet-motion-qa.mjs` + this worktree's `PixelPet.tsx` copied to `/tmp/qa21v4-sampler/`, then `node test-pixelpet-motion-qa.mjs` | 13/13 pass (proves the A-then-B merge story: #26's oracle is green against #25's layer) |
| QA runtime harness (virtual clock, real component) | `node build.mjs && DUMP=1 node run-qa.mjs` in `/tmp/rnqa21` — esbuild bundle rebuilt fresh from this worktree's `PixelPet.tsx` + RN 0.88.1 Animated/Easing stub | 22/22 pass |
| Typecheck | `/tmp/tsqa21/node_modules/.bin/tsc -p /tmp/tsqa21/tsconfig.qa.json` (TypeScript, `--noEmit --strict`, includes this worktree's `PixelPet.tsx`) | exit 0 (empty log) |
| Engine verify (config verify_commands) | `node skills/mascot/scripts/engine.mjs skills/mascot/scripts/packs/duck.mjs --out /tmp/check-qa21-v4` | 10 files written, "all files reproduce byte-for-byte" |
| Delivery gate (config verify_commands) | `node skills/mascot/scripts/validate-frames.mjs skills/mascot/scripts/packs/duck.mjs` | PASS — 0 problem(s) |
| Byte identity | fresh main render `/tmp/check-main-v4` (origin/main `6bc9f5a`) vs branch render, `cmp` on 10 PNGs | 10 compared, 0 differing |

R4 fix spot-check in source: `react-native/PixelPet.tsx:403-405` states the rest
anchor and the 3× crossing-slope gap (~2.86e-5 scaleY/ms); no seam-continuity
claim remains. The sampler log records it as informational.

## Per-AC verdict

- **AC1 (idle never static; breath + sway at spec periods/amplitudes)** — pass.
  Sampler T1.1–T1.4 (breath [0.995, 1.015], period 2200, volume ≤ 0.0005 at
  every 5 ms sample) + T2.1–T2.4 (sway 3400 ms ±0.6°, drift ±0.25° 5–9 s,
  weight 4–7 s / 550 ms, slot never repeats) + T3.1 (A12: worst 3 s window
  29/30 samples deviating, needs ≥2); harness A-pre + A1 confirm perpetual
  values mid-flight at t=1100 ms over the real component. Evidence:
  `qa-sampler.log`, `runtime-harness.log`, `curves-idle-12s.png`.
- **AC2 (native Animated, no JS frame ticks, composes with bob/tilt/squash)** —
  pass. Every perpetual `Animated.timing` carries `useNativeDriver: true`
  (sampler source rungs); harness asserts every moved value was driven by a
  started timing; walk composition verified (breath continues, sway + drift +
  weight exactly 0, walk bob animates); extreme-boundary velocity gaps ≈ 6.7e-8.
- **AC3 (RM fallback, verified in the simulator)** — the simulator half stays
  not executable in this repo: it vendors no app (unchanged since v1 F3 — the
  app-vendored copy lives in the dayli-step-tracker repo). Re-verified at
  source + component-runtime level: RM-on 12 s series exactly 0/1 at every
  sample (`curves-reduce-motion-12s.png`), RM flip mid-loop pins every value to
  exact rest within one frame and no new Animated starts after the flip,
  blink/look swaps keep playing (harness A13, `rmFrames` markers). Left
  unchecked on the PR with this reason, as in v1–v3.
- **AC4 (typecheck green; existing moods/states otherwise unchanged)** — pass.
  `tsc --noEmit --strict` exit 0; duck engine + validate-frames PASS; 10 PNGs
  byte-identical to main; cycles regression 20/20.

## Verdict

**Pass.** The split moved exactly one file and no behaviour: PR #25 is inside
the merge gate's line cap, PR #26's oracle is byte-identical to the reviewed
copy and green against PR #25's component. Card returns to Review; merge order
A (#25) then B (#26) as planned by the orchestrator (B's suite goes red by
design on main until A lands — its sampler reads `PixelPet.tsx` from its own
directory).
