// Interactive parts of the chapters: reciprocal functions, the chessboard, the exponential
// function, worked examples, the logarithm converter, the slope of a^x at 0 and semi-log plots.
/* global Plotly */

import { fr, pow, value, fracTex, fracText } from "../../shared/fraction.js";
import { renderTex, renderMixed, numTex } from "../../shared/tex.js";
import { themeColors, axis, layout, hline, PLOT_CONFIG } from "../../shared/plot.js";
import { linspace } from "../../shared/numeric.js";
import { TYPES, seeded } from "./exercises.js";
import { initExamples } from "../../shared/examples.js";

const $ = (id) => document.getElementById(id);
const nf = (digits = 2) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits });
const fmt = (v, digits = 2) => nf(digits).format(Math.abs(v) < 1e-9 ? 0 : v);

// ───────────── 1. Fonctions réciproques ─────────────

const RECIPROCALS = {
  cube: { f: (x) => x ** 3, tex: "x^3", inv: "\\sqrt[3]{x}", view: [-4, 4], a: [-1.5, 1.5, 0.1] },
  temp: { f: (x) => (9 / 5) * x + 32, tex: "\\frac{9}{5}x + 32", inv: "\\frac{5}{9}(x - 32)", view: [-50, 110], a: [-40, 40, 1] },
  square: { f: (x) => x * x, tex: "x^2", inv: "\\sqrt{x}", view: [-4, 4], a: [-2, 2, 0.1], needsRestriction: true },
  exp2: { f: (x) => 2 ** x, tex: "2^x", inv: "\\log_2 x", view: [-4, 4], a: [-2, 2, 0.1] },
};

function renderReciprocal() {
  const fn = RECIPROCALS[$("recip-fn").value];
  const restricted = fn.needsRestriction && $("recip-restrict").checked;
  const isFunction = !fn.needsRestriction || restricted;
  $("recip-restrict-wrap").hidden = !fn.needsRestriction;

  const slider = $("recip-a");
  const [aMin, aMax, aStep] = fn.a;
  slider.min = restricted ? 0 : aMin;
  slider.max = aMax;
  slider.step = aStep;
  const a = Math.min(Math.max(Number(slider.value), Number(slider.min)), aMax);
  const b = fn.f(a);
  $("recip-a-out").textContent = fmt(a);

  const c = themeColors();
  const [lo, hi] = fn.view;
  const xs = linspace(restricted ? 0 : lo, hi, 400);
  const ys = xs.map(fn.f);
  Plotly.react("plot-recip", [
    { x: [lo, hi], y: [lo, hi], mode: "lines", line: { color: c.muted, width: 1, dash: "dash" }, hoverinfo: "skip" },
    { x: xs, y: ys, mode: "lines", line: { color: c.curve, width: 2.5 }, name: "f", hovertemplate: "f(%{x:.2f}) = %{y:.2f}<extra></extra>" },
    { x: ys, y: xs, mode: "lines", line: { color: c.fit, width: 2.5 }, name: "f⁻¹", hovertemplate: "(%{x:.2f} ; %{y:.2f})<extra></extra>" },
    { x: [a, b], y: [b, a], mode: "lines", line: { color: c.period, width: 1, dash: "dot" }, hoverinfo: "skip" },
    { x: [a, b], y: [b, a], mode: "markers+text", marker: { color: [c.curve, c.fit], size: 9 },
      text: ["(a ; b)", "(b ; a)"], textposition: ["top left", "bottom right"], textfont: { color: c.fg }, hoverinfo: "skip" },
  ], layout(c, {
    xaxis: axis(c, { range: fn.view }),
    yaxis: axis(c, { range: fn.view, scaleanchor: "x", scaleratio: 1 }),
    annotations: [{ x: hi, y: hi, text: "y = x", showarrow: false, xanchor: "right", yanchor: "bottom", font: { color: c.muted } }],
    uirevision: $("recip-fn").value,
  }), PLOT_CONFIG);

  renderTex($("recip-pair"), `\\begin{gathered} f(${numTex(a, 2)}) = ${numTex(b, 2)} \\\\ \\Longleftrightarrow\\; f^{-1}(${numTex(b, 2)}) = ${numTex(a, 2)} \\end{gathered}`, true);
  const verdict = $("recip-verdict");
  verdict.className = `verdict ${isFunction ? "ok" : "bad"}`;
  renderMixed(verdict, isFunction
    ? `✓ $f^{-1}$ est une fonction : $f(x) = ${fn.tex}$ ${restricted ? "sur $[0 \\,;\\, +\\infty[$ " : ""}a pour réciproque $f^{-1}(x) = ${fn.inv}$.`
    : `✗ La réciproque de $x^2$ n'est pas une fonction : $4$ a deux antécédents, $2$ et $-2$ (la courbe rose a deux points au-dessus de $x = 4$). Coche « Restreindre ».`);
}

