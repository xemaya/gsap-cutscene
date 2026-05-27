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
//     id:      "scout" | "walker" | "bubble" | "tear" | ...   (DOM id)
//     kind:    "sprite" | "prop" | "dialog" | "particle-burst" | "title"
//     from:    seconds, when entity becomes visible
//     to:      seconds, when entity fades out
//     owner:   (optional) DOM id of the owning character (for props)
//     anchor:  (optional) one of: forehead | face | head-side | chest | feet |
//              held-hand | held-front | floating-above
//     emotion: (optional) sad | happy | lovestruck | panicked | shocked | ...
//     text:    (optional) for dialog entries — the line typed out
//     fadeIn:  (optional) duration of fade-in, default 0.3
//     fadeOut: (optional) duration of fade-out, default 0.3
//   }

(function (global) {
  const DEFAULT_FADE_IN  = 0.3;
  const DEFAULT_FADE_OUT = 0.3;

  function applyManifest(manifest, tl) {
    if (!manifest || !Array.isArray(manifest.cast)) {
      console.warn("applyManifest: invalid manifest");
      return;
    }
    for (const entry of manifest.cast) {
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
