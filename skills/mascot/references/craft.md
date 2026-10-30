# Craft — palette, outline, shading, animation timing

Distilled from Derek Yu's pixel-art tutorial, Slynyrd Pixelblogs 1/5/6/8
(palette, basics, light, animation), and Lospec palette standards. Follow
these unless the user overrides; they are what makes programmatic art read as
pixel art instead of "blocky".

## Palette discipline

- Pick body / shade / soft-shade / accent / outline from ONE palette
  (`assets/palettes.json` presets: dawnbringer-16, dawnbringer-32,
  endesga-32, resurrect-64, cozy) so all mascots in an app harmonize.
- 2–3 main colors per sprite; at most 2 dark + 2 light steps over a base.
- Hue-shift the ramp: shadows slightly cooler, highlights slightly warmer —
  never a brightness-only ramp. Saturation peaks mid-ramp.
- The outline is the palette's darkest color, NEVER pure #000 (duck: #5B4634).

## Outline, shading, anti-aliasing

- Outline exactly 1px, applied by the engine's `outline()` pass — full 8-neighbor
  dilation around the silhouette, including overhanging parts.
- Light source: distant, above, slightly to one side (pick left or right and
  keep it consistent across every frame). `paintBody` shades below + lower-left.
- NO pillow shading (lightening inward from the outline all around — the
  canonical beginner mistake). Shade by light direction only.
- Cluster shading: large contiguous shade regions; no speckle, no gradients.
  A hard 2-tone boundary beats dithering at 25px.
- NO anti-aliasing on the outer edge (transparent neighbors stay transparent)
  — hard silhouettes only. No stray single pixels ("jaggies"): curve steps
  should descend monotonically (4-3-2-1), the engine's ellipse gives this.
- Scale output only in integer multiples (the engine does this via `scale`).

## Frame/timing table (bake into the component defaults)

| State | Frames | Timing | Notes |
|---|---|---|---|
| idle breathe | 2–3 | hold 400–700ms (loop ~2.2s) | transform bob, not extra frames |
| blink | 2 | 150ms, random every 2.6–4.8s | lid line only; never a fixed loop |
| look | 2 | 700ms, random every 6–10s | eyes shift 1px |
| walk | 2 (+bob/tilt) | swap 180ms; bob 200/180ms; tilt ±4° at 190ms | 4-frame loop standard for chibi; walk frame 1 = idle pose |
| celebrate | 1 + transforms | hop 260/230ms, squash 90ms, settle 220ms elastic | anticipation = the hop's wind-up dip (bob +3 before launch) |
| surprised | 1 | 550ms hold | ring eyes + open mouth |
| particles | 1 sprite | 750–1700ms, alpha in/out | heart on poke; 5 staggered stars on celebrate |

Playback target: 8–12 fps effective (each frame held 80–125ms) on a 60fps
render loop. Fewer frames need LONGER holds to keep pace.

## Transform rules (the component's half)

- Poses = frame swaps. Soft dynamics = transforms. Never draw motion into
  frames that transforms already cover (bob, tilt, squash).
- Squash preserves volume: if `scaleY` drops to 0.9, `scaleX` rises to ~1.12
  (1/scaleY). Stretch is the inverse. Pivot at the feet conceptually — the
  duck centers the pivot; keep `translateY` compensation on landing.
- Land a hop with squash + a 2-frame elastic settle; launch with a small dip
  (anticipation) before the jump.

## Determinism

- All generation is seeded (`pack.seed`, `makeRng`). Same pack → byte-identical
  PNGs — the validator enforces this. Never `Math.random()` in packs.
