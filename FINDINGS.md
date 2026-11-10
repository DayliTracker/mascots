# FINDINGS — tween & manifest v2 contract for in-between frames (#18)

Studied: `smooth-engine.mjs`, `validate-smooth-frames.mjs`,
`packs/smooth-duck.mjs`, `react-native/PixelPet.tsx`,
`references/app-integration.md`, and dayli-step-tracker's
`components/PixelPet.tsx` + `components/pets.ts`. Adopted contract follows.

## Pack schema (smooth packs, additive)

Declare `cycles` beside the existing `frames` map. Nothing else changes.

```
export default {
  kind: 'smooth', name, size, sheet: {...},
  frames: { idle, blink, look, walk_a, walk_b, happy, surprised },  // unchanged
  cycles: {
    walk: {
      fps: 10,            // integer 1..30; app swaps at 1000/fps ms
      keys: [             // >= 2 param snapshots; numbers tween, others step
        { feetPhase: 0 },     // same params as frames.walk_a
        { feetPhase: 0.5 },   // same params as frames.walk_b
      ],
      steps: 4,           // in-betweens sampled per key segment (>= 1)
      tween: 'linear',    // easing from a fixed engine table; default linear
    },
  },
  frame(opts) {...},      // must be total over interpolated numeric params
  silhouette() {...},     // must cover the swept region of interpolated poses
};
```

- Enumerate cycle frames as sample `t = i / (K*S)`, `i` in `[0, K*S)`,
  `K = keys.length`, `S = steps`; segment `j = floor(i/S)`, eased local
  `t' = tween((i mod S) / S)`; params = lerp(`keys[j]`, `keys[(j+1) mod K]`, `t'`).
  Loop cycles never duplicate first/last pose. Files: `<name>_<cycle>_<iii>.png`
  (zero-padded index) — a namespace disjoint from the 7 canonical names.
- Interpolation rule: numeric opts lerp; non-numeric opts (enums, strings)
  hold from the left key. `frameSvg(opts)` therefore interpolates params by
  being parametric — smooth-duck's `eyeShift` already proves the pattern;
  walk needs one new pack-internal numeric (e.g. `feetPhase` replacing the
  feet enum inside interpolated ranges).
- A pack with no `cycles` (or `{}`) renders byte-identical to today: same
  files, same manifest bytes.

## Manifest v2 (additive)

```
{ "pack": ..., "art": "smooth", "canvas": ...,
  "frames": [ {name, file, width, height}, ... ],   // still exactly the 7, pack order
  "cycles": { "walk": { "fps": 10, "loop": true,
      "frames": [ { "name": "walk_000", "file": "<name>_walk_000.png", "width": ..., "height": ... }, ... ] } },
  "version": 2,
  "sheet": ..., "rasterizer": ..., "generator": ... }
```

- `cycles` and `version` appear only when the pack declares cycles; otherwise
  the manifest is byte-identical v1. Cycle frames NEVER enter `frames`.
- v1 consumers (any JSON.parse reader of `frames`) ignore unknown keys and
  keep working: same 7 files, same array, same order.
- Consumers wanting smoothness read `cycles[<id>].frames[].file` + `fps`.

## Validator rules (validate-smooth-frames.mjs, cycle section)

- Schema: fps integer 1..30; keys >= 2; steps >= 1; tween in the engine table.
- Files: every enumerated `<name>_<cycle>_<iii>.png` exists; count == K*S.
- Manifest: cycles block lists exactly those files in engine order with the
  pack's fps; `frames` still exactly the 7 canonical in pack order.
- Alpha gate unchanged: every cycle frame square at canvas size, all opaque
  pixels inside the union silhouette (so the silhouette must sweep
  interpolated poses — misses fail here).
- Adjacent-frame registration (replaces the 200-px base check for cycle
  frames): pixel-diff between each consecutive pair, including last→first,
  must satisfy `MIN <= diff <= MAX`. MIN (propose 50 px) proves visible
  change; MAX (propose 15% of the base frame's opaque pixels) proves a small
  delta, not a keyframe jump or mis-ordered sample. Calibrate on smooth-duck
  at implementation; the 7 canonical frames keep the existing >= 200-px
  base-registration rule untouched.
- Determinism unchanged: re-render reproduces every file (7 frames + cycle
  frames + sheet + manifest) byte-for-byte.

## What stays untouched

- Pixel pipeline: `engine.mjs`, `validate-frames.mjs`, `packs/duck.mjs` — no
  cycles, no schema change; the pixel validator never reads `cycles`.
- The 7 canonical state frames: names, opts, PNG bytes, manifest `frames`.
- The art: `frameSvg` stays hand-authored parametric SVG; tweening only feeds
  numeric params into it. No image-gen, no runtime rasterizer.
- App wiring: `PixelPet`'s 7-frame props remain valid; apps without cycle
  requires behave exactly as today (pets.ts untouched keeps working).

## Consumer opt-in (app side, informational)

`PixelPet` gains an optional `cycles?: { walk?: ImageRequireSource[] }` prop;
when present, walk/lead/arrive/stroll iterate the array at `1000/fps` ms
instead of toggling walkA/walkB at 180 ms; absent → v1 behavior. pets.ts must
enumerate literal `require()` per cycle frame (Metro resolves assets
staticically; template-string requires fail) — a generated snippet from
manifest.json can spell them out.

## Risks / open questions

1. Metro literal requires: frame count changes force regenerating the
   require list; mitigate with a build-time manifest-vs-requires check (app
   side). Glob convention rejected — Metro has no runtime glob.
2. MIN/MAX adjacent-delta thresholds need calibration against real
   smooth-duck renders during implementation.
3. Silhouette coverage: parametric poses (mid-phase feet) need swept shapes
   in the union mask; the alpha gate catches oversights, but authoring
   guidance should say "sweep, don't enumerate".
4. Cycle QA evidence shape (per-cycle contact-sheet rows vs separate
   sheets) stays open per map #16.
5. Idle in-betweens remain undecided (#16 "Not yet specified"); this
   contract supports them (an `idle` cycle) but adoption is a separate call.
6. fps vs app timer drift: setInterval(1000/fps) is adequate at 8..12 fps;
   Reduce Motion honored app-side per standing decision.
