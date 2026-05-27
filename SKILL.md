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
visible when, who owns what prop, and what emotional state each character
is in at each beat. The harness derives all logical-consistency checks
from this declaration — anchor zones, owner-window containment, emotion
temporal mutex — so there's no need to enumerate per-bug rules.

Schema (full reference: `references/manifest-spec.md`):

```js
window.MANIFEST = {
  duration: 13,                        // total animation length in seconds
  cast: [
    // SPRITES — full characters
    { id: "scout", kind: "sprite", from: 0.6 },

    // PROPS — emotion indicators or held objects, with owner + anchor
    { id: "tear", kind: "prop", from: 4.5, to: 5.4,
      owner: "scout", anchor: "forehead", emotion: "sad" },

    // DIALOG — typewriter-driven bubble text
    { id: "bubble", kind: "dialog", from: 2.5, to: 6.5,
      owner: "scout", text: "你也在做这个循环吧？" },

    // PARTICLE-BURST — multiple JS-spawned instances; manifest = doc only
    { id: "hearts-burst", kind: "particle-burst", from: 5.5, to: 6.5,
      owner: "scout", emotion: "happy" },
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

## Runtime helper: applyManifest

The skill bundles `scripts/timeline-lib.js` (≈80 lines, no deps). The
animation's HTML loads it and calls `applyManifest(window.MANIFEST, tl)`,
which auto-injects all `autoAlpha` fade-in/fade-out tweens + dialog
typewriter. Business code only writes MOTION (position / scale /
rotation / loops) — never visibility.

```html
<script src="path/to/scripts/timeline-lib.js"></script>
<script>
  window.MANIFEST = { ... };
  function play() {
    const tl = gsap.timeline();
    applyManifest(window.MANIFEST, tl);     // visibility + dialog text
    // motion tweens below
    tl.to("#scout", { x: 0, duration: 1.4 }, 0.6);
    // ...
  }
</script>
```

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
- `scripts/check.mjs` — static harness (run via Node ≥18)
- `scripts/timeline-lib.js` — runtime helper (load via `<script>`)
- `references/manifest-spec.md` — full MANIFEST schema with edge cases
- `references/playbook.md` — 5-phase workflow + 11 pitfalls
- `references/anchor-zones.md` — anchor zone reference card
- `assets/skit-template.html` — copy-and-edit starter HTML
