# QA v2 — issue #21 pixelpet: perpetual motion layer (rebuild round 2)

Tester rebuild evidence for PR #25 @ `3a7e2de` (R1/R2 builder fixes applied;
R3 was the one open `[qa]` finding). Spec oracle unchanged: adopted motion spec
`research/motion-spec/SPEC.md` @ `8e85bec` (ticket #17).

## What ran

| Check | Command | Result |
|---|---|---|
| Builder suite (motion) | `node react-native/test-pixelpet-motion.mjs` | 22/22 pass |
| Builder suite (cycles, regression) | `node react-native/test-pixelpet-cycles.mjs` | 20/20 pass |
| QA numeric sampler (committed, corrected oracle) | `node react-native/test-pixelpet-motion-qa.mjs` | 13/13 pass |
| QA runtime harness (virtual clock, real component) | `/tmp/rnqa21/run-qa.mjs` (esbuild bundle of the real `PixelPet.tsx` + faithful RN 0.88.1 Animated/Easing stub) | 22/22 pass |
| Typecheck | `/tmp/tsqa21/node_modules/.bin/tsc -p /tmp/tsqa21/tsconfig.qa.json` (TypeScript 5.9.3, `--noEmit --strict`, includes this worktree's `PixelPet.tsx`) | exit 0 |
| Engine verify (config verify_commands) | `node skills/mascot/scripts/engine.mjs skills/mascot/scripts/packs/duck.mjs --out /tmp/check-qa21-v2` | 10 files written |
| Delivery gate | `node skills/mascot/scripts/validate-frames.mjs skills/mascot/scripts/packs/duck.mjs` | PASS, 0 problems |
| Byte identity | `cmp` branch render (`/tmp/check-qa21-v2`) vs main render (`/tmp/check-main-v2`), 10 PNGs | all identical |

## R3 fix — easing oracle learns the per-leg ports (QA-owned)

R3 (`PR #25` review thread on `react-native/test-pixelpet-motion-qa.mjs:50`,
class Verification miss): after the R1 rebuild swapped the legs to
`Easing.out(Easing.sin)` / `Easing.inOut(Easing.sin)` / bare `Easing.sin`, the
suite's `evalEasing` only modeled `sin` and `inOut(cubic)` and threw
"easing not modeled" — red for the right reason, but the oracle needed the
ports to actually sample the corrected curve.

`react-native/test-pixelpet-motion-qa.mjs` (this commit):

- `EASINGS` now ports RN's `out` combinator verbatim (`out(e) = 1 - e(1-t)`)
  and registers `out(sin)` and `inOut(sin)` alongside `sin` / `inOut(cubic)`.
  Closed forms, verified against RN 0.88.1 `Libraries/Animated/Easing.js`:
  `out(sin)(t) = 1 - sin(1-t) = cos((1-t)·π/2)`; `inOut(sin)(t) = (1-cos(πt))/2`
  (the R3 finding's stated forms; `inOut` composes to it exactly).
- `evalEasing` strips every `Easing.` occurrence (nested combinators), not just
  the leading one.
- The v1 informational block (F1 cusps) was refreshed: the composed curve now
  reports leg-boundary velocity gaps — extremes ≈ 6.7e-8 (F1's max→0 cusps are
  closed), rest seam ≈ 2.86e-5 scaleY/ms. The seam gap is arithmetic, not a
  regression: the spec's spans (quarter/half/quarter over rests ≠ bounds-mid)
  make the crossing slopes differ 3× (0.005/550 vs 0.015/550). v1's F1 cusps
  (velocity max→0 freezes at the extremes) are what R1 removed.

## Harness instrument fix (QA-owned, mirrors R3)

The first harness re-run failed 21/22: A15 reported `breathY … now
1.0008563321629416 (want … ≤ 1.0000245)`. Diagnosis: that bound in
`/tmp/rnqa21/run-qa.mjs` (v1's instrument) was derived from the pre-R1
easeInSine leg-1 easing — a fresh leg's first frame at the harness's 20 ms step
is quadratic under `1-cos(πt/2)` (≤ 1.0000245) but linear under the corrected
`out(sin) = sin(u·π/2)` (0.015·sin(π/2·20/550) = 1.0008563…, exactly the
observed value). The component's reset is correct — cleanup pins breathY to
exact 1 (`PixelPet.tsx` cleanup + sampler T4.1) and the read happens one frame
into a legitimate fresh leg. The instrument's fresh-leg bound was updated to
the corrected leg-1 easing; A15 still fails on a frozen mid-flight value
(1.005 ≫ bound) or an oversized first frame. Harness re-run: 22/22.

## Charts

- `curves-idle-12s.png` — RM off: breath in [0.995, 1.015], sway+drift inside
  ±0.9°, weight slots; per-leg sine ports @ `3a7e2de`.
- `curves-reduce-motion-12s.png` — RM on: all transforms flat at exact rest,
  blink/look swaps only.

Both are sampling charts from the virtual-clock run (DUMP=1 series), not
simulator captures — this repo vendors no app (PROJECT.md), so AC3's "in the
simulator" half remains not executable here (v1 finding F3, unchanged).

## Findings

- R3 closed (easing oracle ports + harness bound; thread resolved).
- Observation (Low, informational): the rest-seam velocity gap 2.86e-5
  scaleY/ms described above is inherent to the spec's own numbers (equal leg
  durations over unequal spans through the rest anchor); bounds, period,
  volume, cadence and RM behavior are unaffected. Left to the Reviewer's
  judgement; no code change requested.
- AC3 simulator half: still not executable in this repo (F3 from v1 carries).

## Verdict

AC1, AC2, AC4 verified pass on the rebuilt easing. AC3 verified at source +
component-runtime level (RM exact-rest held at every sample over 12 s, both in
v1 and re-verified in v2); the simulator toggle stays with the app-side QA.
Suite totals: 22 + 20 + 13 + 22, all green; duck byte-identical to main.
