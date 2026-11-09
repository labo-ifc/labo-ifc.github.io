// Interactive parts of the chapters: distillation column, octane mix, cracking,
// combustion balancer, bond enthalpy, σ/π chain builder, additions, polymers,
// worked examples.

import { renderTex, numTex } from "../../shared/tex.js";
import { initExamples } from "../../shared/examples.js";
import {
  ce, molarMass, alkane, alkene, alkaneName, ALKANE_BP, FRACTIONS, fractionOf, OCTANE, octaneOfMix,
  cracking, combustion, combustionAtoms, combustionCe, BONDS, combustionEnthalpy,
  chainCe, chainFormula, chainFamily, chainHydrogens, sigmaPi, ADDITIONS, addition, MONOMERS,
} from "./chem.js";
import { TYPES, seeded } from "./exercises.js";

const $ = (id) => document.getElementById(id);
const fmt = (v, digits = 1) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(v);
const on = (ids, fn) => { for (const id of ids) $(id).addEventListener("input", fn); };
const svg = (tag, attrs, text) => {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  return el;
};
/** Coefficient for \ce: 1 → "", 6.5 → "13/2". */
const coef = (k) => (k === 1 ? "" : Number.isInteger(k) ? `${k}` : `${k * 2}/2`);

// ───────────── 2. Raffinage : colonne de distillation ─────────────

// Plateaus from the top (coldest) to the bottom; the last one is the residue at the foot.
function drawColumn() {
  const col = $("column");
  col.replaceChildren();
  const top = 20, h = 72, x = 120, w = 90;
  col.append(svg("rect", { class: "column-body", x, y: top, width: w, height: h * FRACTIONS.length, rx: 14 }));
  FRACTIONS.forEach((f, i) => {
    const y = top + i * h;
    const g = svg("g", { class: "plateau", "data-id": f.id });
    if (i > 0) g.append(svg("line", { class: "column-tray", x1: x, y1: y, x2: x + w, y2: y }));
    g.append(svg("rect", { class: "plateau-zone", x: x + 4, y: y + 4, width: w - 8, height: h - 8, rx: 10 }));
    g.append(svg("line", { class: "column-pipe", x1: x + w, y1: y + h / 2, x2: x + w + 22, y2: y + h / 2 }));
    g.append(svg("text", { class: "plateau-name", x: x + w + 28, y: y + h / 2 - 4 }, f.name));
    g.append(svg("text", { class: "plateau-carbons", x: x + w + 28, y: y + h / 2 + 13 }, f.carbons));
    const range = i === 0 ? `< ${f.max} °C` : f.max === Infinity ? `> ${FRACTIONS[i - 1].max} °C` : `${FRACTIONS[i - 1].max}–${f.max} °C`;
    g.append(svg("text", { class: "plateau-temp", x: x - 10, y: y + h / 2 + 4, "text-anchor": "end" }, range));
    col.append(g);
  });
  // Crude oil heated at 400 °C enters near the foot.
  const yIn = top + h * (FRACTIONS.length - 0.35);
  col.append(svg("line", { class: "column-feed", x1: 20, y1: yIn, x2: x, y2: yIn }));
  col.append(svg("text", { class: "plateau-temp", x: 20, y: yIn + 18 }, "brut à 400 °C"));
  col.append(svg("circle", { id: "column-dot", class: "column-dot", r: 9, cx: x + w / 2, cy: top }));
}

function renderColumn() {
  const n = Number($("bp-n").value), bp = ALKANE_BP[n], f = alkane(n), frac = fractionOf(bp);
  $("bp-n-out").textContent = n;
  renderTex($("bp-formula"), `\\ce{${ce(f)}}${n <= 10 ? `\\ \\text{(${alkaneName(n)})}` : ""}`);
  $("bp-mass").textContent = `${molarMass(f)} g/mol`;
  $("bp-temp").textContent = `${fmt(bp, 0)} °C`;
  $("bp-fraction").textContent = frac.name;
  const i = FRACTIONS.indexOf(frac);
  for (const g of $("column").querySelectorAll(".plateau")) g.classList.toggle("active", g.dataset.id === frac.id);
  $("column-dot").setAttribute("cy", 20 + i * 72 + 36);
}

// ───────────── 3. Carburants : indice d'octane et craquage ─────────────

function renderOctane() {
  const iso = Number($("oct-iso").value), octane = octaneOfMix(iso);
  $("oct-iso-out").textContent = `${iso} %`;
  $("oct-marker").style.left = `${(octane / 120) * 100}%`;
  const near = OCTANE.filter((o) => o.value <= octane).at(-1);
  $("oct-verdict").textContent = `${iso} % d'iso-octane et ${100 - iso} % de n-heptane : indice d'octane ${octane}`
    + (near && near.value === octane ? ` (comme ${near.name}).` : ".");
  for (const tr of $("oct-table").tBodies[0].rows) tr.classList.toggle("active", Number(tr.dataset.value) === octane);
}

