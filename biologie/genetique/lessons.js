// Interactive parts of the chapters: Punnett grid, F2 simulator, pedigree reader,
// Down syndrome risk by maternal age, worked examples.

import { renderTex, renderMixed } from "../../shared/tex.js";
import { initExamples } from "../../shared/examples.js";
import {
  dominant, codominant, lethal, gametes, genoTex, gameteTex, phenotype, distribution, ratio, probTex, percent,
  sampleCounts, downRisk, DOWN_RISK,
} from "./genetics.js";
import { MODES, possibleGenotypes, compatible, conflicts, pedigreeTex, personName } from "./pedigree.js";
import { drawPedigree, genoLabel } from "./pedigree-svg.js";
import { FAMILIES } from "./families.js";
import { TYPES, seeded } from "./exercises.js";
import { figure } from "./trainer.js";

const $ = (id) => document.getElementById(id);
const fmt = (v, digits = 1) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(v);
const svg = (tag, attrs, text) => {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  return el;
};
const opt = (value, label) => Object.assign(document.createElement("option"), { value, textContent: label });

// ───────────── Échiquier de Punnett ─────────────

const KINDS = {
  dom: { gene: () => dominant("A", "[A]", "[a]"), genos: [["A", "A"], ["A", "a"], ["a", "a"]] },
  co: { gene: () => codominant(["R", "B"], "roux", "blanc", "rouan"), genos: [["R", "R"], ["R", "B"], ["B", "B"]] },
  lethal: { gene: () => lethal("Q", "sans queue", "queue normale"), genos: [["Q", "q"], ["q", "q"]] },
};
const SECOND = { gene: () => dominant("L", "[L]", "[l]"), genos: [["L", "L"], ["L", "l"], ["l", "l"]] };

function fillParentSelects() {
  const kind = KINDS[$("pn-kind").value];
  for (const p of ["1", "2"]) {
    const sel = $(`pn-p${p}-a`);
    const keep = sel.value;
    sel.replaceChildren(...kind.genos.map((g) => opt(g.join(""), g.join(""))));
    sel.value = kind.genos.some((g) => g.join("") === keep) ? keep : kind.genos[1].join("");
  }
}

