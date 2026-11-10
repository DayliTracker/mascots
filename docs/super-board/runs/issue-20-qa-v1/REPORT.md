# QA report — issue #20 · pixelpet: cycle playback + behavior scheduler v2

- **PR:** #24 · head `6c8cf19` (diff vs `origin/main`: `react-native/PixelPet.tsx` + `skills/mascot/references/app-integration.md`, 2 files, +248/−57)
- **Spec source:** adopted motion spec — QA ruling on DayliTracker/mascots#17 (2026-11-10): blink gap U[2600, 4800] hold 140 ms · look gap U[6000, 10000] hold U[600, 900] ms · foot shuffle p = 0.35 after each look, delay U[1200, 4000] ms, walk_a/b/a @ 300 ms, cooldown ≥ 8 s · walk cycle 8 frames @ 10 fps · Reduce Motion freezes transforms, bounded frame swaps still play.
- **Test suite:** `react-native/test-pixelpet-cycles.mjs` (dependency-free node, repo test precedent)

## Verdict per AC

| AC | Result | Evidence |
|---|---|---|
| AC1 v1 manifest consumes exactly as today | ✅ pass | `logs/suite-green.log` T1.1–T1.5 · `logs/t1-docs-numstat.log` (38 additions, 0 deletions) |
| AC2 v2 manifest plays walk cycle at manifest fps | ✅ pass (logic) — simulator leg not runnable, see below | T2.1–T2.5 |
| AC3 scheduler fires spec'd behaviors with randomization; RM respected | ✅ pass | T3.1–T3.10 |
| AC4 typecheck green | ✅ pass | `logs/t4-typecheck.log` (exit 0) · `logs/t4-negative-control.log` (tsc catches a seeded error → invocation is live) |

## What was run

```
node react-native/test-pixelpet-cycles.mjs                 # 20 checks, all green (logs/suite-green.log)
npx tsc --noEmit --strict --jsx react-jsx --esModuleInterop \
  --skipLibCheck --target es2020 --module esnext \
  --moduleResolution bundler react-native/PixelPet.tsx     # exit 0, no diagnostics (logs/t4-typecheck.log)
```

- **Red-first mutation check** (`logs/mutation-red.log`, `logs/mutation-restored-green.log`): `BLINK_HOLD_MS` 140 → 141 in the worktree made T3.1 fail (`'141' !== '140'`); restored via `git checkout --`, suite back to 20/0. The mutation never reached a commit.
- **Typecheck negative control** (`logs/t4-negative-control.log`): `npx tsc --noEmit --strict --target es2020 /tmp/tsc-bad.tsx` reports `error TS2322` — proves the same invocation detects type errors rather than passing silently. Types used: `typescript@5.6.3`, `react@18.3.1`, `react-native@0.76.5` (ships own .d.ts), `@types/react@18.3.12` — installed `--no-save --no-package-lock` in the worktree; no tracked files touched.

## AC notes

- **AC2 — simulator leg not run.** This repo is a component/skill repo with no app host, no Xcode/Android project and no simulator available; "verified per-state in the simulator" could not be executed here. What was verified instead, per state: `cycleSource` is non-null only when `!poked && mood === 'walk' && cycles.walk && frames.length > 0` (walk plays the cycle); idle/celebrate/poked fall back to `frames[frame]`; entry resets to frame 0; stepping is `1000 / fps` ms (10 fps → 100 ms = the spec's 8-frame/800 ms loop) with a 16 ms floor and a `fps ≤ 0` clamp; the interval wraps modulo the frame count and reads the latest `cycles` (inline objects don't restart playback). T2.1–T2.5 in `logs/suite-green.log`.
- **AC1 — v1 contract.** 7 camelCased frame names/order unchanged (`PixelPetFrames`), `cycles` optional, the no-cycle walk path is the untouched 180 ms walkA/walkB swap, render falls back to `frames[frame]`, and the PR's `app-integration.md` change is additions-only (`git diff origin/main...HEAD --numstat` → `38 0`) so v1 wiring text is untouched.

## Test-gap check (gaps not written — none blocking)

- **Medium — celebrate mood never clears when progress falls below 1.** The mood machine's idle branch requires `mood === 'walk'` (`PixelPet.tsx:136`), so progress 1 → 0.5 while celebrating keeps celebrating. **Pre-existing on `origin/main`** — the mood machine is unchanged by this PR — out of this card's scope; worth a follow-up card if unintended.
- **Medium — no execution rung for scheduler/playback logic in this repo.** No react/RN runtime or jest here; suite asserts constants, structure and arithmetic at source level. Closing it needs a consumer app or `react-test-renderer` harness — no app code change needed, so not a Fail per the test-gap rule.
- **Low — shuffle is dropped, not re-rolled, when busy at fire time** (`PixelPet.tsx:230`). Acceptable: the spec only rolls a shuffle after a look, so the next look re-rolls it.
- Checked, not a gap: poke during walk resolves correctly — `cycleSource` is gated on `!poked`, so the source falls straight to `frames['surprised']`; no two-frame walk flash occurs.

## Screenshots

Not captured — no app host or simulator exists in this repo (React Native component, no runnable app). Alternative evidence: the logs above and the source-level suite. Per run.md, the omission is stated rather than dropped silently.
