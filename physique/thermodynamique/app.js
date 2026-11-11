// Entry point: static formulas, chapters, trainer, theme and chapter navigation.

import { renderStaticTex } from "../../shared/tex.js";
import { initTheme } from "../../shared/theme.js";
import { initLessons } from "./lessons.js";
import { initTrainer } from "./trainer.js";
import { initCalculator, PHYSICS_KEYS } from "../../shared/calculator.js";
import { initCourse } from "../../shared/course.js";

renderStaticTex();
const lessons = initLessons();
const trainer = initTrainer();
initExerciseCalculator();
initTheme(document.getElementById("theme-toggle"), lessons.render);

initCourse({ trainer });

// Calculator beside the exercises; shown by default, the choice is remembered.
function initExerciseCalculator() {
  const panel = document.getElementById("calc");
  const toggle = document.getElementById("calc-toggle");
  const answer = document.getElementById("ex-answer");
  initCalculator(panel, {
    functionKeys: PHYSICS_KEYS,
    placeholder: "ex. 0,5·1200·25^2",
    // Replaces the answer.
    onUse(text) {
      answer.value = text;
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
