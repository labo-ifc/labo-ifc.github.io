// UI: reads controls, computes the curve, renders the plot and the formula.
// math.js, KaTeX and Plotly are loaded as globals by index.html.
/* global math, Plotly */

import { evaluateSinusoid, fitSinusoid, cosPhase, derived, circlePoint } from "./model.js";
import { linspace } from "../../shared/numeric.js";
import { piTicks, piLabel } from "../../shared/ticks.js";
import { compileExpression } from "../../shared/parser.js";
import { initTheme } from "../../shared/theme.js";
import { renderTex, renderStaticTex } from "../../shared/tex.js";
import { themeColors, axis, layout, hline, PLOT_CONFIG } from "../../shared/plot.js";

const X_RANGE = [-10, 10];
const Y_RANGE_SLIDERS = [-10.5, 10.5]; // fixed so changing A or D visibly moves the curve
const GOOD_FIT = 0.99;
const xs = linspace(...X_RANGE, 1200);

const $ = (id) => document.getElementById(id);
const SLIDERS = ["A", "omega", "phi", "D"];
const DEFAULTS = { A: 1, omega: 1, phi: 0, D: 0 };

const state = {
  mode: "sliders",
  x0: 0, // abscissa shown on the unit circle (float: the slider step would stall the animation)
  playing: false,
  view: [...X_RANGE], // current x range, kept in sync with zoom/pan
  expr: { fn: null, error: null },
};

// ---------- formatting ----------

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const fmt = (v) => nf.format(Math.abs(v) < 0.005 ? 0 : v);
const tex = (v) => fmt(v).replace(",", "{,}"); // no extra space after the decimal comma in KaTeX

/** "π/4" when φ is close to a multiple of π/12, otherwise "". */
function piApprox(v) {
  const k = Math.round((v / Math.PI) * 12);
  return k !== 0 && Math.abs(v - (k * Math.PI) / 12) < 0.006 ? piLabel(k, 12) : "";
}

/** TeX for A·f(ωx − φ) + D, dropping 1s, zeros and doubled signs. */
function formulaTex(fn, { A, omega, phi, D }, rel = "=") {
  const amp = Math.abs(A - 1) < 0.005 ? "" : tex(A);
  const w = Math.abs(omega - 1) < 0.005 ? "" : tex(omega);
  const ph = Math.abs(phi) < 0.005 ? "" : `${phi > 0 ? " - " : " + "}${tex(Math.abs(phi))}`;
  const d = Math.abs(D) < 0.005 ? "" : `${D > 0 ? " + " : " - "}${tex(Math.abs(D))}`;
  return `y ${rel} ${amp}\\${fn}(${w}x${ph})${d}`;
}

// ---------- computation ----------

function sliderParams() {
  return Object.fromEntries(SLIDERS.map((k) => [k, Number($(k).value)]));
}

/** { ys, params, fit } — params null when nothing sinusoidal can be shown. */
function compute() {
  if (state.mode === "sliders") {
    const params = sliderParams();
    return { ys: evaluateSinusoid(params, xs), params, fit: null };
  }
  if (!state.expr.fn) return { ys: [], params: null, fit: null };
  // The fit is costly: reuse it while the expression is unchanged (circle playback).
  if (state.expr.result?.fn !== state.expr.fn) {
    const ys = xs.map(state.expr.fn);
    const fit = fitSinusoid(xs, ys);
    state.expr.result = { fn: state.expr.fn, ys, params: fit, fit };
  }
  const { ys, params, fit } = state.expr.result;
  return { ys, params, fit };
}

// ---------- unit circle ----------

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const piTex = (label) => label.replaceAll("π", "\\pi ").replaceAll("−", "-");