// ───────────── 2. L'échiquier ─────────────

const GRAIN_GRAMS = 0.025;
const WORLD_RICE_TONNES = 5e8; // order of magnitude of a year's world harvest

/** "= 1\,024" exactly up to 10^12, "\approx 9{,}22 \times 10^{18}" beyond (n is a BigInt). */
function bigTex(n) {
  if (n < 10n ** 12n) return `= ${nf(0).format(Number(n)).replace(/\s/g, "\\,")}`;
  const s = n.toString();
  const mant = Number(`${s[0]}.${s.slice(1, 4)}`);
  return `\\approx ${numTex(mant, 2)} \\times 10^{${s.length - 1}}`;
}

function massText(tonnes) {
  if (tonnes < 1e-3) return `${fmt(tonnes * 1e6, 1)} g`;
  if (tonnes < 1) return `${fmt(tonnes * 1e3, 1)} kg`;
  if (tonnes < 1e6) return `${fmt(tonnes, 0)} tonnes`;
  return `${fmt(tonnes / 1e9, 1)} milliards de tonnes`;
}

function buildChessboard() {
  const board = $("chessboard");
  for (let i = 1; i <= 64; i++) {
    const cell = document.createElement("div");
    const row = Math.floor((i - 1) / 8);
    cell.className = (row + (i - 1)) % 2 ? "dark" : "light";
    board.append(cell);
  }
}

function renderChess() {
  const n = Number($("chess-n").value);
  $("chess-n-out").textContent = n;
  [...$("chessboard").children].forEach((cell, i) => {
    cell.classList.toggle("filled", i < n);
    cell.style.setProperty("--fill", ((i + 1) / 64).toFixed(3));
  });
  const onCase = 2n ** BigInt(n - 1);
  const total = 2n ** BigInt(n) - 1n;
  const tonnes = (Number(total) * GRAIN_GRAMS) / 1e6;
  const rows = [
    ["Grains sur la case", `2^{${n - 1}} ${bigTex(onCase)}`],
    ["Total jusqu'ici", `2^{${n}} - 1 ${bigTex(total)}`],
    ["Masse (25 mg le grain)", null, massText(tonnes)],
  ];
  if (tonnes > WORLD_RICE_TONNES / 100) {
    rows.push(["Récoltes mondiales", null, `≈ ${fmt(tonnes / WORLD_RICE_TONNES, tonnes > WORLD_RICE_TONNES * 10 ? 0 : 2)} années`]);
  }
  const dl = $("chess-values");
  dl.replaceChildren();
  for (const [label, tex, text] of rows) {
    const div = document.createElement("div");
    const dt = Object.assign(document.createElement("dt"), { textContent: label });
    const dd = document.createElement("dd");
    if (tex) renderTex(dd, tex); else dd.textContent = text;
    div.append(dt, dd);
    dl.append(div);
  }
}

// ───────────── 3. La fonction a^x ─────────────

const expState = { a: 2, exact: fr(2) };

function setBase(a, exact = null) {
  expState.a = a;
  expState.exact = exact;
  $("exp-a").value = a;
  renderExp();
}

