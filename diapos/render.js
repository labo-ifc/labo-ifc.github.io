// Draws a slide as DOM: used by the editor stage, the thumbnails and the presenter.
import { renderMixed, renderTex } from "../shared/tex.js";
import { palette, SLIDE_W, SLIDE_H } from "./model.js";
import { compileFunction, curvePath, mapper, niceStep, ticks, tickLabel, FN_NAMES } from "./graph.js";

const SVG = "http://www.w3.org/2000/svg";

/** Sets the slide colour variables (--s-bg, --s-text…) and font on `el`. */
export function applyPalette(el, deck) {
  const p = palette(deck.theme, deck.accent);
  for (const [k, v] of Object.entries(p)) if (k !== "font") el.style.setProperty(`--s-${k}`, v);
  el.style.fontFamily = p.font;
}

const color = (role) => (role === "none" ? "transparent" : `var(--s-${role})`);

export function placeElement(node, el) {
  Object.assign(node.style, {
    left: `${el.x}px`, top: `${el.y}px`, width: `${el.w}px`, height: `${el.h}px`,
    transform: el.rot ? `rotate(${el.rot}deg)` : "",
  });
}

function shapeSvg(el) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", `0 0 ${el.w} ${el.h}`);
  svg.setAttribute("preserveAspectRatio", "none");
  const sw = el.stroke === "none" ? 0 : el.strokeWidth;
  const stroke = color(el.stroke);
  let shape;
  if (el.shape === "rect") {
    shape = document.createElementNS(SVG, "rect");
    const r = Math.min(el.radius, el.w / 2, el.h / 2);
    Object.entries({ x: sw / 2, y: sw / 2, width: Math.max(0, el.w - sw), height: Math.max(0, el.h - sw), rx: r, ry: r })
      .forEach(([k, v]) => shape.setAttribute(k, v));
  } else if (el.shape === "ellipse") {
    shape = document.createElementNS(SVG, "ellipse");
    Object.entries({ cx: el.w / 2, cy: el.h / 2, rx: Math.max(0, el.w / 2 - sw / 2), ry: Math.max(0, el.h / 2 - sw / 2) })
      .forEach(([k, v]) => shape.setAttribute(k, v));
  } else {
    // Line and arrow run along the box's horizontal midline; rotate the box to tilt them.
    const lw = el.strokeWidth || 6, head = el.shape === "arrow" ? Math.min(lw * 4, el.w / 2) : 0;
    const g = document.createElementNS(SVG, "g");
    const line = document.createElementNS(SVG, "line");
    Object.entries({ x1: 0, y1: el.h / 2, x2: el.w - head * 0.9, y2: el.h / 2, "stroke-width": lw, stroke: color(el.stroke === "none" ? "text" : el.stroke) })
      .forEach(([k, v]) => line.setAttribute(k, v));
    g.append(line);
    if (head) {
      const tip = document.createElementNS(SVG, "polygon");
      tip.setAttribute("points", `${el.w},${el.h / 2} ${el.w - head},${el.h / 2 - head * 0.6} ${el.w - head},${el.h / 2 + head * 0.6}`);
      tip.setAttribute("fill", color(el.stroke === "none" ? "text" : el.stroke));
      g.append(tip);
    }
    g.setAttribute("opacity", el.opacity);
    svg.append(g);
    return svg;
  }
  shape.setAttribute("fill", color(el.fill));
  shape.setAttribute("stroke", stroke);
  shape.setAttribute("stroke-width", sw);
  shape.setAttribute("opacity", el.opacity);
  svg.append(shape);
  return svg;
}

// Compiled expressions, shared by the stage, the thumbnails and the presenter.
const compiled = new Map();
export function compiledFunction(expr) {
  if (!compiled.has(expr)) {
    if (compiled.size > 200) compiled.clear();
    compiled.set(expr, compileFunction(expr));
  }
  return compiled.get(expr);
}

