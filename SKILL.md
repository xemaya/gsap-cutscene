---
name: gsap-cutscene
description: Use this skill whenever the user wants to build a short browser-based animation (5–30 seconds) — game opening cutscenes, dialog skits, character reactions, transitions (board unroll, scene wipe), reversal mini-skits. Triggers on phrases like "opening animation", "cutscene", "skit", "scene transition", "short animation", "puppet animation", "我们做个开场动画", "做一个小剧场", "反转 / 翻转 / 抖音风", "felt diorama animation", or anytime the user wants a video-style scene rendered in HTML/JS as a cheaper / iterable alternative to Sora/Veo video gen. ALWAYS use this skill for any browser animation task that has characters with dialog, emotional states, or timed appearances — even if the user doesn't explicitly say "use gsap". Hard dependency on `gsap-skills` (8 sub-skills); if those aren't available, the first action must be `npx skills add greensock/gsap-skills -g -y`.
---

# gsap-cutscene

Author short browser animations as **declarative timelines + deterministic
checks**, not as ad-hoc GSAP code. The skill embraces the constraint that we
can't generate animations from data (like Sora/Veo) and instead pushes that
"commonsense" into structured rules — Flash-era animation workflow.

## Dependency check (do this FIRST on a fresh machine)

This skill produces files that import GSAP from CDN at runtime, but the
**agent** uses `gsap-skills` (8 sub-skills: `gsap-core`, `gsap-timeline`,
`gsap-scrolltrigger`, `gsap-plugins`, `gsap-react`, `gsap-frameworks`,
`gsap-performance`, `gsap-utils`) as a reference during authoring.

Check whether they're available — they appear in your `available_skills`
list with names starting `gsap-`. If they are NOT present, install them:

```bash
npx skills add greensock/gsap-skills -g -y
```

Then proceed.

## When to use this skill (more triggers)

- "开场动画" / "opening animation" / "intro cutscene"
- "小剧场" / "skit" / "短剧"
- "对话动画" / "dialog scene"  
- "转场" / "transition" / "scene wipe"
- "反转动画" / "twist animation"  / "plot reversal"
- "boss reveal" / "character introduction"
- "省视频生成 API 钱" / "cheaper than Sora"
- "puppet animation" / "felt animation" / "stop-motion-style web"

## Core abstraction: MANIFEST

Every animation declares one. It is the single source of truth for what's
visible when, who owns what prop, what emotional state each character is
in, AND **what dramatic beats structure the story**. The harness derives
all logical-consistency AND writing-quality checks from this declaration.

Schema (full reference: `references/manifest-spec.md`):

```js
window.MANIFEST = {
  duration: 13,
  // === Writing-side metadata (REQUIRED, enforced by harness) ===
  genre: "reveal",  // physical-comedy | chase | reveal | transform | impact-gag
                    // (dialog-drama is BLOCKED — see "tool capability" below)
  beats: [
    // narrative beat sheet: hook (≤2s) → setup → escalate → twist → punch (>70% of duration)
    { t: 0.6,  kind: "hook",     owner: "walker", action: "shamble-in"     },
    { t: 4.5,  kind: "setup",    owner: "walker", action: "weep-touched"   },
    { t: 6.65, kind: "twist",    owner: "fatty",  action: "demand-debt"    },
    { t: 9.2,  kind: "punch",    owner: "walker", action: "shock-flee"     },
  ],

  // === Cast — what's on stage when ===
  cast: [
    { id: "walker", kind: "sprite", from: 0.6 },
    { id: "tear", kind: "prop", from: 4.5, to: 5.4,
      owner: "walker", anchor: "forehead", emotion: "sad" },
    { id: "bubble", kind: "dialog", from: 2.5, to: 6.5,
      owner: "fatty", text: "兄弟...这些年..." },
    // SVG OVERLAY auto-spawned from vocabulary (see scripts/overlays.js)
    { id: "sweat1", kind: "overlay", from: 3.0, to: 4.5,
      owner: "walker", overlay: "sweat-drop", emotion: "sad",
      position: { left: "20%", top: "-5%", width: "16px" } },
    // PARTICLE-BURST — JS-spawned; manifest entry is doc + mutex input only
    { id: "hearts-burst", kind: "particle-burst", from: 5.5, to: 6.5,
      owner: "walker", emotion: "happy" },
  ],
};
```

**Anchor zones** (where a prop sits relative to its owner):

| Anchor | Rule |
|--------|------|
| `forehead`, `head-side`, `face`, `chest`, `held-hand` | MUST be DOM child of owner's `<div>` |
| `feet` | nested OR adjacent within 8% horizontal |
| `held-front` | nested OR adjacent within 12% |
| `floating-above` | nested OR adjacent within 15% |

**Emotion valences** (for mutex check):

| Valence | Emotions |
|---------|----------|
| sad | `sad`, `panicked`, `crying` |
| happy | `happy`, `lovestruck`, `warm`, `impressed` |
| neutral | `shocked`, `surprised`, `confused` (allowed to co-occur with anything) |

**Mutex rule**: per owner, SAD-valence and HAPPY-valence props must NOT
have overlapping `[from, to]` time windows. The harness checks this
deterministically (interval-intersection).

## Runtime helpers: timeline-lib + overlays

The skill bundles two runtime scripts (≈300 lines total, no deps):

