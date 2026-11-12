// Exercise UI shared by course pages: generate, check the answer, reveal hints
// and the solution step by step, sticky dock. Each course passes its generator
// and the few texts that depend on its kind of answers.

import { renderTex, renderMixed } from "./tex.js";

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

function fillChoices(select, TYPES, LEVELS) {
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

/**
 * @param {object} course
 * @param {object} course.TYPES       exercise types ({ label, level, … })
 * @param {{ id, label }[]} course.LEVELS
 * @param {(choice: string) => object} course.generate   exercise { prompt, statement | text, hints, steps, … }
 * @param {(ex, input: string) => object} course.checkAnswer   { ok, values, … } (values null = unreadable)
 * @param {(ex) => string} course.roundingNote   appended to the prompt
 * @param {(ex) => string} course.placeholder    answer field placeholder
 * @param {(ex, r) => string | null} course.unreadable   message when r.values is null
 * @param {(ex, r) => string} course.wrong       message for a wrong answer
 * @param {(el, ex) => boolean} [course.figure]  draws the exercise's figure in #ex-figure (false = none)
 *
 * An exercise with `choices` (texts, $…$ allowed) is a multiple choice question:
 * buttons replace the answer field and checkAnswer gets the index clicked ("0", "1"…).
 */
export function initTrainer({ TYPES, LEVELS, generate, checkAnswer, roundingNote, placeholder, unreadable, wrong, figure }) {
  const state = { ex: null, hints: 0, steps: 0, solved: false, counted: false, ok: 0, tried: 0 };

  // Multiple choice buttons, in the card and in the sticky dock.
  const choiceBoxes = [document.createElement("div"), document.createElement("div")];
  choiceBoxes[0].id = "ex-choices";
  choiceBoxes[1].id = "dock-choices";
  for (const box of choiceBoxes) {
    box.className = "choices";
    box.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (btn) submit(btn.dataset.index);
    });
  }
  $("ex-form").querySelector(".answer-row").before(choiceBoxes[0]);
  $("dock-form").prepend(choiceBoxes[1]);

  function fillChoiceBoxes(ex) {
    for (const [k, box] of choiceBoxes.entries()) {
      box.replaceChildren();
      box.closest("form").classList.toggle("choice-mode", Boolean(ex.choices));
      for (const [i, text] of (ex.choices ?? []).entries()) {
        const btn = Object.assign(document.createElement("button"), { type: "button", className: "ghost choice" });
        btn.dataset.index = i;
        renderMixed(btn, text);
        if (k === 1) btn.tabIndex = -1; // the card buttons are the ones reached with Tab
        box.append(btn);
      }
    }
  }

  function markChoice(i, ok) {
    for (const box of choiceBoxes) box.children[i]?.classList.add(ok ? "ok" : "bad");
  }

  const answerFocus = () => (state.ex.choices ? choiceBoxes[0].querySelector("button") : $("ex-answer"));

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
    const fig = $("ex-figure");
    if (fig) {
      fig.replaceChildren();
      fig.hidden = !(figure && figure(fig, ex));
    }
    $("ex-answer").placeholder = placeholder(ex);
    for (const id of ["ex-answer", "dock-answer"]) $(id).value = "";
    for (const id of ["ex-feedback", "dock-feedback"]) Object.assign($(id), { textContent: "", className: "feedback" });
    $("ex-hints").replaceChildren();
    $("ex-steps").replaceChildren();
    fillChoiceBoxes(ex);
    updateButtons();
    if (focus) answerFocus().focus({ preventScroll: true });
  }

  function check(event) {
    event.preventDefault();
    submit($("ex-answer").value);
  }

  function submit(text) {
    const { ex } = state;
    const r = checkAnswer(ex, text);
    if (!r.values) {
      feedback("warn", unreadable(ex, r));
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
    } else {
      feedback("bad", wrong(ex, r));
    }
    if (ex.choices) markChoice(Number(text), r.ok);
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

  fillChoices($("ex-choice"), TYPES, LEVELS);
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
      answerFocus().focus({ preventScroll: true });
    },
  };
}
