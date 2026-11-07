# 0001 — Smooth art over pixel art for the flagship mascot

The pixel pipeline earned its keep, but the 48px-class duck never earned the
user's cute-enough verdict; the user chose to pivot the flagship mascot to
smooth illustration, with the Habita characters (get-habita.app) as visual
north star. New flagship packs are smooth packs: hand-authored SVG rasterized
to deterministic PNG frames at build time. Animation stays frame swap; art
stays code — AI image generation remains excluded. The pixel engine remains
supported for existing and non-flagship packs; the unfinished 48px class is
shelved on `wip/48px-class`.

## Considered options

- **AI image generation with a human vendor step** — highest visual ceiling,
  but loses byte-stable regeneration, per-frame character consistency is the
  hard problem, and every polish round costs a manual generation pass.
  Escalation path only: if the smooth duck misses the verdict after ~2 polish
  passes, this returns as a fresh decision.
- **Commissioned art** — best quality, but the pipeline stops being
  generative.

## Consequences

- The rasterizer is a build-time dependency of this repo only; apps still
  consume plain PNG frames, so PixelPet and the frame contract are unchanged.
- Smooth packs need their own validator rules (no cell grid → no palette
  lock; the contract is the frame set, canvas size, and alpha).
