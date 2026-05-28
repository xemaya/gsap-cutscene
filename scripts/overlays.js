// harness/overlays.js — SVG Overlay Vocabulary
//
// Comic-style symbol primitives that augment a static-PNG character with
// expressive overlays GSAP can animate cheaply. Use these to compensate for
// the fact that single-PNG sprites can't show eye-blinks, mouth movement,
// or limb gestures.
//
// Each primitive is a small SVG string. Insert it into the DOM as a child of
// the character's sprite div (positioned via inline `style="left:X%; top:Y%"`),
// then animate via GSAP — scale-pop, rotate-wobble, fade, drift up, etc.
//
// Convention:
// - viewBox is square or close to it
// - All paths use felt-style stroke colors from the IP's palette
// - The SVG defaults to width:1em (will inherit, override via class/inline)
// - data-overlay="<name>" attr is set so the harness can verify
//
// Each entry: { name, viewBox, html, semantics: "what it conveys" }

export const OVERLAY_VOCAB = {

  // ====== EMOTIONAL STATE ======
  "sweat-drop": {
    semantics: "nervous, anxious, embarrassed",
    viewBox: "0 0 16 22",
    html: `<svg class="overlay" data-overlay="sweat-drop" viewBox="0 0 16 22">
      <path d="M8 2 C5 9, 3 14, 4 17 C5 20, 7 21, 8 21 C9 21, 11 20, 12 17 C13 14, 11 9, 8 2 Z"
            fill="#5a9bd4" stroke="#1f3550" stroke-width="1.4"/>
    </svg>`,
  },

  "tear-drop": {
    semantics: "sad, crying, touched",
    viewBox: "0 0 26 36",
    html: `<svg class="overlay" data-overlay="tear-drop" viewBox="0 0 26 36">
      <path d="M13 3 C7 14, 3 22, 5 28 C6 32, 10 34, 13 34 C16 34, 20 32, 21 28 C23 22, 19 14, 13 3 Z"
            fill="#5a9bd4" stroke="#1f3550" stroke-width="2"/>
      <ellipse cx="10" cy="20" rx="2" ry="3" fill="#a8d0ec" opacity="0.7"/>
    </svg>`,
  },

  "heart": {
    semantics: "love, infatuation, warmth toward another",
    viewBox: "0 0 32 32",
    html: `<svg class="overlay" data-overlay="heart" viewBox="0 0 32 32">
      <path d="M16 28 C 4 18, 4 8, 10 6 C 13 5, 15 7, 16 9 C 17 7, 19 5, 22 6 C 28 8, 28 18, 16 28 Z"
            fill="#E04545" stroke="#4a1818" stroke-width="2"/>
      <path d="M11 12 Q 14 10, 14 14" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    </svg>`,
  },

  "heart-eyes": {
    semantics: "lovestruck, smitten — overlay on top of eye region",
    viewBox: "0 0 50 28",
    html: `<svg class="overlay" data-overlay="heart-eyes" viewBox="0 0 50 28">
      <path d="M12 24 C 2 16, 2 8, 7 6 C 10 5, 12 7, 13 9 C 14 7, 16 5, 19 6 C 24 8, 24 16, 12 24 Z"
            fill="#E04545" stroke="#4a1818" stroke-width="1.5"/>
      <path d="M38 24 C 28 16, 28 8, 33 6 C 36 5, 38 7, 39 9 C 40 7, 42 5, 45 6 C 50 8, 50 16, 38 24 Z"
            fill="#E04545" stroke="#4a1818" stroke-width="1.5"/>
    </svg>`,
  },

  "question-mark": {
    semantics: "confused, what?, baffled",
    viewBox: "0 0 30 40",
    html: `<svg class="overlay" data-overlay="question-mark" viewBox="0 0 30 40">
      <circle cx="15" cy="20" r="14" fill="#fff8e1" stroke="#4a3520" stroke-width="2"/>
      <path d="M15 12 Q15 8, 18 8 Q21 8, 21 12 Q21 16, 15 18 L15 22"
            stroke="#4a3520" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="15" cy="28" r="1.5" fill="#4a3520"/>
    </svg>`,
  },

  "exclaim": {
    semantics: "shocked, alert, sudden realization",
    viewBox: "0 0 30 40",
    html: `<svg class="overlay" data-overlay="exclaim" viewBox="0 0 30 40">
      <circle cx="15" cy="20" r="14" fill="#D9AA56" stroke="#4a3520" stroke-width="2.5"/>
      <path d="M15 8 L15 22" stroke="#4a2a1a" stroke-width="3" stroke-linecap="round"/>
      <circle cx="15" cy="28" r="2" fill="#4a2a1a"/>
    </svg>`,
  },

  "shock-balloon": {
    semantics: "BIG shock — outline burst around exclaim",
    viewBox: "0 0 44 44",
    html: `<svg class="overlay" data-overlay="shock-balloon" viewBox="0 0 44 44">
      <path d="M22 2 L26 10 L36 6 L33 16 L42 18 L34 25 L40 34 L29 32 L26 42 L22 35 L18 42 L15 32 L4 34 L10 25 L2 18 L11 16 L8 6 L18 10 Z"
            fill="#fff8e1" stroke="#4a3520" stroke-width="2.5"/>
      <path d="M22 14 L22 28" stroke="#A64C40" stroke-width="3" stroke-linecap="round"/>
      <circle cx="22" cy="33" r="2" fill="#A64C40"/>
    </svg>`,
  },

  "zzz": {
    semantics: "sleeping, bored, zoned out",
    viewBox: "0 0 40 30",
    html: `<svg class="overlay" data-overlay="zzz" viewBox="0 0 40 30">
      <text x="6"  y="14" font-family="Fredoka, sans-serif" font-weight="700" font-size="11" fill="#4a3520">Z</text>
      <text x="14" y="20" font-family="Fredoka, sans-serif" font-weight="700" font-size="13" fill="#4a3520">Z</text>
      <text x="24" y="28" font-family="Fredoka, sans-serif" font-weight="700" font-size="16" fill="#4a3520">Z</text>
    </svg>`,
  },

  "sparkle-star": {
    semantics: "satisfaction, success, excitement",
    viewBox: "0 0 24 24",
    html: `<svg class="overlay" data-overlay="sparkle-star" viewBox="0 0 24 24">
      <path d="M12 0 L14 9 L24 12 L14 15 L12 24 L10 15 L0 12 L10 9 Z"
            fill="#FFE96B" stroke="#785D3D" stroke-width="1"/>
    </svg>`,
  },

  // ====== MOTION/ACTION ======
  "speed-line": {
    semantics: "fast motion direction — place near a moving prop or character edge",
    viewBox: "0 0 60 6",
    html: `<svg class="overlay" data-overlay="speed-line" viewBox="0 0 60 6">
      <line x1="0"  y1="3" x2="22" y2="3" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
      <line x1="28" y1="3" x2="44" y2="3" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
      <line x1="50" y1="3" x2="60" y2="3" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
    </svg>`,
  },

  "shake-mark": {
    semantics: "trembling, vibrating, jitter",
    viewBox: "0 0 30 6",
    html: `<svg class="overlay" data-overlay="shake-mark" viewBox="0 0 30 6">
      <path d="M2 3 q4 -3 8 0 t8 0 t8 0"
            stroke="#1f1410" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
  },

  "impact-burst": {
    semantics: "hit, contact moment — place at impact point",
    viewBox: "0 0 60 60",
    html: `<svg class="overlay" data-overlay="impact-burst" viewBox="0 0 60 60">
      <path d="M30 0 L34 18 L48 6 L40 22 L60 28 L42 32 L52 50 L36 40 L30 60 L24 40 L8 50 L18 32 L0 28 L20 22 L12 6 L26 18 Z"
            fill="#D9AA56" stroke="#A64C40" stroke-width="2.5"/>
      <circle cx="30" cy="30" r="6" fill="#fff5d6"/>
    </svg>`,
  },

  "cotton-poof": {
    semantics: "soft impact, cotton burst — for felt-IP impacts",
    viewBox: "0 0 60 60",
    html: `<svg class="overlay" data-overlay="cotton-poof" viewBox="0 0 60 60">
      <circle cx="20" cy="30" r="14" fill="#f5e2a8" stroke="#785D3D" stroke-width="1.5"/>
      <circle cx="40" cy="26" r="11" fill="#fff5d6" stroke="#785D3D" stroke-width="1.5"/>
      <circle cx="32" cy="42" r="10" fill="#f5e2a8" stroke="#785D3D" stroke-width="1.5"/>
      <circle cx="48" cy="40" r="7"  fill="#fff5d6" stroke="#785D3D" stroke-width="1.5"/>
    </svg>`,
  },

  // ====== SOCIAL / SPEECH ======
  "ellipsis": {
    semantics: "silence, awkward pause, no words",
    viewBox: "0 0 36 12",
    html: `<svg class="overlay" data-overlay="ellipsis" viewBox="0 0 36 12">
      <circle cx="6"  cy="6" r="3" fill="#4a3520"/>
      <circle cx="18" cy="6" r="3" fill="#4a3520"/>
      <circle cx="30" cy="6" r="3" fill="#4a3520"/>
    </svg>`,
  },

  "thought-cloud": {
    semantics: "thinking, daydreaming — small clouds trailing up to a thought bubble",
    viewBox: "0 0 60 28",
    html: `<svg class="overlay" data-overlay="thought-cloud" viewBox="0 0 60 28">
      <circle cx="6"  cy="22" r="3" fill="#fff8e1" stroke="#4a3520" stroke-width="1.2"/>
      <circle cx="14" cy="18" r="4" fill="#fff8e1" stroke="#4a3520" stroke-width="1.2"/>
      <ellipse cx="40" cy="10" rx="20" ry="8" fill="#fff8e1" stroke="#4a3520" stroke-width="1.5"/>
    </svg>`,
  },

};

// Convenience: list all overlay names (for harness validation)
export const OVERLAY_NAMES = Object.keys(OVERLAY_VOCAB);

// Convenience: inject an overlay into a parent DOM element
// (typically a .sprite div), with positioning props.
//   parent: HTMLElement
//   name: keyof OVERLAY_VOCAB
//   opts: { left, top, width, zIndex }  — all optional, all CSS values
// Returns the inserted SVG element so caller can GSAP-target it.
export function spawnOverlay(parent, name, opts = {}) {
  const v = OVERLAY_VOCAB[name];
  if (!v) {
    console.warn(`spawnOverlay: unknown vocab "${name}"`);
    return null;
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = v.html;
  const svg = tmp.firstElementChild;
  svg.style.position = "absolute";
  if (opts.left   != null) svg.style.left   = opts.left;
  if (opts.top    != null) svg.style.top    = opts.top;
  if (opts.width  != null) svg.style.width  = opts.width;
  if (opts.zIndex != null) svg.style.zIndex = String(opts.zIndex);
  svg.style.opacity = "0";          // start hidden, GSAP fades in
  svg.style.pointerEvents = "none";
  parent.appendChild(svg);
  return svg;
}

// expose globally so vanilla <script> users can grab it without import
if (typeof window !== "undefined") {
  window.OVERLAY_VOCAB = OVERLAY_VOCAB;
  window.OVERLAY_NAMES = OVERLAY_NAMES;
  window.spawnOverlay = spawnOverlay;
}
