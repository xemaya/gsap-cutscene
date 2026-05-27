# GSAP Opening Playbook

A first-cut method for turning a story brief + character assets into a
10-second opening animation that ships in a browser. Distilled from building
the Combo Hopper opening (May 2026, ~3h start-to-final). **Not a skill yet
— needs more reps before it earns the name.** Use this file as a working
checklist; refine in place after each new animation.

## When to use this over a video-gen API

Pick GSAP when:

- You need **≥ 2 iterations** (changing dialog, timing, expressions). Each
  iteration is free.
- The character will **reappear later** in the project. Sprite reuse compounds.
- Animation must **stay in-browser** (no MP4 file to host, no codec concerns).
- Cost budget is **< $5 per opening cycle**.

Pick video-gen when:

- One-shot promo, never to iterate.
- Complex hair/cloth physics, real fluids, photoreal humans.
- True lip-sync to voiced dialog.

## End-to-end flow (5 phases)

### Phase 1 — Brief & assets (≈ 30 min)

1. **Story brief in 1–2 sentences.** Force yourself to write it out.
   e.g. "Scout hikes in, zombies ambush, scout improvises weapons, title slams."
2. **Style anchor.** Find or write a style guide. We used
   `combo-hopper/art-pipeline/anchor.md`. Extract:
   - Palette (incl. **forbidden colors** — neon, oversaturated, etc.)
   - Medium (felt, pixel, vector, photoreal?)
   - Mood verbs
   - "Invariants" — things that must not drift across assets.
3. **Asset inventory.** List every PNG that exists. Note dimensions,
   transparency status, pose (idle / in-action), and what's missing.
4. **Branch decision.**
   - Real assets ready? → go straight to Phase 2 with them.
   - Assets not ready? → build a pure-SVG PoC with placeholder shapes first
     to validate timing, then swap in assets.

### Phase 2 — Beat sheet (≈ 20 min)

**Write the timeline as a 6-column markdown table before touching code.**

| Time | Beat | Actor | Action | Camera/FX | Transition |
|------|------|-------|--------|-----------|------------|

Rules:

- Granularity: **0.5s**. Total budget: 10s for an opening.
- Every actor must have an entry AND an exit (or dim-out) row.
- Camera verbs: `cut`, `pan`, `zoom`, `dolly`, `hold`. Don't invent new ones.
- Transition verbs: `fade`, `wipe`, `cut`, `match-cut`, `flash`.
- Each row should map to **~1–3 `tl.to(...)` calls**. If a row needs more,
  split it.
- Sanity check at the end: count expected GSAP ops. 40–60 total is typical
  for 10s.

### Phase 3 — Single-file HTML (≈ 1h)

Boilerplate that worked:

```html
<style>
  .stage  { position: fixed; inset: 0; overflow: hidden; }
  .sprite { position: absolute; will-change: transform, opacity; opacity: 0; }
  .sprite img { width: 100%; height: auto; display: block; }
</style>
<div class="stage" id="stage">
  <div class="diorama"></div>                <!-- bg layer -->
  <div class="sprite hero"><img src="..."/></div>
  <!-- other sprites, props, overlays, title -->
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script>
  function play() {
    // 1. reset all elements to initial state via gsap.set(...)
    // 2. const tl = gsap.timeline();
    // 3. add beats in TIME ORDER (top to bottom matches the table)
    // 4. return tl;
  }
  let current = play();
  window.current = current;       // CRITICAL: expose for seeking
  // optional REPLAY button:
  document.getElementById("replay").onclick = () => {
    current.kill(); gsap.killTweensOf("*");
    current = play(); window.current = current;
  };
</script>
```

Building blocks used repeatedly:

- `tl.to(target, { x, y, rotation, scale, autoAlpha, duration, ease }, time)`
- `tl.fromTo(target, fromVars, toVars, time)` — explicit start state
- `tl.set(target, vars, time)` — instantaneous swap. **Use this over
  `tl.add(callback)`** because GSAP handles `set()` correctly on seek;
  callbacks have side effects that survive a seek.