function fillOctaneTable() {
  const body = $("oct-table").tBodies[0];
  const scale = document.querySelector(".octane-scale");
  for (const o of OCTANE) {
    const tr = body.insertRow();
    tr.dataset.value = o.value;
    tr.insertCell().textContent = o.name;
    tr.insertCell().textContent = o.value;
    const tick = document.createElement("span");
    tick.className = "octane-tick";
    tick.style.left = `${(o.value / 120) * 100}%`;
    tick.title = `${o.name} : ${o.value}`;
    scale.append(tick);
  }
}

function renderCracking() {
  const n = Number($("crack-n").value), kInput = $("crack-k");
  kInput.max = n - 2;
  const k = Math.min(Number(kInput.value), n - 2);
  kInput.value = k;
  $("crack-n-out").textContent = n;
  $("crack-k-out").textContent = k;
  const r = cracking(n, k);
  renderTex($("crack-eq"), `\\ce{${ce(r.from)} -> ${ce(r.alkane)} + ${ce(r.alkene)}}`, true);
  $("crack-note").textContent = `Carbone : ${n} = ${k} + ${n - k}. Hydrogène : ${r.from.H} = ${r.alkane.H} + ${r.alkene.H}. `
    + `L'alcène formé (${n - k} carbones) peut servir de monomère pour les plastiques.`;
}

// ───────────── 4. Combustions : équilibrer ─────────────

function renderCombustion() {
  const family = $("comb-family").value, n = Number($("comb-n").value);
  const slider = $("comb-n");
  slider.min = family === "alkene" ? 2 : 1;
  const c = Math.max(n, Number(slider.min));
  slider.value = c;
  $("comb-n-out").textContent = c;
  const eq = combustion(family === "alkene" ? alkene(c) : alkane(c), $("comb-kind").value);
  const half = !Number.isInteger(eq.o2PerFuel);
  const tex = `\\ce{${combustionCe(eq)}}`
    + (half ? `\\qquad \\left(\\ce{${ce(eq.fuel)} + ${coef(eq.o2PerFuel)}O2 -> ...}\\right)` : "");
  renderTex($("comb-eq"), tex, true);
  const { left, right } = combustionAtoms(eq);
  $("comb-atoms").innerHTML = ["C", "H", "O"].map((el) =>
    `<tr><td>${el}</td><td>${left[el] ?? 0}</td><td>${right[el] ?? 0}</td></tr>`).join("");
}

// ───────────── 5. Énergie : ΔH par les énergies de liaison ─────────────

function fillBondTable() {
  $("bond-table").innerHTML = Object.values(BONDS).map((b) => `<tr><td class="tex" data-tex="${b.tex}"></td><td>${b.E}</td></tr>`).join("");
  for (const td of $("bond-table").querySelectorAll("[data-tex]")) renderTex(td, td.dataset.tex);
}

function renderEnthalpy() {
  const n = Number($("dh-n").value), kind = $("dh-kind").value;
  $("dh-n-out").textContent = alkaneName(n);
  const r = combustionEnthalpy(n, kind);
  const terms = (list) => list.map((b) => `${b.count} \\cdot ${b.E ?? BONDS[b.bond].E}`).join(" + ");
  const lines = [
    `\\ce{${combustionCe(r.eq)}}`,
    `E_\\text{rupture} = ${terms(r.ruptures)} = ${r.rupture}\\ \\text{kJ}`,
    `E_\\text{formation} = ${terms(r.formations)} = ${r.formation}\\ \\text{kJ}`,
    `\\Delta H = ${r.rupture} - ${r.formation} = ${r.dH}\\ \\text{kJ}`
      + (r.eq.coefs[0] > 1 ? ` \\quad\\Rightarrow\\quad \\frac{${r.dH}}{${r.eq.coefs[0]}} = ${numTex(r.dHPerMol, 1)}\\ \\text{kJ/mol}` : "\\ \\text{par mole}"),
  ];
  const box = $("dh-calc");
  box.replaceChildren(...lines.map((tex) => {
    const p = document.createElement("p");
    renderTex(p, tex);
    return p;
  }));
  const legend = document.createElement("p");
  legend.className = "lab-note";
  const names = (list) => list.map((b) => `${b.count} ${BONDS[b.bond].label}`).join(", ");
  legend.textContent = `Rompues : ${names(r.ruptures)}. Formées : ${names(r.formations)}.`;
  box.append(legend);
}