function renderExp() {
  const { a, exact } = expState;
  const aTex = exact ? fracTex(exact) : numTex(a, 3);
  $("exp-a-out").textContent = exact ? fracText(exact) : a > 2.718 && a < 2.7183 ? "e" : fmt(a, 3);
  for (const chip of $("exp-presets").children) {
    const v = chip.dataset.v ? Number(chip.dataset.v) : Number(chip.dataset.n) / Number(chip.dataset.d);
    chip.classList.toggle("active", Math.abs(v - a) < 1e-9);
  }
  const constant = Math.abs(a - 1) < 0.005;
  const inverse = $("exp-inverse").checked && !constant;

  const c = themeColors();
  const xs = linspace(-4, inverse ? 8 : 4, 500);
  const traces = [{ x: xs, y: xs.map((x) => a ** x), mode: "lines", line: { color: c.curve, width: 2.5 }, hovertemplate: "a^%{x:.2f} = %{y:.3f}<extra></extra>" }];
  traces.push({ x: [0, 1], y: [1, a], mode: "markers+text", text: ["(0 ; 1)", `(1 ; ${exact ? fracText(exact) : fmt(a)})`],
    textposition: ["top left", "top left"], marker: { color: c.curve, size: 9 }, textfont: { color: c.fg }, hoverinfo: "skip" });
  if (inverse) {
    const ts = linspace(-8, 8, 600);
    traces.push(
      { x: [-4, 8], y: [-4, 8], mode: "lines", line: { color: c.muted, width: 1, dash: "dash" }, hoverinfo: "skip" },
      { x: ts.map((t) => a ** t), y: ts, mode: "lines", line: { color: c.fit, width: 2.5 }, hovertemplate: "log(%{x:.2f}) = %{y:.3f}<extra></extra>" },
      { x: [1, a], y: [0, 1], mode: "markers", marker: { color: c.fit, size: 9 }, hoverinfo: "skip" },
    );
  }
  const view = inverse ? [-4, 8] : null;
  Plotly.react("plot-exp", traces, layout(c, {
    xaxis: axis(c, { range: view ?? [-4, 4] }),
    yaxis: axis(c, { range: view ?? [-1, 8], ...(inverse ? { scaleanchor: "x", scaleratio: 1 } : {}) }),
    shapes: [hline(0, c.midline, "dash", 2)],
    annotations: [{ xref: "paper", x: 0.01, y: 0, yanchor: "bottom", xanchor: "left", showarrow: false, text: "asymptote y = 0", font: { color: c.midline } }],
    uirevision: String(inverse),
  }), PLOT_CONFIG);

  const growing = a > 1;
  const items = constant
    ? ["Avec $a = 1$, $f(x) = 1^x = 1$ pour tout $x$ : la fonction est constante. C'est pourquoi la base 1 est exclue."]
    : [
      "$\\operatorname{dom} f = \\mathbb{R}$ et $\\operatorname{im} f = \\left]0 \\,;\\, +\\infty\\right[$ : $a^x > 0$ pour tout $x$.",
      `La courbe passe par $(0 \\,;\\, 1)$ et $(1 \\,;\\, ${aTex})$, car $a^0 = 1$ et $a^1 = a$.`,
      "L'axe $Ox$ est une asymptote horizontale ($y = 0$). Il n'y a pas d'asymptote verticale.",
      growing
        ? `$a = ${aTex} > 1$ : fonction strictement **croissante**, $\\lim_{x \\to -\\infty} a^x = 0$ et $\\lim_{x \\to +\\infty} a^x = +\\infty$.`
        : `$0 < a = ${aTex} < 1$ : fonction strictement **décroissante**, $\\lim_{x \\to -\\infty} a^x = +\\infty$ et $\\lim_{x \\to +\\infty} a^x = 0$.`,
    ];
  const ul = document.createElement("ul");
  for (const text of items) {
    const li = document.createElement("li");
    // **bold** markers become <strong>; the rest goes through renderMixed.
    for (const [i, chunk] of text.split("**").entries()) {
      const span = document.createElement(i % 2 ? "strong" : "span");
      renderMixed(span, chunk);
      li.append(span);
    }
    ul.append(li);
  }
  $("exp-props").replaceChildren(ul);

  const table = $("exp-table");
  table.replaceChildren();
  const ks = [-3, -2, -1, 0, 1, 2, 3];
  const head = table.insertRow(), body = table.insertRow();
  renderTex(head.appendChild(document.createElement("th")), "x");
  renderTex(body.appendChild(document.createElement("th")), "a^x");
  for (const k of ks) {
    renderTex(head.insertCell(), `${k}`);
    const exactValue = exact ? pow(exact, k) : null;
    const small = exactValue && Math.abs(exactValue.n) < 1e4 && exactValue.d < 1e4;
    renderTex(body.insertCell(), small ? fracTex(exactValue) : numTex(a ** k, 3));
  }
}

