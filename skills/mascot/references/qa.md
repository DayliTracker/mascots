# QA — polish passes, gates, simulator evidence

The vision critique loop and the three gates apply to BOTH pack kinds; the
validator command and the sheet knobs differ. Pixel sections below cite
`validate-frames.mjs`; "Smooth packs" cites `validate-smooth-frames.mjs`.

## The vision critique loop (run before Gate 1, unattended)

View the generated `contact_sheet.png` (Read tool renders images) and check,
per frame AND across the sheet:

1. **Silhouette**: each frame reads as the animal at thumbnail size.
2. **Outline**: continuous 1px, no double-thick spots, no gaps, not black.
3. **Eyes**: glint present, both eyes symmetric, blink is a clean lid line.
4. **Mouth/beak**: centered between the eyes, no collision with eye pixels.
5. **Shading**: one consistent light direction; no pillow shading; shade
   regions are contiguous clusters.
6. **Accessory**: reads as the thing it is (scarf ≠ sash) and doesn't collide
   with face/feet.
7. **Registration**: blink/look differ from idle ONLY where intended.
8. **Particles**: readable at small size, palette-locked.

Fix → regenerate → recheck. Minimum 2 critique-fix passes before showing the
user. Then Gate 1: show the sheet path, name what you fixed, ask "cute
enough?" — and WAIT. Ship nothing until the verdict.

Smooth contact sheets come from the same loop: `smooth-engine.mjs` writes
`contact_sheet.png` next to the frames. Sheet look is a pack knob —
`sheet: { bg, scale, gap, pad }` (smooth-duck: `#FAF3E6`, 0.44, 20, 28).
Bump `scale` if faces are too small to critique; the sheet is evidence, the
frames are the product.

## Gate 2 — motion

- Pixel: `node scripts/mascots/validate-frames.mjs ...` must PASS (paste the
  output). Smooth: `node scripts/validate-smooth-frames.mjs ...` must PASS
  (`npm ci` first — pinned rasterizer, repo-side). Checks it runs on a smooth
  pack (ADR 0001):
  1. files — every frame + `contact_sheet.png` + `manifest.json` exists
  2. manifest — names the pack, canvas, all frames in pack order, pinned
     rasterizer version
  3. dimensions — every frame PNG is the pack's square canvas
  4. alpha — every opaque pixel lies inside the pack's `silhouette()` union
     mask (no stray pixels or anti-aliasing artifacts outside the character)
  5. silhouette — every frame has a substantial opaque body
  6. registration — every frame differs from the base frame by ≥200 px (same
     character, not a duplicate render)
  7. determinism — re-rendering reproduces every file byte-for-byte
- Build an inline HTML preview: embed the pack's pixel maps in a canvas (or
  the smooth frames as data-URL PNGs), port the component's timings (idle bob
  2.2s, blink random, walk 180ms swap ±4° tilt, celebrate hop+squash, poke
  550ms) and let the user click through states. Timing changes go into BOTH
  the preview and the component.

## Gate 3 — device (iOS simulator protocol)

```bash
npm run typecheck            # or tsc --noEmit
npx expo run:ios             # stays attached streaming logs after launch
```

Tapping (the plugin's UI tools may report "idb not on PATH" even when idb is
installed — call idb directly):

```bash
export PATH="/opt/homebrew/bin:$PATH"
UDID=$(xcrun simctl list devices booted | grep -oE '[A-F0-9-]{36}' | head -1)
idb ui describe-all --udid $UDID      # exact element frames, in points
idb ui tap <x> <y> --udid $UDID
xcrun simctl io booted screenshot shot.png
```

Capture each state: idle, walk (tap a progress control; screenshot within the
2.6s walk window), celebrate (cross the goal), poke (tap the mascot; the
surprised frame lasts 550ms — screenshot immediately, retry with shorter sleep
if missed). Save to `<app>/docs/mascots/<animal>/qa/` with state names, and
commit them as the QA record.

## Evidence layout

```
docs/mascots/<animal>/
├── contact-sheet.png      # copy of the approved Gate 1 sheet
└── qa/
    ├── idle.png  walk.png  celebrate.png  poke.png
```

## Pitfalls

- Capture screenshots to `/tmp` and COPY them into `docs/mascots/<animal>/qa/`
  afterwards — writing new files inside the project while Metro watches it can
  trigger a dev reload mid-QA, which resets app state and eats taps (symptom:
  a blue "Refreshing…" banner and counters that don't add up).
- Space taps ≥0.8s apart and re-screenshot to verify each counter before the
  next state; a missed tap makes the state capture worthless.
- Two checkouts of an app (e.g. a worktree) installing the same bundle id
  fight over the simulator — last `expo run:ios` install wins. Rebuild from
  the repo you think you're testing.
- `expo run:ios` stays alive after launch (it is not hung); pipe its output
  to a file, not through `tail`, or you'll see nothing until it exits.
- Screenshot latency is ~300–500ms; the surprised state may need retries.
- Metro asset `require()` paths must be literal strings (no template
  literals) and are relative to the importing file — `components/pets.ts`
  uses `../assets/mascots/<animal>/...`.