- `keyframes: [...]` — multi-segment motion (hops, shakes, impacts).
- **Parabolic throw**: two `.to()` calls — up-arc with `ease: "power1.out"`,
  down-arc with `ease: "power2.in"`. Add `rotation: 720` to spin the projectile.

### Phase 4 — Visual iteration (≈ 1–1.5h)

The loop:

1. Reload the page in browser
2. `window.current.pause(); window.current.time(T)` — seek to a beat
3. Screenshot (Playwright MCP works well, or eyeball)
4. Adjust `tl.to(...)` params
5. Reload

Tooling that made this fast:

- **HTTP server runs at workspace root**, not inside the project. Keeps
  project paths clean and lets you keep multiple animations side-by-side.
- **`assets/` is a symlink to the project's image folder**, never a copy.
  Upstream art updates propagate.
- **Element-level screenshot** via `page.locator("#scout").screenshot()` for
  inspecting small details like hand-prop alignment.
- **`browser_resize(1280, 800)`** before screenshots — Playwright default
  viewport is mobile-narrow (390px) which compresses everything.

### Phase 5 — MANIFEST + harness (Flash timeline style)

The animation is structured around a `window.MANIFEST` declaration at the
top of the file. Each entity (sprite / prop / dialog) has `from` and `to`
times. `applyManifest()` (from `harness/timeline-lib.js`) auto-injects all
visibility tweens + dialog typewriter. **Business code below only writes
motion** (position / scale / rotation / loops).

This is the Flash workflow: each layer has a visibility track. We embraced
the constraint of our tool stack — we can't learn commonsense from data,
so we make every entity's appearance window explicit.

```html
<script src="../harness/timeline-lib.js"></script>
<script>
window.MANIFEST = {
  duration: 13,
  cast: [
    { id: "walker", kind: "sprite", from: 0.6 },
    { id: "tear",   kind: "prop", from: 4.5, to: 5.4,
      owner: "walker", anchor: "forehead", emotion: "sad" },
    { id: "bubble", kind: "dialog", from: 2.5, to: 6.5,
      owner: "fatty", text: "兄弟...这些年..." },
  ],
};
</script>
```

Then run harness — it reads the manifest and derives ALL checks:

```bash
node harness/check.mjs <animation-dir>
```

