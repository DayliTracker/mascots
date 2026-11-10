# QA v1 — issue #14 (engine CLI entry no-op via symlinked path)

Branch `issue-14-mascot-engine-cli-symlink-noop` @ `b0bbd9a` · macOS darwin 25.6.0 arm64 · node v22.23.4 · 2026-11-10

## Verdict: PASS — 3/3 AC

| AC | Result | Evidence |
|---|---|---|
| AC1 — `node <app-under-/tmp>/scripts/mascots/engine.mjs <pack> --out <dir>` writes the 10 expected files (no silent no-op) | ✅ | `ac1-render.log` — exit 0, `Wrote 10 files`, 10 PNGs on disk; vendored app at `/tmp/qa-issue14-app` (`/tmp` → `private/tmp`) |
| AC2 — documented scaffold flow (SKILL.md steps 2–5) end-to-end in an app dir under `/tmp`: render + `validate-frames` PASS 0 problems | ✅ | `test-scaffold-flow.log` — GATE 1 renders 10 files, GATE 2 `PASS — 0 problem(s)`; vendor step copied engine + validate-frames + palettes.json + PixelPet.tsx per `references/pipeline.md` |
| AC3 — duck `verify_commands` stay PASS, frame PNGs byte-identical | ✅ | `ac3-verify-commands.log` — both config commands exit 0, validator `PASS — 0 problem(s)`; `ac3-byte-identity.txt` — all 10 files sha256-identical to a render from the pre-fix engine (`origin/main` `6f0d9f4`) |

Screenshots: n/a — CLI surface, no UI. The rendered `contact_sheet.png` is embedded in the QA comments as visual proof of the render.

## Test-gap check

| AC | Asserting test (rung) | Verdict |
|---|---|---|
| AC1 | `skills/mascot/scripts/test-engine-entry.mjs` symlink-absolute + direct-absolute checks (CLI spawn, real files counted) | covered; red under pre-fix guard (mutation check) |
| AC2 | `skills/mascot/scripts/test-scaffold-flow.mjs` GATE 1 + GATE 2 (CLI spawn + validator stdout asserted) | gap in the Builder diff — written this pass (`test-scaffold-flow.mjs`); the Builder suite never ran `validate-frames` |
| AC3 | validator determinism check + this pass's sha256 comparison | evidence-level, not a committed unit test — a baseline-vs-branch compare needs both engines on disk; validator determinism covers the committed side |

Edge cases: percent-encoded entry path (space) — pinned by `test-scaffold-flow.mjs` (red under pre-fix guard); import-must-not-render — `test-engine-entry.mjs`; determinism re-render — validator. Not a case: nonexistent `argv[1]` — `realpathSync` would throw, but node cannot have loaded a script that does not exist, and `process.argv[1]` is undefined for `-e`/REPL (guarded).

### Findings (all informational, none block)

1. **Relative-entry invocations never fired the pre-fix bug on node v22.** The issue's step-b repro (relative invocation from the app root) could not be reproduced as a no-op: node realpath-resolves a relative entry itself, so `argv[1]` already matches `import.meta.url` (`node-argv-probe.txt`). The pre-fix no-op forms are: absolute path through a symlink, absolute path under symlinked ancestry (`/var` → `/private/var`), and percent-encodable paths (space). All three are covered red→green by the committed suites (`mutation-check.md`). The fix makes every invocation form work, so no AC is affected.
2. **Test suite is guard-sensitive.** With the pre-fix guard restored, `test-engine-entry.mjs` fails 2/4 and `test-scaffold-flow.mjs` fails 2/3; shipped code passes 4/4 and 3/3. Surviving-mutant check: deleting the guard entirely would fail the import-must-not-render check.

## Commands

```
node skills/mascot/scripts/test-engine-entry.mjs      # builder suite — PASS 4/4
node skills/mascot/scripts/test-scaffold-flow.mjs     # qa suite — PASS 3/3
node skills/mascot/scripts/engine.mjs skills/mascot/scripts/packs/duck.mjs --out /tmp/check
node skills/mascot/scripts/validate-frames.mjs skills/mascot/scripts/packs/duck.mjs
```
