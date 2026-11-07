# QA report — issue #3 v1 · smooth duck Gate 1 polish

Head tested: `e5c0892b1103f7ceb6048799e47cc80d49da24d8` (PR #12 head, branch `issue-3-smooth-duck-gate1-polish-cute-verdict`).
All commands run in the QA worktree at that sha. Date: 2026-11-08 (Asia/Ho_Chi_Minh).

## Per-AC verification

- **AC1 — ≥2 polish passes documented on the issue with contact sheets before the first user review: PASS**
  - Pass 1: comment `6710386981` (2026-11-07T17:05:04Z) embeds `docs/super-board/runs/issue-3-build/pass-1-contact-sheet.png`.
  - Pass 2: comment `6710390328` (2026-11-07T17:05:18Z) embeds `docs/super-board/runs/issue-3-build/pass-2-contact-sheet.png`.
  - Both precede the first review event (Gate 1 ruling, comment `6712296293`, 2026-11-07T19:58:01Z).
  - Both PNGs exist on the branch at the tested sha; the two sheets visibly differ exactly as the pass-2 critique documents (wing side-lumps → tucked nubs; scarf tail off the wing onto the belly; outline 10 → 11).

- **AC2 — Habita references re-fetched and re-measured; only recorded relationships used: PASS**
  - `docs/super-board/runs/issue-3-build/habita-measurements.md` on the branch: re-fetch dated 2026-11-07 from get-habita.app, pixel-scan method, relationships-only table, prototype v6 mapping, per-pass applied values.
  - `grep -nE 'base64|data:image|fetch\(|https?://'` over `packs/smooth-duck.mjs` + `smooth-engine.mjs`: only SVG xmlns strings — no reference pixels, no runtime fetches.
  - Recorded constants present in the pack: outline `#5B4634`, feet `{ x: cx-27, y: cy-17, w: 54, h: 34, rx: 17 }`, tail curl at (358,307)…(405,388), scarf rotated-rect tail (44.8×68.3 r19.2 → 46×62 r20, rotate 6°).

- **AC3 — final contact sheet posted to the issue with the regen command: PASS**
  - Pass-2 comment carries both regen commands verbatim and embeds the final sheet.
  - Ran the regen twice: `smooth-engine.mjs` → 9 files; `diff -r` run1 vs run2 = byte-identical.
  - Regenerated `contact_sheet.png` is byte-identical to the committed `docs/demo/smooth-duck-contact-sheet.png` (`cmp` clean).

- **AC4 — the issue carries the user's explicit cute-enough verdict, or an explicit escalation ruling: PASS**
  - Ruling recorded on the issue: comment `6712296293` (2026-11-07T19:58:01Z), "[orchestrator] [verdict] Gate 1 cute-enough: RULED — delegated ruling recorded under the user's standing directive" — explicit ruling citing the user's standing directive (2026-11-07) and the 2026-11-05 parity precedent (dayli #45/#39); explicitly reversible (pixel duck stays default; smooth ships behind the pack switcher, #2).

## Regression checks (mascots AGENTS.md "Changing engine or pack code")

- `node skills/mascot/scripts/engine.mjs skills/mascot/scripts/packs/duck.mjs --out <dir>` at PR head and from an `origin/main` extract → `diff -r` = **10/10 output files byte-identical**.
- `node skills/mascot/scripts/validate-frames.mjs skills/mascot/scripts/packs/duck.mjs --out <dir>` → **PASS — 0 problem(s)** (incl. determinism byte-for-byte).
- `node skills/mascot/scripts/test-validate-frames.mjs` → **PASS — 8/8 checks**.

## Commands (exact, rerunnable)

```
node skills/mascot/scripts/smooth-engine.mjs skills/mascot/scripts/packs/smooth-duck.mjs --out /tmp/issue-3-qa-smooth
node skills/mascot/scripts/validate-smooth-frames.mjs skills/mascot/scripts/packs/smooth-duck.mjs --out /tmp/issue-3-qa-smooth
node skills/mascot/scripts/engine.mjs skills/mascot/scripts/packs/duck.mjs --out /tmp/issue-3-qa-pixel
node skills/mascot/scripts/validate-frames.mjs skills/mascot/scripts/packs/duck.mjs --out /tmp/issue-3-qa-pixel
node skills/mascot/scripts/test-validate-frames.mjs
```

Note for reruns: `engine.mjs:236` gates its CLI entry on `resolve(process.argv[1]) === import.meta.url.replace('file://','')`. On macOS, running a copy of the script from a symlinked path (`/tmp`, `$TMPDIR` → `/private/...`) makes the guard false and the script exits 0 silently without rendering. Run from a real (non-symlinked) path — `mktemp -d` + `cd` + `pwd -P`.

## Verdict

4/4 ACs verified. PASS → card to Review.

## Test gaps (not written)

- Low: no automated check pins the regenerated contact sheet to the committed `docs/demo` copy (byte-equality verified manually this pass; the validator's determinism check covers re-render, not the committed artifact).
- Low: cuteness itself is not machine-checkable by design — that is the Gate 1 verdict gate, resolved by the delegated ruling on the issue.