/** Params for the circle, or the reason it cannot be drawn (null when the box is unchecked). */
function circleStatus({ params, fit }) {
  if (!$("show-circle").checked) return null;
  if (state.mode === "free") {
    if (!$("expr").value.trim()) return { reason: "Saisissez une expression pour afficher le cercle." };
    if (!state.expr.fn) return { reason: "Expression invalide : le cercle ne peut pas être construit." };
    if (!params) {
      return { reason: "Aucune sinusoïde n'a pu être ajustée (fonction constante, non définie, ou sans période " +
        "complète sur l'intervalle) : il n'y a pas d'angle θ = ωx − φ à représenter sur le cercle." };
    }
    if (fit.r2 < GOOD_FIT) {
      return { reason: `Ajustement trop approximatif (R² = ${nf.format(Math.round(fit.r2 * 1000) / 1000)}) : ` +
        "la courbe n'est pas de la forme A·sin(ωx − φ) + D, elle ne se lit donc pas sur le cercle." };
    }
  }
  const view = circleView(params);
  // Keep the point on screen: the position slider is limited to the window.
  state.x0 = Math.min(Math.max(state.x0, view.x[0]), view.x[1]);
  const key = view.x.concat(view.y).map((v) => v.toFixed(2)).join(",");
  if (key !== state.circleKey) {
    state.circleKey = key;
    state.view = [...view.x];
    Object.assign($("x0"), { min: view.x[0], max: view.x[1] });
    $("x0").value = state.x0;
  }
  return { params, view, key, point: circlePoint(params, state.x0) };
}

/**
 * Window used while the circle is shown: y spans the circle and the curve
 * (with a margin), x follows so that units are equal and the circle is round.
 */
function circleView({ A, D }) {
  const lo = Math.min(-1, D - A), hi = Math.max(1, D + A);
  const m = 0.12 * (hi - lo);
  const y = [lo - m, hi + m];
  const fl = $("plot")._fullLayout;
  const ratio = fl?.xaxis?._length && fl?.yaxis?._length ? fl.xaxis._length / fl.yaxis._length : 1.6;
  const half = Math.min(((y[1] - y[0]) / 2) * ratio, X_RANGE[1]);
  return { x: [-half, half], y };
}

/** Shapes, labels and traces of the unit circle, the angle θ and the matching point of the curve. */
function circleLayers({ params, point }, c, shapes, annotations, traces) {
  const { theta, cos, sin, y } = point;
  const line = (x0, y0, x1, y1, dash = "solid", width = 1.5) =>
    ({ type: "line", x0, y0, x1, y1, line: { color: c.circle, width, dash } });
  shapes.push(
    { type: "circle", x0: -1, y0: -1, x1: 1, y1: 1, line: { color: c.circle, width: 2 } },
    line(0, 0, cos, sin, "solid", 2),
    line(cos, sin, cos, 0, "dot"),
    line(cos, sin, 0, sin, "dot"),
    line(0, y, state.x0, y, "dash", 1),
  );
  const font = { color: c.circle, size: 12 };
  annotations.push(
    { x: cos, y: sin / 2, text: "sin θ", showarrow: false, font, xanchor: cos >= 0 ? "left" : "right", xshift: cos >= 0 ? 4 : -4 },
    { x: cos / 2, y: sin, text: "cos θ", showarrow: false, font, yanchor: sin >= 0 ? "bottom" : "top", yshift: sin >= 0 ? 2 : -2 },
    { x: 0.45 * Math.cos(theta / 2), y: 0.45 * Math.sin(theta / 2), text: "θ", showarrow: false, font },
  );
  const arc = Array.from({ length: 41 }, (_, i) => (theta * i) / 40);
  traces.push({
    x: arc.map((t) => 0.3 * Math.cos(t)), y: arc.map((t) => 0.3 * Math.sin(t)),
    mode: "lines", line: { color: c.circle, width: 1.5 }, hoverinfo: "skip", name: "θ",
  }, {
    x: [cos], y: [sin], mode: "markers", marker: { color: c.circle, size: 9 },
    hovertemplate: "cos θ = %{x:.3f}<br>sin θ = %{y:.3f}<extra></extra>", name: "cercle",
  }, {
    x: [state.x0], y: [y], mode: "markers", marker: { color: c.circle, size: 9, symbol: "diamond" },
    hovertemplate: "x = %{x:.2f}<br>y = A·sin θ + D = %{y:.3f}<extra></extra>", name: "point",
  });
}

