#!/usr/bin/env node
// harness/check.mjs — Static + heuristic validation for a GSAP animation directory.
// Runs against an animation's index.html. No external deps. No browser launched.
//
// Usage:    node harness/check.mjs <animation-dir>
// Example:  node harness/check.mjs skit-debt

import fs from "node:fs";
import path from "node:path";

// ---- canon (from combo-hopper/art-pipeline/anchor.md + project conventions) ----
const CANON = {
  fonts: {
    required: ["Fredoka", "Patrick Hand"],
    chineseFallback: /PingFang SC|system-ui|ZCOOL KuaiLe|Noto Sans SC/,
  },
  forbiddenColors: [
    // pure neon and oversaturated values are off-style for felt diorama
    "#ff00ff", "#ff00",  "#00ffff", "#00ff",
    "#ff0000", "#0000ff", "#39ff14", "#ffff00",
  ],
  charClasses: /\.(scout|walker|runner|fatty|hero)\s*\{/g,
  spriteWidth: { min: 10, max: 22 },        // % of viewport
  bubbleAttrs: {
    centered: /xPercent:\s*-50/,            // bubble centering convention
    anchorBottom: /bottom:\s*['"]?[345]\d%/, // bubble above sprite, not stuck at top
  },
};

const animDir = process.argv[2];
if (!animDir) {
  console.error("usage: node harness/check.mjs <animation-dir>");
  process.exit(1);
}
const root = path.resolve(animDir);
const html = path.join(root, "index.html");
if (!fs.existsSync(html)) {
  console.error(`no index.html at ${html}`);
  process.exit(2);
}
const src = fs.readFileSync(html, "utf8");

const r = [];
const ok    = (n, d) => r.push({ ok: "PASS", n, d });
const warn  = (n, d) => r.push({ ok: "WARN", n, d });
const fail  = (n, d) => r.push({ ok: "FAIL", n, d });
const info  = (n, d) => r.push({ ok: "INFO", n, d });

// 1. window.current exposed (CLAUDE.md rule #3)
if (/window\.current\s*=\s*current/.test(src) || /window\.current\s*=\s*play\(/.test(src)) {
  ok("window.current exposed for seek/debug", null);
} else {
  fail("window.current NOT exposed — playwright seek won't work", "add `window.current = current;` after `let current = play();`");
}

// 2. GSAP from CDN
const gv = src.match(/gsap@([\d.]+)/);
gv ? ok("GSAP CDN imported", `version ${gv[1]}`) : fail("GSAP not imported via gsap@x.y.z CDN", null);

// 3. No GSAP plugins unless declared
const plugins = [...src.matchAll(/registerPlugin\(\s*([A-Za-z]+)/g)].map(m => m[1]);
if (plugins.length) {
  info("GSAP plugins used", plugins.join(", "));
}

// 4. Canonical fonts loaded
const fontsFound = CANON.fonts.required.filter(f => src.includes(f));
if (fontsFound.length === CANON.fonts.required.length) {
  ok("canonical fonts present", fontsFound.join(", "));
} else {
  fail("canonical fonts missing", `expected ${CANON.fonts.required.join(", ")}; found ${fontsFound.join(", ") || "none"}`);
}

// 5. Chinese fallback chain
CANON.fonts.chineseFallback.test(src)
  ? ok("Chinese font fallback chain present", null)
  : warn("Chinese font fallback chain missing", "add `PingFang SC, system-ui` or similar to dialog font-family");

// 6. No forbidden colors
const lower = src.toLowerCase();
const bad = CANON.forbiddenColors.filter(c => lower.includes(c.toLowerCase()));
bad.length === 0
  ? ok("no neon/forbidden colors", null)
  : fail("forbidden colors present", bad.join(", "));

// 7. assets/ symlink resolves
const assetsDir = path.join(root, "assets");
let assetsTarget = null;
try { assetsTarget = fs.realpathSync(assetsDir); } catch {}
assetsTarget
  ? ok("assets/ symlink resolves", path.relative(root, assetsTarget))
  : fail("assets/ symlink missing or broken", null);

// 8. All <img src> reachable on disk
const imgs = [...src.matchAll(/<img[^>]+src=["']([^"']+)["']/g)].map(m => m[1]);
const missingImgs = imgs.filter(p => !fs.existsSync(path.join(root, p)));
imgs.length
  ? (missingImgs.length === 0
      ? ok(`${imgs.length} sprite images reachable`, null)
      : fail(`${missingImgs.length} sprite images missing`, missingImgs.join(", ")))
  : warn("no <img> sprites referenced", "is this animation purely SVG/CSS?");

// 9. Character class widths in canonical range
const charBlocks = [...src.matchAll(/\.(scout|walker|runner|fatty|hero)\s*\{[^}]*\bwidth:\s*(\d+)%/g)];
if (charBlocks.length) {
  const issues = charBlocks
    .map(([, cls, w]) => ({ cls, w: parseInt(w) }))
    .filter(x => x.w < CANON.spriteWidth.min || x.w > CANON.spriteWidth.max);
  issues.length === 0
    ? ok(`${charBlocks.length} character widths within ${CANON.spriteWidth.min}–${CANON.spriteWidth.max}%`, null)
    : warn("character widths outside canonical range",
            issues.map(i => `${i.cls}=${i.w}%`).join(", "));
}

// ---- 9a–c (declarative engine) ----
// Each prop SVG carries `data-owner`, `data-anchor`, optionally `data-emotion`.
// Harness derives ALL logical-consistency checks from these 3 attrs.
// Adding a new anim → write attrs on each prop; no harness code changes.

// All anchors: nested-in-owner-div is ALWAYS OK; otherwise must be near owner.
// maxGapPct=0 effectively means "must be nested" (no adjacency tolerance).
const ANCHOR_RULES = {
  "forehead":       { maxGapPct: 0  },   // strict on-body
  "head-side":      { maxGapPct: 0  },
  "face":           { maxGapPct: 0  },
  "chest":          { maxGapPct: 0  },
  "feet":           { maxGapPct: 8  },   // detachables OK (e.g. shoe kicked off)
  "held-hand":      { maxGapPct: 0  },
  "held-front":     { maxGapPct: 12 },   // either nested OR within 12% horizontal
  "floating-above": { maxGapPct: 15 },   // either nested OR within 15%
};
// emotion → valence; same valence can co-occur; cross-valence on SAME owner is suspect
const EMOTION_VALENCE = {
  sad:        "sad",     panicked:  "sad",     crying:    "sad",
  happy:      "happy",   lovestruck:"happy",   impressed: "happy",   warm: "happy",
  shocked:    "neutral", surprised: "neutral", confused:  "neutral",
  angry:      "angry",
};

// extract every <svg ... data-owner=...>
const propTagRe = /<svg([^>]*\bdata-owner=[^>]*)>/g;
const declaredProps = [];
for (const m of src.matchAll(propTagRe)) {
  const attrs = m[1];
  const get = re => (attrs.match(re) || [])[1];
  declaredProps.push({
    startIdx: m.index,
    endIdx:   m.index + m[0].length,
    owner:    get(/\bdata-owner=["']([^"']+)["']/),
    anchor:   get(/\bdata-anchor=["']([^"']+)["']/),
    emotion:  get(/\bdata-emotion=["']([^"']+)["']/),
    cls:      get(/\bclass=["']([^"']+)["']/) || "",
    id:       get(/\bid=["']([^"']+)["']/) || "",
  });
}

if (declaredProps.length === 0) {
  info("no data-* annotated props", "(animation has no narrative props, or hasn't been migrated yet)");
} else {
  const ownerIds = new Set(
    [...src.matchAll(/<div[^>]*\bclass=["'][^"']*\bsprite\b[^"']*["'][^>]*\bid=["']([^"']+)["']/g)]
      .concat([...src.matchAll(/<div[^>]*\bid=["']([^"']+)["'][^>]*\bclass=["'][^"']*\bsprite\b[^"']*["']/g)])
      .map(m => m[1])
  );
  // helper: is `idx` inside the DOM range of <div id="ownerId">?
  function isInsideOwner(idx, ownerId) {
    const openRe = new RegExp(`<div[^>]*\\bid=["']${ownerId}["'][^>]*>`);
    const om = src.match(openRe);
    if (!om) return false;
    const openIdx = om.index;
    const after = src.slice(openIdx + om[0].length);
    let depth = 1, scan = 0, closeIdx = -1;
    while (scan < after.length && depth > 0) {
      const o = after.indexOf("<div", scan);
      const c = after.indexOf("</div>", scan);
      if (c === -1) break;
      if (o !== -1 && o < c) { depth++; scan = o + 4; }
      else { depth--; if (depth === 0) closeIdx = c; scan = c + 6; }
    }
    if (closeIdx === -1) return false;
    return idx > openIdx && idx < (openIdx + om[0].length + closeIdx);
  }
  // helper: read CSS class left%; fallback to inline style
  function readLeftPct(prop) {
    const tagSrc = src.slice(prop.startIdx, prop.endIdx);
    const inlineLeft = (tagSrc.match(/style=["'][^"']*\bleft:\s*(\d+)%/) || [])[1];
    if (inlineLeft) return parseInt(inlineLeft);
    for (const c of prop.cls.split(/\s+/)) {
      const m = src.match(new RegExp(`\\.${c}\\s*\\{[^}]*\\bleft:\\s*(\\d+)%`));
      if (m) return parseInt(m[1]);
    }
    return null;
  }
  function readOwnerLeftPct(ownerId) {
    const m = src.match(new RegExp(`\\.${ownerId}\\s*\\{[^}]*\\bleft:\\s*(\\d+)%`));
    return m ? parseInt(m[1]) : null;
  }

  // (A) every prop has owner that exists
  // (B) anchor zone rule satisfied (nested vs adjacent)
  // (C) per-owner emotion valence consistency
  const issues = { unknownOwner: [], badAnchor: [], notNested: [], tooFar: [] };
  const byOwnerValence = {};

  for (const p of declaredProps) {
    if (!ownerIds.has(p.owner)) {
      issues.unknownOwner.push(`#${p.id || p.cls} → owner "${p.owner}"`);
      continue;
    }
    if (!p.anchor) {
      issues.badAnchor.push(`#${p.id || p.cls} (no data-anchor)`);
    } else {
      const rule = ANCHOR_RULES[p.anchor];
      if (!rule) {
        issues.badAnchor.push(`#${p.id || p.cls} unknown anchor "${p.anchor}"`);
      } else {
        // Nested is always OK. Otherwise check horizontal proximity to owner.
        if (!isInsideOwner(p.startIdx, p.owner)) {
          const propLeft = readLeftPct(p);
          const ownerLeft = readOwnerLeftPct(p.owner);
          if (rule.maxGapPct === 0) {
            issues.notNested.push(`#${p.id || p.cls} (anchor=${p.anchor}) must be DOM-child of #${p.owner}`);
          } else if (propLeft != null && ownerLeft != null) {
            const gap = Math.abs(propLeft - ownerLeft);
            if (gap > rule.maxGapPct) {
              issues.tooFar.push(`#${p.id || p.cls} (anchor=${p.anchor}) ${propLeft}% vs #${p.owner} ${ownerLeft}% gap ${gap}% > ${rule.maxGapPct}%`);
            }
          }
        }
      }
    }
    if (p.emotion) {
      const val = EMOTION_VALENCE[p.emotion];
      if (val && val !== "neutral") {
        (byOwnerValence[p.owner] = byOwnerValence[p.owner] || {})[val] =
          (byOwnerValence[p.owner][val] || []).concat([p.id || p.cls]);
      }
    }
  }

  if (issues.unknownOwner.length) fail("data-owner references unknown sprite",
      issues.unknownOwner.join(", "));
  if (issues.badAnchor.length)    warn("missing or unknown data-anchor",
      issues.badAnchor.join(", "));
  if (issues.notNested.length)    warn("anchor demands DOM-nesting but prop is sibling",
      issues.notNested.join("; "));
  if (issues.tooFar.length)       warn("held/floating prop too far from owner",
      issues.tooFar.join("; "));

  const passed = !issues.unknownOwner.length && !issues.badAnchor.length
              && !issues.notNested.length && !issues.tooFar.length;
  if (passed) {
    const byAnchor = {};
    for (const p of declaredProps) byAnchor[p.anchor] = (byAnchor[p.anchor] || 0) + 1;
    ok(`${declaredProps.length} declarative props pass anchor rules`,
       Object.entries(byAnchor).map(([a, n]) => `${a}×${n}`).join(", "));
  }

  // emotion-mutex check (per owner, only same-owner conflicts flagged)
  const mutexConflicts = [];
  for (const [owner, valMap] of Object.entries(byOwnerValence)) {
    const valences = Object.keys(valMap);
    // sad + happy on SAME owner → mutex violation candidate
    if (valences.includes("sad") && valences.includes("happy")) {
      mutexConflicts.push(`${owner}: sad${JSON.stringify(valMap.sad)} + happy${JSON.stringify(valMap.happy)}`);
    }
  }
  if (mutexConflicts.length) {
    info("multi-valence emotions on same owner — temporal mutex checked below (rule 9e)",
         mutexConflicts.join("; "));
  }
}

// ---- 9e: MANIFEST temporal coherence (deterministic, no LLM) ----
// Parses window.MANIFEST.cast and verifies:
//   (a) from < to for every entry
//   (b) every prop's [from, to] is within its owner's [from, to]
//   (c) per-owner emotion mutex: SAD and HAPPY time windows must NOT overlap

const manifestRe = /window\.MANIFEST\s*=\s*(\{[\s\S]*?\n\s*\})\s*;/;
const manifestMatch = src.match(manifestRe);

if (!manifestMatch) {
  info("no window.MANIFEST declared", "(legacy file; consider migrating)");
} else {
  let manifest = null;
  try {
    // safe: we own these files
    manifest = (new Function(`return ${manifestMatch[1]};`))();
  } catch (e) {
    fail("MANIFEST present but unparseable", e.message);
  }

  if (manifest) {
    const cast = manifest.cast || [];
    const dur = manifest.duration ?? Infinity;
    const issues = { timing: [], owner: [], mutex: [] };

    // (a) timing sanity
    for (const e of cast) {
      if (e.from == null || e.from < 0) issues.timing.push(`${e.id}: invalid from=${e.from}`);
      if (e.to != null && e.to <= e.from) issues.timing.push(`${e.id}: to(${e.to}) ≤ from(${e.from})`);
      if (e.to != null && e.to > dur)    issues.timing.push(`${e.id}: to(${e.to}) > duration(${dur})`);
    }

    // (b) prop's window must be within owner's window
    const spriteWindows = {};
    for (const e of cast) {
      if (e.kind === "sprite") {
        spriteWindows[e.id] = { from: e.from, to: e.to ?? dur };
      }
    }
    for (const e of cast) {
      if (!e.owner) continue;
      const ow = spriteWindows[e.owner];
      if (!ow) {
        issues.owner.push(`${e.id}: owner #${e.owner} has no sprite entry`);
        continue;
      }
      const eTo = e.to ?? dur;
      if (e.from < ow.from)  issues.owner.push(`${e.id} from(${e.from}) < owner ${e.owner} from(${ow.from}) — appears before owner`);
      if (eTo > ow.to)       issues.owner.push(`${e.id} to(${eTo}) > owner ${e.owner} to(${ow.to}) — outlives owner`);
    }

    // (c) per-owner emotion mutex — sad and happy windows must not overlap
    const EMOTION_VAL = {
      sad: "sad", panicked: "sad", crying: "sad",
      happy: "happy", lovestruck: "happy", warm: "happy", impressed: "happy",
      // neutral valences (allowed to coexist with anything)
      shocked: "neutral", surprised: "neutral", confused: "neutral",
    };
    const owner_windows = {};  // {owner: [{id, val, from, to}]}
    for (const e of cast) {
      if (!e.owner || !e.emotion) continue;
      const v = EMOTION_VAL[e.emotion];
      if (!v || v === "neutral") continue;
      (owner_windows[e.owner] = owner_windows[e.owner] || []).push({
        id: e.id, val: v, from: e.from, to: e.to ?? dur,
      });
    }
    for (const [owner, ws] of Object.entries(owner_windows)) {
      const sads = ws.filter(w => w.val === "sad");
      const haps = ws.filter(w => w.val === "happy");
      for (const s of sads) for (const h of haps) {
        if (s.from < h.to && h.from < s.to) {
          issues.mutex.push(
            `${owner}: SAD(${s.id}) ${s.from}-${s.to}s OVERLAPS HAPPY(${h.id}) ${h.from}-${h.to}s`
          );
        }
      }
    }

    const allIssues = [...issues.timing, ...issues.owner, ...issues.mutex];
    if (allIssues.length === 0) {
      const totalEmotionEntries = Object.values(owner_windows).reduce((n, ws) => n + ws.length, 0);
      ok(`MANIFEST temporally coherent (${cast.length} entries, ${totalEmotionEntries} emotion-tagged, mutex satisfied)`,
         `duration=${dur}s`);
    } else {
      if (issues.timing.length) fail("MANIFEST timing", issues.timing.join("; "));
      if (issues.owner.length)  fail("MANIFEST owner-window violation", issues.owner.join("; "));
      if (issues.mutex.length)  fail("MANIFEST emotion mutex (TEMPORAL OVERLAP)", issues.mutex.join("; "));
    }
  }
}

// 9b. Narrative props must be visually prominent (≥ 40px or ≥ 4%).
// Particles (dust, mote, sparkle, leaf, stitch, puff-dot, speedline) are EXCLUDED
// — they're allowed tiny.
const NARRATIVE_PROPS = new Set([
  "tear","heart","watch","shock","sweat","boot","flower","mirror","weapon",
  "exclaim","sunglasses","chain","gloom","reaction","glint","shake-mark",
  "heart-eyes",
]);
const TINY_PX  = 40;
const TINY_PCT = 4;
// CSS class width: .className { ... width: NN(px|%); ... }
const propRules = [...src.matchAll(/\.([a-z][\w-]*)\s*\{[^}]*?\bwidth:\s*(\d+)(px|%)\b/gi)];
// inline <svg style="width:Npx"> (used for per-instance reactions in skit-makeover)
const inlineSvgRules = [...src.matchAll(/<svg[^>]*\bclass=["']([^"']*)["'][^>]*\bstyle=["'][^"']*\bwidth:\s*(\d+)(px|%)/gi)];
const allRules = [
  ...propRules.map(([, cls, w, u]) => ({ cls, w: parseInt(w), unit: u })),
  ...inlineSvgRules.flatMap(([, classes, w, u]) =>
    classes.split(/\s+/).map(cls => ({ cls, w: parseInt(w), unit: u }))
  ),
];
const tinies = [];
for (const r of allRules) {
  const cn = r.cls.toLowerCase();
  if (!NARRATIVE_PROPS.has(cn)) continue;
  if (r.unit === "px" && r.w < TINY_PX)  tinies.push(`${cn}=${r.w}px`);
  if (r.unit === "%"  && r.w < TINY_PCT) tinies.push(`${cn}=${r.w}%`);
}
const narrativeRules = allRules.filter(r => NARRATIVE_PROPS.has(r.cls.toLowerCase()));
if (narrativeRules.length === 0) {
  info("no narrative props detected", null);
} else if (tinies.length) {
  warn("tiny narrative props (likely hard to see at glance)",
       `${tinies.join(", ")}  —  rule: ≥ ${TINY_PX}px or ≥ ${TINY_PCT}%`);
} else {
  ok(`${narrativeRules.length} narrative props all ≥ ${TINY_PX}px / ${TINY_PCT}%`, null);
}

// 10. Bubble centered with xPercent:-50
if (/\.bubble\s*\{/.test(src) || /id=["']bubble/i.test(src)) {
  CANON.bubbleAttrs.centered.test(src)
    ? ok("dialog bubble uses xPercent:-50 centering", "playbook rule #3")
    : warn("dialog bubble not using xPercent:-50",
            "see playbook pitfall #3 (GSAP overwrites CSS translate)");
}

// 11. mirror trick: any inner-img transform: scaleX(-1)?
if (/img\s*\{[^}]*transform:\s*scaleX\(-1\)/.test(src)) {
  ok("sprite mirror applied on inner <img>", "playbook rule #11");
}

// 12. dimension sanity: file size
const stat = fs.statSync(html);
const kb = (stat.size / 1024).toFixed(1);
parseFloat(kb) < 60
  ? ok(`html size ${kb} KB`, "below 60KB; single-file healthy")
  : warn(`html size ${kb} KB`, "consider splitting if approaching 100KB");

// ---- output ----
console.log(`\n  harness: ${path.basename(root)}\n`);
let failCount = 0;
for (const x of r) {
  console.log(`  [${x.ok.padEnd(4)}] ${x.n}${x.d ? `  —  ${x.d}` : ""}`);
  if (x.ok === "FAIL") failCount++;
}
console.log("");
console.log(`  ${r.filter(x => x.ok === "PASS").length} pass · ${r.filter(x => x.ok === "WARN").length} warn · ${failCount} fail · ${r.filter(x => x.ok === "INFO").length} info\n`);

// Visual harness reminder — static check alone misses motion / proportions / style drift.
console.log(`  Visual harness — snap each named beat at 1280×800 via Playwright MCP, eyeball:`);
console.log(`    [ ] bubble tail lands on speaker's head (not random spot)`);
console.log(`    [ ] narrative props visible at glance — none "speck-sized" in screenshot`);
console.log(`    [ ] each narrative prop on screen ≥ 0.3s (slow enough to read)`);
console.log(`    [ ] z-order: dialog > characters > particles > bg`);
console.log(`    [ ] style coherence: felt diorama (no thin vectors, no neon, no flat-color)\n`);
process.exit(failCount ? 1 : 0);
