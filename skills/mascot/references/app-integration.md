# App integration — PixelPet, progress mapping, switcher

PixelPet animates PNG frames and never knows how they were made — pixel and
smooth packs (ADR 0001) wire identically: a smooth pack ships the same
`<animal>_<frame>.png` set (plus `manifest.json`) into
`assets/mascots/<animal>/`, and everything below applies unchanged.

## PixelPet props

```tsx
import PixelPet, { PixelPetFrames, PixelPetParticles } from './components/PixelPet';

<PixelPet
  frames={{
    idle: require('./assets/mascots/duck/duck_idle.png'),
    blink: require('./assets/mascots/duck/duck_blink.png'),
    look: require('./assets/mascots/duck/duck_look.png'),
    walkA: require('./assets/mascots/duck/duck_walk_a.png'),
    walkB: require('./assets/mascots/duck/duck_walk_b.png'),
    happy: require('./assets/mascots/duck/duck_happy.png'),
    surprised: require('./assets/mascots/duck/duck_surprised.png'),
  }}
  particles={{
    star: require('./assets/mascots/duck/particle_star.png'),
    heart: require('./assets/mascots/duck/particle_heart.png'),
  }}
  progress={Math.min(steps / goal, 1)}
  size={200}
/>
```

- `progress` is 0..1. Rising progress → walk burst (2.6s). `>= 1` → celebrate
  (hops + sparkles) until progress drops. Falling progress → idle.
- `size` is points; keep it near `grid × scale / 3` (duck: 25×20/3 ≈ 167) so
  3x devices render pixels near 1:1. PNGs are supersampled; downscaling keeps
  edges crisp, upscaling blurs them.
- The pet is tappable — poke triggers the surprised frame + heart. Put it
  where a tap is welcome, and tell users to poke it once in the UI.

## Manifest v2 cycle playback

Smooth packs with tween cycles ship `cycles` in their manifest (`version: 2`).
Pass it as the optional `cycles` prop and the walk mood plays the cycle at the
manifest fps instead of the two-frame walk swap — v1 packs just omit `cycles`
and behave exactly as before:

```tsx
import PixelPet, { PixelPetCycles } from './components/PixelPet';

// Metro needs static require literals: enumerate the cycle PNGs, in manifest
// `cycles.walk.frames[].file` order (smooth-duck: 8 frames, fps 10).
const cycles: PixelPetCycles = {
  walk: {
    fps: 10,
    frames: [
      require('./assets/mascots/duck/duck_walk_000.png'),
      require('./assets/mascots/duck/duck_walk_001.png'),
      require('./assets/mascots/duck/duck_walk_002.png'),
      require('./assets/mascots/duck/duck_walk_003.png'),
      require('./assets/mascots/duck/duck_walk_004.png'),
      require('./assets/mascots/duck/duck_walk_005.png'),
      require('./assets/mascots/duck/duck_walk_006.png'),
      require('./assets/mascots/duck/duck_walk_007.png'),
    ],
  },
};

<PixelPet frames={frames} particles={particles} cycles={cycles} progress={...} />
```

- The cycle always loops (`cycles.<name>.loop: true` in the manifest); the
  component steps one frame per `1000 / fps` ms.
- Idle behaviors are scheduler-driven with randomized timing (blink, look,
  foot shuffle) and Reduce Motion freezes transforms while frame swaps keep
  playing — the mascot stays alive without continuous motion.
- A perpetual motion layer (spec #17) keeps the pet never static: breathing
  scale runs in every mood; micro-sway and weight shift run while idle. All
  loops are native `Animated` — no props, no consumer changes, no JS frame
  ticks. Under Reduce Motion every transform holds at rest and only the
  bounded frame swaps play.


## Pet registry + character switcher

Keep one registry so the switcher is data-driven:

```tsx
// components/pets.ts
export type Pet = { id: string; label: string; emoji: string; frames: ...; particles: ... };
export const PETS: Pet[] = [duck, /* new pets land here */];
```

```tsx
const [petId, setPetId] = useState(PETS[0].id);
// chips: PETS.map(p => <Pressable onPress={() => setPetId(p.id)}>...)
<PixelPet {...selected} progress={...} />
```

A `/mascot` run adds its pack + assets + one registry entry — the switcher
picks it up with no component changes.

## Where mascots appear

The demo/preview screen shows the pet with test controls (e.g. +steps) until
the app's real screens adopt it. The pet belongs on the main screen in
production; the registry makes that a one-line move.

## Constraints

- Zero dependencies beyond `react`/`react-native` — no Reanimated, no Skia,
  no Lottie. Animations are core `Animated` with `useNativeDriver: true`
  (transform/opacity only).
- Works in Expo Go and dev builds; no config plugins, no native modules.
- TypeScript: `ImageRequireSource` typing requires the app's tsconfig to
  resolve `require('*.png')` — Expo templates do this out of the box.
