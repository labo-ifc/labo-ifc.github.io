// Draws a pedigree (tree format of pedigree.js) as an SVG; colours come from style.css.
//
// Person flags used for drawing: aff (filled), carrier (dot), grey (second trait),
// cross (third trait, diagonal cross), name (shown under the number); sex "?" = unborn (diamond).

import { ROMAN } from "./pedigree.js";

const NS = "http://www.w3.org/2000/svg";
const GEN = 100, S = 24, LEFT = 40, TOP = 22;

function el(tag, attrs = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Plain text of a pedigree genotype key, with superscripts: "XAXa" → "Xᴬ Xᵃ". */
export function genoLabel(key) {
  const sup = { A: "ᴬ", a: "ᵃ", m: "ᵐ" };
  return key.replace(/X([Aa])/g, (_, c) => `X${sup[c]}`).replace("Ym", "Yᵐ");
}

/**
 * @param {object} tree
 * @param {object} [opts]
 * @param {(id: string) => void} [opts.onPick]  click / Entrée on a person
 * @param {string} [opts.picked]   person ringed
 * @param {object[]} [opts.conflicts]  families drawn in the error colour
 * @param {Record<string, string>} [opts.labels]  text under a person (genotypes)
 * @param {string} [opts.label]    accessible name of the figure
 */
export function drawPedigree(tree, opts = {}) {
  const { onPick, picked, conflicts = [], labels = {}, label = "Arbre généalogique" } = opts;
  const P = tree.people;
  const xs = Object.values(P).map((p) => p.x);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const gens = Math.max(...Object.values(P).map((p) => p.g)) + 1;
  // Each genotype option on its own line, under the name.
  const under = (id) => [P[id].name, ...(labels[id] ? labels[id].split(" / ") : [])].filter(Boolean);
  const nLines = Math.max(0, ...Object.keys(P).map((id) => under(id).length));
  const COL = Object.keys(labels).length ? 58 : 44;
  const gen = Math.max(GEN, 76 + nLines * 13);
  const cx = (p) => LEFT + (p.x - minX) * COL + S;
  const cy = (p) => TOP + p.g * gen + S / 2;
  const width = LEFT + (maxX - minX) * COL + 2 * S;
  const height = TOP + (gens - 1) * gen + S + 22 + (nLines ? nLines * 13 + 12 : 0);

  const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, class: "ped", role: "img", "aria-label": label });
  svg.style.maxWidth = `${width * 1.15}px`;
  const lines = el("g", { class: "ped-lines" });
  svg.append(lines);

  for (let g = 0; g < gens; g++) {
    svg.append(el("text", { x: 4, y: TOP + g * gen + S / 2 + 5, class: "ped-gen" }, ROMAN[g]));
  }

  for (const fam of tree.families) {
    const cls = conflicts.includes(fam) ? "conflict" : "";
    const [a, b] = fam.parents.map((id) => P[id]);
    const y = cy(a);
    const [l, r] = cx(a) < cx(b) ? [a, b] : [b, a];
    lines.append(el("line", { x1: cx(l) + S / 2, y1: y, x2: cx(r) - S / 2, y2: y, class: cls }));
    if (!fam.kids.length) continue;
    const kids = fam.kids.map((id) => P[id]);
    const sibY = cy(kids[0]) - S / 2 - 22;
    const mid = (cx(a) + cx(b)) / 2;
    lines.append(el("line", { x1: mid, y1: y, x2: mid, y2: sibY, class: cls }));
    // Twins hang from one point of the sibship line.
    const twins = fam.twins ?? [];
    const tops = kids.map((k, i) => (twins.includes(fam.kids[i]) ? null : cx(k)));
    if (twins.length) tops.push(twins.map((id) => cx(P[id])).reduce((s, v) => s + v, 0) / twins.length);
    const ends = tops.filter((v) => v !== null);
    lines.append(el("line", { x1: Math.min(mid, ...ends), y1: sibY, x2: Math.max(mid, ...ends), y2: sibY, class: cls }));
    kids.forEach((k, i) => {
      const top = cy(k) - S / 2 - (k.sex === "?" ? 3 : 0);
      if (twins.includes(fam.kids[i])) lines.append(el("line", { x1: tops.at(-1), y1: sibY, x2: cx(k), y2: top, class: cls }));
      else lines.append(el("line", { x1: cx(k), y1: sibY, x2: cx(k), y2: top, class: cls }));
    });
  }

  const inConflict = new Set(conflicts.flatMap((f) => [...f.parents, ...f.kids]));
  for (const [id, p] of Object.entries(P)) {
    const x = cx(p), y = cy(p);
    const g = el("g", { class: "ped-person" });
    const fill = p.grey ? "grey" : p.aff ? "aff" : "";
    const cls = `sym ${fill} ${inConflict.has(id) ? "conflict" : ""}`;
    if (id === picked) {
      g.append(p.sex === "f" ? el("circle", { cx: x, cy: y, r: S / 2 + 6, class: "ring" }) : el("rect", { x: x - S / 2 - 6, y: y - S / 2 - 6, width: S + 12, height: S + 12, rx: 4, class: "ring" }));
    }
    if (p.sex === "f") g.append(el("circle", { cx: x, cy: y, r: S / 2, class: cls }));
    else if (p.sex === "m") g.append(el("rect", { x: x - S / 2, y: y - S / 2, width: S, height: S, class: cls }));
    else g.append(el("path", { d: `M${x} ${y - S / 2 - 3}l${S / 2 + 3} ${S / 2 + 3}l${-S / 2 - 3} ${S / 2 + 3}l${-S / 2 - 3} ${-S / 2 - 3}z`, class: cls }));
    if (p.cross) {
      const d = p.sex === "f" ? S / 2.9 : S / 2;
      g.append(el("path", { d: `M${x - d} ${y - d}L${x + d} ${y + d}M${x + d} ${y - d}L${x - d} ${y + d}`, class: "mark" }));
    }
    if (p.carrier) g.append(el("circle", { cx: x, cy: y, r: 4, class: "dot" }));
    if (p.n !== undefined && p.sex !== "?") g.append(el("text", { x, y: y + S / 2 + 14, class: "ped-num" }, p.n));
    under(id).forEach((t, i) => g.append(el("text", { x, y: y + S / 2 + 28 + i * 13, class: i === 0 && p.name ? "ped-name" : "ped-label" }, t)));
    const who = `${ROMAN[p.g]}-${p.n ?? "?"}${p.name ? ` (${p.name})` : ""}`;
    const state = p.sex === "?" ? "enfant à naître" : `${p.sex === "f" ? "femme" : "homme"}${p.aff ? (p.sex === "f" ? " atteinte" : " atteint") : ""}`;
    g.append(el("title", {}, `${who} : ${state}${labels[id] ? ` – ${labels[id]}` : ""}`));
    if (onPick && p.sex !== "?") {
      g.classList.add("pickable");
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", `${who}, ${state}`);
      g.addEventListener("click", () => onPick(id));
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(id); }
      });
    }
    svg.append(g);
  }
  return svg;
}
