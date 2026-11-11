// Interactive parts of the chapters: Ec/Ep sliders and free fall, work of an
// inclined force, heating, first law signs, worked examples.

import { renderTex, numTex } from "../../shared/tex.js";
import { initExamples } from "../../shared/examples.js";
import { G, MATERIALS, kinetic, potential, fallState, heat, toKelvin, cosDeg, sinDeg, work } from "./physics.js";
import { TYPES, seeded } from "./exercises.js";

const $ = (id) => document.getElementById(id);
const fmt = (v, digits = 1) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(v);
const fmtSigned = (v, digits = 1) => (v > 0 ? "+" : "") + fmt(v, digits);
const on = (ids, fn) => { for (const id of ids) $(id).addEventListener("input", fn); };
const val = (id) => Number($(id).value);
const svg = (tag, attrs, text) => {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  return el;
};
/** Energy in J, with kJ / MJ for large values. */
const joules = (e) => (Math.abs(e) >= 1e6 ? `${fmt(e / 1e6, 2)} MJ` : Math.abs(e) >= 1e4 ? `${fmt(e / 1e3, 1)} kJ` : `${fmt(e, 1)} J`);
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// ───────────── 2. Énergie mécanique : curseurs et chute libre ─────────────

const fall = { t: 0, playing: false, frame: 0, last: 0 };

function renderMechanics() {
  const m = val("mec-m"), v = val("mec-v"), h = val("mec-h");
  $("mec-m-out").textContent = `${fmt(m)} kg`;
  $("mec-v-out").textContent = `${fmt(v)} m/s (${fmt(v * 3.6, 0)} km/h)`;
  $("mec-h-out").textContent = `${fmt(h)} m`;
  const ec = kinetic(m, v), ep = potential(m, h);
  $("mec-ec").textContent = joules(ec);
  $("mec-ep").textContent = joules(ep);
  $("mec-em").textContent = joules(ec + ep);
  renderTex($("mec-formula"), `E_c = \\tfrac{1}{2} \\cdot ${numTex(m)} \\cdot ${numTex(v)}^2 \\qquad E_p = ${numTex(m)} \\cdot ${numTex(G)} \\cdot ${numTex(h)}`);
  renderFall();
}

function drawFallScene() {
  const scene = $("fall-scene");
  scene.replaceChildren();
  scene.append(svg("line", { class: "fall-ground", x1: 48, y1: 230, x2: 170, y2: 230 }));
  scene.append(svg("line", { class: "fall-ruler", x1: 40, y1: 30, x2: 40, y2: 230 }));
  for (let i = 0; i <= 4; i++) scene.append(svg("line", { class: "fall-ruler", x1: 34, y1: 30 + i * 50, x2: 46, y2: 30 + i * 50 }));
  scene.append(svg("text", { id: "fall-top", class: "fall-label", x: 30, y: 34, "text-anchor": "end" }));
  scene.append(svg("text", { class: "fall-label", x: 30, y: 234, "text-anchor": "end" }, "0"));
  scene.append(svg("circle", { id: "fall-ball", class: "fall-ball", cx: 100, cy: 30, r: 12 }));
  // Bars: Ep, Ec and Em = Ep + Ec, out of the same total.
  [["ep", "Ep", 200], ["ec", "Ec", 240], ["em", "Em", 280]].forEach(([id, name, x]) => {
    scene.append(svg("rect", { class: "fall-bar-bg", x: x - 14, y: 30, width: 28, height: 200, rx: 4 }));
    scene.append(svg("rect", { id: `fall-bar-${id}`, class: `fall-bar fall-${id}`, x: x - 14, y: 230, width: 28, height: 0, rx: 4 }));
    scene.append(svg("text", { class: "fall-label", x, y: 250, "text-anchor": "middle" }, name));
  });
}

