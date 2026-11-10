# Motion spec — "moves like a real animal" (ticket #17)

Adopted under the user's delegated 2026-11-10 directive ("run, merge without
me; goal: all tickets in board are resolved") against their standing bar from
the 2026-11-09/10 grilling: **"the mascot always moves as a real animal"** —
continuous, organic, never a static hold. Every number here is vetoable by
reply on #17 or #16; a veto reopens the ticket and re-adopts.

Companion preview (open in a browser, no network needed):
`research/motion-spec/preview.html` — the /mascot GATE 2 pattern: 7 PR #15
smooth-duck frames embedded as base64, layers toggled individually, live
transform readouts, walk fps candidates side by side, current-app baseline
for contrast.

## The bar, made checkable

"Always moves like a real animal" = three requirements on the resting duck:

1. **Never static** — some perpetual transform is away from rest in any 3 s
   window (assertion A12).
2. **Organic, not metronomic** — loop periods mutually non-integer
   (2200 / 3400 / weight 4–7 s randomize against each other), drift added to
   sway, weight targets randomized; no loop is a plain visible square wave.
3. **Behavior, not just wobble** — randomized frame-swap behaviors (blink,
   look, foot shuffle) layered on top of the transforms.

## Named loops (transforms; all native-driver, `useNativeDriver: true`)

| Loop | Moods | Period | Amplitude / range | Easing | Property |
|---|---|---|---|---|---|
| breath | idle, walk, celebrate, surprised (all resting + bursts) | 2200 ms | scaleY ∈ [0.995, 1.015] (mid 1.005); scaleX = 1/scaleY | sine | scale |
| sleep breath | sleep | 3200 ms | scaleY ∈ [0.998, 1.008] (mid 1.003); scaleX = 1/scaleY | sine | scale |
| sway | idle only | 3400 ms | ±0.6° base + drift term ±0.25° retargeted every 5–9 s (2 s cubic inOut glide) | sine + cubic drift | rotate |
| weight shift | idle only | retarget every 4–7 s | translateX ∈ {−2.5, 0, +2.5} px at 170 pt (±1.5% of size), linked tilt ±0.35° | 550 ms cubic inOut per move | translateX + rotate |
| walk bob | walk, lead, arrive, stroll | 800 ms cycle (2 footfalls) | translateY −3.5% of size at footfall | up: out-quad, down: in-quad | translateY |
| walk tilt | walk, lead, arrive, stroll | 800 ms cycle | ±4°, one full L/R swing per cycle | inOut quad | rotate |

Layering order (outer → inner): **weight translate → (weight tilt + sway)
rotate → breath scale → frame image**. During walk moods sway and weight
suspend (walk tilt dominates); breath continues in every mood. On mood exit
every loop value resets to rest (0 / 0 / 1) — never freeze mid-flight, never
restart a loop on re-render.

Driver discipline (the B2 builder contract): exactly one animated value per
property; the composed transform string per tick is deterministic; nothing
animates that a transform could not (poses stay frame swaps).

## Behavior list (idle frame swaps; random, never a fixed loop)

| Behavior | Schedule | Hold | Notes |
|---|---|---|---|
| blink | gap U[2600, 4800] ms, uniform | 140 ms | restores idle |
| look | gap U[6000, 10000] ms, uniform | U[600, 900] ms | restores idle |
| foot shuffle | p = 0.35 after each look restore, else skip; delay U[1200, 4000] ms; cooldown ≥ 8000 ms between shuffles | walk_a → walk_b → walk_a, 300 ms each | the weight-shift in feet; suppressed while a blink/look is in flight |

Mutual exclusion: behaviors never overlap. If a blink fires while the duck is
busy (or vice versa), it defers 250 ms and retries. Blink and look gaps are
independent draws — they must not share a phase or queue into a pattern.

## Walk cycle definition (per the #18 tween contract)

`cycles: { walk: { fps: 10, keys: [{ feetPhase: 0 }, { feetPhase: 0.5 }], steps: 4, tween: 'linear' } }`

- 8 frames @ 10 fps = 800 ms loop; frame hold 100 ms.
- Keys read as the loop's endpoints (t = 0 and t = 1, wrapping): feetPhase
  goes 0 → 0.5 → 0 — pose blends walk_a → walk_b → walk_a. Frame i (i = 0..7)
  blends walk_a/walk_b at factor **[0, .25, .5, .75, 1, .75, .5, .25]**.
  (Reading the keys as interior t = 0/0.5 with a snap-back would make the
  last→first delta a 0.875 jump and fail #18's adjacent-delta rule; A→B→A is
  the consistent reading.)
- Adjacent blend delta is constant 0.25 including last→first — inside
  #18's MIN ≤ diff ≤ MAX registration band by construction.
