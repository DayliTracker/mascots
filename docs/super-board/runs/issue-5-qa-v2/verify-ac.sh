#!/usr/bin/env bash
# verify-ac.sh — issue-scoped, re-runnable checks for DayliTracker/mascots#5 (QA v2).
#
# v2 change (reviewer finding R1, round 2): the AC5 assertion no longer pins the
# branch diff to "the ADR only" — QA's own evidence folders make that stale by
# design (reproduced by the reviewer at v1 head 721b548: 5 passed, 1 failed).
# v2 asserts what AC5 actually claims: the shipped pixel duck and the engine are
# untouched, and the branch adds no code — every changed file stays under docs/.
#
# Covers the checkout-local ACs:
#   AC1  wip/48px-class exists on the remote and holds the 4 stranded commits
#   AC2  local main == origin/main (0 ahead, 0 behind)
#   AC3  docs/adr/0001-smooth-art-over-pixel-art.md is committed at the branch head
#   AC5  duck pack + engine byte-identical; branch diff touches no code
# AC4 (dayli #30 closed with supersede comment) is cross-repo state — captured in
# ac4-dayli-30.txt via gh, not assertable from a checkout.
#
# Usage (from any checkout of this repo): bash docs/super-board/runs/issue-5-qa-v2/verify-ac.sh
set -uo pipefail

STRAND_BASE=52cfe78f4f96d1ab1d7ec279042b33e9d4abffaf   # origin/main when the 4 commits were stranded
MERGE_BASE=a9ab92d                                      # origin/main at QA v2 time (rebase target, includes #7 fix)
EXPECTED_WIP_TIP=325087d57a43aaad00e03d28b1ae74bb5efcb831
EXPECTED_COUNT=4
pass=0; fail=0

ok()   { echo "PASS  $1"; pass=$((pass + 1)); }
bad()  { echo "FAIL  $1"; fail=$((fail + 1)); }

# --- AC1 -------------------------------------------------------------------
WIP_SHA=$(git ls-remote origin refs/heads/wip/48px-class | cut -f1)
if [ -n "$WIP_SHA" ]; then
  ok "AC1 wip/48px-class exists on remote at $WIP_SHA"
else
  bad "AC1 wip/48px-class missing from remote"
fi
if [ "$WIP_SHA" = "$EXPECTED_WIP_TIP" ]; then
  ok "AC1 branch tip is the duck48 WIP commit $EXPECTED_WIP_TIP"
else
  bad "AC1 branch tip $WIP_SHA != expected $EXPECTED_WIP_TIP"
fi
COUNT=$(git rev-list --count "$STRAND_BASE..$WIP_SHA" 2>/dev/null || echo "?")
if [ "$COUNT" = "$EXPECTED_COUNT" ]; then
  ok "AC1 branch contains all $EXPECTED_COUNT stranded commits past $STRAND_BASE"
else
  bad "AC1 rev-list count $COUNT != expected $EXPECTED_COUNT"
fi

# --- AC2 -------------------------------------------------------------------
PARITY=$(git rev-list --left-right --count main...origin/main | tr '\t' ' ')
if [ "$PARITY" = "0 0" ]; then
  ok "AC2 local main equals origin/main (0 ahead, 0 behind)"
else
  bad "AC2 main vs origin/main = $PARITY (want '0 0')"
fi
MAINSHA=$(git rev-parse main); ORIGINSHA=$(git rev-parse origin/main)
if [ "$MAINSHA" = "$ORIGINSHA" ]; then
  ok "AC2 both refs at $(git rev-parse --short main)"
else
  bad "AC2 main $MAINSHA != origin/main $ORIGINSHA"
fi

# --- AC3 -------------------------------------------------------------------
if git cat-file -e HEAD:docs/adr/0001-smooth-art-over-pixel-art.md 2>/dev/null; then
  ok "AC3 ADR 0001 committed at HEAD ($(git rev-parse --short HEAD)) — lands on main at squash merge"
else
  bad "AC3 ADR 0001 missing at HEAD"
fi

# --- AC5 (R1-fixed form) ---------------------------------------------------
if git diff --quiet "$MERGE_BASE..HEAD" -- skills/mascot/scripts/packs/duck.mjs skills/mascot/scripts/engine.mjs; then
  ok "AC5 duck pack + engine byte-identical to $MERGE_BASE"
else
  bad "AC5 duck pack or engine changed on this branch"
fi
NONDOCS=$(git diff --name-only "$MERGE_BASE..HEAD" -- . | grep -v '^docs/' || true)
if [ -z "$NONDOCS" ]; then
  ok "AC5 branch diff adds no code — every changed file is under docs/ (no dayli paths)"
else
  bad "AC5 non-docs files changed: $NONDOCS"
fi

echo "---"
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
