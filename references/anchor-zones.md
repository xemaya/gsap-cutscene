# Anchor zone reference card

Each prop in a MANIFEST declares `data-anchor` (or `anchor` field). This
determines where it sits relative to its owner and what DOM/CSS structure
the harness requires.

## Quick table

| Anchor zone     | Description                          | DOM nesting | Adjacency tolerance |
|-----------------|--------------------------------------|-------------|---------------------|
| `forehead`      | Above-head sweat / tear              | MUST nest   | n/a                 |
| `head-side`     | Speed lines / shake marks beside head| MUST nest   | n/a                 |
| `face`          | Heart-eyes / sunglasses / glint      | MUST nest   | n/a                 |
| `chest`         | Necklace / heart on chest            | MUST nest   | n/a                 |
| `held-hand`     | Object grabbed in character's hand   | MUST nest   | n/a                 |
| `feet`          | Boot / shoe / footprint near feet    | nested OR adjacent | within 8% left% |
| `held-front`    | Mirror / flower held in front        | nested OR adjacent | within 12% left%|
| `floating-above`| Shock balloon / boss-reveal aura     | nested OR adjacent | within 15% left%|

"MUST nest" means: the prop's `<svg>` must be a DOM child of the owner
character's `<div>`. The harness verifies this by walking the source.

"Adjacent within X%" means: the prop's CSS `left:` value must be within
X percentage points of the owner's `left:`. If the prop has no CSS left,
the harness checks the inline `style` attr first, then the class-level
CSS rule.

## Why nesting matters

For body-attached emotion indicators (sweat on forehead, sunglasses on
face), nesting guarantees:

1. The prop moves with the owner automatically (parent transform
   applies).
2. The prop's `left:X%` is relative to the owner's bounding box, so
   "8% from left" means "8% across the owner's body" — semantically
   meaningful.
3. The harness can quickly verify "this is logically attached" without
   simulating physics.

If you position via stage-level absolute coords (`left: 30%` of the
viewport, not of the owner), the prop will drift when the owner moves —
this is the bug that motivated rule 9a originally.

## When to use which

### `forehead`
Sweat drops, tear drops, lightbulb (idea moment). Position inside
`<div class="sprite owner">` with CSS:

```css
.sweat {
  position: absolute;
  left: 30%;      /* relative to owner */
  top: -10%;      /* just above the head */
  width: 32px;
  height: 44px;
}
```

### `head-side`
Speed-line wavy marks indicating shake/anxiety. Place left of owner
(`left: -20%`) and right of owner (`left: 100%`).

### `face`
Heart-eyes, sunglasses, glint flashes. Center on the face area:
`left: 14%; top: 24%; width: 72%`. The width spans the eye region.

### `chest`
Necklace, heart pendant. `left: 22%; top: 52%; width: 55%`.

### `feet`
Shoe that's been kicked off, footprint. Special case: this often happens
mid-animation when the prop detaches. Use `feet` anchor and place near
the owner; the harness tolerates adjacency within 8% horizontal.

### `held-hand`
Strictly nested: the prop appears in the character's hand. Position
relative to the owner's hand pixel (estimate from PNG; iterate).

### `held-front`
The prop is held in front of the owner — visible to camera, partially
overlapping with the owner's body. Use for mirrors, flowers offered,
weapons drawn. Either nest inside owner div OR place at stage level with
`left:` close to owner's `left:`. CSS `z-index: 21` (above sprite) makes
it visually "in front".

### `floating-above`
Speech balloon-style indicators above the character: shock, exclamation,
idea. Often pop with `scale 0.3→1` + light vertical bob.

## How to choose

Ask: "Where does this prop logically belong on the character's body or
in their hand?" Match to the closest zone. If unsure between two, pick
the more constrained one (nested) — overrides are cheap to relax later.

## Anti-patterns

**Don't** position emotion props at viewport-level `top: 23%`. Even if
visual placement works on your screen, the prop drifts when the owner
moves, AND the harness will fail anchor checks if the prop isn't a child
of the owner's sprite div.

**Don't** invent new anchor names. The harness only understands the 8
above. If you need a new zone, extend `ANCHOR_RULES` in `check.mjs` and
document the new entry here.

**Don't** mix `data-anchor` (attribute on the SVG element) with manifest
`anchor` field for the same prop — pick one. Manifest is canonical; the
data-attr is just helpful for grep and future inspection.
