// Exercise UI: generate, check the answer, reveal hints and the solution step by step.

import { TYPES, LEVELS, generate, checkAnswer } from "./exercises.js";
import { renderTex, renderMixed } from "../shared/tex.js";

const $ = (id) => document.getElementById(id);

/** Appends one solution step (display math + explanation) to an <ol>. */
export function appendStep(list, { tex, note }) {
  const li = document.createElement("li");
  const math = document.createElement("div");
  math.className = "step-tex";
  renderTex(math, tex, true);
  li.append(math);
  if (note) {
    const p = document.createElement("p");
    p.className = "step-note";
    renderMixed(p, note);
    li.append(p);
  }
  list.append(li);
}

function fillChoices(select) {
  const opt = (value, label) => Object.assign(document.createElement("option"), { value, textContent: label });
  select.append(opt("all", "Tous les types"));
  const byLevel = document.createElement("optgroup");
  byLevel.label = "Par niveau";
  for (const { id, label } of LEVELS) byLevel.append(opt(`level:${id}`, label));
  select.append(byLevel);
  for (const { id, label } of LEVELS) {
    const group = document.createElement("optgroup");
    group.label = label;
    for (const [type, t] of Object.entries(TYPES)) if (t.level === id) group.append(opt(type, t.label));
    select.append(group);
  }
}

function roundingNote(ex) {
  if (ex.kind === "expr") return "";
  if (ex.text) return ex.digits === 0 ? " (arrondis à l'unité)" : " (arrondis au centième)";
  return ex.approx ? " (valeur exacte ou arrondie au centième)" : "";
}

function placeholder(ex) {
  if (ex.kind === "expr") return "f'(x) = …   ex. 2x e^(x^2)   ·   3/(3x+1)";
  if (ex.text) return ex.digits === 0 ? "ex. 1250" : "ex. 12,35";
  if (ex.prompt === "Calcule") return "ex. 3   ·   -2";
  return ex.approx ? "ex. ln 3   ·   1,10 ; -0,69   ·   ∅" : "ex. 3/2   ·   1 ; 3   ·   ∅";
}