// ───────────── 5. Convertisseur de logarithme ─────────────

const readNumber = (s) => Number(s.trim().replace(",", ".").replace(/[−–]/g, "-"));

function renderLog() {
  const a = readNumber($("log-a").value);
  const x = readNumber($("log-x").value);
  const out = $("log-result");
  out.className = "formula-box";
  if (!Number.isFinite(a) || !Number.isFinite(x) || $("log-a").value.trim() === "" || $("log-x").value.trim() === "") {
    out.textContent = "Entre une base et un nombre.";
    return;
  }
  if (a <= 0 || a === 1) {
    out.classList.add("warn");
    renderMixed(out, "La base doit être strictement positive et différente de 1.");
    return;
  }
  if (x <= 0) {
    out.classList.add("warn");
    renderMixed(out, `$\\log_{${numTex(a)}} ${numTex(x)}$ n'existe pas : une puissance de $${numTex(a)}$ est toujours strictement positive.`);
    return;
  }
  const y = Math.log(x) / Math.log(a);
  const exact = Math.abs(y - Math.round(y)) < 1e-9;
  const yTex = exact ? `${Math.round(y)}` : numTex(y, 4);
  const rel = exact ? "=" : "\\approx";
  renderTex(out, `\\log_{${numTex(a)}} ${numTex(x)} ${rel} ${yTex} \\quad\\Longleftrightarrow\\quad ${numTex(a)}^{${yTex}} ${rel} ${numTex(x)}`, true);
}

// ───────────── 6. Le nombre e : pente de a^x en 0 ─────────────

function renderSlope() {
  const a = Number($("e-a").value);
  const isE = Math.abs(a - Math.E) < 0.0015;
  $("e-a-out").textContent = isE ? "e" : fmt(a, 3);
  for (const chip of $("e-presets").children) chip.classList.toggle("active", Math.abs(Number(chip.dataset.v) - a) < 0.0015);
  const k = Math.log(a);
  const c = themeColors();
  const xs = linspace(-2, 2, 300);
  Plotly.react("plot-e", [
    { x: xs, y: xs.map((x) => a ** x), mode: "lines", line: { color: c.curve, width: 2.5 }, hovertemplate: "a^%{x:.2f} = %{y:.3f}<extra></extra>" },
    { x: [-2, 2], y: [1 - 2 * k, 1 + 2 * k], mode: "lines", line: { color: c.fit, width: 2, dash: "dash" }, hoverinfo: "skip" },
    { x: [-2, 2], y: [-1, 3], mode: "lines", line: { color: c.muted, width: 1, dash: "dot" }, hoverinfo: "skip" },
    { x: [0], y: [1], mode: "markers", marker: { color: c.curve, size: 9 }, hoverinfo: "skip" },
  ], layout(c, {
    xaxis: axis(c, { range: [-2, 2] }),
    yaxis: axis(c, { range: [-1, 4] }),
    annotations: [{ x: 1.4, y: 2.4, showarrow: false, text: "pente 1", font: { color: c.muted } }],
  }), PLOT_CONFIG);
  renderMixed($("e-slope"), isE
    ? "Pente de la tangente en 0 : $k = 1$. La tangente est la droite $y = x + 1$ : c'est la base $e \\approx 2{,}718$."
    : `Pente de la tangente en 0 : $k \\approx ${numTex(k, 3)}$ ($= \\ln ${numTex(a, 3)}$). ${k < 1 ? "Moins que 1 : augmente la base." : "Plus que 1 : diminue la base."}`);
}