```html
<script src="path/to/scripts/overlays.js"></script>        <!-- comic-vocab SVGs -->
<script src="path/to/scripts/timeline-lib.js"></script>    <!-- applyManifest -->
<script>
  window.MANIFEST = { ... };
  function play() {
    const tl = gsap.timeline();
    applyManifest(window.MANIFEST, tl);     // visibility + dialog + overlay spawn
    // motion-only tweens below — autoAlpha is fully managed.
    tl.to("#scout", { x: 0, duration: 1.4 }, 0.6);
  }
</script>
```

**`overlays.js`** exposes a comic-style SVG vocabulary — sweat-drop,
question-mark, exclaim, shock-balloon, zzz, sparkle-star, speed-line,
shake-mark, impact-burst, cotton-poof, ellipsis, thought-cloud,
heart, heart-eyes, tear-drop. Use them via `kind: "overlay"` cast entries
or imperatively via `window.spawnOverlay(parentDiv, name, position)`.

These overlays are the **escape valve** for single-PNG sprite limitations.
You can't animate a sprite's mouth, but you CAN drop an `exclaim`
balloon over its head to convey shock — same readability for a fraction
of the budget.

## Why genre + beats are MANDATORY

Our tools are **Keaton/Newgrounds tools**, not Pixar tools — they can do
MACRO motion (translate / scale / rotate / pose-swap / prop physics) but
NOT MICRO acting (eye blink, mouth sync, subtle limb gestures on a
single PNG). Scripts that rely on micro-acting produce stiff, lifeless
animations.

The `genre` + `beats` fields force the author to structure the story
around motion, not around dialogue/expression. The harness gate refuses
`genre: dialog-drama` and refuses manifests where `dialog` text exceeds
`duration × 8` chars (so the typewriter doesn't eat the visual budget).

**If you find yourself writing a sit-and-talk skit, stop**. Either:
1. Rewrite as physical comedy / chase / reveal / transform / impact-gag, OR
2. Add face-parts kit assets (multiple head expressions per character) — out of scope for v1 of this skill.

## Static harness: check.mjs

After building, run:

```bash
node path/to/scripts/check.mjs <animation-dir>
```

It parses `index.html`, finds `window.MANIFEST` + DOM, and validates:

- `from < to` for every entry
- `to ≤ duration`
- Every prop's `[from, to]` ⊆ owner's `[from, to]`
- Every prop's anchor zone (DOM nesting or adjacency)
- Per-owner SAD ↔ HAPPY temporal mutex (interval intersection)
- Plus structural checks: canonical fonts, `window.current` exposed, GSAP
  import present, file size, etc.

Exit 0 = ship-ready; non-zero = blocked. **Always run this before
declaring an animation done.**

## 5-phase authoring workflow

Read `references/playbook.md` for the full 5-phase methodology with worked
pitfalls (em-vs-px units, GSAP overwriting CSS transforms, seek+callback
side effects, prop-anchor pixel alignment, etc.). Short version:

1. **Brief & assets** (~30 min) — story 1-2 sentences; lock visual style
   anchor; inventory character PNGs and props.
2. **Emotion arc + MANIFEST** (~20 min) — write per-character emotion
   table over time first; derive cast entries with ACT comments. Verify
   mutex gap in comments BEFORE coding.
3. **Single-file HTML** (~1 h) — DOM skeleton, load `timeline-lib.js`,
   declare `window.MANIFEST`, write motion-only tweens.
4. **Visual iteration** (~1 h) — Playwright MCP key-beat snapshots at
   1280×800; adjust.
5. **Harness** (~5 min) — `node check.mjs`, must be 0 FAIL.

## Worked examples (bundled)

`assets/skit-template.html` is a fill-in-the-blanks template. Copy and
edit the MANIFEST + motion sections. The template imports a relative
`timeline-lib.js` and includes the dialog bubble DOM structure that the
typewriter expects.

For complete reference implementations, see the project at
`/Users/huanghaibin/Workspace/games/gsap/series/scout-zombies/` (if
present on this machine). Five animations there cover transitions,
dialog scenes, and reversal skits.

## Directory pattern (recommended)

Organize your animation work as:

```
<workspace>/
├── docs/             # methodology you carry over from this skill
├── scripts/          # check.mjs + timeline-lib.js (copy from this skill)
├── series/           # one folder per IP series
│   └── <ip-name>/
│       ├── README.md   # style guide + asset table + animation index
│       ├── art         # symlink to your art source
│       └── <anim>/     # one folder per scene; single-file HTML
└── (deploy infra as needed)
```

## What this skill does NOT cover

- Photorealistic lip-sync (use video gen)
- Real fluid/fire physics (out of scope for CSS/SVG)
- 60-second+ feature-length (video gen becomes economical)
- Multi-pose character animation (sprites are one PNG; need extra renders
  for new expressions — use `image-work-flow` companion tool)

## Files in this skill

- `SKILL.md` — this file
- `scripts/check.mjs` — static harness (run via Node ≥18) — now validates
  genre + beats structure + dialog density on top of anchor / owner / mutex
- `scripts/timeline-lib.js` — runtime: applyManifest auto-fades + dialog
  typewriter + overlay spawn
- `scripts/overlays.js` — 15 comic-style SVG primitives (sweat / heart /
  exclaim / zzz / thought-cloud / cotton-poof / etc.)
- `references/manifest-spec.md` — full MANIFEST schema with edge cases
- `references/playbook.md` — 5-phase workflow + 11 pitfalls
- `references/anchor-zones.md` — anchor zone reference card
- `assets/skit-template.html` — copy-and-edit starter HTML
