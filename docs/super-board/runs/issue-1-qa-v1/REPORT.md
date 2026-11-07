# QA report — issue #1 · PR #13 · v1

- Card: 📝 [docs] mascots: /mascot skill goes dual-mode
- Branch: `issue-1-mascot-skill-dual-mode` · head `23e35a095340a58507765d02b0e1a9b61b541fe7`
- Base: `origin/main` at `00fbe5d`
- Worktree: `.claude/worktrees/issue-1-qa/`
- Result: **PASS — 5/5 AC**
- Test-gap test added: `skills/mascot/scripts/test-new-pack.mjs` (18 checks, red-green proven)

## AC1 — SKILL.md documents the smooth-pack pipeline and when to choose each pack kind

- `skills/mascot/SKILL.md:15-32` — "Pack kinds — pick one first": pixel vs smooth table
  with engines, validators, reference packs, and a "Choose when" row (smooth = flagship
  default per ADR 0001; pixel when the app must regenerate art or the retro look is wanted).
- `skills/mascot/SKILL.md:42-69` — Pipeline steps 2/4/5 dual-mode: per-kind vendor paths,
  per-kind engine command, per-kind validator ("the kind's validator must PASS").
- `skills/mascot/SKILL.md:80-86` — Reference routing rows for smooth rendering, smooth
  craft, smooth validator rules + contact-sheet knobs.
- Frontmatter `SKILL.md:3` — description names both pack kinds.
- Evidence: read-based content check (no runtime surface).

## AC2 — references cover smooth-specific craft (SVG authoring) and QA (validator rules, contact sheets)

- `references/craft.md:62-90` — "Smooth craft — SVG authoring": parametric shapes,
  NEVER `<text>` (font metrics break byte-identity), two-tone clipped shading, alpha gate
  as the outline discipline, registration ≥200 px.
- `references/qa.md:1-8` — vision loop and three gates apply to BOTH kinds.
- `references/qa.md:27-28` — smooth contact sheets + `sheet: { bg, scale, gap, pad }` knobs.
- `references/qa.md:33-47` — smooth Gate 2: all 7 `validate-smooth-frames.mjs` checks
  (files, manifest, dimensions, alpha, silhouette, registration, determinism).
- `references/pipeline.md:112-153` — smooth app-side layout (app gets PNG frames +
  manifest.json), scaffolder line, engine/validator commands.
- `references/animal-recipes.md`, `references/app-integration.md` — recipes and PixelPet
  wiring cover both kinds (smooth ships the same PNG frames).
- Evidence: read-based content check.

## AC3 — the pack scaffolder offers smooth packs

Run in the QA worktree, `skills/mascot/scripts/` (logs in `logs/`):

| Test | Command | Exit | Result |
|---|---|---|---|
| scaffold `--kind smooth` | `node new-pack.mjs qa-smooth --kind smooth` | 0 | PASS (`t3-scaffold.log`) |
| scaffold default kind | `node new-pack.mjs qa-default` | 0 | PASS — file contains `kind: 'smooth'` |
| scaffold `--kind pixel` | `node new-pack.mjs qa-pixel --kind pixel` | 0 | PASS |
| render smooth starter | `node smooth-engine.mjs packs/qa-smooth.mjs --out /tmp/qa-render-smooth` | 0 | PASS — 9 files |
| validate smooth starter as-is | `node validate-smooth-frames.mjs packs/qa-smooth.mjs` | 0 | **PASS — 0 problems** (7/7 checks) |
| render pixel starter | `node engine.mjs packs/qa-pixel.mjs --out /tmp/qa-render-pixel` | 0 | PASS — 10 files |
| validate pixel starter as-is | `node validate-frames.mjs packs/qa-pixel.mjs` | 0 | **PASS — 0 problems** |
| validate default-kind pack | `node validate-smooth-frames.mjs packs/qa-default.mjs` | 0 | PASS — 0 problems |
| invalid name | `node new-pack.mjs "Bad Name"` | 2 | PASS (`t3-edge.log`) |
| taken name | `node new-pack.mjs qa-smooth` (again) | 1 | PASS |
| unknown kind | `node new-pack.mjs qa-x --kind bogus` | 2 | PASS |
| determinism | same name scaffolded in two fresh dirs | — | sha256 `f2355955…` identical |

