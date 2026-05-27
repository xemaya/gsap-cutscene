# MANIFEST schema reference

The `window.MANIFEST` object is the single source of truth for an animation.
Read this if you're authoring a non-trivial scene and need to confirm
schema edge cases.

## Top-level

```js
window.MANIFEST = {
  duration: 13,            // required: total animation length in seconds
  cast: [ /* entries */ ], // required: list of entities
};
```

## Cast entry — common fields

| Field    | Type       | Required | Notes |
|----------|-----------|----------|-------|
| `id`     | string    | yes      | DOM element id (or shared id for multi-line dialog) |
| `kind`   | enum      | yes      | `sprite` / `prop` / `dialog` / `particle-burst` |
| `from`   | number    | yes      | seconds; entity becomes visible |
| `to`     | number    | no\*     | seconds; entity fades out. If omitted, stays visible till `duration` |
| `fadeIn` | number    | no       | seconds, override default 0.3 |
| `fadeOut`| number    | no       | seconds, override default 0.3 |

\* `to` is technically optional, but the harness only validates emotion mutex
when both `from` and `to` are present.

## Per-kind fields

### `sprite` — a character

```js
{ id: "scout", kind: "sprite", from: 0.6 }
```

`id` must match a `<div class="sprite" id="...">` in the DOM. No `owner` —
sprites are root-level actors.

### `prop` — an emotion indicator or held object

```js
{ id: "tear", kind: "prop", from: 4.5, to: 5.4,
  owner: "scout", anchor: "forehead", emotion: "sad" }
```

| Field     | Required | Notes |
|-----------|----------|-------|
| `owner`   | yes      | id of a `sprite` entry |
| `anchor`  | yes      | one of 8 zones (see anchor-zones.md) |
| `emotion` | optional | for mutex check; see valence table below |

### `dialog` — typewriter-driven bubble line

```js
{ id: "bubble", kind: "dialog", from: 2.5, to: 6.5,
  owner: "fatty", text: "兄弟...这些年..." }
```

| Field    | Required | Notes |
|----------|----------|-------|
| `owner`  | yes      | id of the speaker sprite |
| `text`   | yes      | string to typewriter into the bubble |

The same `id` can appear in multiple `dialog` entries — each represents
one line, and `applyManifest` swaps the text in/out at the right time.
DOM structure expected:

```html
<div class="bubble" id="bubble">
  <div class="who">WHO</div>
  <div class="text"><span id="bubbleText"></span><span class="caret"></span></div>
</div>
```

The typewriter targets `.text > span` (the first one). The caret stays
static.

### `particle-burst` — JS-spawned multi-instance effect

```js
{ id: "hearts-burst", kind: "particle-burst", from: 5.5, to: 6.5,
  owner: "walker", emotion: "happy" }
```

`applyManifest` does NOT touch these — the manifest entry is
documentation + mutex input only. The actual particle spawning is JS
code (e.g. `for (i...) document.createElement(...)`).

`owner` and `emotion` still participate in mutex checks. Set them.

## Emotion valences (for mutex)

| Valence | Emotions |
|---------|----------|
| sad     | `sad`, `panicked`, `crying` |
| happy   | `happy`, `lovestruck`, `warm`, `impressed` |
| neutral | `shocked`, `surprised`, `confused` — co-exists freely |

## Constraints the harness verifies

1. **Timing sanity**: `from ≥ 0`, `to > from`, `to ≤ duration`.
2. **Owner window containment**: every prop's `[from, to]` ⊆ owner's
   `[from, to]`. A prop cannot exist before its owner appears or after
   the owner leaves.
3. **Anchor zone rule**:
   - `forehead` / `face` / `head-side` / `chest` / `held-hand`: prop's
     `<svg>` must be a DOM child of owner's `<div>`.
   - `feet`: nested OR CSS left% within 8% of owner's left%.
   - `held-front`: nested OR within 12%.
   - `floating-above`: nested OR within 15%.
4. **Emotion temporal mutex** (deterministic):
   - For each owner, collect all SAD-valence intervals and all HAPPY-
     valence intervals.
   - Check pairwise interval intersection: if any SAD interval overlaps
     any HAPPY interval, FAIL.

## Worked example: skit-debt MANIFEST

```js
window.MANIFEST = {
  duration: 13,
  cast: [
    // ACT 1: arrivals
    { id: "walker", kind: "sprite", from: 0.6 },
    { id: "fatty",  kind: "sprite", from: 0.7 },

    // ACT 2: warm phase
    { id: "bubble", kind: "dialog", from: 2.5, to: 6.5,
      owner: "fatty", text: "兄弟...这些年..." },
    // walker SAD window: 4.5–5.4
    { id: "tear",   kind: "prop", from: 4.5, to: 5.4,
      owner: "walker", anchor: "forehead", emotion: "sad" },
    // walker HAPPY window: 5.5–6.5 — gap of 0.1s satisfies mutex
    { id: "hearts-burst", kind: "particle-burst", from: 5.5, to: 6.5,
      owner: "walker", emotion: "happy" },

    // ACT 3: twist
    { id: "bubble", kind: "dialog", from: 6.65, to: 9.5,
      owner: "fatty", text: "...你欠我的钱呢?" },
    { id: "shock",  kind: "prop", from: 8.2, to: 9.5,
      owner: "walker", anchor: "floating-above", emotion: "shocked" },
    { id: "watch",  kind: "prop", from: 8.7, to: 9.5,
      owner: "walker", anchor: "held-front" },
  ],
};
```

Verifying mutex in head:
- walker SAD: `[4.5, 5.4)`
- walker HAPPY: `[5.5, 6.5)`
- 5.4 ≤ 5.5 ✓ no overlap
- walker has SHOCKED (neutral), can co-occur with anything ✓

The harness produces the same answer deterministically via interval
intersection. No LLM, no commonsense — just arithmetic.
