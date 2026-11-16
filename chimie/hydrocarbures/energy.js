// Chapter "Calcul d'énergie": exercise generator (alkane slider, complete or CO)
// and step-by-step solver with an answer at each step, then a summary table.

import { energyProblem, checkStep } from "./energy-steps.js";
import { BONDS, ce } from "./chem.js";
import { renderTex, renderMixed, numTex } from "../../shared/tex.js";

const $ = (id) => document.getElementById(id);
const fr = (v) => numTex(v, 1).replace("{,}", ",");
const SVG = "http://www.w3.org/2000/svg";

export function initEnergy() {
  const slider = $("en-n"), kinds = [...document.querySelectorAll("#en-kind button")];
  let kind = "complete", problem, states;

  $("en-bonds").innerHTML = Object.values(BONDS).map((b) => `<tr><td data-tex="${b.tex}"></td><td>${b.E}</td></tr>`).join("");
  for (const td of $("en-bonds").querySelectorAll("[data-tex]")) renderTex(td, td.dataset.tex);

  function setKind(k) {
    kind = k;
    for (const b of kinds) {
      b.classList.toggle("active", b.dataset.kind === k);
      b.setAttribute("aria-pressed", String(b.dataset.kind === k));
    }
  }

  function build() {
    problem = energyProblem(Number(slider.value), kind);
    renderTex($("en-n-out"), `\\text{${problem.name}}\\ \\ce{${ce(problem.fuel)}}`);
    renderMixed($("en-statement"), problem.statement);
    states = problem.steps.map(() => ({ attempts: 0, first: null, firstOk: false, done: null }));
    $("en-steps").replaceChildren(...problem.steps.map(stepItem));
    $("en-summary").hidden = true;
    reveal();
  }

  function stepItem(step, i) {
    const li = document.createElement("li");
    li.className = "energy-step";
    li.hidden = true;
    li.innerHTML = `
      <p class="kicker">Étape ${i + 1} sur ${problem.steps.length}</p>
      <h3></h3><p class="energy-task"></p>
      <form class="energy-form" autocomplete="off">
        <div class="energy-fields"></div>
        <div class="energy-actions">
          <button type="submit" class="primary">Vérifier</button>
          <button type="button" class="ghost energy-show">Voir la réponse</button>
        </div>
        <p class="feedback" role="status"></p>
      </form>
      <div class="energy-answer" hidden><span class="energy-answer-label">Réponse :</span> <span class="energy-answer-tex"></span></div>
      <div class="energy-figure" hidden></div>`;
    li.querySelector("h3").textContent = step.title;
    renderMixed(li.querySelector(".energy-task"), step.task);
    const fields = li.querySelector(".energy-fields");
    for (const f of step.fields) {
      const label = document.createElement("label");
      label.className = "energy-field";
      const text = document.createElement("span");
      renderMixed(text, f.label);
      const input = Object.assign(document.createElement("input"), {
        className: "text-input", type: "text", spellcheck: false, name: f.key,
        placeholder: f.placeholder ?? (f.unit ? `en ${f.unit}` : ""),
      });
      if (!f.formula) input.inputMode = "decimal";
      label.append(text, input);
      fields.append(label);
    }
    renderTex(li.querySelector(".energy-answer-tex"), step.answerTex);
    const form = li.querySelector("form");
    form.addEventListener("submit", (e) => { e.preventDefault(); check(i, li); });
    li.querySelector(".energy-show").addEventListener("click", () => finish(i, li, "revealed"));
    return li;
  }

  function inputsOf(li) {
    return Object.fromEntries([...li.querySelectorAll("input")].map((el) => [el.name, el.value]));
  }

  function check(i, li) {
    const inputs = inputsOf(li);
    const r = checkStep(problem, i, inputs);
    const s = states[i];
    if (!r.unreadable && !s.done) {
      s.attempts++;
      if (!s.first) { s.first = inputs; s.firstOk = r.ok; }
    }
    for (const el of li.querySelectorAll("input")) el.setAttribute("aria-invalid", String(r.wrong.includes(el.name)));
    const fb = li.querySelector(".feedback");
    fb.className = `feedback ${r.ok ? "ok" : r.unreadable ? "warn" : "bad"}`;
    renderMixed(fb, r.ok ? "Juste !" : r.message);
    if (r.ok) finish(i, li, "ok");
  }

  function finish(i, li, how) {
    const s = states[i];
    if (!s.done) s.done = how;
    li.classList.add("done");
    li.querySelector(".energy-answer").hidden = false;
    li.querySelector(".energy-show").disabled = true;
    if (problem.steps[i].id === "structures") showStructures(li.querySelector(".energy-figure"));
    const next = reveal();
    if (next) next.querySelector("input")?.focus({ preventScroll: false });
  }

  /** Shows every finished step and the first unfinished one; the summary when all are done. */
  function reveal() {
    const items = [...$("en-steps").children];
    const current = states.findIndex((s) => !s.done);
    items.forEach((li, i) => { li.hidden = current !== -1 && i > current; });
    if (current === -1) { summary(); return null; }
    return items[current];
  }

  function summary() {
    const rows = problem.steps.map((step, i) => {
      const s = states[i];
      const tr = document.createElement("tr");
      const user = s.first ? step.fields.map((f) => s.first[f.key].trim()).join(" ; ") : "—";
      const good = step.fields.map((f) => {
        const v = step.expected[f.key];
        return typeof v === "number" ? fr(v) : v;
      }).join(" ; ");
      const result = s.firstOk ? "Juste du premier coup"
        : s.done === "ok" ? `Juste après ${s.attempts} essais`
        : "Réponse affichée";
      for (const [text, cls] of [[`${i + 1}. ${step.title}`, ""], [user, "mono"], [good, "mono"], [result, s.firstOk ? "ok" : s.done === "ok" ? "warn" : "bad"]]) {
        const td = document.createElement("td");
        td.textContent = text;
        if (cls) td.className = cls;
        tr.append(td);
      }
      return tr;
    });
    $("en-summary-rows").replaceChildren(...rows);
    const firstTry = states.filter((s) => s.firstOk).length;
    $("en-score").textContent = `${firstTry} étape${firstTry > 1 ? "s" : ""} sur ${states.length} juste${firstTry > 1 ? "s" : ""} du premier coup.`;
    renderMixed($("en-conclusion"), problem.conclusion);
    $("en-summary").hidden = false;
  }

  function showStructures(box) {
    const { n, kind: k } = problem;
    box.replaceChildren(
      molecule(alkaneStructure(n), problem.name),
      molecule(k === "complete" ? co2Structure() : coStructure(), k === "complete" ? "dioxyde de carbone" : "monoxyde de carbone"),
      molecule(waterStructure(), "eau"),
      molecule(oxygenStructure(), "dioxygène"),
    );
    box.hidden = false;
  }

  slider.addEventListener("input", build);
  for (const b of kinds) b.addEventListener("click", () => { setKind(b.dataset.kind); build(); });
  $("en-random").addEventListener("click", () => {
    slider.value = String(1 + Math.floor(Math.random() * 10));
    setKind(Math.random() < 0.5 ? "complete" : "co");
    build();
  });
  $("en-restart").addEventListener("click", () => { build(); $("en-steps").firstElementChild.scrollIntoView({ block: "center" }); });
  setKind(kind);
  build();
}

