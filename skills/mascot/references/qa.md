# QA — polish passes, gates, simulator evidence

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

## Gate 2 — motion

- `node scripts/mascots/validate-frames.mjs ...` must PASS (paste the output).
- Build an inline HTML preview: embed the pack's pixel maps in a canvas, port
  the component's timings (idle bob 2.2s, blink random, walk 180ms swap ±4°
  tilt, celebrate hop+squash, poke 550ms) and let the user click through
  states. Timing changes go into BOTH the preview and the component.

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
