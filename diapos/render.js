// Draws a slide as DOM: used by the editor stage, the thumbnails and the presenter.
import { renderMixed, renderTex } from "../shared/tex.js";
import { palette, SLIDE_W, SLIDE_H } from "./model.js";

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
