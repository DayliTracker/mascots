# Gate 1 polish — measured relationships (issue #3)

References re-fetched 2026-11-07 from https://get-habita.app (character PNGs
served at the site root: `sprout_idle_1.png`, `sprout_happy.png`,
`lumi_happy.png`, `sprout_and_hazel.png`, `bunny_idle_1.png`,
`bear_sitting_on_planet.png`). Measured with a pixel scan (PIL) — alpha
bounding boxes, interior dark-blob detection (distance-from-edge > 14px),
pink-blob detection. Relationships only; no reference pixels copied.

No pre-existing mascots style guide doc exists on `main` (searched for
`Habita`, `Sprout`, `Lumi`, `style guide`, `relationship` — only hits are
ADR 0001 and the super-board pre-flight doc). The measurements below were
taken fresh this pass and are the recorded relationships this card used.

## Habita measurements (px, from the PNGs)

| Relationship | Sprout (614×613, char 369×573) | Lumi (1952×2176, char 1799×1967) |
|---|---|---|
| Head mass | face spans top of char to scarf top y=336 → ~55% of char height | scarf top ≈ 0.60 of char height |
| Eyes | circles Ø28 ≈ 8% of head width (28/349), centers cy 268 → 55–78% down the head | arcs w 225 ≈ 13% of char width, cy 0.39 of char |
| Eye spacing | 140px center-to-center = 40% of head width | 0.30 of char width |
| Blush | circles beside/below eyes | Ø ~190 ≈ 10.6% of char width, below-outside eyes (Δcy +0.09, Δcx ±0.05) |
| Mouth | small (51×15 = 14% of char width) | open laugh 301×220 = 17% of char width |
| Outline | dark maroon-brown ≈ 3% of char width (11px strokes) | same family, ≈ 3% |
| Scarf | wide band + hanging tail front-left, tail ≈ 12% of char height | band + front-left hanging tail |
| Shading | cream base, subtle warm shade, light top-left | same |
| Palette | cream #F0E0B0/#F0E0C0 + brown #E0B080 + dark #3x0000 outline | cream #F0E0D0/#F0F0D0 + dark #2x0000 outline + blush #E0A080 |

## Approved baseline (prototype v6 duck)

`dayli-step-tracker@prototype/textless-shell` → `prototype-merged-shell.html`
(120×120 user space). This is the only duck art the user has verdicted. Key
shapes mapped to the 512 pack space (×4.267): outline #5B4634 stroke 2–3 →
~8.5–12.8; radial body gradient #FFFAEE→#FFF6E3→#F3E7CE (cx 38% cy 30%);
eye r 4.6 → 19.6, spacing 26 → 111; bill 18 wide → 77; scarf band 34..86 →
145..367 with rotated-rect tail (10.5×16 r4.5 rotate 6°) → 45×68 r19; feet
13×8.5 r4.2 → 55×36 r17; tail curl at (84..95, 72..91) → (358..405, 307..388);
tuft stroke curl (58..68, 18.5..31.5) → (247..290, 79..134).

## Applied to the pack (smooth-duck.mjs)

Pass 1: outline #5B4634 on every shape (body 10, wings/scarf/tail/tuft 8–9,
bill/feet 7); radial-gradient body; eye circles r16 at (200,200)/(312,200)
(spacing 112 ≈ 40% of head width, eye line ~half-way down the face); blush
rx20 ry13 at (170,240)/(342,240) (30 outside / 40 below the eyes);
scarf smile-band 148..364 @ 288..342 + front-left hanging tail; rounded-rect
feet 54×34 r17; stroke tuft; right tail curl; one soft belly ellipse instead
of the two heavy bottom bands; prototype bill shapes (closed/smile/o-open).

Pass 2: wings shrunk to tucked nubs (was: side lumps reading as a shell);
scarf tail → prototype rotated rounded rect (46×62 r20 rotate 6°) hanging
over the belly, not the wing; body outline 10 → 11 (Habita ≈ 3% of width).

## Verification

- `node skills/mascot/scripts/smooth-engine.mjs skills/mascot/scripts/packs/smooth-duck.mjs --out /tmp/sd-pass1` → 9 files, then `validate-smooth-frames.mjs` → **PASS**
- same for pass 2 → **PASS** (`pass-2-validator.log`)
- regression (AGENTS.md + config verify_commands): pixel duck engine + validator → **PASS** (`verify-pixel-duck-*.log`); frames byte-identical to main (`cmp` per file)
- `node skills/mascot/scripts/test-validate-frames.mjs` → PASS 8/8
