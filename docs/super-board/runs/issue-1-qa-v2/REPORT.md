# QA v2 — issue #1 /mascot skill goes dual-mode · PR #13

Head under test: `6c14e09` (build `23e35a0` + QA v1 suite). QA v1 (v1 report in
`runs/issue-1-qa-v1/`) already passed 5/5; this round re-proves it independently
and adds: a doc-conformance rung for the docs ACs, one scaffolder edge the v1
suite missed, and fresh pixel-path byte-identity evidence. Card came back to the
QA lane with `loop:rebuild-1`; no reviewer findings exist on the PR (no
`[qa]`/`[builder]` threads, no CHANGES_REQUESTED — the 9 inline comments are
PR author notes), so this pass re-tests what is there.

## Verdict: PASS — 5/5 AC

## AC → proof

| AC | Proof (this run) |
|---|---|
| 1. SKILL.md documents the smooth-pack pipeline and when to choose each kind | `test-dual-mode-docs.mjs` AC1 block 5/5 (kind-choice table w/ "Choose when", smooth engine + PNG-frames pipeline, pixel engine + validator, `--kind smooth|pixel`, pipeline.md smooth layout) · manual read of `skills/mascot/SKILL.md:15-74` |
| 2. References cover smooth craft (SVG authoring) and QA (validator rules, contact sheets) | `test-dual-mode-docs.mjs` AC2 block 7/7 (craft.md "Smooth craft — SVG authoring", `<text>` ban, alpha gate, pixel sections retained; qa.md smooth validator checks + `sheet: { bg, scale, gap, pad }` knobs; recipes "BOTH pack kinds") · `references/qa.md:33-53` lists all 7 smooth validator checks |
| 3. The pack scaffolder offers smooth packs | `test-new-pack.mjs` 19/19: default kind smooth, `--kind smooth|pixel` both scaffold, both starters render + PASS their validator as-is (`logs/t5-*.log`), refusals (missing name/invalid/taken/bad kind/missing value), byte-identical re-scaffold |
| 4. Pixel-pack path unchanged and still documented | `git diff origin/main...HEAD` on `engine.mjs`, `validate-frames.mjs`, `test-validate-frames.mjs`, `packs/` = **0 bytes** (`logs/t4-pixel-path-diff.log`) · duck rendered from `origin/main` pack bytes vs branch pack: **10/10 files byte-identical** (`logs/t4-duck-byte-identical.log`) · pixel doc sections pinned by the doc checks |
| 5. NEVERs span pixel maps and SVG; image-gen stays excluded | `test-dual-mode-docs.mjs` AC5 block 4/4 ("art is code in BOTH kinds", "pixel maps" + "hand-authored SVG", "image-gen AI", scaffolder header "no image generation") · `SKILL.md:92-94` |

## Red-green (new tests seen to fail)

| Mutant (never committed) | Result | Log |
|---|---|---|
| SKILL.md NEVER line → "art is code in smooth kinds only" | doc test FAIL 15/16, exit 1 | `logs/t3-docs-mutant-red.log` |
| new-pack.mjs missing `--kind` value silently defaults to smooth | suite FAIL 18/19 — exactly `✗ missing --kind value exits 2 — exit 0, want 2` | `logs/t3-scaffold-mutant-red.log` |

Restored → 19/19 + 16/16 green (`logs/t1-test-new-pack.log`, `logs/t2-docs-green.log`).

An earlier, blunter mutant (`argv[kindIdx+1] || 'smooth'`) also went red but
crashed the suite on an earlier check via an unguarded `readFileSync`; the guard
at `test-new-pack.mjs:60-64` now reports cleanly instead.

## Test-gap ledger

| AC | Asserting rung |
|---|---|
| AC1 | docs: `test-dual-mode-docs.mjs` AC1 block · unit/component/e2e: n/a — docs card, no app code |
| AC2 | docs: `test-dual-mode-docs.mjs` AC2 block · others n/a |
| AC3 | `test-new-pack.mjs` (black-box, subprocess-level — the rung the change lives at) |
| AC4 | 0-byte diff + 10/10 duck byte-identity (repo-level) + doc checks for "still documented" |
| AC5 | docs: `test-dual-mode-docs.mjs` AC5 block |

Edge cases pinned by the suite: missing name, invalid name (`Bad Name`), taken
name, unknown kind, missing `--kind` value, byte-identical re-scaffold per name,
different name/kind scaffolds differently. Money/auth/data-loss surfaces: none
(docs + scaffolder in a docs repo).

Test gaps (not written):
- Medium: the smooth half of `test-new-pack.mjs` self-skips (⊘) when
  `@resvg/resvg-js` is not installed; it is a devDependency here, so `npm ci`
  covers it, but a fresh clone without install silently shrinks the suite.
- Low: smooth alpha-gate *rejection* (a pack with pixels outside `silhouette()`
  → validator FAIL) is engine-side (card #4) and not re-tested here.

## Visual artifacts (rendered as-is, no UI surface on this card)

| Artifact | Render |
|---|---|
| Smooth starter, scaffolded as-is (7 frames) | `qa-smooth-starter-contact-sheet.png` |
| Pixel starter, scaffolded as-is (7 frames + particles) | `qa-pixel-starter-contact-sheet.png` |
| Duck, branch render — byte-identity subject | `duck-contact-sheet-branch.png` |

## Commands

```
node skills/mascot/scripts/test-new-pack.mjs        # 19/19 PASS
node skills/mascot/scripts/test-dual-mode-docs.mjs  # 16/16 PASS
git diff origin/main...HEAD -- skills/mascot/scripts/{engine,validate-frames,test-validate-frames}.mjs skills/mascot/scripts/packs/   # 0 bytes
```