function renderFall() {
  const m = val("mec-m"), h0 = Math.max(val("mec-h"), 0.1);
  const s = fallState(m, h0, fall.t);
  const y = 230 - (s.h / h0) * 200;
  $("fall-top").textContent = `${fmt(h0)} m`;
  $("fall-ball").setAttribute("cy", y - 12);
  for (const [id, e] of [["ep", s.ep], ["ec", s.ec], ["em", s.em]]) {
    const bar = $(`fall-bar-${id}`), hh = (e / s.em) * 200;
    bar.setAttribute("y", 230 - hh);
    bar.setAttribute("height", hh);
  }
  $("fall-t").textContent = `${fmt(s.landed ? s.tGround : Math.min(fall.t, s.tGround), 2)} s`;
  $("fall-h").textContent = `${fmt(s.h, 2)} m`;
  $("fall-v").textContent = `${fmt(s.v, 2)} m/s`;
  $("fall-ep").textContent = joules(s.ep);
  $("fall-ec").textContent = joules(s.ec);
  $("fall-play").textContent = fall.playing ? "Pause" : s.landed ? "Recommencer" : fall.t > 0 ? "Reprendre" : "Lâcher";
  return s;
}

function tick(now) {
  const dt = (now - fall.last) / 1000;
  fall.last = now;
  fall.t += dt;
  const s = renderFall();
  if (s.landed) { fall.playing = false; renderFall(); return; }
  fall.frame = requestAnimationFrame(tick);
}

function toggleFall() {
  const s = fallState(val("mec-m"), Math.max(val("mec-h"), 0.1), fall.t);
  if (fall.playing) {
    fall.playing = false;
    cancelAnimationFrame(fall.frame);
  } else {
    if (s.landed) fall.t = 0;
    if (reducedMotion()) {
      fall.t = s.landed ? 0 : s.tGround; // no animation: jump to the ground
    } else {
      fall.playing = true;
      fall.last = performance.now();
      fall.frame = requestAnimationFrame(tick);
    }
  }
  renderFall();
}

function resetFall() {
  fall.playing = false;
  cancelAnimationFrame(fall.frame);
  fall.t = 0;
}

// ───────────── 5. Travail : force inclinée ─────────────

