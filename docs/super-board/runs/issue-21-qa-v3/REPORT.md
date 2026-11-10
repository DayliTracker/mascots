# QA v3 — issue #21 pixelpet: perpetual motion layer (rebuild round 3)

Tester rebuild-pass evidence for PR #25 @ `3154c0a`. Rebuild round 3 fixed R4
(comment-only: the breath comment claimed seam velocity continuity; it now
states the rest anchor and the 3× seam slope gap). No behavior change was
claimed, so v3 re-runs the full v2 plan against the new head to confirm
nothing moved. Spec oracle unchanged: adopted motion spec
`research/motion-spec/SPEC.md` @ `8e85bec` (ticket #17).

## R4 fix verified in source

`react-native/PixelPet.tsx:395-406` — the breath comment now reads "anchored at
rest 1 — not bounds-mid 1.005" and "not at the loop seam: the legs span unequal
deltas (0.005 vs 0.015 over 550 ms), so the crossing slopes differ 3× — a
~2.86e-5 scaleY/ms gap inherent to the rest anchor". No seam-continuity claim
remains. The committed sampler records the same measurement as informational
(`qa-sampler.log`: "rest seam ≈ 2.86e-5").

## What ran

| Check | Command | Result |
|---|---|---|
| Builder suite (motion) | `node react-native/test-pixelpet-motion.mjs` | 22/22 pass |
| Builder suite (cycles, regression) | `node react-native/test-pixelpet-cycles.mjs` | 20/20 pass |
| QA numeric sampler (committed, corrected oracle) | `node react-native/test-pixelpet-motion-qa.mjs` | 13/13 pass |
| QA runtime harness (virtual clock, real component) | `DUMP=1 node /tmp/rnqa21/run-qa.mjs` (esbuild bundle of this worktree's `PixelPet.tsx` + faithful RN 0.88.1 Animated/Easing stub, rebuilt fresh) | 22/22 pass |
| Typecheck | `/tmp/tsqa21/node_modules/.bin/tsc -p /tmp/tsqa21/tsconfig.qa.json` (TypeScript 5.9.3, `--noEmit --strict`, includes this worktree's `PixelPet.tsx`) | exit 0 |
| Engine verify (config verify_commands) | `node skills/mascot/scripts/engine.mjs skills/mascot/scripts/packs/duck.mjs --out /tmp/check-qa21-v3` (from this worktree) | 10 files written, "all files reproduce byte-for-byte" |
| Delivery gate (config verify_commands) | `node skills/mascot/scripts/validate-frames.mjs skills/mascot/scripts/packs/duck.mjs` (from this worktree) | PASS — 0 problem(s) |
| Byte identity | `cmp` branch render (`/tmp/check-qa21-v3`) vs main render (`/tmp/check-main-v3`), 10 PNGs | 10 compared, 0 differing |

## Per-AC verdict

- **AC1 (idle never static; breath + sway at spec periods/amplitudes)** — pass.
  Sampler T1.1–T1.3 (breath [0.995, 1.015], period 2200 ms) + T2.1–T2.4 (sway
  3400 ms ±0.6°, drift ±0.25° 5–9 s, weight 4–7 s/550 ms) + T3.1 (A12 never
  static: worst 3 s window 29/30 samples deviating, needs ≥2); harness A-pre +
  A1 confirm perpetual values are mid-flight at t=1100 ms over the real
  component. Evidence: `qa-sampler.log`, `runtime-harness.log`.
- **AC2 (native Animated, no JS ticks, composes with bob/tilt/squash)** — pass.
  Every perpetual `Animated.timing` carries `useNativeDriver: true` (sampler
  source rungs); harness asserts every moved value was driven by a started
  timing; per-leg sine ports compose velocity-continuously at the extreme
  boundaries (≈ 6.7e-8); walk composition verified (breath continues, sway +
  weight suspend exactly 0, bob animates).
- **AC3 (RM fallback, verified in the simulator)** — the simulator half stays
  not executable in this repo: it vendors no app (unchanged since v1 F3).
  Re-verified at source + component-runtime level: RM-on 12 s series is exactly
  0/1 at every sample (`curves-reduce-motion-12s.png`), RM flip mid-loop pins
  every value to exact rest within one frame, blink/look swaps still play
  (harness A13, `rmFrames` markers).
- **AC4 (typecheck green; moods otherwise unchanged)** — pass. tsc 5.9.3
  `--noEmit --strict` exit 0; cycles regression 20/20; duck engine +
  validate-frames PASS, 10 PNGs byte-identical to main.

## Charts

- `curves-idle-12s.png` — RM off: breath in [0.995, 1.015], sway+drift+weight
  inside ±0.9°, weight slots; fresh DUMP=1 series @ `3154c0a`.
- `curves-reduce-motion-12s.png` — RM on: all transforms flat at exact rest,
  blink/look frame swaps marked.

Both are sampling charts from the virtual-clock run of the real bundled
component, not simulator captures (AC3's "in the simulator" half remains with
the app-side QA; see above).

## Findings

- R4 fixed (comment + PR record; thread resolved) — verified against the code
  above, not just the thread state.
- Observation (Low, informational, unchanged from v2): the rest-seam velocity
  gap 2.86e-5 scaleY/ms is inherent to the spec's own numbers; bounds, period,
  volume, cadence and RM behavior are unaffected.
- AC3 simulator half: not executable in this repo (F3 from v1 carries).
- Merge-size note for the Reviewer (carried from Builder round 3): PR counts
  869 lines against the 800 cap; the gate will human-gate at merge.

## Verdict

AC1, AC2, AC4 verified pass at `3154c0a`; AC3 verified at source +
component-runtime level, simulator toggle with the app-side QA. Suite totals
22 + 20 + 13 + 22 all green; tsc 0; duck byte-identical to main.
