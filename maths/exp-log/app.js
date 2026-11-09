// Entry point: static formulas, chapters, trainer, theme and chapter navigation.
/* global Plotly */

import { renderStaticTex } from "../../shared/tex.js";
import { initTheme } from "../../shared/theme.js";
import { initLessons } from "./lessons.js";
import { initTrainer } from "./trainer.js";
import { initCalculator } from "../../shared/calculator.js";
import { initCourse } from "../../shared/course.js";

renderStaticTex();
const lessons = initLessons();
const trainer = initTrainer();
initExerciseCalculator();
initTheme(document.getElementById("theme-toggle"), lessons.renderPlots);

initCourse({
  trainer,
  // Plots drawn while their chapter was hidden have the wrong width.
  onShow: (chapter) => { for (const plot of chapter.querySelectorAll(".js-plotly-plot")) Plotly.Plots.resize(plot); },
});

// Calculator beside the exercises; shown by default, the choice is remembered.
function initExerciseCalculator() {
  const panel = document.getElementById("calc");
  const toggle = document.getElementById("calc-toggle");
  const answer = document.getElementById("ex-answer");
  initCalculator(panel, {
    // Replaces the answer, or adds a second solution after a ";".
    // Exercises that ask for an approximation get the value rounded (2 decimals, or `digits`).
    onUse(text) {
      if (trainer.exercise.approx) text = Number(text.replace(",", ".")).toFixed(trainer.exercise.digits ?? 2).replace(".", ",");
      answer.value = /;\s*$/.test(answer.value) ? `${answer.value.trimEnd()} ${text}` : text;
      answer.dispatchEvent(new Event("input")); // copied to the sticky dock
      answer.focus({ preventScroll: true });
    },
  });
  const show = (on) => {
    panel.hidden = !on;
    toggle.setAttribute("aria-pressed", String(on));
    try { localStorage.setItem("calculator", on ? "on" : "off"); } catch {}
  };
  let saved = null;
  try { saved = localStorage.getItem("calculator"); } catch {}
  show(saved !== "off");
  toggle.addEventListener("click", () => show(panel.hidden));
}