function renderCircleCalc(circle) {
  const el = $("circle-calc");
  if (!circle?.point) { el.textContent = ""; return; }
  const { params: { omega, phi }, point: { theta, cos, sin, y } } = circle;
  const raw = omega * state.x0 - phi;
  const thetaPi = piApprox(theta);
  const reduced = Math.abs(raw - theta) > 0.005 ? ` \\equiv ${tex(theta)} \\ (\\mathrm{mod}\\ 2\\pi)` : "";
  renderTex(el,
    `\\theta = \\omega x - \\varphi = ${tex(raw)}${reduced}${thetaPi ? ` \\approx ${piTex(thetaPi)}` : ""}` +
    ` \\qquad \\cos\\theta = ${tex(cos)} \\quad \\sin\\theta = ${tex(sin)}` +
    ` \\qquad y = A\\sin\\theta + D = ${tex(y)}`);
}

// ---------- plot ----------

function renderPlot({ ys, params, fit }, circle) {
  const c = themeColors();
  const traces = [{
    x: xs, y: ys.map((y) => (Number.isFinite(y) ? y : null)),
    mode: "lines", line: { color: c.curve, width: 2.5 }, name: "f(x)", hoverinfo: "x+y",
  }];
  const shapes = [], annotations = [];

  // Only draw the guides when the curve really is (close to) a sinusoid.
  const trusted = params && (!fit || fit.r2 >= GOOD_FIT);
  if (fit && fit.r2 >= 0.5) {
    traces.push({
      x: xs, y: evaluateSinusoid(fit, xs), mode: "lines", name: "ajustement",
      line: { color: c.fit, width: 1.5, dash: "dot" }, hoverinfo: "skip",
    });
  }
  if (trusted) {
    const { A, D } = params;
    if ($("show-midline").checked) shapes.push(hline(D, c.midline, "dash"));
    if ($("show-bounds").checked) shapes.push(hline(D + A, c.bounds, "dot"), hline(D - A, c.bounds, "dot"));
    if ($("show-period").checked) {
      const { T, xPeak } = derived(params);
      const top = D + A;
      const vline = (x) => ({ type: "line", x0: x, x1: x, y0: D, y1: top, line: { color: c.period, width: 1, dash: "dot" } });
      shapes.push(vline(xPeak), vline(xPeak + T));
      annotations.push({
        x: xPeak, y: top, ax: xPeak + T, ay: top, axref: "x", ayref: "y",
        showarrow: true, arrowside: "end+start", arrowhead: 2, arrowcolor: c.period, text: "",
      }, {
        x: xPeak + T / 2, y: top, yshift: 12, showarrow: false,
        text: `T = ${fmt(T)}`, font: { color: c.period },
      });
      traces.push({
        x: [xPeak], y: [top], mode: "markers+text", text: ["x<sub>p</sub>"], textposition: "top left",
        marker: { color: c.period, size: 8 }, textfont: { color: c.period }, hoverinfo: "x+y", name: "pic",
      });
    }
  }

  const showCircle = Boolean(circle?.point);
  if (showCircle) circleLayers(circle, c, shapes, annotations, traces);

  const xaxis = axis(c, { range: showCircle ? circle.view.x : X_RANGE, title: { text: $("axis").value === "radians" ? "x (rad)" : "x" } });
  if ($("axis").value === "radians") {
    const { values, labels } = piTicks(...state.view);
    Object.assign(xaxis, { tickmode: "array", tickvals: values, ticktext: labels });
  }
  // Equal units with the circle (scaleanchor corrects any rounding of the window).
  const yaxis = axis(c, {
    title: { text: "y" },
    ...(showCircle ? { range: circle.view.y, scaleanchor: "x", scaleratio: 1 }
      : state.mode === "sliders" ? { range: Y_RANGE_SLIDERS } : { autorange: true }),
  });

  Plotly.react("plot", traces, layout(c, {
    xaxis, yaxis, shapes, annotations,
    // Keep the user's zoom across updates; reset it when the mode or the circle window changes.
    uirevision: `${state.mode}-${showCircle ? circle.key : ""}`,
  }), PLOT_CONFIG);
}

