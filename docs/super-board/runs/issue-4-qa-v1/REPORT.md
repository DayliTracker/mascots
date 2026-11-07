# issue-4 QA v1 — smooth-pack engine, SVG → PNG frames (PR #10 @ 35e879e)

Date: 2026-11-07 · Tester lane · worktree `.claude/worktrees/issue-4-qa` · branch `issue-4-smooth-pack-engine`

## Verdict: PASS — 5/5 AC verified, card moves QA → Review

## Checks run (all executed this session, worktree root)

| AC | Check | Command | Result |
|---|---|---|---|
| 1 | 7 contract frames render as PNGs | `node skills/mascot/scripts/smooth-engine.mjs skills/mascot/scripts/packs/smooth-duck.mjs --out <dir>` + `node /tmp/qa4-verify.mjs <dir>` | ✅ 9 files; manifest in contract order idle, blink, look, walk_a, walk_b, happy, surprised; every frame 512×512; all 7 pairwise byte-distinct (`ac1-render-verify.txt`) |
| 2 | regeneration byte-for-byte identical | two independent renders, `diff -r` + `sha256` | ✅ all 9 files identical (`ac2-byte-identity.txt`); validator determinism gate also ✅; manifest has no timestamps |
| 3 | adapted validator passes | `node skills/mascot/scripts/validate-smooth-frames.mjs skills/mascot/scripts/packs/smooth-duck.mjs` (fresh-render mode) and `… --out <render>` | ✅ PASS — 0 problem(s), exit 0, both forms (`ac3-validator-bare.txt`, `ac3-validator-outdir.txt`) |
| 3 | gate can actually fail (test-the-tests) | mutated pack: stray 6px blob at (492,492) outside union silhouette → validator | ✅ FAIL — 7 problem(s), exit 1; all frames flagged "opaque pixels outside the silhouette" (`ac3-mutation-fail.txt`) |
| 4 | contact sheet emitted for art review | `file contact_sheet.png` + visual review of the sheet | ✅ 1751×281 RGBA, matches manifest `sheet` dims; art verdict: pass (below) |
| 5 | no consuming-app dependency | `package.json` + repo-wide grep | ✅ `@resvg/resvg-js: "2.6.2"` exact-pinned in `devDependencies` only, `dependencies` key absent; no `package.json` under `skills/` or `examples/`; `@resvg` referenced only by build-time scripts `smooth-engine.mjs` / `validate-smooth-frames.mjs`; shipping pixel scripts import node builtins only (`ac5-dependency-surface.txt`) |
| reg | pixel duck untouched (AGENTS.md guard) | config `verify_commands`: `node skills/mascot/scripts/engine.mjs skills/mascot/scripts/packs/duck.mjs --out <dir>` and `node skills/mascot/scripts/validate-frames.mjs skills/mascot/scripts/packs/duck.mjs` | ✅ PASS — 0 problem(s); duck render byte-identical between branch and `origin/main`, all 10 files (`regression-duck-verify.txt`, `regression-duck-byte-identity.txt`) |

## Art review (AC4 — QA's call, per builder handoff)

Sheet read left→right as idle, blink, look, walk_a, walk_b, happy, surprised: consistent chibi
duckling (egg body, two-tone shading, mint scarf + tail knot, blush, tuft), all 7 states
distinguishable at sheet scale — blink arcs, 16px side-glance, alternating walk feet, wings-up
smile, wide-eyed open-bill surprise. First-cut-but-complete bar met. Pass.

## Test-gap check

- Ledger: every AC maps to an asserting gate or command above; no AC without an observable check.
- Edge cases exercised: fresh checkout (packs dir ships 0 PNGs — bare validator self-renders),
  determinism across two dirs, manifest-vs-pack frame order, pairwise-distinct frames,
  alpha-gate red path (mutation).
- High gaps: none. Medium/Low (handoff notes, not blocking):
  - Low: the builder's recorded `Local tests:` command pins `--out /tmp/smooth-duck-v1`, which
    fails spuriously on a machine where that dir does not exist (file-presence checks fail). The
    portable gate is the bare form — recorded below as the command the Reviewer reruns.
  - Low (pre-existing on `main`, out of scope): both engines' CLI guard silently no-ops when the
    script itself is invoked through a symlinked path (macOS `/tmp` → `/private/tmp`);
    `resolve(process.argv[1])` ≠ `import.meta.url`. Hit while rendering the archived main tree;
    worked around with real paths.

## Evidence

This directory. Visual embeds in the PR/issue comments use raw URLs pinned to the commit that
added these files. Not a web UI — standard-viewport screenshots do not apply; the contact sheet
and frame PNGs are the visual evidence.