function svgNode(tag, attrs) {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

const LABEL = 24; // tick label size, slide units

function graphSvg(el) {
  const { w, h } = el;
  const view = { xmin: el.xmin, xmax: el.xmax, ymin: el.ymin, ymax: el.ymax };
  const { px, py } = mapper(view, w, h);
  const svg = svgNode("svg", { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: "none" });
  const xs = ticks(view.xmin, view.xmax, niceStep(view.xmax - view.xmin, Math.max(2, w / 90)));
  const ys = ticks(view.ymin, view.ymax, niceStep(view.ymax - view.ymin, Math.max(2, h / 70)));

  if (el.grid) {
    const g = svgNode("g", { class: "grid" });
    for (const x of xs) g.append(svgNode("line", { x1: px(x), y1: 0, x2: px(x), y2: h }));
    for (const y of ys) g.append(svgNode("line", { x1: 0, y1: py(y), x2: w, y2: py(y) }));
    svg.append(g);
  }

  // Axes through the origin, or along the nearest edge when 0 is out of view.
  const ax = Math.min(w, Math.max(0, px(0))), ay = Math.min(h, Math.max(0, py(0)));
  const axes = svgNode("g", { class: "axes", stroke: color(el.color), fill: color(el.color) });
  axes.append(svgNode("line", { x1: 0, y1: ay, x2: w, y2: ay }), svgNode("line", { x1: ax, y1: 0, x2: ax, y2: h }));
  axes.append(svgNode("polygon", { points: `${w},${ay} ${w - 18},${ay - 9} ${w - 18},${ay + 9}`, stroke: "none" }));
  axes.append(svgNode("polygon", { points: `${ax},0 ${ax - 9},18 ${ax + 9},18`, stroke: "none" }));
  const labels = svgNode("g", { class: "labels", "font-size": LABEL });
  const below = ay < h - LABEL * 1.6, left = ax > LABEL * 2.4;
  for (const x of xs) {
    const X = px(x);
    if (x === 0 || X < 14 || X > w - 26) continue;
    axes.append(svgNode("line", { x1: X, y1: ay - 6, x2: X, y2: ay + 6 }));
    const t = svgNode("text", { x: X, y: below ? ay + LABEL + 6 : ay - 12, "text-anchor": "middle" });
    t.textContent = tickLabel(x);
    labels.append(t);
  }
  for (const y of ys) {
    const Y = py(y);
    if (y === 0 || Y < 26 || Y > h - 14) continue;
    axes.append(svgNode("line", { x1: ax - 6, y1: Y, x2: ax + 6, y2: Y }));
    const t = svgNode("text", { x: left ? ax - 12 : ax + 12, y: Y + LABEL * 0.35, "text-anchor": left ? "end" : "start" });
    t.textContent = tickLabel(y);
    labels.append(t);
  }
  if (px(0) >= 0 && px(0) <= w && py(0) >= 0 && py(0) <= h) {
    const o = svgNode("text", { x: left ? ax - 10 : ax + 10, y: below ? ay + LABEL + 6 : ay - 12, "text-anchor": left ? "end" : "start" });
    o.textContent = "0";
    labels.append(o);
  }
  svg.append(axes);

  for (const f of el.fns) {
    const c = compiledFunction(f.expr);
    if (c.error) continue;
    const d = curvePath(c.fn, view, w, h);
    if (d) svg.append(svgNode("path", { d, class: "curve", stroke: color(f.color), "stroke-width": el.lineWidth }));
  }
  svg.append(labels);
  return svg;
}

function graphLegend(el) {
  const rows = el.fns.map((f, i) => ({ f, i, c: compiledFunction(f.expr) })).filter((r) => !r.c.error && r.c.tex);
  if (!el.legend || !rows.length) return null;
  const box = document.createElement("div");
  box.className = "graph-legend";
  for (const { f, i, c } of rows) {
    const row = document.createElement("div");
    row.style.color = color(f.color);
    const name = c.name === "y" ? "y" : `${c.name ?? FN_NAMES[i]}(x)`;
    renderTex(row, `${name} = ${c.tex}`);
    box.append(row);
  }
  return box;
}

/** Fills `node` with the content of element `el`. */
export function drawContent(node, el) {
  node.replaceChildren();
  node.className = `el el-${el.type}`;
  if (el.type === "text") {
    Object.assign(node.style, {
      fontSize: `${el.size}px`, fontWeight: el.bold ? "700" : "400", fontStyle: el.italic ? "italic" : "normal",
      textAlign: el.align, color: color(el.color),
    });
    // One block per line; "- " or "• " at the start makes a bullet.
    for (const line of el.text.split("\n")) {
      const row = document.createElement("div");
      const bullet = /^\s*[-•]\s+/.exec(line);
      if (bullet) {
        row.className = "bullet";
        const span = document.createElement("span");
        renderMixed(span, line.slice(bullet[0].length));
        row.append(span);
      } else if (line.trim()) {
        renderMixed(row, line);
      } else {
        row.innerHTML = "&nbsp;";
      }
      node.append(row);
    }
  } else if (el.type === "formula") {
    Object.assign(node.style, { fontSize: `${el.size}px`, color: color(el.color) });
    const span = document.createElement("span");
    renderTex(span, el.tex || "\\square", true);
    node.append(span);
  } else if (el.type === "image") {
    const img = document.createElement("img");
    img.src = el.src;
    img.alt = "";
    img.draggable = false;
    node.append(img);
  } else if (el.type === "shape") {
    node.append(shapeSvg(el));
  } else if (el.type === "graph") {
    node.append(graphSvg(el));
    const legend = graphLegend(el);
    if (legend) node.append(legend);
  }
}

export function drawElement(el) {
  const node = document.createElement("div");
  node.dataset.id = el.id;
  drawContent(node, el);
  placeElement(node, el);
  return node;
}

/** Builds a 1600×900 slide node (unscaled) for `slide` of `deck`. */
export function drawSlide(deck, slide) {
  const node = document.createElement("div");
  node.className = "slide";
  applyPalette(node, deck);
  node.style.width = `${SLIDE_W}px`;
  node.style.height = `${SLIDE_H}px`;
  for (const el of slide.elements) node.append(drawElement(el));
  return node;
}