// ---------- formula & values ----------

function renderResults({ params, fit }) {
  const note = $("fit-note");
  note.className = "note";
  note.textContent = "";
  $("formula-cos").textContent = "";
  $("values").replaceChildren();

  if (!params) {
    $("results-title").textContent = "Formule";
    $("formula").textContent = state.mode === "free" && state.expr.fn
      ? "Impossible d'ajuster une sinusoïde (fonction constante ou non définie sur l'intervalle)."
      : "—";
    return;
  }

  const rel = fit ? "\\approx" : "=";
  $("results-title").textContent = fit ? "Sinusoïde ajustée" : "Formule";
  renderTex($("formula"), formulaTex("sin", params, rel));
  renderTex($("formula-cos"), formulaTex("cos", { ...params, phi: cosPhase(params.phi) }, rel));

  const { T, xPeak } = derived(params);
  const phiPi = piApprox(params.phi);
  const rows = [
    ["A", fmt(params.A)],
    ["\\omega", fmt(params.omega)],
    ["T = 2\\pi/\\omega", fmt(T)],
    ["\\varphi", fmt(params.phi) + (phiPi ? ` ≈ ${phiPi}` : "")],
    ["D", fmt(params.D)],
    ["x_p", fmt(xPeak)],
  ];
  if (fit) rows.push(["R^2", nf.format(Math.round(fit.r2 * 1000) / 1000)]);
  for (const [label, value] of rows) {
    const div = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    renderTex(dt, label);
    dd.textContent = value;
    div.append(dt, dd);
    $("values").append(div);
  }

  if (fit && fit.r2 < GOOD_FIT) {
    note.className = "note warn";
    note.textContent = "Ajustement approximatif : cette courbe n'est probablement pas une sinusoïde pure. " +
      "La courbe pointillée montre la sinusoïde la plus proche.";
  } else if (fit) {
    note.textContent = "Paramètres retrouvés par ajustement (moindres carrés) sur l'intervalle affiché.";
  }
}

// ---------- update loop ----------

function update() {
  for (const k of SLIDERS) {
    const v = Number($(k).value);
    const p = k === "phi" ? piApprox(v) : "";
    $(`${k}-out`).textContent = fmt(v) + (p ? ` ≈ ${p}` : "");
  }
  $("x0-out").textContent = fmt(state.x0);
  const result = compute();
  const circle = circleStatus(result);
  if (!circle?.point) {
    stopPlaying();
    if (state.circleKey) { state.circleKey = null; state.view = [...X_RANGE]; }
  }
  $("circle-note").textContent = circle?.reason ?? "";
  $("circle-play").disabled = reducedMotion.matches || !circle?.point;
  renderPlot(result, circle);
  renderResults(result);
  renderCircleCalc(circle);
}

// Playback: θ turns by π/2 per second; x wraps around the visible range.
let last = 0, playFrame = 0;
function tick(now) {
  const omega = compute().params?.omega;
  if (!state.playing || !omega) return;
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  let x = state.x0 + (dt * Math.PI) / (2 * omega);
  const [lo, hi] = [Number($("x0").min), Number($("x0").max)];
  if (x > hi) x = lo;
  state.x0 = x;
  $("x0").value = x;
  update();
  playFrame = requestAnimationFrame(tick);
}

function setPlaying(on) {
  state.playing = on;
  $("circle-play").setAttribute("aria-pressed", String(on));
  $("circle-play").textContent = on ? "⏸ Pause" : "▶ Lecture";
  cancelAnimationFrame(playFrame);
  if (on) playFrame = requestAnimationFrame((now) => { last = now; tick(now); });
}
function stopPlaying() { if (state.playing) setPlaying(false); }