// ───────────── 6. Alcènes : σ et π, additions ─────────────

let chain = [2, 1, 1];

function renderChain() {
  const n = Number($("chain-n").value);
  $("chain-n-out").textContent = n;
  while (chain.length < n - 1) chain.push(1);
  chain.length = n - 1;
  const hs = chainHydrogens(chain);
  const root = $("chain");
  root.replaceChildren();
  hs.forEach((h, i) => {
    const atom = document.createElement("span");
    atom.className = "chain-atom";
    atom.innerHTML = `C${h ? `H<sub>${h > 1 ? h : ""}</sub>` : ""}`;
    root.append(atom);
    if (i < chain.length) {
      const bond = document.createElement("button");
      bond.type = "button";
      bond.className = `chain-bond order-${chain[i]}`;
      bond.textContent = ["", "–", "=", "≡"][chain[i]];
      bond.setAttribute("aria-label", `Liaison ${i + 1}–${i + 2} : ${["", "simple", "double", "triple"][chain[i]]}`);
      bond.addEventListener("click", () => {
        // Next order that leaves every carbon with ≥ 0 hydrogens.
        for (let step = 1; step <= 3; step++) {
          const next = ((chain[i] - 1 + step) % 3) + 1;
          const trial = chain.map((o, k) => (k === i ? next : o));
          if (chainHydrogens(trial).every((x) => x >= 0)) { chain = trial; break; }
        }
        renderChain();
        root.querySelectorAll(".chain-bond")[i].focus();
      });
      root.append(bond);
    }
  });
  const { sigma, pi } = sigmaPi(chain);
  $("chain-family").textContent = chainFamily(chain);
  renderTex($("chain-brute"), `\\ce{${ce(chainFormula(chain))}}`);
  $("chain-bonds").textContent = `${sigma} σ et ${pi} π`;
  renderTex($("chain-ce"), `\\ce{${chainCe(chain)}}`, true);
}

function renderAddition() {
  const n = Number($("add-alkene").value);
  const orders = [2, ...Array(n - 2).fill(1)];
  const id = $("add-reagent").value, r = addition(orders, id), add = ADDITIONS[id];
  renderTex($("add-eq"), `\\ce{${chainCe(orders)} + ${add.reagent} -> ${r.ce}}`, true);
  const m = (f) => fmt(molarMass(f), 1);
  $("add-note").textContent = `${add.label} : la double liaison devient simple. `
    + `${m(alkene(n))} g/mol + ${m(add.formula)} g/mol = ${m(r.formula)} g/mol (${ce(r.formula)}).`
    + (id === "H2O" && n > 2 ? " Le groupe OH se fixe sur le carbone qui porte le moins d'hydrogènes." : "");
}

// ───────────── 7. Polymères ─────────────

function renderPolymer() {
  const mono = MONOMERS.find((m) => m.id === $("poly-monomer").value);
  const n = Number($("poly-n").value), M0 = molarMass(mono.formula);
  $("poly-n-out").textContent = fmt(n, 0);
  renderTex($("poly-eq"), `n\\,\\ce{${mono.ce}} \\longrightarrow \\left[\\text{–}\\ce{${mono.motif}}\\text{–}\\right]_n`, true);
  $("poly-note").textContent = `${mono.polymer} (${mono.id}) : M(monomère) = ${fmt(M0)} g/mol, `
    + `donc pour n = ${fmt(n, 0)}, M(polymère) = ${fmt(n * M0, 0)} g/mol ≈ ${fmt((n * M0) / 1000)} kg/mol.`;
}

// ───────────── setup ─────────────

export function initLessons() {
  drawColumn();
  fillOctaneTable();
  fillBondTable();
  $("add-reagent").innerHTML = Object.entries(ADDITIONS).map(([id, a]) => `<option value="${id}">${a.label} (${a.reagent})</option>`).join("");
  $("poly-monomer").innerHTML = MONOMERS.map((m) => `<option value="${m.id}">${m.monomer} → ${m.id}</option>`).join("");

  on(["bp-n"], renderColumn);
  on(["oct-iso"], renderOctane);
  on(["crack-n", "crack-k"], renderCracking);
  on(["comb-family", "comb-n", "comb-kind"], renderCombustion);
  on(["dh-n", "dh-kind"], renderEnthalpy);
  on(["chain-n"], renderChain);
  on(["add-alkene", "add-reagent"], renderAddition);
  on(["poly-monomer", "poly-n"], renderPolymer);

  const render = () => {
    renderColumn(); renderOctane(); renderCracking(); renderCombustion();
    renderEnthalpy(); renderChain(); renderAddition(); renderPolymer();
  };
  render();
  initExamples((type) => TYPES[type].gen(seeded(11)));
  return { render };
}