function renderPunnett() {
  const two = $("pn-genes").value === "2";
  for (const id of ["pn-p1-b", "pn-p2-b"]) $(id).closest(".row").hidden = !two;
  const kind = KINDS[$("pn-kind").value];
  const genes = two ? [kind.gene(), SECOND.gene()] : [kind.gene()];
  const geno = (p) => {
    const a = kind.genos.find((g) => g.join("") === $(`pn-p${p}-a`).value);
    return two ? [a, SECOND.genos.find((g) => g.join("") === $(`pn-p${p}-b`).value)] : [a];
  };
  const g1 = geno("1"), g2 = geno("2");
  const d = distribution(genes, g1, g2);
  const classOf = new Map(d.classes.map((c, i) => [c.label, i]));

  const table = document.createElement("table");
  table.className = "punnett";
  const rows = gametes(g1), cols = gametes(g2);
  const head = table.createTHead().insertRow();
  const corner = document.createElement("th");
  corner.innerHTML = '<span class="pn-corner">♀ \\ ♂</span>';
  head.append(corner);
  for (const c of cols) {
    const th = document.createElement("th");
    renderTex(th, gameteTex(c.gamete));
    head.append(th);
  }
  const body = table.createTBody();
  for (const r of rows) {
    const tr = body.insertRow();
    const th = document.createElement("th");
    renderTex(th, gameteTex(r.gamete));
    tr.append(th);
    for (const c of cols) {
      const kid = genes.map((g, i) => [r.gamete[i], c.gamete[i]].sort((x, y) => g.alleles.indexOf(x) - g.alleles.indexOf(y)));
      const label = phenotype(genes, kid);
      const td = tr.insertCell();
      const tex = document.createElement("span");
      renderTex(tex, genoTex(kid));
      const small = document.createElement("small");
      small.textContent = label ?? "meurt";
      td.append(tex, small);
      td.className = label === null ? "dead" : `pc${Math.min(classOf.get(label), 3)}`;
    }
  }
  $("pn-grid").replaceChildren(table);

  const ints = ratio(d.classes.map((c) => c.p));
  const list = $("pn-result");
  list.replaceChildren(...d.classes.map((c, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="swatch pc${Math.min(i, 3)}"></span><span class="pn-label"></span><span class="pn-p"></span><span class="pn-pc"></span>`;
    li.querySelector(".pn-label").textContent = c.label;
    renderTex(li.querySelector(".pn-p"), probTex(c.p));
    li.querySelector(".pn-pc").textContent = `(${percent(c.p)})`;
    return li;
  }));
  const dead = d.dead ? ` ${fmt(d.dead * 100)} % des embryons meurent : les proportions sont calculées parmi les survivants.` : "";
  $("pn-ratio").textContent = `Rapport phénotypique ${ints.join(" : ")}, sur ${rows.length * cols.length} cases.${dead}`;
}

function initPunnett() {
  for (const p of ["1", "2"]) {
    $(`pn-p${p}-b`).replaceChildren(...SECOND.genos.map((g) => opt(g.join(""), g.join(""))));
    $(`pn-p${p}-b`).value = "Ll";
  }
  fillParentSelects();
  $("pn-kind").addEventListener("change", () => { fillParentSelects(); renderPunnett(); });
  for (const id of ["pn-genes", "pn-p1-a", "pn-p2-a", "pn-p1-b", "pn-p2-b"]) $(id).addEventListener("change", renderPunnett);
  renderPunnett();
}

// ───────────── Simulateur de F2 (Mendel) ─────────────

const F2 = {
  mono: { labels: ["graines lisses", "graines ridées"], ps: [3 / 4, 1 / 4], expected: [3, 1] },
  di: { labels: ["jaunes et lisses", "jaunes et ridées", "vertes et lisses", "vertes et ridées"], ps: [9 / 16, 3 / 16, 3 / 16, 1 / 16], expected: [9, 3, 3, 1] },
};
const f2 = { counts: [0, 0] };

function renderF2() {
  const m = F2[$("f2-mode").value];
  const total = f2.counts.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...f2.counts);
  $("f2-bars").replaceChildren(...m.labels.map((label, i) => {
    const row = document.createElement("div");
    row.className = "f2-row";
    row.innerHTML = `<span class="f2-label"></span><span class="f2-track"><span class="f2-bar pc${i}"></span></span><span class="f2-count"></span>`;
    row.querySelector(".f2-label").textContent = label;
    row.querySelector(".f2-bar").style.width = `${(f2.counts[i] / max) * 100}%`;
    row.querySelector(".f2-count").textContent = fmt(f2.counts[i], 0);
    return row;
  }));
  const last = f2.counts.at(-1);
  let text;
  if (!total) text = "Sème des graines de F2 pour voir apparaître le rapport.";
  else if (!last) text = `${fmt(total, 0)} graines : il faut en semer davantage pour comparer au rapport attendu.`;
  else {
    const obs = f2.counts.map((c) => fmt(c / last, 2)).join(" : ");
    text = `${fmt(total, 0)} graines. Observé ${obs} ; attendu ${m.expected.join(" : ")}. Plus on sème, plus on s'en approche.`;
  }
  $("f2-ratio").textContent = text;
}

function initF2() {
  const reset = () => { f2.counts = F2[$("f2-mode").value].ps.map(() => 0); renderF2(); };
  const sow = (n) => {
    const m = F2[$("f2-mode").value];
    sampleCounts(Math.random, m.ps, n).forEach((c, i) => { f2.counts[i] += c; });
    renderF2();
  };
  $("f2-mode").addEventListener("change", reset);
  $("f2-sow-10").addEventListener("click", () => sow(10));
  $("f2-sow-100").addEventListener("click", () => sow(100));
  $("f2-sow-1000").addEventListener("click", () => sow(1000));
  $("f2-reset").addEventListener("click", reset);
  reset();
}

// ───────────── Lecteur d'arbres généalogiques ─────────────

const ped = { family: "eyes", mode: null, picked: null };

function familyName(tree, fam) {
  const [a, b] = fam.parents.map((id) => personName(tree.people[id]));
  return `${a} × ${b}`;
}

function renderPedigree() {
  const tree = FAMILIES[ped.family].tree();
  const mode = ped.mode;
  const sets = mode ? possibleGenotypes(tree, mode) : null;
  const ok = mode ? compatible(tree, mode) : null;
  const bad = mode && !ok ? conflicts(tree, mode) : [];
  const labels = {};
  if (mode && ok && $("ped-all").checked) {
    for (const [id, list] of Object.entries(sets)) if (list.length) labels[id] = list.map(genoLabel).join(" / ");
  }
  const fig = drawPedigree(tree, {
    picked: ped.picked,
    conflicts: bad,
    labels,
    label: `Arbre : ${FAMILIES[ped.family].label}`,
    onPick: (id) => { ped.picked = ped.picked === id ? null : id; renderPedigree(); },
  });
  $("ped-figure").replaceChildren(fig);

  for (const b of document.querySelectorAll("#ped-modes button")) {
    b.classList.toggle("active", b.dataset.mode === mode);
    b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
  }
  const verdict = $("ped-verdict");
  if (!mode) {
    verdict.className = "verdict";
    verdict.textContent = "Choisis une hypothèse de transmission.";
  } else if (ok) {
    verdict.className = "verdict ok";
    verdict.textContent = `Hypothèse possible : chaque personne a au moins un génotype qui convient.`;
  } else {
    verdict.className = "verdict bad";
    verdict.textContent = bad.length
      ? `Hypothèse impossible : ${bad.length === 1 ? "la famille" : "les familles"} ${bad.map((f) => familyName(tree, f)).join(", ")} ne ${bad.length === 1 ? "peut" : "peuvent"} pas avoir ces enfants (en rouge).`
      : "Hypothèse impossible : chaque famille prise seule convient, mais les générations ne s'accordent pas entre elles.";
  }

  const info = $("ped-person");
  const p = ped.picked && tree.people[ped.picked];
  if (!p) {
    info.textContent = "Clique sur une personne de l'arbre pour voir ses génotypes possibles.";
  } else if (!mode) {
    info.textContent = `${personName(p)} : choisis d'abord une hypothèse.`;
  } else if (!ok) {
    info.textContent = `${personName(p)} : aucune réponse, l'hypothèse est impossible.`;
  } else {
    const list = sets[ped.picked];
    renderMixed(info, `${personName(p)}${p.name ? ` (${p.name})` : ""} : ${list.length === 1 ? "génotype certain" : "génotypes possibles"} $${list.map(pedigreeTex).join("\\text{ ou }")}$.`);
  }
}

function initPedigreeLab() {
  const sel = $("ped-family");
  sel.replaceChildren(...Object.entries(FAMILIES).map(([id, f]) => opt(id, `Ex. ${f.ex} : ${f.label}`)));
  sel.addEventListener("change", () => { ped.family = sel.value; ped.picked = null; renderPedigree(); });
  $("ped-modes").replaceChildren(...Object.entries(MODES).map(([id, m]) => {
    const b = Object.assign(document.createElement("button"), { type: "button", textContent: m.label });
    b.dataset.mode = id;
    b.addEventListener("click", () => { ped.mode = ped.mode === id ? null : id; renderPedigree(); });
    return b;
  }));
  $("ped-all").addEventListener("change", renderPedigree);
  renderPedigree();
}

// ───────────── Trisomie 21 et âge de la mère ─────────────

const DW = { w: 460, h: 220, l: 44, r: 12, t: 12, b: 34, a0: 18, a1: 48, max: 45 };
const ax = (age) => DW.l + ((age - DW.a0) / (DW.a1 - DW.a0)) * (DW.w - DW.l - DW.r);
const ay = (perMille) => DW.t + (1 - perMille / DW.max) * (DW.h - DW.t - DW.b);

function drawDownChart() {
  const g = $("down-chart");
  g.replaceChildren();
  for (const v of [0, 10, 20, 30, 40]) {
    g.append(svg("line", { x1: DW.l, x2: DW.w - DW.r, y1: ay(v), y2: ay(v), class: "grid" }));
    g.append(svg("text", { x: DW.l - 6, y: ay(v) + 4, class: "axis-label", "text-anchor": "end" }, v));
  }
  for (let a = 20; a <= 45; a += 5) g.append(svg("text", { x: ax(a), y: DW.h - DW.b + 16, class: "axis-label", "text-anchor": "middle" }, a));
  g.append(svg("text", { x: (DW.l + DW.w) / 2, y: DW.h - 2, class: "axis-label", "text-anchor": "middle" }, "âge de la mère (ans)"));
  g.append(svg("text", { x: 4, y: DW.t + 2, class: "axis-label", "dominant-baseline": "hanging" }, "‰"));
  const pts = [];
  for (let a = DW.a0; a <= DW.a1; a += 0.5) pts.push(`${ax(a)},${ay(1000 / downRisk(a))}`);
  g.append(svg("polyline", { points: pts.join(" "), class: "curve" }));
  for (const row of DOWN_RISK) g.append(svg("circle", { cx: ax(row.age), cy: ay(1000 / row.oneIn), r: 3.5, class: "table-point" }));
  g.append(svg("line", { id: "down-guide", class: "guide" }));
  g.append(svg("circle", { id: "down-point", r: 6, class: "point" }));
}

function renderDown() {
  const age = Number($("down-age").value);
  const oneIn = downRisk(age);
  const per = 1000 / oneIn;
  $("down-age-out").textContent = `${age} ans`;
  const shown = oneIn >= 200 ? Math.round(oneIn / 10) * 10 : Math.round(oneIn);
  $("down-risk").textContent = `environ 1 naissance sur ${fmt(shown, 0)}`;
  $("down-per").textContent = `${fmt(per, per < 1 ? 2 : 1)} pour 1000`;
  const x = ax(age), y = ay(per);
  Object.entries({ x1: x, x2: x, y1: ay(0), y2: y }).forEach(([k, v]) => $("down-guide").setAttribute(k, v));
  $("down-point").setAttribute("cx", x);
  $("down-point").setAttribute("cy", y);
  const out = age < 20 || age > 45;
  $("down-note").textContent = out ? "Hors du tableau du cours (20 à 45 ans) : la valeur du bord du tableau est reprise." : "Entre deux lignes du tableau, le risque est interpolé.";
}

function initDown() {
  drawDownChart();
  $("down-age").addEventListener("input", renderDown);
  renderDown();
}

const SUP = { A: "ᴬ", a: "ᵃ", H: "ᴴ", h: "ʰ", N: "ᴺ", n: "ⁿ", D: "ᴰ", d: "ᵈ", M: "ᴹ", m: "ᵐ", B: "ᴮ", b: "ᵇ", R: "ᴿ", r: "ʳ" };

/** Genotype key of pedigree.js written with the exercise's letters ("Aa" → "Br", "XAXa" → "Xᴴ Xʰ"). */
function lettered(key, [dom, rec]) {
  const letter = (c) => (c === "A" ? dom : rec);
  if (!key.startsWith("X")) return [...key].map(letter).join("");
  return key.match(/X[Aa]|Y\w?/g).map((t) => (t[0] === "Y" ? "Y" : `X${SUP[letter(t[1])] ?? letter(t[1])}`)).join("");
}

/** Static trees of the exercises; with data-mode, genotypes written under each person. */
function initStaticTrees() {
  for (const box of document.querySelectorAll(".ped-figure[data-family]")) {
    const fam = FAMILIES[box.dataset.family];
    const tree = fam.tree();
    const labels = {};
    if (box.dataset.mode) {
      const letters = (box.dataset.letters ?? "A a").split(" ");
      for (const [id, keys] of Object.entries(possibleGenotypes(tree, box.dataset.mode))) {
        if (tree.people[id].sex !== "?") labels[id] = keys.map((k) => lettered(k, letters)).join(" / ");
      }
    }
    box.replaceChildren(drawPedigree(tree, { labels, label: `Arbre : ${fam.label}` }));
  }
}

export function initLessons() {
  initStaticTrees();
  initPunnett();
  initF2();
  initPedigreeLab();
  initDown();
  // Multiple choice examples list their choices after the question.
  initExamples((type) => {
    const ex = TYPES[type].gen(seeded(11));
    return ex.choices ? { ...ex, text: `${ex.text} (${ex.choices.join(" · ")})` } : ex;
  }, figure);
  return { render() {} };
}
