# QA report — issue #19 (tween cycles + manifest v2) · v1

Head under test: `e68b73f5ca061e7df09897fe7694beb656134e4e` (PR #23, `issue-19-tween-cycles-manifest-v2`).
Environment: macOS arm64, Node ≥ 20, `@resvg/resvg-js@2.6.2` (pinned).

## Verdict — PASS, 5/5 AC

| AC | Observable test (run in this worktree) | Result |
|---|---|---|
| 1 | `node skills/mascot/scripts/smooth-engine.mjs skills/mascot/scripts/packs/smooth-duck.mjs --out <A>` and `--out <B>`; `diff -r A B` | 17 files each, 8 `smooth-duck_walk_000..007.png`, **diff -r clean** → `ac1-two-run-bytes.log` |
| 2a | manifest shape probe | `version: 2`, `cycles.walk.fps: 10`, 8 cycle frames, `frames` stays exactly 7, no cycle leak → `ac2-manifest-v2.log` |
| 2b | main's engine (`git archive origin/main` tree) vs branch engine on the cycle-less main pack | both write 9 files, **diff -r clean** → `ac2-v1-crossengine.log` |
| 3a | `validate-smooth-frames.mjs smooth-duck --out <A>` | **PASS, 0 problems, exit 0**, wrap pair `007→000 (wrap): 830 px` exercised → `ac3-validator-pass.log` |
| 3b | real-PNG mutations of one cycle frame | idle over `walk_003` → exit 1 (determinism); duplicate `walk_006` over `walk_005` → exit 1 (MIN-delta gate) → `ac3-mutated-keyjump.log`, `ac3-mutated-duplicate.log` |
| 4 | AGENTS.md commands on `packs/duck.mjs` + byte-compare vs main engine output | engine exit 0, 10 files, `validate-frames` **PASS**, **diff -r clean** (10/10 byte-identical) → `ac4-duck-engine.log`, `ac4-duck-validate.log`, `ac4-duck-bytes.log` |
| 5 | Builder's `Local tests` command, four suites | 17/17 + 8/8 + 19/19 + 20/20 = **64/64**, all exits 0 → `ac5-suite-*.log` |

Extra cycle-to-canonical evidence: `smooth-duck_walk_000.png` byte-identical to `smooth-duck_walk_a.png`, `walk_004` to `walk_b` — the cycle keys land exactly on the canonical geometry.

## Test-gap check

- Ledger: every AC maps to an asserting test (above). AC4's byte-identity is the AGENTS.md manual gate by design; run here.
- Edge cases: K=1 / steps 0 / fps bounds / unknown tween → schema gates (`validate-smooth-frames.mjs:148-165`), fps 0 covered by `test-smooth-cycles.mjs`. Non-numeric opts hold from left key (`test-smooth-cycles.mjs:57-62`). Wrap pair exercised (log). Cycle frames never leak into `manifest.frames`.
- High gap found: Builder's mutation test writes `Buffer.from('corrupted frame')` — an unreadable file, not a mutated frame. Closed with `test-smooth-cycles-qa.mjs` (8 checks): real-PNG key-jump + duplicate mutations rejected, wrap-pair regex, key poses on canonical bytes, AC1's ≥8 frames / ≥8 fps numbers.
- Red-first: with `cycleOpts` lerp disabled the suite fails (adjacent deltas 0 px → validator gate); with `MIN_CYCLE_DELTA = 0` the duplicate-mutation check fails. Restored, suite green 8/8. Mutations never committed.
- Test gaps not written (Low): MIN/MAX registration constants have no bound-pinning test; contact sheet excludes cycle frames by design (deferred to #16 per FINDINGS risk 4).
