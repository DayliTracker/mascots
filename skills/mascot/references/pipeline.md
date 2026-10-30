# Pipeline — vendoring, pack anatomy, engine CLI

## Target-app layout (what a `/mascot` run adds)

```
<app>/
├── scripts/mascots/
│   ├── engine.mjs              # vendored from the skill (never edited per-app)
│   ├── validate-frames.mjs     # vendored
│   ├── palettes.json           # vendored
│   └── packs/<animal>.mjs      # the art — this file IS the mascot
├── components/PixelPet.tsx     # vendored animator
├── components/pets.ts          # registry: which packs exist, their frame sources
├── assets/mascots/<animal>/    # generated PNGs (commit them)
└── docs/mascots/<animal>/      # contact sheet + qa/ screenshots (evidence)
```

## Vendoring

`SKILL_DIR` below is the directory containing this skill's SKILL.md.

```bash
mkdir -p <app>/scripts/mascots/packs <app>/assets/mascots <app>/docs/mascots
cp "$SKILL_DIR/scripts/engine.mjs"            <app>/scripts/mascots/
cp "$SKILL_DIR/scripts/validate-frames.mjs"   <app>/scripts/mascots/
cp "$SKILL_DIR/assets/palettes.json"          <app>/scripts/mascots/
cp "$(dirname "$SKILL_DIR")/../react-native/PixelPet.tsx" <app>/components/
```

If the app already has a `scripts/mascots/engine.mjs`, do NOT overwrite it with
an older/newer copy silently — diff first and tell the user what changed.

## Pack anatomy

A pack is one ES module. Full worked example: `scripts/packs/duck.mjs`.

| Field | Type | Meaning |
|---|---|---|
| `name` | string | file prefix + folder name (`duck` → `duck_idle.png`) |
| `grid`, `cx`, `cy`, `rx`, `ry` | numbers | canvas size and body ellipse (center + radii, in art pixels) |
| `scale` | number | device pixels per art pixel in frame PNGs (20 → 500px frames) |
| `palette` | `{key: '#RRGGBB'}` | every color the pack may use; validator enforces this lock |
| `seed` | number | RNG seed for `makeRng` — same seed, same output, always |
| `particleScale`, `sheetScale`, `sheetBg` | numbers/string | rendering knobs (defaults 24, 8, `'#FAF3E6'`) |
| `particles` | `{name: string[]}` | small maps (≤8px) for star/heart effects |
| `frames` | `{name: object}` | the frame manifest; each value is opts for `compose` |
| `compose(c, opts)` | function | paints ONE unoutlined frame; engine applies the outline pass |

### Required frame manifest

| Key | opts | Pose |
|---|---|---|
| `idle` | `{}` | neutral, eyes open, wings/arms down |
| `blink` | `{eyes: 'blink'}` | eyelid line, everything else identical |
| `look` | `eyeShift: 1` | pupils/eyes nudged one pixel sideways |
| `walk_a` / `walk_b` | `feet` variants | one foot forward/down each — the waddle pair |
| `happy` | happy eyes + smile + arms up | celebration |
| `surprised` | wide eyes + open mouth | poke reaction |

Compose order (matters — later stamps overwrite earlier): body mask → shade →
appendages (wings/ears/tail) → feet → accessory → blush → mouth/beak → eyes
last (they sit on top of everything).

### `compose` helpers (`c.*`)

- `c.blank(grid)`, `c.stamp(canvas, artRows, atRow, atCol)` — art rows are
  strings, one char per pixel, `.` = transparent, other chars = palette keys
- `c.bodyMask(pack)` — ellipse filled with `'b'` from the pack geometry
- `c.paintBody(canvas, {cx, cy, rx, ry})` — two-tone shading, top-left light
- `c.outline(canvas, key)` — applied by the engine automatically; call it only
  for intermediate outlines inside `compose`
- `c.makeRng(seed)` — deterministic jitter; never `Math.random()`

## Engine + validator CLI

```bash
# generate frames + particles + contact sheet
node scripts/mascots/engine.mjs scripts/mascots/packs/<animal>.mjs \
  --out <app>/assets/mascots/<animal>

# delivery gate — must PASS before wiring or QA
node scripts/mascots/validate-frames.mjs scripts/mascots/packs/<animal>.mjs \
  --out <app>/assets/mascots/<animal>
```

The validator checks: files exist, frame dimensions = `grid × scale` square,
palette lock (every opaque pixel is a pack color), non-empty silhouette, frame
registration (every frame 80–100% pixel-identical to the base frame — same
character, but not a duplicate), and determinism (re-render byte-compares).

## Rules

- Changing art = edit the pack, re-run engine + validator. NEVER retouch PNGs.
- Keep `idle` as the FIRST key in `frames` — the validator diffs against it.
- Commit generated PNGs: the app must build without running the engine.
- Art scale: frames render at `scale` (default 20). Keep the displayed size
  near `grid × scale / 3` points so 3x devices show pixels near 1:1.