let frame = 0;
const scheduleUpdate = () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(update);
};

function setExpression(text) {
  const r = compileExpression(math, text);
  state.expr = r.fn ? { fn: r.fn, error: null } : { fn: null, error: r.error };
  $("expr-error").textContent = text.trim() ? state.expr.error ?? "" : "";
  $("expr").setAttribute("aria-invalid", String(Boolean(state.expr.error && text.trim())));
}

function setMode(mode) {
  state.mode = mode;
  state.circleKey = null;
  state.view = [...X_RANGE];
  for (const btn of document.querySelectorAll(".tabs button")) {
    btn.setAttribute("aria-selected", String(btn.dataset.mode === mode));
  }
  $("mode-sliders").hidden = mode !== "sliders";
  $("mode-free").hidden = mode !== "free";
  if (mode === "free") {
    // Start from the slider curve so the two modes connect.
    if (!$("expr").value.trim()) {
      const p = sliderParams();
      const a = p.A === 1 ? "" : `${p.A} `;
      const w = p.omega === 1 ? "" : p.omega;
      const phi = p.phi === 0 ? "" : p.phi > 0 ? ` - ${p.phi}` : ` + ${-p.phi}`;
      const d = p.D === 0 ? "" : p.D > 0 ? ` + ${p.D}` : ` - ${-p.D}`;
      $("expr").value = `${a}sin(${w}x${phi})${d}`;
    }
    setExpression($("expr").value);
    $("expr").focus();
  }
  update();
}

// ---------- wiring ----------

for (const k of SLIDERS) $(k).addEventListener("input", scheduleUpdate);
$("reset").addEventListener("click", () => {
  for (const k of SLIDERS) $(k).value = DEFAULTS[k];
  update();
});
for (const btn of document.querySelectorAll(".tabs button")) {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
}

let typing = 0;
$("expr").addEventListener("input", () => {
  clearTimeout(typing);
  typing = setTimeout(() => { setExpression($("expr").value); update(); }, 150);
});
for (const chip of document.querySelectorAll("[data-expr]")) {
  chip.addEventListener("click", () => {
    $("expr").value = chip.dataset.expr;
    setExpression(chip.dataset.expr);
    update();
  });
}

$("show-circle").addEventListener("change", () => {
  $("circle-controls").hidden = !$("show-circle").checked;
  state.circleKey = null;
  if (!$("show-circle").checked) state.view = [...X_RANGE];
});

$("x0").addEventListener("input", () => {
  stopPlaying();
  state.x0 = Number($("x0").value);
  scheduleUpdate();
});
$("circle-play").addEventListener("click", () => setPlaying(!state.playing));
const motionNote = () => {
  $("circle-play").title = reducedMotion.matches ? "Animation désactivée : mouvement réduit demandé par le système." : "";
  if (reducedMotion.matches) stopPlaying();
};
reducedMotion.addEventListener("change", () => { motionNote(); update(); });
motionNote();

for (const id of ["axis", "show-midline", "show-bounds", "show-period", "show-circle"]) {
  $(id).addEventListener("change", update);
}
initTheme($("theme-toggle"), update);

renderStaticTex();

update();

// Re-label π ticks when the user zooms or pans.
$("plot").on("plotly_relayout", (e) => {
  // Responsive resize: the circle window depends on the plot's aspect ratio.
  if (e.autosize && $("show-circle").checked) { state.circleKey = null; scheduleUpdate(); return; }
  if (e["xaxis.autorange"]) state.view = [...X_RANGE];
  else if ("xaxis.range[0]" in e) state.view = [e["xaxis.range[0]"], e["xaxis.range[1]"]];
  else if (Array.isArray(e["xaxis.range"])) state.view = [...e["xaxis.range"]];
  else return;
  if ($("axis").value === "radians") scheduleUpdate();
});
