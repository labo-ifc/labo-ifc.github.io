// Deck data and element geometry, no DOM (tested in tests/diapos.test.js).
// A slide is SLIDE_W × SLIDE_H units; the editor scales it to the screen.

export const SLIDE_W = 1600;
export const SLIDE_H = 900;
export const MIN_SIZE = 20;

// Slide themes: content colours, independent of the site's light/dark theme.
export const THEMES = {
  clair: { label: "Clair", dark: false, bg: "#ffffff", text: "#1f2937", muted: "#6b7280", light: "#eef1f5",
    font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  papier: { label: "Papier", dark: false, bg: "#fbf7ee", text: "#3b2f22", muted: "#8a7a66", light: "#f0e7d4",
    font: 'Georgia, "Times New Roman", serif' },
  sombre: { label: "Sombre", dark: true, bg: "#16181d", text: "#f1f3f5", muted: "#9aa3ae", light: "#2a2e36",
    font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  tableau: { label: "Tableau noir", dark: true, bg: "#24402f", text: "#f4f1e8", muted: "#bcc8b5", light: "#33553f",
    font: '"Chalkboard SE", "Comic Neue", "Segoe Print", "Comic Sans MS", cursive' },
};

// Accent colours: the site's subject colours (lighter variant on dark themes).
export const ACCENTS = {
  maths: { label: "Bleu (maths)", light: "#2563eb", dark: "#7aa7ff" },
  chimie: { label: "Vert (chimie)", light: "#0f7a55", dark: "#4fd1a0" },
  physique: { label: "Ambre (physique)", light: "#b45309", dark: "#fbbf24" },
  biologie: { label: "Lime (biologie)", light: "#4d7c0f", dark: "#a3e635" },
  rose: { label: "Rose", light: "#db2777", dark: "#f472b6" },
};

// Element colours are roles, so switching theme recolours everything.
export const COLORS = {
  text: "Texte",
  muted: "Gris",
  accent: "Accent",
  accent2: "Rose",
  light: "Clair",
  bg: "Fond",
  none: "Aucune",
};

/** Concrete colours of `theme` with `accent`. */
export function palette(theme, accent) {
  const t = THEMES[theme] ?? THEMES.clair;
  const a = ACCENTS[accent] ?? ACCENTS.maths;
  return {
    bg: t.bg, text: t.text, muted: t.muted, light: t.light, font: t.font,
    accent: t.dark ? a.dark : a.light,
    accent2: t.dark ? ACCENTS.rose.dark : ACCENTS.rose.light,
    none: "transparent",
  };
}

let counter = 0;
export function uid() {
  counter = (counter + 1) % 1e6;
  return Date.now().toString(36) + counter.toString(36) + Math.random().toString(36).slice(2, 6);
}

// Defaults per element type.
const DEFAULTS = {
  text: { w: 700, h: 120, text: "Texte", size: 44, bold: false, italic: false, align: "left", color: "text" },
  formula: { w: 600, h: 160, tex: "f(x) = ax^2 + bx + c", size: 56, color: "text" },
  image: { w: 600, h: 400, src: "" },
  shape: { w: 400, h: 260, shape: "rect", fill: "accent", stroke: "none", strokeWidth: 6, radius: 0, opacity: 1 },
};
export const ELEMENT_TYPES = Object.keys(DEFAULTS);
export const SHAPES = { rect: "Rectangle", ellipse: "Ellipse", line: "Ligne", arrow: "Flèche" };

/** New element of `type`, centred on the slide unless x/y are given. */
export function makeElement(type, props = {}) {
  const base = { ...DEFAULTS[type], ...props };
  if (type === "shape" && (base.shape === "line" || base.shape === "arrow") && !("h" in props)) {
    Object.assign(base, { h: 40, fill: "none", stroke: props.stroke ?? "accent" });
  }
  return {
    id: uid(), type, rot: 0,
    x: Math.round((SLIDE_W - base.w) / 2), y: Math.round((SLIDE_H - base.h) / 2),
    ...base,
  };
}

export const LAYOUTS = {
  title: "Titre",
  titleText: "Titre et texte",
  titleFormula: "Titre et formule",
  blank: "Vide",
};

/** New slide from a layout. */
export function makeSlide(layout = "titleText") {
  const title = (props) => makeElement("text", { size: 64, bold: true, ...props });
  const elements = {
    title: [
      title({ text: "Titre de la présentation", x: 160, y: 320, w: 1280, h: 120, size: 80, align: "center" }),
      makeElement("text", { text: "Sous-titre", x: 160, y: 460, w: 1280, h: 80, size: 40, align: "center", color: "muted" }),
    ],
    titleText: [
      title({ text: "Titre", x: 100, y: 70, w: 1400, h: 100 }),
      makeElement("text", { text: "- Premier point\n- Deuxième point avec une formule $E = mc^2$", x: 100, y: 220, w: 1400, h: 560 }),
    ],
    titleFormula: [
      title({ text: "Titre", x: 100, y: 70, w: 1400, h: 100 }),
      makeElement("formula", { tex: "\\Delta = b^2 - 4ac", x: 300, y: 340, w: 1000, h: 220, size: 80 }),
    ],
    blank: [],
  }[layout] ?? [];
  return { id: uid(), elements };
}

export function makeDeck() {
  return { version: 1, title: "Nouvelle présentation", theme: "clair", accent: "maths", slides: [makeSlide("title")] };
}

/** Deep copies with fresh ids. */
export function cloneSlide(slide) {
  return { id: uid(), elements: slide.elements.map(cloneElement) };
}
export function cloneElement(el, offset = 0) {
  return { ...structuredClone(el), id: uid(), x: el.x + offset, y: el.y + offset };
}

/** Moves item `from` to index `to`, in place. */
export function moveItem(list, from, to) {
  if (to < 0 || to >= list.length || from === to) return list;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  return list;
}

const rad = (deg) => (deg * Math.PI) / 180;
function rotate(x, y, deg) {
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
  return [x * c - y * s, x * s + y * c];
}

/**
 * Resizes `box` ({x, y, w, h, rot}) by dragging `handle` (n, ne, e, se, s, sw, w, nw) by (dx, dy)
 * in slide units. The opposite side or corner stays put, even when the box is rotated.
 * `keepRatio` keeps proportions (corner handles only).
 */
export function resizeBox(box, handle, dx, dy, { keepRatio = false, min = MIN_SIZE } = {}) {
  const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  const [lx, ly] = rotate(dx, dy, -(box.rot || 0));
  let w = Math.max(min, box.w + sx * lx);
  let h = Math.max(min, box.h + sy * ly);
  if (keepRatio && sx && sy) {
    const ratio = box.w / box.h;
    if (w / h > ratio) h = w / ratio; else w = h * ratio;
    if (h < min) { h = min; w = h * ratio; }
    if (w < min) { w = min; h = w / ratio; }
  }
  // The centre moves by half the growth, in the box's own frame.
  const [cx, cy] = rotate((sx * (w - box.w)) / 2, (sy * (h - box.h)) / 2, box.rot || 0);
  const centerX = box.x + box.w / 2 + cx, centerY = box.y + box.h / 2 + cy;
  return { x: centerX - w / 2, y: centerY - h / 2, w, h };
}

/** Angle (degrees, 0–360) pointing the box's top at (px, py); `step` rounds it (Shift: 15°). */
export function rotationTo(box, px, py, step = 0) {
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  let deg = (Math.atan2(py - cy, px - cx) * 180) / Math.PI + 90;
  if (step) deg = Math.round(deg / step) * step;
  return ((deg % 360) + 360) % 360;
}

/**
 * Snaps position (x, y) of a w × h box to the edges and centre of the slide and of `others`
 * ({x, y, w, h} boxes). Returns the snapped position and the guide lines to draw.
 */
export function snapPosition(x, y, w, h, others = [], tolerance = 10) {
  const targetsX = [0, SLIDE_W / 2, SLIDE_W], targetsY = [0, SLIDE_H / 2, SLIDE_H];
  for (const o of others) {
    targetsX.push(o.x, o.x + o.w / 2, o.x + o.w);
    targetsY.push(o.y, o.y + o.h / 2, o.y + o.h);
  }
  const best = (pos, size, targets) => {
    let found = null;
    for (const [k, offset] of [[0, 0], [1, size / 2], [2, size]]) {
      for (const t of targets) {
        const d = t - (pos + offset);
        if (Math.abs(d) <= tolerance && (!found || Math.abs(d) < Math.abs(found.d))) found = { d, line: t, k };
      }
    }
    return found;
  };
  const bx = best(x, w, targetsX), by = best(y, h, targetsY);
  return {
    x: bx ? x + bx.d : x,
    y: by ? y + by.d : y,
    guides: { x: bx ? bx.line : null, y: by ? by.line : null },
  };
}

// ── Reading a .json file: keep only known fields, with safe values. ──

const num = (v, def, lo = -Infinity, hi = Infinity) =>
  (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def);
const str = (v, def, max = 20000) => (typeof v === "string" ? v.slice(0, max) : def);
const pick = (v, allowed, def) => (Object.hasOwn(allowed, v) ? v : def);
const bool = (v, def) => (typeof v === "boolean" ? v : def);

function cleanElement(raw) {
  if (!raw || typeof raw !== "object" || !ELEMENT_TYPES.includes(raw.type)) return null;
  const d = DEFAULTS[raw.type];
  const el = {
    id: str(raw.id, "", 64) || uid(),
    type: raw.type,
    x: num(raw.x, 0, -SLIDE_W, 2 * SLIDE_W),
    y: num(raw.y, 0, -SLIDE_H, 2 * SLIDE_H),
    w: num(raw.w, d.w, MIN_SIZE, 4 * SLIDE_W),
    h: num(raw.h, d.h, MIN_SIZE, 4 * SLIDE_H),
    rot: num(raw.rot, 0, 0, 360),
  };
  switch (raw.type) {
    case "text":
      return { ...el, text: str(raw.text, ""), size: num(raw.size, d.size, 8, 400),
        bold: bool(raw.bold, false), italic: bool(raw.italic, false),
        align: pick(raw.align, { left: 1, center: 1, right: 1 }, "left"), color: pick(raw.color, COLORS, "text") };
    case "formula":
      return { ...el, tex: str(raw.tex, ""), size: num(raw.size, d.size, 8, 400), color: pick(raw.color, COLORS, "text") };
    case "image": {
      const src = str(raw.src, "", 20e6);
      return /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,/.test(src) ? { ...el, src } : null;
    }
    case "shape":
      return { ...el, shape: pick(raw.shape, SHAPES, "rect"), fill: pick(raw.fill, COLORS, "accent"),
        stroke: pick(raw.stroke, COLORS, "none"), strokeWidth: num(raw.strokeWidth, d.strokeWidth, 0, 80),
        radius: num(raw.radius, 0, 0, 1000), opacity: num(raw.opacity, 1, 0, 1) };
  }
  return null;
}

/** Clean deck from a parsed file; throws if it is not a deck. */
export function cleanDeck(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.slides)) {
    throw new Error("Ce fichier n'est pas une présentation Diapos.");
  }
  const slides = raw.slides
    .filter((s) => s && typeof s === "object")
    .map((s) => ({
      id: str(s.id, "", 64) || uid(),
      elements: (Array.isArray(s.elements) ? s.elements : []).map(cleanElement).filter(Boolean),
    }));
  return {
    version: 1,
    title: str(raw.title, "Présentation", 200),
    theme: pick(raw.theme, THEMES, "clair"),
    accent: pick(raw.accent, ACCENTS, "maths"),
    slides: slides.length ? slides : [makeSlide("blank")],
  };
}

/** Safe file name from the title: « Les ions & sels » → les-ions-sels.json. */
export function fileName(title) {
  const base = title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return (base || "presentation") + ".json";
}

/** Undo history of JSON snapshots, at most `limit`. */
export class History {
  constructor(limit = 100) { this.limit = limit; this.past = []; this.future = []; }
  push(snapshot) {
    if (this.past.at(-1) === snapshot) return;
    this.past.push(snapshot);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }
  undo(current) {
    if (!this.past.length) return null;
    this.future.push(current);
    return this.past.pop();
  }
  redo(current) {
    if (!this.future.length) return null;
    this.past.push(current);
    return this.future.pop();
  }
}
