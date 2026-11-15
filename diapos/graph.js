// Function graphs for slides: expressions, ticks and SVG paths, no DOM (tested in tests/diapos.test.js).
// Expressions use the site calculator syntax (shared/calc.js): 2x^2 − 3, sin(x), ln(x), √x, e^(−x)…
import { parse, evaluate, toTex } from "../shared/calc.js";

// Default names of curves 1–4 in the legend.
export const FN_NAMES = ["f", "g", "h", "k"];

/**
 * "f(x) = 2x+1", "y = 2x+1" or "2x+1" → { fn, tex, name } or { error } (French message).
 * `name` is the name typed before "(x) =" ("y" for "y =", null if none).
 */
export function compileFunction(text) {
  const head = /^\s*(?:(y)|([a-z])\s*\(\s*x\s*\))\s*=/i.exec(String(text ?? ""));
  const name = head ? (head[1] ?? head[2]) : null;
  const body = String(text ?? "").slice(head ? head[0].length : 0).trim();
  if (!body) return { error: "Expression vide" };
  let tree;
  try {
    tree = parse(body);
    // Catches syntax the parser accepts but cannot evaluate (e.g. a lone operator).
    evaluate(tree, 0, 0.5);
  } catch (e) {
    if (!/n'existe|négati|zéro|réel|trop grand/i.test(e.message)) return { error: e.message };
  }
  const fn = (x) => {
    try { return evaluate(tree, 0, x); } catch { return NaN; }
  };
  let tex = "";
  try { tex = toTex(tree); } catch {}
  return { fn, tex, name };
}

/** Round step (1, 2 or 5 × 10^k) giving at most about `maxTicks` intervals over `span`. */
export function niceStep(span, maxTicks = 10) {
  if (!(span > 0)) return 1;
  const raw = span / maxTicks;
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw - 1e-12) return m * p;
  return 10 * p;
}

/** Tick values (multiples of `step`) inside [min, max]. */
export function ticks(min, max, step) {
  const out = [];
  for (let k = Math.ceil(min / step - 1e-9); k * step <= max + 1e-9 * step; k++) out.push(Number((k * step).toPrecision(12)));
  return out;
}

/** Tick label in French: decimal comma and a real minus sign. */
export function tickLabel(v) {
  const s = String(Number(v.toPrecision(10)));
  return s.replace("-", "−").replace(".", ",");
}

/** Maps graph coordinates to pixels of a w × h box. */
export function mapper(view, w, h) {
  const sx = w / (view.xmax - view.xmin), sy = h / (view.ymax - view.ymin);
  return {
    px: (x) => (x - view.xmin) * sx,
    py: (y) => (view.ymax - y) * sy,
  };
}

/**
 * SVG path data for y = fn(x) in a w × h box. The curve breaks where fn is undefined
 * and across vertical asymptotes; parts far outside the box are left out.
 */
export function curvePath(fn, view, w, h, samples = Math.max(200, Math.round(w))) {
  const { px, py } = mapper(view, w, h);
  const side = (v) => (v < 0 ? -1 : v > h ? 1 : 0);
  const clamp = (v) => Math.min(2 * h, Math.max(-h, v)); // keeps coordinates small
  const dx = (view.xmax - view.xmin) / samples;
  const segments = [];
  let seg = [], prev = null;
  const cut = () => { if (seg.length > 1) segments.push(seg); seg = []; };
  for (let i = 0; i <= samples; i++) {
    const x = view.xmin + i * dx, y = fn(x);
    if (!Number.isFinite(y)) { cut(); prev = null; continue; }
    const p = [px(x), py(y)];
    if (prev) {
      const s0 = side(prev.p[1]), s1 = side(p[1]);
      if (s0 && s0 === s1) {
        // Both outside on the same side: nothing to draw between them.
        cut();
      } else if (Math.abs(p[1] - prev.p[1]) > h && isAsymptote(fn, prev.x, x, prev.y, y)) {
        cut();
      } else if (!seg.length) {
        seg.push(prev.p);
      }
    }
    if (seg.length) seg.push(p);
    prev = { x, y, p };
  }
  cut();
  return segments.map((s) => s.map(([a, b], i) => `${i ? "L" : "M"}${r(a)} ${r(clamp(b))}`).join("")).join("");
}

/** True if fn blows up between x0 and x1 (values y0, y1) instead of just being steep. */
function isAsymptote(fn, x0, x1, y0, y1) {
  for (let k = 0; k < 12; k++) {
    const xm = (x0 + x1) / 2, ym = fn(xm);
    if (!Number.isFinite(ym)) return true;
    // A continuous steep curve has its midpoint between the ends; keep the half that holds the jump.
    if (ym < Math.min(y0, y1) || ym > Math.max(y0, y1)) return true;
    if (Math.abs(ym - y0) > Math.abs(y1 - ym)) { x1 = xm; y1 = ym; } else { x0 = xm; y0 = ym; }
  }
  return Math.abs(y1 - y0) > 1e3 * (1 + Math.min(Math.abs(y0), Math.abs(y1)));
}

const r = (v) => Math.round(v * 10) / 10;

/** Window with the same unit on both axes, keeping the x range and the y centre. */
export function orthonormal(view, w, h) {
  const half = ((view.xmax - view.xmin) * (h / w)) / 2;
  const cy = (view.ymin + view.ymax) / 2;
  return { ...view, ymin: round6(cy - half), ymax: round6(cy + half) };
}
const round6 = (v) => Math.round(v * 1e6) / 1e6;
