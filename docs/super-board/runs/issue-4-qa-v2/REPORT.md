# QA v2 report — issue #4 smooth-pack engine (re-verification pass)

Head under test: `eebd150` (branch `issue-4-smooth-pack-engine`, PR #10).
This pass re-verified every AC first-hand in a fresh worktree
(`.claude/worktrees/issue-4-qa`) after the card returned to Ready; v1 evidence
from the earlier pass is at `runs/issue-4-qa-v1/` and is not counted here.

Setup: `npm ci` — `@resvg/resvg-js@2.6.2` installed from the pinned lockfile.

| AC | Result | Evidence |
|---|---|---|
| 1 · 7 contract frames as PNGs | ✅ render-a: 9 files; manifest frame order idle, blink, look, walk_a, walk_b, happy, surprised; every frame 512×512; 21/21 pairwise byte-distinct | `ac1-render-verify.txt` |
| 2 · regeneration byte-for-byte identical | ✅ two independent renders (render-a, render-b): `diff -r` empty, sha256 identical on all 9 files; manifest has no timestamps | `ac2-byte-identity.txt` |
| 3 · adapted validator passes | ✅ `--out` form PASS — 0 problem(s), exit 0; bare fresh-checkout form PASS — 0 problem(s), exit 0. Red path: injected stray `<circle>` outside the union silhouette → FAIL — 7 problem(s) (1060 opaque px outside silhouette on all 7 frames), exit 1 | `ac3-validator-outdir.txt`, `ac3-validator-bare.txt`, `ac3-mutation-fail.txt` |
| 4 · contact sheet emitted | ✅ fresh sheet 1751×281 matches manifest; committed `docs/demo/smooth-duck-contact-sheet.png` byte-identical to a fresh render. Art verdict: pass — consistent chibi duckling, all 7 states distinguishable at sheet scale | `ac4-contact-sheet.txt`, `ac4-contact-sheet.png` |
| 5 · no consuming-app dependency | ✅ `@resvg/resvg-js` `2.6.2` exact-pinned in `devDependencies` only (`dependencies` key absent); no `package.json` under `skills/` or `examples/`; `@resvg` imported only by build-time scripts `smooth-engine.mjs` / `validate-smooth-frames.mjs` | `ac5-dependency-surface.txt` |
| regression · pixel duck untouched | ✅ pixel validator PASS — 0 problem(s); duck render byte-identical between branch and `origin/main`, all 10 files | `regression-duck-byte-identity.txt` |

Red-path note (v2): the first mutation attempt failed to keep the pack module
valid, and a second attempt validated against an empty `--out` (file-missing
FAIL, not the alpha gate). The recorded `ac3-mutation-fail.txt` is the third
attempt: valid module, rendered output, alpha gate fires with
`1060 opaque pixels outside the silhouette` × 7 frames.

`render-a/` and `render-b/` are kept in full as the byte-identity evidence.

Local tests: node skills/mascot/scripts/validate-smooth-frames.mjs skills/mascot/scripts/packs/smooth-duck.mjs