// ---------- formules développées (SVG) ----------

const STEP = 46;

function alkaneStructure(n) {
  const atoms = [], bonds = [];
  const x0 = 30 + STEP, y = 70;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * STEP;
    atoms.push({ x, y, el: "C" });
    const c = atoms.length - 1;
    if (i > 0) bonds.push({ a: c - 3, b: c, order: 1, cls: "cc" }); // previous C (C, H, H added per carbon)
    atoms.push({ x, y: y - STEP, el: "H" }, { x, y: y + STEP, el: "H" });
    bonds.push({ a: c, b: c + 1, order: 1 }, { a: c, b: c + 2, order: 1 });
  }
  atoms.push({ x: x0 - STEP, y, el: "H" });
  bonds.push({ a: 0, b: atoms.length - 1, order: 1 });
  atoms.push({ x: x0 + n * STEP, y, el: "H" });
  bonds.push({ a: (n - 1) * 3, b: atoms.length - 1, order: 1 });
  return { atoms, bonds, width: x0 + n * STEP + 30, height: 140 };
}

const linear = (els, orders) => ({
  atoms: els.map((el, i) => ({ x: 30 + i * STEP, y: 30, el })),
  bonds: orders.map((order, i) => ({ a: i, b: i + 1, order, cls: order > 1 ? "multi" : "" })),
  width: 60 + (els.length - 1) * STEP,
  height: 60,
});
const co2Structure = () => linear(["O", "C", "O"], [2, 2]);
const coStructure = () => linear(["C", "O"], [3]);
const oxygenStructure = () => linear(["O", "O"], [2]);
const waterStructure = () => linear(["H", "O", "H"], [1, 1]);

function molecule({ atoms, bonds, width, height }, name) {
  const fig = document.createElement("figure");
  fig.className = "molecule";
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", width);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Formule développée : ${name}`);
  const r = 10;
  for (const { a, b, order, cls } of bonds) {
    const A = atoms[a], B = atoms[b];
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len, px = -uy * 4, py = ux * 4;
    const offsets = order === 1 ? [0] : order === 2 ? [-0.75, 0.75] : [-1.5, 0, 1.5];
    for (const k of offsets) {
      const line = document.createElementNS(SVG, "line");
      Object.entries({
        x1: A.x + ux * r + px * k, y1: A.y + uy * r + py * k,
        x2: B.x - ux * r + px * k, y2: B.y - uy * r + py * k,
      }).forEach(([key, v]) => line.setAttribute(key, v.toFixed(1)));
      line.setAttribute("class", `bond ${cls ?? ""}`);
      svg.append(line);
    }
  }
  for (const { x, y, el } of atoms) {
    const t = document.createElementNS(SVG, "text");
    t.setAttribute("x", x);
    t.setAttribute("y", y);
    t.setAttribute("class", `atom atom-${el}`);
    t.textContent = el;
    svg.append(t);
  }
  const cap = document.createElement("figcaption");
  cap.textContent = name;
  fig.append(svg, cap);
  return fig;
}
