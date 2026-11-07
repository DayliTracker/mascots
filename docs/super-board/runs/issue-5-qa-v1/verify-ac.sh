#!/usr/bin/env bash
# verify-ac.sh — issue-scoped, re-runnable checks for DayliTracker/mascots#5.
#
# Covers the checkout-local ACs of the qa card:
#   AC1  wip/48px-class exists on the remote and holds the 4 stranded commits
#   AC3  docs/adr/0001-smooth-art-over-pixel-art.md is committed on the issue branch
#   AC5  the branch diff touches nothing but the ADR (duck pack + engine untouched)
# AC2 (local main == origin/main) and AC4 (dayli #30 closed with supersede
# comment) are machine-local / cross-repo state — see REPORT.md evidence, they
# cannot be asserted from a checkout.
#
# Usage: bash docs/super-board/runs/issue-5-qa-v1/verify-ac.sh
set -uo pipefail

BASE=52cfe78f4f96d1ab1d7ec279042b33e9d4abffaf   # origin/main at QA time
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
COUNT=$(git rev-list --count "$BASE..$WIP_SHA" 2>/dev/null || echo "?")
if [ "$COUNT" = "$EXPECTED_COUNT" ]; then
  ok "AC1 branch contains all $EXPECTED_COUNT stranded commits past $BASE"
else
  bad "AC1 rev-list count $COUNT != expected $EXPECTED_COUNT"
fi

# --- AC3 -------------------------------------------------------------------
if git cat-file -e HEAD:docs/adr/0001-smooth-art-over-pixel-art.md 2>/dev/null; then
  ok "AC3 ADR 0001 committed at HEAD ($(git rev-parse --short HEAD)) — lands on main at squash merge"
else
  bad "AC3 ADR 0001 missing at HEAD"
fi

# --- AC5 -------------------------------------------------------------------
FILES=$(git diff --name-only "$BASE..HEAD")
if [ "$FILES" = "docs/adr/0001-smooth-art-over-pixel-art.md" ]; then
  ok "AC5 branch diff touches only the ADR"
else
  bad "AC5 branch diff is not ADR-only: $FILES"
fi
if git diff --quiet "$BASE..HEAD" -- skills/mascot/scripts/packs/duck.mjs skills/mascot/scripts/engine.mjs; then
  ok "AC5 duck pack + engine byte-identical to $BASE"
else
  bad "AC5 duck pack or engine changed on this branch"
fi

echo "---"
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
