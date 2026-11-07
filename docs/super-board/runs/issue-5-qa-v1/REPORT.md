# QA report — mascots#5 · 🔧 [chore] mascots: shelve 48px class, adopt smooth-art ADR · v1

Tester lane, super-board qa card. Ran against PR #6 head `7482786`
(branch `issue-5-shelve-48px-class-adopt-smooth-art-adr`) on 2026-11-07.
Worktree `.claude/worktrees/issue-5-qa/`; evidence in this folder.

**Verdict: PASS — 5/5 AC verified. One pre-existing infra finding filed separately (F1).**

| AC | Check (exact command) | Result |
|---|---|---|
| AC1 `wip/48px-class` on remote w/ all 4 commits | `git ls-remote origin refs/heads/wip/48px-class` → `325087d…`; `git rev-list --count 52cfe78..325087d` → `4`; `git log --format='%h %s' 52cfe78..325087d` → the 4 subjects named in the ticket (11a120c engine tokens, 1e474d6 style guide+scaffolder+CI, 555afe3 framework-agnostic contract, 325087d duck48 WIP) | ✅ PASS · `ac1-wip-branch.txt` |
| AC2 local main == origin/main | `git rev-list --count --left-right main...origin/main` → `0 0`; `git rev-parse main origin/main` → both `52cfe78f4f96…` | ✅ PASS · `ac2-main-parity.txt` |
| AC3 ADR committed on mascots main | `git cat-file -e HEAD:docs/adr/0001-smooth-art-over-pixel-art.md` → exists at PR head `7482786`; PR #6 squash merge lands it on `main`. Local `main` does not contain it yet (`0 0` parity at `52cfe78` precedes the ADR commit) — the commit reaches `main` at the Reviewer's merge, per the ticket's own Fix ("commit the already-written ADR … to `main`") being delivered by this PR | ✅ PASS · `ac3-ac5-adr-diff.txt` |
| AC4 dayli #30 closed w/ supersede pointer | `issue view 30 -R DayliTracker/dayli-step-tracker --json state` → `CLOSED`; comment `6666322726` (2026-11-05): "the smooth-art duck shipped directly via #45/PR #46 (squash dbe1d3f) … shelved in the mascots repo (see #37, mascots ADR 0001). Closing as superseded." — points at the smooth-pack chain | ✅ PASS · quoted in full below |
| AC5 dayli pixel duck untouched | `git diff --name-only 52cfe78..HEAD` → `docs/adr/0001-smooth-art-over-pixel-art.md` only; `git diff --quiet 52cfe78..HEAD -- skills/mascot/scripts/packs/duck.mjs skills/mascot/scripts/engine.mjs` → clean. PR metadata: changedFiles=1, +27/−0 | ✅ PASS · `ac3-ac5-adr-diff.txt` |

Re-runnable subset: `bash docs/super-board/runs/issue-5-qa-v1/verify-ac.sh` → 6/6 PASS (`verify-ac-run.log`).

## Local tests (duck verify, AGENTS.md contract)

```
node skills/mascot/scripts/engine.mjs skills/mascot/scripts/packs/duck.mjs --out /tmp/check
node skills/mascot/scripts/validate-frames.mjs skills/mascot/scripts/packs/duck.mjs --out /tmp/check
```
→ `PASS — 0 problem(s)`, exit 0; determinism re-render byte-compare ✓ (`verify-commands.txt`).

## F1 — pre-existing infra finding (not an AC failure, not a PR regression)

`config.verify_commands[1]` verbatim (`node skills/mascot/scripts/validate-frames.mjs skills/mascot/scripts/packs/duck.mjs`, bare, no `--out`) **fails on any fresh checkout**: `FAIL — 20 problem(s)`, exit 1 (`verify-commands-bare-fail.txt`). Root cause: `validate-frames.mjs:62` defaults `outDir` to the pack directory and no frame PNGs are committed there (`git ls-tree 52cfe78 skills/mascot/scripts/packs/` → `duck.mjs` only) — identical on `origin/main`, so the defect predates this PR. Effect: the merge gate (`super-board-merge-gate.sh:279-286`) exits 2 ("stale — rebase pass") on every merge attempt of every PR in this repo; a rebase cannot fix it. Filed as follow-up bug issue (see handoff comment for the number); the builder flagged the same condition in the PR risk block.

## Test-gap check (per super-qa "Test gaps")

| AC | Unit | Component | e2e | Edge cases hunted |
|---|---|---|---|---|
| AC1 | ✅ `verify-ac.sh` (tip sha, count=4) | — | remote state via ls-remote | force-push / GC of the wip branch would flip tip/count checks |
| AC2 | machine-local state — no automatable committed test; parity is point-in-time on this Mac | — | — | drift reappears the moment anyone commits on local main; a `git fetch && count` guard could run in CI but this repo has no CI yet |
| AC3 | ✅ `verify-ac.sh` (blob exists at HEAD) | — | — | squash-merge rewrites the sha — the check pins branch state, not the future main sha |
| AC4 | cross-repo state — API check captured in evidence, not automatable here | — | — | comment deletion/re-edit would drop the pointer |
| AC5 | ✅ `verify-ac.sh` (diff isolation, pack byte-compare) | — | — | n/a — diff-scoped |

High gaps needing app-code changes: none. Medium/Low (not written, by design): AC2/AC4 are environment or cross-repo assertions — automating them would need CI this repo does not have; recorded here instead.

## Raw dayli #30 supersede comment (AC4 evidence)

> **[orchestrator]** Superseded (2026-11-06): the smooth-art duck shipped directly via #45/PR #46 (squash dbe1d3f) under the prototype-parity directive — the app now renders the smooth frame set, and the 48px pixel class this ticket pointed at is shelved in the mascots repo (see #37, mascots ADR 0001). Closing as superseded.
