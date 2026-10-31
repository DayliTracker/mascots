# App integration — the animator contract

The skill ships art, not components: packs → PNG frames + `manifest.json`.
Animating them is the app's job, and every framework already has the two
primitives needed — timed frame swaps and transforms. This page is the
contract an animator implements, whatever the stack.

## Frame contract

The engine writes `<app>/assets/mascots/<animal>/` (machine-readable map in
`manifest.json`):

| File | Pose |
|---|---|
| `<animal>_idle.png` | neutral, eyes open, arms/wings down |
| `<animal>_blink.png` | eyelid line only — nothing else moves |
| `<animal>_look.png` | pupils shifted 1px sideways |
| `<animal>_walk_a.png` / `<animal>_walk_b.png` | the waddle pair (one foot forward each) |
| `<animal>_happy.png` | celebration: happy eyes + smile + arms up |
| `<animal>_surprised.png` | poke reaction: wide eyes, open mouth |
| `particle_star.png`, `particle_heart.png` | effect sprites (when the pack declares them) |

Frame PNGs are `grid × scale` px square (see manifest). Display near
`grid × scale / 3` logical units so 3x screens render pixels near 1:1 —
downscaling keeps edges crisp, upscaling blurs them.

## Mood state machine

| Mood | Enter | Exit | Playback |
|---|---|---|---|
| idle | default | — | idle frame; transform bob (~2.2s loop); blink 150ms every 2.6–4.8s; look 700ms every 6–10s — random timers, never a fixed loop |
| walk | progress rises (and < 1) | after 2.6s | walk_a/walk_b swap 180ms + bob + ±4° tilt |
| celebrate | progress ≥ 1 | progress drops below 1 | happy frame; hop + squash-and-stretch loop; staggered star particles |
| poke | user taps the pet | 550ms | surprised frame + heart particle + spring "punch" |

Numbers come from the frame/timing table in `references/craft.md` — keep the
preview, the docs, and the animator on those numbers. Two transitions that
are easy to get wrong:

- **celebrate MUST exit** when progress falls below 1 (new day, goal reset) —
  otherwise the pet celebrates forever.
- **blink/look must restore the idle frame** even if the mood changes
  mid-blink — reset to idle when leaving the idle mood, or the pet holds the
  wrong face for seconds.

## Per-framework notes

- **React Native** — core `Animated` with `useNativeDriver: true`
  (transform/opacity only), `Image` with `fadeDuration={0}`, a `Pressable`
  wrapper for poke. A complete reference animator lives in the mascots repo:
  `examples/react-native/PixelPet.tsx` (not installed with the skill).
- **Web** — `image-rendering: pixelated` on `<img>` (or canvas `drawImage`
  with `imageSmoothingEnabled = false`); swap `src` on timers; CSS transforms
  for bob/tilt/squash.
- **Flutter / game engines** — swap two `Image`/sprite nodes per mood; one
  looping controller per motion (bob, tilt, squash); keep the timing table as
  named constants.

## Registry + character switcher (optional)

For apps with several mascots keep one registry so the switcher is
data-driven — entries are data (id, label, frame/particle file map from
`manifest.json`), not code:

```tsx
export type Pet = { id: string; label: string; emoji: string; frames: ...; particles: ... };
export const PETS: Pet[] = [duck, /* new pets land here */];
```

A `/mascot` run adds its pack + assets + one registry entry — the switcher
picks it up with no animator changes. If the app's bundler needs literal
asset imports (e.g. Metro `require()` paths must be literal strings relative
to the importing file), generate those imports in the registry file.

## Constraints

- The skill adds NO dependencies: the animator uses only what the app already
  has — its image component and its transform/animation primitives.
- Nothing native is required by the art: the frames are plain PNGs, so Expo
  Go, dev builds, web, and embedded views all work.
