// harness/timeline-lib.js — shared runtime that applies a MANIFEST to a GSAP timeline.
//
// Each animation declares window.MANIFEST = { duration, cast: [...] } at the top,
// then in play() calls `applyManifest(window.MANIFEST, tl)`. This auto-injects
// fade-in / fade-out tweens at each entity's `from` / `to` time.
//
// Business code now only writes MOTION (position / scale / rotation), never visibility.
// Visibility is fully declarative — Flash timeline-style.
//
// Cast entry schema:
//   {
//     id:      "scout" | "walker" | "bubble" | "tear" | ...   (DOM id, or for
//                 kind=overlay: a unique key per-instance — entry creates a new
//                 DOM node via spawnOverlay)
//     kind:    "sprite" | "prop" | "dialog" | "particle-burst" | "title" | "overlay"
//     from:    seconds, when entity becomes visible
//     to:      seconds, when entity fades out
//     owner:   (optional) DOM id of the owning character (for props/overlays)
//     anchor:  (optional) one of: forehead | face | head-side | chest | feet |
//              held-hand | held-front | floating-above
//     emotion: (optional) sad | happy | lovestruck | panicked | shocked | ...
//     text:    (optional) for dialog entries — the line typed out
//     overlay: (optional, for kind=overlay) name from OVERLAY_VOCAB
//                (e.g. "sweat-drop", "question-mark", "heart")
//     position:(optional, for kind=overlay) { left, top, width } CSS values
//                applied to the auto-spawned overlay SVG
//     fadeIn:  (optional) duration of fade-in, default 0.3
//     fadeOut: (optional) duration of fade-out, default 0.3
//   }
//
// `kind: "overlay"` entries auto-spawn an SVG (from OVERLAY_VOCAB) into the
// owner's sprite div at first render. Loading order: include
// `<script src="path/to/overlays.js">` BEFORE this lib so window.spawnOverlay
// is available.

(function (global) {
  const DEFAULT_FADE_IN  = 0.3;
  const DEFAULT_FADE_OUT = 0.3;

  function applyManifest(manifest, tl) {
    if (!manifest || !Array.isArray(manifest.cast)) {
      console.warn("applyManifest: invalid manifest");
      return;
    }
    for (const entry of manifest.cast) {
      // ---- kind: overlay — auto-spawn from OVERLAY_VOCAB into owner's sprite div ----
      if (entry.kind === "overlay") {
        const ownerEl = document.getElementById(entry.owner);
        if (!ownerEl) {
          console.warn(`applyManifest overlay ${entry.id}: no owner #${entry.owner}`);
          continue;
        }
        if (typeof window.spawnOverlay !== "function") {
          console.warn(`applyManifest overlay ${entry.id}: spawnOverlay() unavailable — include overlays.js before timeline-lib.js`);
          continue;
        }
        const svg = window.spawnOverlay(ownerEl, entry.overlay, entry.position || {});
        if (!svg) continue;
        svg.id = entry.id;                 // so harness + GSAP can target by id
        const fIn  = entry.fadeIn  ?? DEFAULT_FADE_IN;
        const fOut = entry.fadeOut ?? DEFAULT_FADE_OUT;
        tl.fromTo(svg,
          { autoAlpha: 0, scale: 0.6 },
          { autoAlpha: 1, scale: 1, duration: fIn, ease: "back.out(2)" },
          entry.from);
        if (entry.to != null && entry.to < manifest.duration) {
          tl.to(svg, { autoAlpha: 0, scale: 0.8, duration: fOut, ease: "power2.out" }, entry.to);
        }
        continue;
      }

      const el = document.getElementById(entry.id);
      if (!el) {
        // particle-burst etc. may not map to a single DOM id — skip silently
        if (entry.kind !== "particle-burst" && entry.kind !== "title") {
          console.warn(`applyManifest: no element #${entry.id}`);
        }
        continue;
      }
      if (entry.kind === "particle-burst") continue;   // JS-driven, manifest is doc only

      const fIn  = entry.fadeIn  ?? DEFAULT_FADE_IN;
      const fOut = entry.fadeOut ?? DEFAULT_FADE_OUT;
      // appear
      tl.to(el, { autoAlpha: 1, duration: fIn, ease: "back.out(1.6)" }, entry.from);
      // disappear
      if (entry.to != null && entry.to < manifest.duration) {
        tl.to(el, { autoAlpha: 0, duration: fOut, ease: "power2.out" }, entry.to);
      }

      // dialog: also handle text via typewriter
      if (entry.kind === "dialog" && entry.text) {
        const textEl = el.querySelector("[data-role='text']")
                    || el.querySelector(".text > span")
                    || el.querySelector(".text")
                    || el;
        const text = entry.text;
        const window = Math.max(0.1, entry.to - entry.from - fIn - fOut);
        const perChar = Math.max(0.03, window / Math.max(1, text.length));
        // clear at appear
        tl.add(() => { textEl.textContent = ""; }, entry.from);
        for (let i = 1; i <= text.length; i++) {
          tl.add(() => { textEl.textContent = text.slice(0, i); }, entry.from + fIn + (i - 1) * perChar);
        }
      }
    }
  }

  // utility: at any t, return list of cast entries currently visible
  function castAt(manifest, t) {
    return (manifest.cast || []).filter(e => t >= e.from && t < e.to);
  }

  global.applyManifest = applyManifest;
  global.castAt = castAt;
})(window);