- Why 8 @ 10: preview comparison shows 4 fps mushy, 12 fps scurrying;
  10 fps sits in craft.md's 8–12 fps playback target with holds long enough
  for the tween to read. The current app's 2-frame swap at 180 ms (≈5.5 fps)
  is the mushy end; the tweened 8-frame cycle replaces it.
- Walk transforms ride on top: bob −3.5% at each footfall, tilt ±4°, per the
  loops table.

## Mood mapping

| Mood | Frames | Transforms | Behaviors |
|---|---|---|---|
| idle | idle (+blink/look/shuffle swaps) | breath + sway + weight shift | scheduler on |
| walk / lead / arrive / stroll | walk cycle (8 @ 10 fps) | walk bob + tilt, breath continues | scheduler off |
| celebrate | happy | celebrate hop + squash (craft.md/PixelPet numbers unchanged) + breath | off |
| sleep | blink held | sleep breath, dim to 0.72 | off |
| surprised / dizzy / hop | unchanged from PixelPet.tsx | unchanged + breath | off |

## Reduce Motion fallback

**Full static transforms + bounded frame swaps.** With Reduce Motion on:
breath, sway, weight shift, walk bob/tilt and the celebrate hop never start —
all transforms hold at rest (scale 1, rotate 0, translate 0). Bounded frame
swaps still play (blink, look, shuffle) and bounded moods play unlooped,
mirroring the PixelPet.tsx precedent (presentation-only gating; the mood
machine is untouched). The alternative "single minimal breath" (3200 ms,
scaleY 0.998–1.008) stays available as a one-line change if QA finds full
static too dead — flag it on #16 and it re-adopts.

## Checkable assertions (each maps to a B2/B3 builder AC)

- **A1 Breath bounds** — sample scaleY at 100 ms over 10 s: every sample in
  [0.995, 1.015], measured period 2200 ms ± 20 ms.
- **A2 Breath volume** — at every sample |scaleX · scaleY − 1| ≤ 0.0005.
- **A3 Sway bounds** — rotation samples stay within ±0.9° (0.6 base + 0.25
  drift + compose margin).
- **A4 Sway drift** — drift target changes at 5–9 s intervals; rotation is
  not a pure sine (residual after removing the 3400 ms component ≠ 0).
- **A5 Weight shift** — translateX changes at 4–7 s intervals; each move
  completes in 550 ms ± 30 ms; |tilt| ≤ 0.35° and tilt sign follows
  translateX sign.
- **A6 Walk pose sequence** — the 8 cycle frames blend walk_a/walk_b at
  [0, .25, .5, .75, 1, .75, .5, .25]; adjacent blend delta = 0.25 for all 8
  pairs including last→first (asserts the #18 validator band too).
- **A7 Walk timing** — frame hold 100 ms ± 5 ms; full cycle 800 ms ± 20 ms.
- **A8 Walk transforms** — bob reaches −3.5% ± 0.3% of size twice per cycle;
  tilt reaches ±4° ± 0.4° once per direction per cycle; bob and tilt periods
  both 800 ms.
- **A9 Blink** — inter-blink gaps uniform over [2600, 4800] ms (KS test or
  min/max over ≥ 20 samples); blink hold 140 ms ± 10 ms.
- **A10 Look** — gaps in [6000, 10000] ms; holds in [600, 900] ms.
- **A11 Shuffle** — after ≥ 10 looks, shuffle rate ≈ 0.35 (binomial 0.2–0.5);
  ≥ 8000 ms between shuffles; shuffle never overlaps a blink/look; run is
  walk_a/b/a at 300 ms holds.
- **A12 Never-static** — with Reduce Motion off, in any 3 s idle window at
  least 2 of 30 samples (100 ms apart) deviate ≥ 0.2% scaleY or ≥ 0.1° from
  rest. With the current-app baseline the same sampler fails — this is the
  checkable form of "always moves like a real animal".
- **A13 Reduce Motion** — with the OS flag on, transform values are exactly
  at rest at every sample; blink/look swaps still occur.
- **A14 Exclusion** — no two behaviors active in the same 100 ms sample.
- **A15 Rest reset** — on every mood exit, transforms read exactly
  translate 0 / rotate 0 / scale 1 within one frame; no value freezes
  mid-flight.

## Implementation pointers (B2/B3)

- Transforms: the harness JS (`preview.html`, `Duck.prototype.tick`) is the
  executable reference for every formula; port to `Animated` drivers — one
  value per property, loops via `Animated.loop(Animated.sequence(...))` with
  the same periods, `setValue` resets on mood exit.
- Behaviors: port PixelPet.tsx's `scheduleBlink`/`scheduleLook` timers with
  the new distributions; add the shuffle chain and busy-defer.
- Walk: B2 emits the 8 tweened frames per #18's contract (feetPhase param
  through `frameSvg`); the app consumes `cycles.walk` opt-in and drops the
  180 ms swap.
- Determinism untouched: the pack/engine stay seeded; the harness's
  `Math.random` is preview-only.
