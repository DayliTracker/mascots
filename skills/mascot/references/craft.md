# Craft — palette, outline, shading, animation timing

Distilled from Derek Yu's pixel-art tutorial, Slynyrd Pixelblogs 1/5/6/8
(palette, basics, light, animation), and Lospec palette standards. Follow
these unless the user overrides; they are what makes programmatic art read as
pixel art instead of "blocky".

Sections through "Transform rules" govern **pixel packs**; "Smooth craft"
governs **smooth packs** (ADR 0001). The frame/timing table and determinism
rules apply to both kinds.

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

## Smooth craft — SVG authoring (smooth packs)

Smooth packs trade the cell grid for parametric shapes. The validator adapts
(ADR 0001): no palette lock, no outline pass — the contract is the frame set,
canvas, and the alpha gate against `silhouette()`. Reference:
`scripts/packs/smooth-duck.mjs`.

- **One user space**: every frame is inner SVG in the pack's `size × size`
  canvas (512 on the duck). Draw with `ellipse`, `circle`, and `path` —
  NEVER `<text>` (font metrics would break byte-identity; the engine also
  sets `loadSystemFonts: false`).
- **Hand-authored, parametric**: define named path constants (body, ears,
  wings, scarf) and compose them per frame from opts — the smooth analog of
  stamping art rows. The art is code: no image-gen AI, no traced bitmaps.
- **Silhouette by shape, not outline**: smooth packs have no 1px outline.
  The character reads through silhouette first, then two-tone shading, then
  face. Check every frame at thumbnail size — the qa.md vision loop applies
  as-is (skip the outline item).
- **Two-tone shading, clipped**: fill the body, then draw soft/deep shade
  ellipses clipped to the body path (`<clipPath>`), keyed to the same
  top-left light as pixel packs. No gradients — hard band boundaries read
  cleaner at app sizes, and gradient meshes rasterize unpredictably.
- **Eyes last, glints always**: same rule as pixel — eyes sit on top;
  each eye gets a main glint (and the duck adds a small secondary). Happy
  and blink are stroke arcs, wide is a ring.
- **The alpha gate is the outline discipline**: every opaque pixel of every
  frame must fall inside `silhouette()`. Keep starter shapes inside the body
  ellipse; when anatomy breaks the body edge (ears, wings, tail, feet),
  union those shapes into `silhouette()` and inflate the mask with a round
  stroke (~16px on a 512 canvas ≈ 8px outward pad) so anti-aliased edges
  stay inside. A stray anti-aliased pixel outside the mask FAILS the gate.
- **Registration still applies**: every frame must differ from `idle` by
  ≥200 px (validator check) — move feet, swap eyes, open the mouth; a frame
  that only re-renders identically fails.

## Determinism

- All generation is seeded (`pack.seed`, `makeRng`). Same pack → byte-identical
  PNGs — the validator enforces this. Never `Math.random()` in packs.
