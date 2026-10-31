---
name: mascot
description: "Create an original animated pixel-art mascot (any animal) in any app — React Native, web, Flutter, or a game engine: a zero-dependency pixel-map engine generates sprite-frame PNGs plus a manifest, poses change by frame swap, soft motion runs on the platform's own transform primitives, and every state is verified in the running app. Use when the user runs /mascot [animal], or asks for a mascot, pixel pet, pixel-art character, sprite, avatar, idle animation, waddle, or cute app character."
---

# Mascot

Create ONE original animated pixel-art mascot in the current app. The art is
code: pixel maps rendered to PNG by a zero-dependency engine (no image-gen AI,
no npm installs). The skill delivers frames + a manifest; the app animates
them with its own primitives (frame swaps on timers, bob/tilt/squash as
transforms). Every generation is deterministic — regenerating a pack
reproduces its PNGs byte-for-byte.

## Delivery (the contract)

`<app>/assets/mascots/<animal>/` receives: 7 frames
(`<animal>_idle|blink|look|walk_a|walk_b|happy|surprised.png`),
`particle_star.png` / `particle_heart.png` when the pack declares them,
`manifest.json` (name, grid, scale, frame/particle file map), and
`contact_sheet.png`. Timing defaults any animator should use:
`references/craft.md`. Animator contract: `references/app-integration.md`.

## Pipeline

1. **Interview** — animal from `$ARGUMENTS`, else ask (suggest: cat, bunny,
   panda, frog, fox — any animal works). Then ask the mascot's name. Then one
   prompt: "Defaults: palette from `assets/palettes.json` (cozy/DB16), one
   small accessory, full 7-frame state set. Any overrides?" Apply overrides;
   otherwise proceed. Only ask what is missing.
2. **Vendor** — copy `scripts/engine.mjs`, `scripts/validate-frames.mjs`,
   `assets/palettes.json` into `<app>/scripts/mascots/`. The build scripts and
   generated PNGs live in the app repo, diffable and regenerable without this
   skill. Details: `references/pipeline.md`.
3. **Design the pack** — write `scripts/mascots/packs/<animal>.mjs` following
   `references/animal-recipes.md` (construction) and `references/craft.md`
   (palette, outline, timing). Study `scripts/packs/duck.mjs` first — it is
   the reference implementation.
4. **GATE 1 · art** — generate (`node scripts/mascots/engine.mjs
   scripts/mascots/packs/<animal>.mjs --out <app>/assets/mascots/<animal>`).
   Self-critique the contact sheet against the checklist in
   `references/qa.md` and run at least 2 polish passes BEFORE showing the
   user. Then show the sheet path and wait for the user's "cute enough".
   Do not write animator code before this verdict.
5. **GATE 2 · motion** — `node scripts/mascots/validate-frames.mjs` must PASS.
   Then build an inline HTML preview of the animation (port the frames to a
   canvas; timings from `references/craft.md`) and get the user's timing
   approval before touching the app.
6. **GATE 3 · app** — write the animator in the app's own framework (frame
   swaps + transforms; the mood-machine contract is
   `references/app-integration.md`), typecheck, run, drive every state, save
   per-state screenshots to `<app>/docs/mascots/<animal>/qa/`. Protocol:
   `references/qa.md`.
7. **Report** — evidence links (contact sheet, QA screenshots), the regen
   command, and which files were added/changed.

## Reference routing

| When | Read |
|---|---|
| First run in an app, pack anatomy, engine/validator CLI | `references/pipeline.md` |
| Drawing the animal (ears, tails, silhouettes) | `references/animal-recipes.md` |
| Palettes, outlines, shading, animation timing | `references/craft.md` |
| Reviewing art, polish passes, in-app QA, evidence | `references/qa.md` |
| The animator contract, mood machine, per-framework notes | `references/app-integration.md` |

## NEVER

- NEVER ship art without the user's explicit "cute enough" — polish passes
  before that verdict are yours to run unattended; the verdict is not.
- NEVER add a dependency — the engine uses only `node:` builtins, and the
  animator uses the app's existing primitives. If something seems to need a
  library, redesign.
- NEVER hand-edit generated PNGs — change the pack, regenerate, revalidate.
- NEVER put pixel art in the animator — animators swap frames; all art lives
  in packs.
- NEVER claim QA done without per-state screenshots saved on disk (wherever
  the platform can capture them).
