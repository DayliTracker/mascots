# Mutation check — pre-fix guard restored onto the fixed engine (not committed)

## With the pre-fix guard (red)
```
engine via an absolute path through a symlinked dir (issue #14)
  ✗ renders 10 files, exit 0 — exit 0, 0 pngs

engine via a direct absolute path (no symlink)
  ✗ renders 10 files, exit 0 — exit 0, 0 pngs

engine via a relative path from the app root (SKILL.md GATE 1)
  ✓ renders 10 files, exit 0
importing engine.mjs must not render
  ✓ exits 0, no render output

FAIL — 2/4 checks
---
documented scaffold flow (SKILL.md steps 2–5) in an app dir under a symlinked base
  ✓ GATE 1 renders 10 files, exit 0
  ✓ GATE 2 validate-frames PASS — 0 problem(s)
entry path containing a space (percent-encoded URL round-trip)
  ✗ renders 10 files, exit 0 — exit 0, 0 pngs


FAIL — 2/3 checks
```

## With the shipped guard (green, restored via git checkout)
```
PASS — 4/4 checks
PASS — 3/3 checks
```