Smooth validator output: files ✓ manifest ✓ (pinned `@resvg/resvg-js@2.6.2`) dimensions+alpha ✓
registration (1744–4788 px differ from idle) ✓ determinism byte-for-byte ✓ — `t3-smooth-validate.log`.

## AC4 — the pixel-pack path is unchanged and still documented

- `git diff origin/main...HEAD -- skills/mascot/scripts/engine.mjs skills/mascot/scripts/validate-frames.mjs skills/mascot/scripts/packs/` → **0 bytes** (`t4-duck-branch.log`).
- Config verify_commands on the branch:
  - `node skills/mascot/scripts/engine.mjs skills/mascot/scripts/packs/duck.mjs --out /tmp/check-branch` → exit 0, 10 files
  - `node skills/mascot/scripts/validate-frames.mjs skills/mascot/scripts/packs/duck.mjs` → **PASS — 0 problem(s)**
- Byte-identical vs origin/main (rendered from a detached `origin/main` worktree at `00fbe5d`):
  all 9 duck frame + particle PNGs **IDENTICAL** (sha256 compare, contact sheet excluded;
  the contact sheets were also identical: `188ce742…`). `t4-byte-identical.log`.
- Pixel path still documented: SKILL.md Pack kinds table + pipeline keep the pixel vendor/
  engine/validator steps; `references/pipeline.md` retains the pixel sections.

## AC5 — NEVERs updated: art is code spans pixel maps and SVG; AI image generation stays excluded

- `skills/mascot/SKILL.md:92-94` — "NEVER generate the art with image-gen AI — the art is
  code in BOTH kinds: hand-written pixel maps and hand-authored SVG."
- `skills/mascot/SKILL.md:95-98` — runtime-dependency NEVER scoped: pixel engine uses only
  `node:` builtins; the smooth rasterizer is build-time, exact-pinned, never ships.
- `skills/mascot/SKILL.md:99-103` — regenerate + revalidate with the kind's validator; art
  lives in packs (pixel maps or SVG functions).

## Test-gap check (issue-scoped)

- AC1/AC2/AC5 are doc-content ACs — the observable test is content inspection (read +
  grep), recorded above; no runtime surface to unit-test.
- AC3 had no committed regression test at any rung — High gap → closed this run with
  `skills/mascot/scripts/test-new-pack.mjs` (repo's black-box convention, zero-dep core):
  kind selection (default smooth), refusals (2/1/2 exits), per-name determinism,
  pixel starter render+validate roundtrip, smooth starter render+validate roundtrip
  (runs when `@resvg/resvg-js` is installed; reports a skip otherwise).
  - First full run: PASS 18/18 (`t6-test-new-pack.log`).
  - Mutation check: default kind flipped to `pixel` → **FAIL 15/18, exit 1**
    (`t6-mutant.log`); restored → PASS 18/18, exit 0 (`t6-restored.log`).
- Edge cases pinned: invalid/taken names, unknown kind, missing name, determinism,
  different-name-different-output.
- No auth/money/security/data-loss surface in this diff. Medium/Low gaps: none blocking.

## Notes for the Reviewer

- Local tests: `node skills/mascot/scripts/test-new-pack.mjs` (from repo root; run
  `npm ci` first for the smooth roundtrip) plus the two config `verify_commands`.
- The scaffolder writes `packs/<animal>.mjs` next to itself; QA's throwaway packs were
  deleted before commit — `packs/` on the branch contains only `duck.mjs` + `smooth-duck.mjs`.
- `node_modules/` was installed in the QA worktree via `npm ci` (not committed).
