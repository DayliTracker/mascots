# Style guide — the 48px class

How packs in this repo get their shading, outlines, and ground shadow. The
tokens live in `scripts/engine.mjs` (`shadeTones`, `stampGroundShadow`,
selective outline); this page records what they are, where the numbers came
from, and how to apply them. Structure only — packs derive their own colors
from their own base hexes; no reference pixels are copied.

## Where the numbers came from

Pixel-statistics pass over the get-habita.app character PNGs (Sprout, Lumi —
2026-10-31). The files are hi-res smooth art, not crisp grids, so the
measurable signals are relationships, not cells:

| Signal | Measured | Token |
|---|---|---|
| Shadow hue vs mid tone | −12° to −14° toward red on every file | shadows bias warm: blue channel drops fastest |
| Outline colors | one dark warm-brown family (`#3A1610`–`#5B2E1C`), 1–2% of cells, several lightness steps | outline lerps toward one dark anchor |
| Ground shadow | semi-transparent neutral gray, ~10–30% alpha, 1–4 cells under the body | solid pre-blended ellipse (see below) |
| Palette spread | one dominant family ≈ 80% of cells; accents as small families | 3–4 tones per family, accents stay small |

## Tone ramp

`shadeTones(hex)` derives four tones from one base hex:

| Tone | Recipe | Use |
|---|---|---|
| `soft` | × (0.95, 0.90, 0.84) | lower band of the fill — the paintBody soft shade |
| `deep` | × (0.86, 0.76, 0.62) | bottom crescent, soles, mouths |
| `hi` | +22% toward white | highlights on saturated fills (bill, cheeks); skipped on near-white bases where it does nothing |
| `out` | 82% toward `#301812` | the selective outline tint for this fill |

Packs assign these to their own single-char palette keys at module load
(canvas cells hold one char each):

```js
import { shadeTones } from '../engine.mjs';

const B = shadeTones(BODY);
const palette = { b: BODY, t: B.soft, s: B.deep, O: B.out, /* ... */ };
```

Light is consistent across packs: top-left glints, soft shade lower-left,
deep shade at the bottom.

## Selective outline

`pack.style.outline: 'selective'` with `outlineFor: { <fill char>: <outline char> }`
makes the silhouette outline take the darkened tone of the fill it wraps
(cream silhouettes in cream-family brown, bill in bill-family brown), instead
of one flat outline color. Cells whose fill has no mapping fall back to
`pack.outlineKey`.

## Ground shadow

`pack.style.groundShadow: { rxScale, rows }` stamps a shrinking ellipse of
palette key `g` under the lowest filled row of every frame. The engine never
outlines it and never overwrites body pixels. `g` is a **solid, pre-blended**
color — pick it by blending your shadow hue over the app's canvas color at
~20–25% (true alpha would break the palette-lock validator). At 48px, 2 rows
at `rxScale ≈ 1.18` reads right.

## Frame set

The 48px class ships eight frames: the seven contract frames plus
`happy_alt` (celebrate frame 2 — open bill, wings higher). The 4-frame walk
cycle (`idle → walk_a → idle → walk_b`) is the animator's business: the pack
only supplies the poses. `validate-frames.mjs` gates the whole set.