export function initTrainer() {
  const state = { ex: null, hints: 0, steps: 0, solved: false, counted: false, ok: 0, tried: 0 };

  function updateButtons() {
    const { ex, hints, steps } = state;
    $("ex-hint").textContent = `Indice (${hints}/${ex.hints.length})`;
    $("ex-hint").disabled = hints >= ex.hints.length;
    const done = steps >= ex.steps.length;
    $("ex-step").textContent = steps === 0 ? "Voir la résolution pas à pas" : `Étape suivante (${steps}/${ex.steps.length})`;
    $("ex-step").disabled = done;
    $("ex-all").hidden = done;
    $("ex-new").classList.toggle("pulse", done || state.solved);
    // The sticky dock mirrors the card buttons.
    for (const name of ["hint", "step", "all"]) {
      const from = $(`ex-${name}`), to = $(`dock-${name}`);
      Object.assign(to, { textContent: from.textContent, disabled: from.disabled, hidden: from.hidden });
    }
  }

  function updateScore() {
    $("ex-score").textContent = state.tried ? `Réussis : ${state.ok} / ${state.tried}` : "";
  }

  function feedback(kind, text) {
    for (const el of [$("ex-feedback"), $("dock-feedback")]) {
      el.className = `feedback ${kind}`;
      renderMixed(el, text);
    }
  }

  function newExercise({ focus = true } = {}) {
    state.ex = generate($("ex-choice").value);
    Object.assign(state, { hints: 0, steps: 0, solved: false, counted: false });
    const { ex } = state;
    $("ex-prompt").textContent = `${ex.prompt}${roundingNote(ex)} :`;
    $("ex-statement").classList.toggle("text", Boolean(ex.text));
    if (ex.text) renderMixed($("ex-statement"), ex.text);
    else renderTex($("ex-statement"), ex.statement, true);
    if (ex.text) renderMixed($("dock-statement"), ex.text);
    else renderTex($("dock-statement"), ex.statement);
    $("ex-answer").placeholder = placeholder(ex);
    for (const id of ["ex-answer", "dock-answer"]) $(id).value = "";
    for (const id of ["ex-feedback", "dock-feedback"]) Object.assign($(id), { textContent: "", className: "feedback" });
    $("ex-hints").replaceChildren();
    $("ex-steps").replaceChildren();
    updateButtons();
    if (focus) $("ex-answer").focus({ preventScroll: true });
  }

  function check(event) {
    event.preventDefault();
    const { ex } = state;
    const r = checkAnswer(ex, $("ex-answer").value);
    if (!r.values && ex.kind === "expr") {
      feedback("warn", `Je n'arrive pas à lire cette expression${r.error ? ` : ${r.error}` : ""}. Écris par exemple $2x \\cdot e^{x^2}$ comme 2x e^(x^2), ou $\\frac{3}{3x+1}$ comme 3/(3x+1).`);
      return;
    }
    if (!r.values) {
      feedback("warn", "Je n'arrive pas à lire cette réponse. Écris par exemple $3/2$, $-1$, $1 ; 3$ ou $\\emptyset$ (aucune solution).");
      return;
    }
    const revealed = state.steps >= ex.steps.length;
    if (!state.counted && !revealed) {
      state.tried++;
      state.counted = true;
    }
    if (r.ok) {
      if (!state.solved && !revealed) state.ok++;
      state.solved = true;
      const help = state.hints ? ` (avec ${state.hints} indice${state.hints > 1 ? "s" : ""})` : "";
      feedback("ok", revealed ? "C'est juste. La solution était affichée, donc ce n'est pas compté." : `Bravo, c'est juste${help} !`);
    } else if (ex.kind === "expr") {
      feedback("bad", `J'ai lu $f'(x) = ${r.tex}$ : ce n'est pas la bonne dérivée. Essaie un indice, ou regarde la résolution.`);
    } else if (r.values.length !== ex.solutions.length) {
      const n = ex.solutions.length;
      feedback("bad", n === 0
        ? "Pas tout à fait : cette équation n'a aucune solution ($S = \\emptyset$)."
        : `Pas tout à fait : il y a ${n === 1 ? "une seule solution" : `${n} solutions`}.`);
    } else {
      feedback("bad", "Ce n'est pas ça. Essaie un indice, ou regarde la prochaine étape de la résolution.");
    }
    updateScore();
    updateButtons();
  }

  function showHint() {
    const { ex } = state;
    if (state.hints >= ex.hints.length) return;
    const li = document.createElement("li");
    renderMixed(li, ex.hints[state.hints++]);
    $("ex-hints").append(li);
    li.scrollIntoView({ block: "nearest", behavior: "smooth" });
    updateButtons();
  }

  function showStep() {
    const { ex } = state;
    if (state.steps >= ex.steps.length) return;
    appendStep($("ex-steps"), ex.steps[state.steps++]);
    $("ex-steps").lastElementChild.scrollIntoView({ block: "nearest", behavior: "smooth" });
    updateButtons();
  }

  function showAll() {
    while (state.steps < state.ex.steps.length) appendStep($("ex-steps"), state.ex.steps[state.steps++]);
    updateButtons();
  }

  // Sticky dock: shown once the card buttons have scrolled off the top,
  // while the card is still on screen.
  const root = document.documentElement;
  const chapterBar = document.querySelector(".chapters");
  function placeDock() {
    const top = chapterBar.offsetHeight;
    const helpers = document.querySelector("#exercise .helpers").getBoundingClientRect();
    const card = $("exercise").getBoundingClientRect();
    const show = helpers.bottom < top && card.bottom > top + 120;
    $("ex-dock").hidden = !show;
    $("exercices").classList.toggle("docked", show);
  }
  new ResizeObserver(() => {
    root.style.setProperty("--chapters-h", `${chapterBar.offsetHeight}px`);
    root.style.setProperty("--dock-h", `${$("ex-dock").offsetHeight}px`);
    placeDock();
  }).observe(chapterBar);
  new ResizeObserver(() => {
    if (!$("ex-dock").hidden) root.style.setProperty("--dock-h", `${$("ex-dock").offsetHeight}px`);
  }).observe($("ex-dock"));
  addEventListener("scroll", placeDock, { passive: true });
  addEventListener("resize", placeDock);
  addEventListener("hashchange", placeDock);

  // Both answer fields hold the same text.
  for (const [a, b] of [["ex-answer", "dock-answer"], ["dock-answer", "ex-answer"]]) {
    $(a).addEventListener("input", () => { $(b).value = $(a).value; });
  }

  fillChoices($("ex-choice"));
  $("ex-choice").addEventListener("change", () => newExercise());
  $("ex-new").addEventListener("click", () => newExercise());
  $("ex-form").addEventListener("submit", check);
  $("dock-form").addEventListener("submit", check);
  $("ex-hint").addEventListener("click", showHint);
  $("ex-step").addEventListener("click", showStep);
  $("ex-all").addEventListener("click", showAll);
  $("dock-hint").addEventListener("click", showHint);
  $("dock-step").addEventListener("click", showStep);
  $("dock-all").addEventListener("click", showAll);
  newExercise({ focus: false });

  return {
    /** The exercise on screen. */
    get exercise() { return state.ex; },
    /** Jump to the trainer with a given type or level selected. */
    train(choice) {
      $("ex-choice").value = choice;
      newExercise({ focus: false });
      $("ex-answer").focus({ preventScroll: true });
    },
  };
}