- `data-anchor` on each prop SVG → DOM nesting + adjacency rules
- `from`/`to` per cast entry → visibility windows
- `emotion` per cast entry → per-owner mutex (sad and happy props can
  declare on same owner only if their `from`/`to` windows don't overlap)

Adding a new skit = declare manifest + write motion tweens. No new harness
rules. **This is the N→N scaling solution.**

Then **snapshot every key beat** at 1280×800 viewport via Playwright MCP
(it's a habit, not optional). For each snapshot eyeball:

| Check | What to look for |
|---|---|
| character placement | matches beat-sheet text — "scout left, fatty right" etc. |
| item proportion | bubble ≈ character head size; props fit in hand/face zones, not floating |
| bubble tail anchor | tail tip points at the speaker's head, not random |
| z-order | dialog > characters > props > bg |
| style coherence | felt-diorama feel — no thin vector lines, no flat-color, no neon |

Save snapshots only if they're worth keeping (permanent reference).
Iteration screenshots throw away.

Patch anything FAIL, re-run, re-snap. Ship only on 0 FAIL + visual pass.

## Pitfalls (each cost us 5–20 min)

### 1. `globalTimeline.time(t)` doesn't undo past callbacks
If your timeline runs `gsap.set(...)` inside an `add(() => {...})` block,
seeking past that point **fires the callback**, leaving state inconsistent
when you later seek back. Always prefer `tl.set(target, vars, time)` in the
timeline — GSAP knows how to reverse it on seek-back.

### 2. `em` in flex `gap` uses parent's font-size
A title row with 130px children and `gap: 0.45em` gives a **7px** gap
(parent inherits 16px body font-size, 16 × 0.45 ≈ 7). Use
`padding-right` on the child instead — that em is computed against the
child's font-size, which is what you want.

### 3. GSAP overwrites CSS `transform: translate(-50%,-50%)`
For center-anchored absolute elements (impact poofs, custom markers), use
`xPercent: -50, yPercent: -50` in `gsap.set()`. GSAP then manages the anchor
through its own transform pipeline. The CSS-level `translate(-50%,-50%)`
gets blown away the moment any GSAP `x`/`y`/`scale` runs.

### 4. Nested `z-index` and stacking contexts
A child of `.scout { z-index: 20 }` with `z-index: 24` sits **above other
`.scout` children** but **below another `.scout`-sibling with z 25**, because
`.scout` forms a stacking context. Always think layer hierarchy first, raw
`z-index` numbers second. Use Chrome DevTools "Layers" tab when in doubt.

### 5. `mix-blend-mode: screen` on dark backgrounds
First version of the cotton-poof impact used a cream radial gradient with
`mix-blend-mode: screen` — the effect vanished on dark forest green because
"screen" multiplies brightness and the bg was already low-luminance. Solid
radial gradient + `box-shadow` glow works on any background.

### 6. `vw` vs `px` for distances that should scale
Use `vw` (`x: "-15vw"`) for motion that should feel proportional to viewport
width — character recoils, scene-traversal distances. Use `px` for fine
motion that's "always the same visual size" (UI shake, small wobbles).
Mixing them without thinking gives a recoil that looks ferocious on desktop
and pathetic on mobile, or vice versa.

### 7. `gsap.from()` immediateRender
`gsap.from(target, vars)` immediately writes `vars` as the start state, then
animates back. Stacking multiple `from()`s on the same property of the same
target requires `immediateRender: false` on the later ones — otherwise the
later `from`'s "from" state overwrites the earlier `from`'s end state
before it gets a chance to play.

### 8. Hand-anchoring a prop on a character sprite
A "flag in the scout's hand" took 3 iterations to anchor correctly because:
- `scout.png` has hands at ~28% from left, 55% from top of the PNG bbox
- The flag SVG's pole was at the **edge** of its own viewBox, not center
- `transform-origin: 50% 100%` pivoted around bbox-bottom-center, not
  pole-bottom

Fix sequence: (1) rewrite SVG so pole is at viewBox center-x, (2) set
`transform-origin: 50% 100%`, (3) iterate `.flag { left:X%; bottom:Y% }`
inside `.scout` until a `getBoundingClientRect()` check shows the pole
bottom landing on the hand pixel.

### 9. GSAP `y: "95%"` is **element-self** percent, not parent percent
This is the same gotcha as CSS `transform: translateY(95%)` — both use the
element's own box height as the basis. So if you want a small element to
travel ~95% of a much larger PARENT, `y: "95%"` will only move ~95% of the
element's own height, which can look like "nothing happened".

Symptom: built a carpet-unroll animation where a thin cylindrical roll was
supposed to traverse the full board. With `y: "95%"`, the roll only moved
~8% of the parent (because the roll itself was 9% tall — 95% × 9% ≈ 8.5%).
Visually appeared static.

Fix: use a function that returns **px** computed from the parent at
animation time:
```js
y: () => document.getElementById("boardWrap").offsetHeight * 0.95
```
GSAP evaluates the function once when the tween renders, getting an
accurate parent-relative pixel distance.

Verify with `probe`-style evaluate: read both element's and parent's
`getBoundingClientRect()` at multiple t values to confirm the element
actually moves the intended fraction of parent.

### 10. Co-revealed elements should share ONE clip-path, not animate separately
When two visual elements are conceptually "one piece" (e.g. a rope frame
that lives around a board), DON'T animate them independently. Put both
inside a single clip-mask wrapper and animate the wrapper's `clip-path`.

Symptom: first version of the carpet-unroll had the board reveal via
clip-path (smooth, carpet-like) but the rope frame drop in afterward in
4 separate slide-in tweens. Watching it, the rope clearly "arrived as a
second piece" — visually broke the illusion that rope and board were one
woven object.

Fix: nest both `.board` and `.rope-full` inside `.board-clip`. The single
clip-path on `.board-clip` now reveals both at once, perfectly in sync.
Removed ~15 lines of redundant 4-segment rope animation.

General rule: **if two elements are part of the same physical object,
they should be in the same DOM subtree and share the same mask/clip
animation**. Independent tweens compose well for independent objects;
they betray a stitched illusion when used for unified ones.

### 11. Sprite mirroring without fighting GSAP — flip the inner `<img>`, not the GSAP-controlled outer div
When a sprite PNG faces the wrong way (e.g., the runner zombie's PNG is
running RIGHT but you need it chasing the scout to the LEFT), do NOT apply
`transform: scaleX(-1)` to the outer GSAP-controlled wrapper. GSAP's
transform pipeline (`x` / `y` / `scale` / `rotation`) overwrites or fights
the CSS flip, and the sprite will appear un-mirrored as soon as any tween
sets a transform.

Fix: wrap the sprite as `<div class="char"><img src="..."></div>` and put
the mirror on the inner `<img>`:

```css
.runner img { transform: scaleX(-1); }
```

GSAP only touches the outer `.runner` div. The CSS mirror lives on the
inner `<img>`, in its own transform layer. The two never collide.

Cousin of pitfall #3: there we say "let GSAP own a center-anchor via
`xPercent: -50`". Here we say the reverse — "if a transform must NEVER
animate (e.g., a horizontal flip, a fixed rotation), isolate it on a
nested element GSAP doesn't touch". Both rules come from the same root:
**decide who owns each element's transform — CSS or GSAP — and don't
share the slot.**

Side effects to remember after mirroring inner img:
- Decorative overlays on the character (sweat drops, exclaim bubbles,
  prop SVGs) are usually positioned with `left: X%` on the parent. The
  mirror moves the visible character but does NOT move the overlays —
  re-tune their `left` after mirroring (e.g. `left: 55%` → `left: 28%`
  to follow the head from right-of-center to left-of-center).

## What's missing for this to be a skill

To upgrade this playbook into a `gsap-scene-choreographer` skill we'd need:

- A **beat-sheet template file** (markdown table) humans can fill before
  opening any editor.
- A **codegen step**: beat-sheet table → boilerplate `tl.to(...)` lines.
- A **per-character sprite kit spec** — for each character: which poses
  to generate, what dimensions, what anchor points to mark.
- A **sound-cue hook spec** so audio integrates without re-jiggering the
  timeline. (e.g. SFX file naming convention + load + play-at-cue helper.)
- Worked examples across **3+ different projects** (we have 1).

When all of those exist, this becomes a skill. Until then: copy this file
into the next project and follow the 5 phases.

## Reference implementations

- `/Users/huanghaibin/Workspace/games/combo-hopper/opening/` — Combo Hopper
  felt-style 10s opening (shipped). Style anchor:
  `combo-hopper/art-pipeline/anchor.md`. README inside that dir documents
  the beat sheet, asset inventory, visual tokens, and integration paths.
- `/Users/huanghaibin/Workspace/games/gsap/unroll-board/` — Combo Hopper
  4–5s board unroll transition. Demonstrates clip-path reveal synced to a
  cylinder roll (pitfalls #9 element-self percent and #10 co-revealed
  clip-mask both came from this one).
- `/Users/huanghaibin/Workspace/games/gsap/opening.html` — Loop-style
  紫黑 cinematic. Title sequence + scrub-pinned scroll. Different rhythm.
- `/Users/huanghaibin/Workspace/games/gsap/index.html` — GSAP capability
  showcase (8 sub-skills). Reference, not for production.