function renderWork() {
  const F = val("work-f"), d = val("work-d"), theta = val("work-theta");
  $("work-f-out").textContent = `${fmt(F, 0)} N`;
  $("work-d-out").textContent = `${fmt(d)} m`;
  $("work-theta-out").textContent = `${theta}°`;
  const cos = cosDeg(theta), W = work(F, d, theta);
  $("work-cos").textContent = fmt(cos, 3);
  $("work-par").textContent = `${fmt(F * cos, 1)} N`;
  $("work-w").textContent = joules(W);
  renderTex($("work-formula"), `W = ${numTex(F)} \\cdot ${numTex(d)} \\cdot \\cos ${theta}^\\circ \\approx ${numTex(W, 1)}\\ \\text{J}`);
  $("work-note").innerHTML = Math.abs(cos) < 1e-9
    ? "<strong>θ = 90°</strong> : la force est perpendiculaire au déplacement, elle ne travaille pas (<strong>W = 0</strong>)."
    : W < 0
      ? "θ > 90° : la force freine le mouvement, son travail est <strong>négatif</strong> (travail résistant)."
      : theta === 0
        ? "θ = 0° : toute la force sert à avancer, <strong>W = F · d</strong>."
        : "Seule la <strong>composante parallèle</strong> au déplacement (en pointillés) travaille.";

  // Drawing: box on the ground, force arrow at θ from its centre, parallel component and displacement.
  const scene = $("work-scene");
  scene.replaceChildren();
  const cx = 150, cy = 150, L = 40 + (F / 200) * 90;
  const fx = cx + L * cos, fy = cy - L * sinDeg(theta);
  scene.append(svg("line", { class: "work-ground", x1: 10, y1: 172, x2: 390, y2: 172 }));
  scene.append(svg("rect", { class: "work-box", x: cx - 30, y: 128, width: 60, height: 44, rx: 4 }));
  scene.append(svg("line", { class: "work-disp", x1: cx - 30, y1: 192, x2: cx - 30 + 40 + d * 8, y2: 192, "marker-end": "url(#arrow-disp)" }));
  scene.append(svg("text", { class: "work-label", x: cx - 30, y: 212 }, `déplacement d = ${fmt(d)} m`));
  if (Math.abs(cos) > 1e-9) {
    scene.append(svg("line", { class: "work-par", x1: cx, y1: cy, x2: fx, y2: cy, "marker-end": "url(#arrow-par)" }));
    scene.append(svg("line", { class: "work-guide", x1: fx, y1: cy, x2: fx, y2: fy }));
  }
  scene.append(svg("line", { class: "work-force", x1: cx, y1: cy, x2: fx, y2: fy, "marker-end": "url(#arrow-force)" }));
  if (theta > 0) {
    const r = 26, ax = cx + r * cos, ay = cy - r * sinDeg(theta);
    scene.append(svg("path", { class: "work-angle", d: `M ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${ax} ${ay}` }));
  }
  scene.append(svg("text", { class: "work-label work-label-force", x: fx + (cos >= 0 ? 6 : -6), y: fy - 6, "text-anchor": cos >= 0 ? "start" : "end" }, "F"));
  scene.prepend(svg("defs", {}));
  for (const id of ["force", "par", "disp"]) {
    const marker = svg("marker", { id: `arrow-${id}`, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" });
    marker.append(svg("path", { d: "M 0 0 L 10 5 L 0 10 z", class: `arrow-${id}` }));
    scene.firstChild.append(marker);
  }
}

// ───────────── 4. Chaleur : chauffer un corps ─────────────

function renderHeat() {
  const mat = MATERIALS.find((x) => x.id === $("heat-mat").value);
  const m = val("heat-m"), t1 = val("heat-t1"), t2 = val("heat-t2");
  $("heat-m-out").textContent = `${fmt(m)} kg`;
  $("heat-t1-out").textContent = `${t1} °C (${fmt(toKelvin(t1), 2)} K)`;
  $("heat-t2-out").textContent = `${t2} °C (${fmt(toKelvin(t2), 2)} K)`;
  $("heat-c").textContent = `${mat.c} J/(kg·°C)`;
  const Q = heat(m, mat.c, t1, t2);
  $("heat-dt").textContent = `${fmtSigned(t2 - t1, 0)} °C = ${fmtSigned(t2 - t1, 0)} K`;
  $("heat-q").textContent = joules(Q);
  renderTex($("heat-formula"), `Q = m \\cdot c \\cdot \\Delta T = ${numTex(m)} \\cdot ${mat.c} \\cdot ${t2 - t1 < 0 ? `(${t2 - t1})` : t2 - t1} \\approx ${numTex(Q, 0)}\\ \\text{J}`);
  $("heat-note").innerHTML = Q > 0
    ? `Q > 0 : le corps <strong>reçoit</strong> de la chaleur, sa température monte.`
    : Q < 0
      ? `Q < 0 : le corps <strong>cède</strong> de la chaleur, sa température baisse.`
      : "Pas de variation de température : Q = 0.";
  // Comparison with water: same mass, same ΔT.
  const ratio = 4185 / mat.c;
  $("heat-compare").textContent = mat.id === "eau"
    ? "L'eau a une capacité thermique massique très élevée : elle se réchauffe et se refroidit lentement."
    : `Avec la même chaleur, ce ${mat.name === "huile" || mat.name === "eau" ? "liquide" : "matériau"} se réchauffe environ ${fmt(ratio)} fois plus que la même masse d'eau.`;
}

// ───────────── 6. Premier principe : ΔU = Q + W ─────────────

function renderFirstLaw() {
  const cycle = $("fl-cycle").checked;
  $("fl-w").disabled = cycle;
  if (cycle) $("fl-w").value = String(-val("fl-q"));
  const Q = val("fl-q"), W = val("fl-w"), dU = Q + W;
  $("fl-q-out").textContent = `${fmtSigned(Q, 0)} J`;
  $("fl-w-out").textContent = `${fmtSigned(W, 0)} J`;
  $("fl-q-word").textContent = Q > 0 ? "chaleur reçue" : Q < 0 ? "chaleur cédée" : "aucun échange de chaleur";
  $("fl-w-word").textContent = W > 0 ? "travail reçu (gaz comprimé)" : W < 0 ? "travail fourni (gaz détendu)" : "aucun travail";
  $("fl-du").textContent = `${fmtSigned(dU, 0)} J`;
  $("fl-t").textContent = dU > 0 ? "monte" : dU < 0 ? "baisse" : "ne change pas";
  renderTex($("fl-formula"), `\\Delta U = Q + W = ${Q} + ${W < 0 ? `(${W})` : W} = ${dU}\\ \\text{J}`);
  $("fl-note").innerHTML = cycle
    ? "Sur un <strong>cycle</strong>, le système revient à son état de départ : ΔU = 0, donc W = −Q."
    : "Convention : ce que le système <strong>reçoit</strong> est positif, ce qu'il <strong>cède</strong> est négatif.";

  // Drawing: the gas in a cylinder, Q arrow on the left, W arrow on the piston.
  const scene = $("fl-scene");
  scene.replaceChildren();
  const warm = dU > 0 ? "fl-gas warm" : dU < 0 ? "fl-gas cool" : "fl-gas";
  const piston = 60 + Math.max(-30, Math.min(30, W / 70)); // compressed (W > 0): lower
  scene.append(svg("path", { class: "fl-cylinder", d: "M 130 40 L 130 200 L 270 200 L 270 40" }));
  scene.append(svg("rect", { class: warm, x: 132, y: piston + 10, width: 136, height: 188 - piston }));
  scene.append(svg("rect", { class: "fl-piston", x: 132, y: piston, width: 136, height: 10 }));
  scene.append(svg("text", { class: "fl-label", x: 200, y: 140, "text-anchor": "middle" }, `ΔU = ${fmtSigned(dU, 0)} J`));
  const arrow = (x1, y1, x2, y2, cls, text, tx, ty) => {
    scene.append(svg("line", { class: cls, x1, y1, x2, y2, "marker-end": "url(#fl-head)" }));
    scene.append(svg("text", { class: "fl-label", x: tx, y: ty, "text-anchor": "middle" }, text));
  };
  if (Q > 0) arrow(20, 130, 120, 130, "fl-q", `Q = ${fmtSigned(Q, 0)} J`, 70, 118);
  if (Q < 0) arrow(120, 130, 20, 130, "fl-q", `Q = ${fmtSigned(Q, 0)} J`, 70, 118);
  if (W > 0) arrow(330, piston - 40, 280, piston + 4, "fl-w", `W = ${fmtSigned(W, 0)} J`, 335, piston - 46);
  if (W < 0) arrow(280, piston + 4, 330, piston - 40, "fl-w", `W = ${fmtSigned(W, 0)} J`, 335, piston - 46);
  const defs = svg("defs", {});
  const marker = svg("marker", { id: "fl-head", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" });
  marker.append(svg("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "fl-head" }));
  defs.append(marker);
  scene.prepend(defs);
}

export function initLessons() {
  $("heat-mat").innerHTML = MATERIALS.map((x) => `<option value="${x.id}">${x.name[0].toUpperCase()}${x.name.slice(1)} (c = ${x.c})</option>`).join("");
  drawFallScene();

  on(["mec-m", "mec-v"], renderMechanics);
  on(["mec-h"], () => { resetFall(); renderMechanics(); });
  $("fall-play").addEventListener("click", toggleFall);
  on(["work-f", "work-d", "work-theta"], renderWork);
  on(["heat-mat", "heat-m", "heat-t1", "heat-t2"], renderHeat);
  on(["fl-q", "fl-w"], renderFirstLaw);
  $("fl-cycle").addEventListener("change", renderFirstLaw);

  const render = () => { renderMechanics(); renderWork(); renderHeat(); renderFirstLaw(); };
  render();
  // Multiple choice examples list their choices after the question.
  initExamples((type) => {
    const ex = TYPES[type].gen(seeded(11));
    return ex.choices ? { ...ex, text: `${ex.text} (${ex.choices.join(" · ")})` } : ex;
  });
  return { render };
}
