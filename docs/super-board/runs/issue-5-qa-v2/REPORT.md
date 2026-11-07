# QA report — mascots#5 · 🔧 [chore] mascots: shelve 48px class, adopt smooth-art ADR · v2

Tester lane, super-board qa card, rebase-pass re-verification. Ran against PR #6 head
`9bc654b` (branch `issue-5-shelve-48px-class-adopt-smooth-art-adr`, rebased onto
`origin/main` `a9ab92d` — includes #7's `validate-frames.mjs` fresh-checkout fix) on
2026-11-07. Worktree `.claude/worktrees/issue-5-qa/`; evidence in this folder.

**Verdict: PASS — 5/5 AC re-verified. No new findings.**

## Why v2

Reviewer round 2 bounced the card to the builder on a merge-gate exit 2: bare
`verify_commands[1]` failed any fresh checkout (pre-existing F1, tracked in #7). #7
landed on `origin/main` (`a9ab92d`) and the builder rebased this branch onto it. This
round re-verifies every AC on the rebased head and confirms the bounce reason is gone.

## Per-AC results

| AC | Check (exact command) | Result |
|---|---|---|
| AC1 `wip/48px-class` on remote w/ all 4 commits | `git ls-remote origin refs/heads/wip/48px-class` → `325087d…`; `git rev-list --count 52cfe78..325087d` → `4`; the 4 subjects are exactly the stranded commits named in the ticket (555afe3 framework-agnostic contract, 11a120c engine tokens, 1e474d6 style guide+scaffolder+CI, 325087d duck48 WIP) | ✅ PASS · `ac1-wip-branch.txt` |
| AC2 local main == origin/main | `git rev-list --left-right --count main...origin/main` → `0 0`; `git rev-parse main origin/main` → both `a9ab92dc0f0d…` (post-#7 main) | ✅ PASS · `ac2-main-parity.txt` |
| AC3 ADR committed on mascots main | `git cat-file -e HEAD:docs/adr/0001-smooth-art-over-pixel-art.md` → exists at PR head `9bc654b` (`ff6bce4`); PR #6 squash merge lands it on `main` — same interpretation rounds 1–2 accepted | ✅ PASS · `verify-ac-run.log` |
| AC4 dayli #30 closed w/ supersede pointer | `gh issue view 30 -R DayliTracker/dayli-step-tracker --json state` → `CLOSED`; supersede comment `6666322726` points at the smooth-pack chain (#45/PR #46, squash `dbe1d3f`, mascots ADR 0001) | ✅ PASS · `ac4-dayli-30.txt` |
| AC5 dayli pixel duck untouched | `git diff --name-status a9ab92d..HEAD` → docs-only (ADR + QA evidence, no dayli paths); `git diff --quiet a9ab92d..HEAD -- skills/mascot/scripts/packs/duck.mjs skills/mascot/scripts/engine.mjs` → clean | ✅ PASS · `ac5-pr-files.txt` |

Re-runnable: `bash docs/super-board/runs/issue-5-qa-v2/verify-ac.sh` → **8 passed, 0 failed** (`verify-ac-run.log`).

## R1 fixed in v2

Reviewer R1 (round 2, owner qa, Over-engineering, non-blocking): v1's `verify-ac.sh:50`
asserted "branch diff is ADR-only", stale the moment QA commits its own evidence. v2
asserts what AC5 actually claims: duck pack + engine byte-identical to `a9ab92d`, and
no non-docs file changed (no code, no dayli paths). The assertion now stays true as
evidence folders accumulate.

## Merge-gate verify (the bounce reason, re-checked)

Both `config.verify_commands` green at head `9bc654b` (`verify-commands.txt`):

```
node skills/mascot/scripts/engine.mjs skills/mascot/scripts/packs/duck.mjs --out /tmp/check   → Wrote 10 files, exit 0
node skills/mascot/scripts/validate-frames.mjs skills/mascot/scripts/packs/duck.mjs           → PASS — 0 problem(s), exit 0
```

The bare command now detects no committed frames and validates a fresh render — the
`validate-frames.mjs:62` outDir default is fixed by #7 (`a9ab92d`). The round-2 gate
exit 2 no longer reproduces.

## Local tests (Reviewer re-runs)

```
bash docs/super-board/runs/issue-5-qa-v2/verify-ac.sh
```
→ 8 passed, 0 failed, exit 0.

## Test gaps (carried from v1, unchanged)

AC2 and AC4 are point-in-time machine/cross-repo assertions (local main parity; dayli
issue state) — not automatable as committed tests without CI this repo does not have.
No High gaps; nothing blocks.

## Screenshots

Not captured — intentionally. All five ACs are git/cross-repo state checks; there is no
UI surface in this PR (docs-only diff), so there is nothing to screenshot.