// ───────────── 7. Graphique semi-logarithmique ─────────────

const SL_CURVES = {
  2: { label: "2ˣ", f: (x) => 2 ** x, color: "curve" },
  e: { label: "eˣ", f: Math.exp, color: "fit" },
  10: { label: "10ˣ", f: (x) => 10 ** x, color: "period" },
  half: { label: "(1/2)ˣ", f: (x) => 0.5 ** x, color: "bounds" },
};

function renderSemiLog() {
  const log = $("sl-log").checked;
  const m = 10 ** Number($("sl-m").value);
  const a = Number($("sl-a").value);
  $("sl-m-out").textContent = fmt(m, m < 1 ? 2 : 1);
  $("sl-a-out").textContent = fmt(a, 2);
  const c = themeColors();
  const xs = linspace(-3, 5, 300);
  const traces = [];
  for (const box of $("sl-curves").querySelectorAll("input")) {
    if (!box.checked) continue;
    const curve = box.value === "custom" ? { label: "m·aˣ", f: (x) => m * a ** x, color: "accent" } : SL_CURVES[box.value];
    traces.push({ x: xs, y: xs.map(curve.f), mode: "lines", name: curve.label, line: { color: c[curve.color], width: 2.5 },
      hovertemplate: `${curve.label} : %{y:.3g}<extra></extra>` });
  }
  Plotly.react("plot-sl", traces, layout(c, {
    showlegend: true,
    legend: { orientation: "h", y: 1.02, yanchor: "bottom", x: 0 },
    margin: { l: 56, r: 16, t: 36, b: 44 },
    xaxis: axis(c, { range: [-3, 5] }),
    yaxis: log
      ? axis(c, { type: "log", range: [-3, 5], dtick: 1, exponentformat: "power" })
      : axis(c, { range: [-5, 60] }),
    uirevision: String(log),
  }), PLOT_CONFIG);
  const slope = Math.log10(a);
  renderMixed($("sl-note"), log
    ? `En échelle log, $m \\cdot a^x$ est une droite de pente $\\log a \\approx ${numTex(slope, 3)}$ (${Math.abs(slope) < 0.005 ? "horizontale : $a = 1$" : slope > 0 ? "montante : $a > 1$" : "descendante : $a < 1$"}) qui coupe l'axe vertical en $m \\approx ${numTex(m, 2)}$.`
    : "En échelle linéaire, les exponentielles s'envolent hors du graphique et les petites valeurs se confondent avec l'axe. Coche l'axe logarithmique.");
}

// Reading quiz: a point placed on a gridline d·10^e of a semi-log plot.
const QUIZ_TICKS = [0, 1, 2, 3, 4].flatMap((e) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => d * 10 ** e)).concat(1e5);
const quiz = { value: 0, t: 0, m: 1, a: 1, tries: 0 };

function newQuiz() {
  const r = Math.random;
  quiz.t = 1 + Math.floor(r() * 6);
  quiz.value = (2 + Math.floor(r() * 8)) * 10 ** Math.floor(r() * 4);
  quiz.m = [1, 2, 5, 10, 20, 50][Math.floor(r() * 6)];
  if (Math.abs(Math.log10(quiz.value / quiz.m)) < 0.2) return newQuiz();
  quiz.a = (quiz.value / quiz.m) ** (1 / quiz.t);
  $("slq-answer").value = "";
  $("slq-feedback").textContent = "";
  $("slq-feedback").className = "feedback";
  renderMixed($("slq-question"), `La droite représente $f(t) = m \\cdot a^t$. Que vaut $f(${quiz.t})$ (le point marqué) ?`);
  renderQuiz();
}

