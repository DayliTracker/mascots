# QA v3 — issue #1 · branch `issue-1-mascot-skill-dual-mode` @ `56698b7`

Re-test after builder rebuild round 2 (R1 fix: pixel scaffold step runs from the
skill dir). Verdict: **PASS 5/5 AC · R1 verified fixed (black-box) · 1 new
pre-existing engine bug filed separately (N1, out of this PR's diff).**

## Per-AC results

| AC | Check | Result | Evidence |
|---|---|---|---|
| 1 | SKILL.md documents smooth pipeline + when to choose each kind | PASS | doc suite AC1 5/5 (`logs/t3b-*.log`); kind-choice table `SKILL.md:15-28` |
| 2 | references cover smooth craft + QA | PASS | doc suite AC2 7/7; `references/craft.md` "Smooth craft — SVG authoring"; `references/qa.md` smooth validator + sheet knobs |
| 3 | scaffolder offers smooth packs | PASS | `test-new-pack.mjs` 19/19 (`logs/t2-*.log`); my own scaffold `--kind smooth` → render + `validate-smooth-frames` PASS as-is (`logs/t6a/t6b`) |
| 4 | pixel path unchanged and still documented | PASS | `git diff origin/main...HEAD` on engine/validator/duck = 0 bytes; duck render 10/10 files byte-identical vs `00fbe5d` (`logs/t5*`) |
| 5 | NEVERs span pixel maps and SVG; image-gen excluded | PASS | doc suite AC5 4/4; `SKILL.md:92-98` |

## R1 verification (the v2 bounce reason) — black-box

Followed the docs verbatim in fresh app dirs:

1. Vendor per `references/pipeline.md:42-46` (engine, validator, palettes,
   PixelPet) → OK.
2. Scaffold per `SKILL.md:51-55`: `node "$SKILL_DIR/scripts/new-pack.mjs"
   tester --kind pixel` from a **neutral cwd** → writes
   `$SKILL_DIR/scripts/packs/tester.mjs` beside itself → OK (this was R1's
   complaint; it now runs where the docs say).
3. Copy the pack into `<app>/scripts/mascots/packs/` per the docs → OK.
4. Render + validate inside the app (`$HOME/qa3-app2`, no symlinks) →
   `Wrote 10 files`, `validate-frames` **PASS — 0 problem(s)**
   (`logs/t1c-home-render.log`, `logs/t1d-home-validate.log`).

R1 is fixed: the documented flow is now runnable end-to-end where the pack
must live. The fix is pinned by 4 new checks in `test-dual-mode-docs.mjs`
(20/20), red-green proven — mutating `SKILL.md` step 3 back to
`node scripts/new-pack.mjs` turns exactly the new check red
(`logs/t3c-red-green-mutant.log`), restore → 20/20 (`logs/t3d-*.log`).

## N1 — new finding, filed as a separate bug card

`skills/mascot/scripts/engine.mjs:236` — the CLI entry guard
`resolve(process.argv[1]) === import.meta.url.replace('file://','')` silently
no-ops (exit 0, no output) when the engine's own path contains a symlink: node
reports `import.meta.url` via realpath while `argv[1]` stays as typed
(probe: `node /tmp/qa3-probe.mjs` → argv1 `/tmp/…` vs url `file:///private/tmp/…`).
Repro: same documented flow in `/tmp/qa3-app` → render writes nothing
(`logs/t1a-app-render.log`, 0 bytes), validator FAIL 20 missing-file problems
(`logs/t1b-app-validate.log`). Same flow in `$HOME/qa3-app2` → PASS.

- Engine is **unchanged on this branch** (0-byte diff vs origin/main) — the bug
  exists on main identically; not a regression of this PR.
- Not a failure of any AC of this docs card → bug card, card moves to Review
  with the finding (run.md → "qa cards").

## Suite totals

- `node skills/mascot/scripts/test-new-pack.mjs` → 19/19 (`logs/t2-*.log`)
- `node skills/mascot/scripts/test-dual-mode-docs.mjs` → 20/20, was 16/16 + 4 new R1 pins (`logs/t3b-*.log`)
- config `verify_commands` → engine `Wrote 10 files`, validator `PASS — 0 problem(s)` (`logs/t4a/t4b`)

## Artifacts

- `qa-smooth-starter-contact-sheet.png` — smooth starter, scaffolded as-is (7 frames)
- `qa-pixel-starter-contact-sheet.png` — pixel starter, scaffolded as-is, rendered in-app (control case)
- `duck-contact-sheet-branch.png` — duck on branch (byte-identity subject, 10/10 identical)
- `logs/` — all raw command output cited above
