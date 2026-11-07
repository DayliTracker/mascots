# QA v3 report — issue #4 smooth-pack engine (rebuild-1 verification pass)

Head under test: `62a4090` (branch `issue-4-smooth-pack-engine`, PR #10).
Rebuild 1 changed only `skills/mascot/references/pipeline.md` (+5/−2 — the R1
byte-identity wording). Code is unchanged since QA v2 verified `fc21719`; this
pass re-ran every AC first-hand on the new head in a fresh worktree
(`.claude/worktrees/issue-4-qa`), plus the R1 fix check.

Setup: `npm ci` — `@resvg/resvg-js@2.6.2` installed from the pinned lockfile.

| AC | Result | Evidence |
|---|---|---|
| 1 · 7 contract frames as PNGs | ✅ render-a: 9 files; manifest order idle, blink, look, walk_a, walk_b, happy, surprised; every frame 512×512 (PNG IHDR); 21/21 pairwise byte-distinct | `ac1-render-verify.txt` |
| 2 · regeneration byte-for-byte identical | ✅ two independent renders (render-a, render-b): `diff -r` empty, sha256 identical on all 9 files; manifest carries no timestamps | `ac2-byte-identity.txt` |
| 3 · adapted validator passes | ✅ `--out` form PASS — 0 problem(s), exit 0; bare fresh-checkout form PASS — 0 problem(s), exit 0. Red path: stray `<circle cx="16" cy="16" r="14">` outside the union silhouette → FAIL — 7 problem(s) (648 opaque px outside silhouette on all 7 frames), exit 1 | `ac3-validator-outdir.txt`, `ac3-validator-bare.txt`, `ac3-mutation-fail.txt` |
| 4 · contact sheet emitted | ✅ fresh sheet 1751×281 matches manifest; committed `docs/demo/smooth-duck-contact-sheet.png` byte-identical to a fresh render (same sha256). Art verdict: pass — consistent chibi duckling, all 7 states distinguishable at sheet scale | `ac4-contact-sheet.txt`, `ac4-contact-sheet.png` |
| 5 · no consuming-app dependency | ✅ `@resvg/resvg-js` `2.6.2` exact-pinned in `devDependencies` only (`dependencies` key absent); no `package.json` under `skills/` or `examples/`; the only `@resvg` import is `smooth-engine.mjs:27` (build-time script) | `ac5-dependency-surface.txt` |
| R1 fix (reviewer bounce round 2) | ✅ `pipeline.md:100-106` states proven-vs-design (same-machine proven; cross-machine rests on the exact pin + no `<text>` + no system fonts + no timestamps); overclaim wording gone from the branch tree; PR body carries the same statement | `r1-fix-verified.txt` |
| regression · pixel duck untouched | ✅ config verify_commands PASS (engine 10 files, validator PASS — 0 problem(s)); duck render byte-identical between branch and `origin/main`, all 10 files | `regression-duck-verify.txt`, `regression-duck-byte-identity.txt` |

`render-a/` and `render-b/` are kept in full as the byte-identity evidence.

Test-gap ledger (unchanged from v1/v2; scope = full branch diff vs `main`):
every AC has asserting build-level evidence produced by this suite; no High
gap is new in rebuild 1 (the only diff vs the v2-verified head is docs wording).
Low observation (pre-existing on `main`, outside this PR's diff):
`skills/mascot/scripts/engine.mjs:236` — the CLI guard
`resolve(process.argv[1]) === import.meta.url.replace('file://','')` never
matches when the engine is launched via `/tmp/...` on macOS (node
canonicalizes `import.meta.url` to `/private/tmp`), so the CLI silently
exits 0 without rendering. Proven while running the regression against the
extracted `origin/main` tree; file a follow-up if smooth packs or CI ever
invoke the pixel engine from a symlinked path.

Local tests: node skills/mascot/scripts/validate-smooth-frames.mjs skills/mascot/scripts/packs/smooth-duck.mjs
