# QA v1 — issue #21 pixelpet: perpetual motion layer (breath, sway, shift)

Tester evidence for PR #25 @ `5ba4e7c`, against the adopted motion spec
(`research/motion-spec/SPEC.md` @ `8e85bec`, ticket #17).

## What ran

| Check | Command | Result |
|---|---|---|
| Builder suite (motion) | `node react-native/test-pixelpet-motion.mjs` | 22/22 pass |
| Builder suite (cycles, regression) | `node react-native/test-pixelpet-cycles.mjs` | 20/20 pass |
| QA numeric sampler (committed) | `node react-native/test-pixelpet-motion-qa.mjs` | 13/13 pass |
| QA runtime harness (virtual clock, real component) | `/tmp/rnqa21/run-qa.mjs` (esbuild bundle of the real `PixelPet.tsx` + faithful RN 0.88.1 Animated/Easing stub) | 22/22 pass |
| Typecheck | `/tmp/tsqa21/node_modules/.bin/tsc -p /tmp/tsqa21/tsconfig.qa.json` (TypeScript 5.9.3, `--noEmit --strict --skipLibCheck`, react-native types 0.72.8) | exit 0 |
| Engine verify (config verify_commands) | `node skills/mascot/scripts/engine.mjs skills/mascot/scripts/packs/duck.mjs --out /tmp/check-qa21-branch` | 10 files written |
| Delivery gate | `node skills/mascot/scripts/validate-frames.mjs skills/mascot/scripts/packs/duck.mjs` | PASS, 0 problems |
| Byte identity | `cmp` branch render vs main render, 9 PNGs | all identical |

Note: the Builder handoff's literal typecheck command (`npx tsc …`) cannot run
in this repo — typescript is not installed and `npx tsc` resolves to the fake
`tsc` stub package (exit 1 banner "This is not the tsc command you are looking
for"). The equivalent check above uses a real compiler with `react` /
`react-native` types resolvable.

## Runtime harness (what the Builder left to QA)

Drives the real transpiled `PixelPet.tsx` through react-test-renderer with a
virtual clock and a faithful `react-native` stub (Animated timing/sequence/
loop/parallel + Easing ported verbatim from react-native@0.88.1
`Libraries/Animated/Easing.js`). Spec assertions exercised on the mounted
component (`runtime-harness.log`):

- A1 breath bounds [0.995, 1.015] at every sample; amplitude reached; measured
  period 2200 ms ± 20 (frame-step fine sampling); ≥5 periods in 12 s
- A2 volume |scaleX·scaleY − 1| ≤ 0.0005 at every sample (worst 5.5e-5)
- A3 |sway + drift| ≤ 0.9° at every sample (worst 0.80°)
- A4 drift retargets at 5.5 s / 11.1 s (within the 5–9 s cadence)
- A5 weight move at 4.2 s / 9.2 s (4–7 s cadence), settle ≤ 600 ms, slots
  ⊂ {−2.5, 0, +2.5} px, tilt sign follows translateX sign
- A12 never-static: worst 3 s window 27–28 of 30 samples deviating (≥2 required)
- A13 Reduce Motion on: every sampled value exactly 0/1 for 12 s; no Animated
  start after the RM flag resolves; first blink inside [2600, 4800] ms with
  140 ms hold, restoring idle; RM flip mid-loop pins everything to exact rest
- A15 mood exit mid-breath: all five perpetual values read exactly rest within
  one frame (breathY resets to 1, fresh walk loop one frame in); walk window:
  breath continues, sway/drift/weight stay exactly 0

Red-first (mutations applied to the worktree copy, never committed; bundle
rebuilt clean after each restore):

| Mutation | Expected | Result |
|---|---|---|
| `BREATH_PERIOD_MS` 2200 → 2400 | harness A1 period red | A1 red ×2, 20 pass |
| remove `\|\| reduceMotion` from idle gate | harness A13 red | A13 red ×4, 18 pass |
| `SWAY_DRIFT_DEG` 0.25 → 0.9 | harness A3 red | A3 red ×1, 21 pass |
| `BREATH_MAX` 1.015 → 1.025 (sampler) | sampler T1.2/T1.3 red | red ×2, 11 pass → restored 13 pass |

## Charts

- `curves-idle-12s.png` — RM-off: breath, sway+drift (vs the ±0.9° bound),
  weight translateX slots. These are sampling charts from the virtual-clock
  run, not simulator captures: this repo vendors no app (PROJECT.md), so the
  spec's sampler instrument (A1–A15) is the available runtime evidence and the
  AC3 "in the simulator" half could not be executed here.
- `curves-reduce-motion-12s.png` — RM-on: all transforms flat at exact rest,
  blink/look swaps marked.

## Findings

- **F1 (Bug, Low)** — breath/sway legs ease with RN `Easing.sin`, which is
  easeInSine `1 − cos(πt/2)` (react-native@0.88.1 `Libraries/Animated/Easing.js`
  →138), not the symmetric sinusoid the spec's loops table ("sine") and its
  executable reference (`research/motion-spec/preview.html` →207,
  `mid + amp·Math.sin(2πt/period)`) use. The composed curve bounds/period match
  A1/A3, but velocity jumps from max to zero at every leg boundary (breath leg
  exits at ≈4.3e-5 scaleY/ms; true sine exits at 0) — visible as pointed peaks
  in `curves-idle-12s.png`. Faithful port per leg would be
  `Easing.out(Easing.sin)` / `Easing.inOut(Easing.sin)` / `Easing.in(Easing.sin)`
  (max→min leg is already cos-shaped under `inOut`). Fix is app-code, one line
  per loop.
- **F2 (Verification miss, Low)** — Builder's suite comment misstates the
  easing: `react-native/test-pixelpet-motion.mjs` →92 claims "RN's Easing.sin
  IS the sinusoidal ease-in-out, (1 − cos(pi*t)) / 2"; actual RN 0.88.1 source
  is `1 − Math.cos((t * Math.PI) / 2)` (easeInSine). The regex pins built on
  that comment still hold, but the comment masked F1.
- **F3 (not run)** — AC3's "verified in the simulator with the setting on" is
  not executable in this repo: no app/simulator here (the vendor app and its
  vendored PixelPet copy live in DayliTracker/dayli-step-tracker). RM fallback
  verified at source + component-runtime level instead; the simulator toggle
  remains for the app-side QA.

## Verdict

AC1, AC2, AC4 verified pass. AC3 verified at code + component-runtime level
but not in a simulator — left unticked with that reason. Findings F1/F2 are
Low (motion-shape fidelity + comment), do not block; carried to the Reviewer.
