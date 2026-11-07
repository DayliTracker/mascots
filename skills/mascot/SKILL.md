---
name: mascot
description: "Create an original animated mascot (any animal) inside a React Native/Expo app: pick a pixel pack (zero-dependency pixel-map engine) or a smooth pack (hand-authored SVG rasterized at build time, ADR 0001 flagship), generate verified sprite-frame PNGs, and a PixelPet component animates idle/walk/celebrate/poke states screenshot-verified in the iOS simulator. Use when the user runs /mascot [animal], or asks for a mascot, pixel pet, pixel-art character, sprite, avatar, idle animation, waddle, smooth vector mascot, or cute app character."
---

# Mascot

Create ONE original animated mascot in the current app. The art is code —
pixel maps OR hand-authored SVG — rendered to PNG by a deterministic engine
(no image-gen AI, no runtime installs). Poses change by frame swap;
bob/tilt/squash run as native transforms in a `PixelPet` component. Every
generation is deterministic — regenerating a pack reproduces its PNGs
byte-for-byte.

## Pack kinds — pick one first

ADR 0001 (`docs/adr/0001-smooth-art-over-pixel-art.md`) made smooth art the
flagship style; the pixel engine stays supported for existing packs.

| | Pixel pack | Smooth pack (flagship) |
|---|---|---|
| Art | pixel maps (char rows) | hand-authored SVG per frame |
| Engine | `scripts/engine.mjs` — zero deps | `scripts/smooth-engine.mjs` — pinned build-time rasterizer |
| Renders | inside the app repo (engine is vendored) | in the mascots repo; app consumes PNG frames |
| Look | crisp retro, 1px outline | soft rounded shapes, no cell grid |
| Reference pack | `scripts/packs/duck.mjs` | `scripts/packs/smooth-duck.mjs` |
| Validator | `scripts/validate-frames.mjs` | `scripts/validate-smooth-frames.mjs` |
| Choose when | the app must regenerate art itself, or the retro look is wanted | flagship cuteness (default per ADR 0001) |

New packs scaffold with
`node scripts/new-pack.mjs <animal> [--kind smooth|pixel]` — the starter
passes the kind's validator as-is.

## Pipeline

1. **Interview** — animal from `$ARGUMENTS`, else ask (suggest: cat, bunny,
   panda, frog, fox — any animal works). Then ask the mascot's name. Then one
   prompt: "Defaults: smooth pack (flagship), palette from
   `assets/palettes.json`, one small accessory, full 7-frame state set. Any
   overrides — including pixel instead of smooth?" Apply overrides; otherwise
   proceed. Only ask what is missing.
2. **Vendor** — pixel: copy `scripts/engine.mjs`,
   `scripts/validate-frames.mjs`, `assets/palettes.json` into
   `<app>/scripts/mascots/`, and `../../react-native/PixelPet.tsx` into
   `<app>/components/`. Smooth: the pack lives in the mascots repo
   (`skills/mascot/scripts/packs/`); render there with `smooth-engine.mjs`
   (`npm ci` first — build-time rasterizer) and copy the PNG frames +
   `manifest.json` into `<app>/assets/mascots/<animal>/`. The build scripts
   and generated PNGs live in a repo, diffable and regenerable. Details:
   `references/pipeline.md`.
3. **Design the pack** — scaffold (`node "$SKILL_DIR/scripts/new-pack.mjs"
   <animal> --kind <kind>` — the scaffolder runs from the skill dir, not the
   app repo, and writes `scripts/packs/<animal>.mjs` beside itself: smooth
   packs stay in the mascots repo; for a pixel pack copy the scaffolded file
   into `<app>/scripts/mascots/packs/` before rendering), then follow
   `references/animal-recipes.md` (construction) and `references/craft.md`
   (palette, outline, timing — pixel; smooth craft: SVG authoring). Study the
   kind's reference pack first — `duck.mjs` (pixel) or `smooth-duck.mjs`
   (smooth) is the reference implementation.
4. **GATE 1 · art** — generate the kind's engine
   (`node scripts/mascots/engine.mjs scripts/mascots/packs/<animal>.mjs --out
   <app>/assets/mascots/<animal>` — or, for smooth packs,
   `node scripts/smooth-engine.mjs ...` in the mascots repo). Self-critique
   the contact sheet against the checklist in `references/qa.md` and run at
   least 2 polish passes BEFORE showing the user. Then show the sheet path
   and wait for the user's "cute enough". Do not write component code before
   this verdict.
5. **GATE 2 · motion** — the kind's validator must PASS:
   `node scripts/mascots/validate-frames.mjs ...` (pixel) or
   `node scripts/validate-smooth-frames.mjs ...` (smooth; `npm ci` first,
   repo-side). Then build an inline HTML preview of the animation (port the
   frames to a canvas; timings from `references/craft.md`) and get the user's
   timing approval before touching the simulator.
6. **GATE 3 · device** — typecheck, run the app, drive every state, and save
   per-state screenshots to `<app>/docs/mascots/<animal>/qa/`. Protocol:
   `references/qa.md`.
7. **Report** — evidence links (contact sheet, QA screenshots), the regen
   command, and which files were added/changed.

## Reference routing

| When | Read |
|---|---|
| First run in an app, pack anatomy, engine/validator CLI, pixel vs smooth rendering | `references/pipeline.md` |
| Drawing the animal (ears, tails, silhouettes) | `references/animal-recipes.md` |
| Palettes, outlines, shading, animation timing (pixel) | `references/craft.md` |
| Smooth craft — SVG authoring, silhouette masks | `references/craft.md` → "Smooth craft" |
| Reviewing art, polish passes, simulator QA, evidence | `references/qa.md` |
| Smooth validator rules + contact-sheet knobs | `references/qa.md` → "Smooth packs" |
| Wiring PixelPet, progress mapping, character switcher | `references/app-integration.md` |

## NEVER

- NEVER ship art without the user's explicit "cute enough" — polish passes
  before that verdict are yours to run unattended; the verdict is not.
- NEVER generate the art with image-gen AI — the art is code in BOTH kinds:
  hand-written pixel maps and hand-authored SVG. If something seems to need
  a generated image, redesign it as parametric shapes.
- NEVER add a runtime dependency — the pixel engine uses only `node:`
  builtins; PixelPet only `react-native`. The smooth rasterizer
  (`@resvg/resvg-js`) is build-time only in this repo, exact-pinned, and
  never ships to a consuming app.
- NEVER hand-edit generated PNGs — change the pack, regenerate, revalidate
  with the kind's validator.
- NEVER put art in the component — components animate frames; all art lives
  in packs (pixel maps or SVG functions).
- NEVER claim QA done without per-state screenshots saved on disk.
