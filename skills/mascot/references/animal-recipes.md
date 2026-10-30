# Animal recipes — constructing a cute chibi mascot from stamps

Sources: Slynyrd Pixelblog 25 (motion cycles), Saint11/Pedro Medeiros tutorials,
chibi/super-deformed proportion convention. These recipes are starting points —
the contact-sheet critique loop decides cuteness, not the recipe.

## Universal proportions

- Head-body is ONE blob: the head is ~40–50% of total height (super-deformed
  convention). The ellipse body mask handles this — keep `ry` slightly larger
  than `rx` (duck: rx 7.6, ry 8.4 on a 25 grid).
- Eyes are large (3px blocks with a white glint top-left), spaced so the mouth
  fits between them (duck: eyes at `cx±5..±3`, mouth 5 wide at `cx±2`).
- Blush sits just under the eyes' outer edge.
- Feet are 2-row stamps below the body; the outline pass wraps them.
- Parts MAY break the body silhouette (ears, wings, tails, frog eyes) — the
  outline pass wraps whatever you stamp, so overhangs come out clean.
- Silhouette test: every frame must read as the same animal at thumbnail size.
  If only the face says "cat", the ears are too small.

## Stamp order in `compose`

body mask → paintBody shading → appendages (ears/wings/tail) → feet →
accessory (scarf/hat) → blush → mouth/beak → eyes LAST.

## Cat

- Ears: two 2–3px triangles with rounded tips on the head arc, angled outward.
  Optional 1px inner-ear accent (lighter palette color).
- Nose/muzzle: tiny triangle nose (1–2px) replacing a beak; optional 1px
  whisker dots on the cheeks.
- Tail: thin curved stroke (1px wide) hugging the lower body side, tip bending
  up. Tail animates LAST in real animation — for 7 frames, a static tail is
  fine; wiggle it only in `happy`.
- Walk: same alternate-feet stamps as the duck.

## Bunny

- Ears: two long rounded oblongs, 4–6px tall, extending well above the head.
  Droop ONE ear (offset its top 1px sideways) — instant cuteness.
- Inner-ear: 1–2px vertical accent inside each ear.
- Tail: 2–3px round puff at the lower back edge.

## Panda

- Ears: round 3px circles (NOT triangles) on the head arc.
- Eye patches: 2×3 dark ovals behind the eye stamps.
- Body stays light; the dark patches + ears carry the identity. A scarf or
  bamboo sprig accessory helps if patches alone feel bare.

## Frog

- NO ears. Eyes bulge as 2px circles ABOVE the head circle's top edge —
  breaking the silhouette is what makes a frog read as a frog.
- Mouth: 1px wide line (or gentle arc) across the lower face.
- Optional lighter belly patch via `paintBody` soft tone.

## Fox

- Ears: taller and wider than cat triangles, with a 1–2px light inner-ear.
- Muzzle: 1–2px lighter oval low-center, nose dot at its bottom.
- Tail: thick (3–4px) with a light tip, curled around one side.

## Animation rules across species

- Walk: two frames, one foot dropped/forward each (`walk_a`/`walk_b`); the
  component adds body bob + ±4° tilt. Legs/feet travel the same distance each
  frame or the body reads as an accordion.
- Blink: replace eyes with a 1px lid line, 150ms at runtime — nothing else
  moves in that frame.
- Celebrate: arms/wings up + open mouth + happy eyes in one frame; the hop and
  squash are transforms in the component, not extra frames.
- Surprise: eyes wide (ring style) + mouth open; everything else static.
- Quadrupeds: front and back legs must travel the same distance per frame;
  animate legs first, body bob second, tail last.