function renderQuiz() {
  const c = themeColors();
  const ts = linspace(0, 7, 100);
  const f = (t) => quiz.m * quiz.a ** t;
  Plotly.react("plot-slq", [
    { x: ts, y: ts.map(f), mode: "lines", line: { color: c.curve, width: 2.5 }, hoverinfo: "skip" },
    { x: [quiz.t], y: [quiz.value], mode: "markers", marker: { color: c.accent, size: 11 }, hoverinfo: "skip" },
  ], layout(c, {
    // Hover disabled: the value has to be read on the axis.
    hovermode: false,
    xaxis: axis(c, { range: [0, 7], dtick: 1, title: { text: "t" } }),
    // A gridline at every d·10^e, labels only on the powers of 10.
    yaxis: axis(c, { type: "log", range: [-0.3, 4.3], tickmode: "array", tickvals: QUIZ_TICKS, ticktext: QUIZ_TICKS.map((v) => (Number.isInteger(Math.log10(v)) ? nf(0).format(v) : "")) }),
  }), { ...PLOT_CONFIG, staticPlot: true });
}

function checkQuiz(event) {
  event.preventDefault();
  const v = Number($("slq-answer").value.replace(/\s/g, "").replace(",", "."));
  const el = $("slq-feedback");
  if (!$("slq-answer").value.trim() || !Number.isFinite(v)) {
    el.className = "feedback warn";
    el.textContent = "Écris un nombre, par exemple 300.";
    return;
  }
  const ok = Math.abs(v - quiz.value) <= 0.04 * quiz.value;
  el.className = `feedback ${ok ? "ok" : "bad"}`;
  const below = 10 ** Math.floor(Math.log10(quiz.value));
  renderMixed(el, ok
    ? `C'est juste : $f(${quiz.t}) = ${numTex(quiz.value, 0)}$.`
    : `Pas tout à fait. Repère d'abord la puissance de 10 juste en dessous du point ($${numTex(below, 0)}$), puis compte les graduations : chacune ajoute $${numTex(below, 0)}$.`);
}

// ───────────── wiring ─────────────

export function initLessons() {
  $("recip-fn").addEventListener("change", () => {
    const fn = RECIPROCALS[$("recip-fn").value];
    $("recip-a").value = fn === RECIPROCALS.temp ? 20 : 1.5; // 20 °C is the course's example
    renderReciprocal();
  });
  $("recip-restrict").addEventListener("change", renderReciprocal);
  $("recip-a").addEventListener("input", renderReciprocal);

  buildChessboard();
  $("chess-n").addEventListener("input", renderChess);

  $("exp-a").addEventListener("input", () => setBase(Number($("exp-a").value)));
  for (const chip of $("exp-presets").children) {
    chip.addEventListener("click", () => {
      if (chip.dataset.v) setBase(Number(chip.dataset.v));
      else {
        const f = fr(Number(chip.dataset.n), Number(chip.dataset.d));
        setBase(value(f), f);
      }
    });
  }
  $("exp-inverse").addEventListener("change", renderExp);

  initExamples((type) => TYPES[type].gen(seeded(11)));
  for (const id of ["log-a", "log-x"]) $(id).addEventListener("input", renderLog);

  $("e-a").addEventListener("input", renderSlope);
  for (const chip of $("e-presets").children) {
    chip.addEventListener("click", () => {
      $("e-a").value = chip.dataset.v;
      renderSlope();
    });
  }
  for (const id of ["sl-log", "sl-m", "sl-a"]) $(id).addEventListener("input", renderSemiLog);
  $("sl-curves").addEventListener("change", renderSemiLog);
  $("slq-form").addEventListener("submit", checkQuiz);
  $("slq-new").addEventListener("click", newQuiz);
  newQuiz();

  renderAll();
  return { renderPlots: () => { renderReciprocal(); renderExp(); renderSlope(); renderSemiLog(); renderQuiz(); } };
}

function renderAll() {
  renderReciprocal();
  renderChess();
  renderExp();
  renderLog();
  renderSlope();
  renderSemiLog();
}
