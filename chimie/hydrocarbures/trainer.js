// Exercise UI for this course: the shared trainer with the texts that depend
// on hydrocarbon answers (coefficients, numbers with a unit), and the picker
// that builds an exercise from chosen values instead of random ones.

import { TYPES, LEVELS, generate, checkAnswer, chosenExercise } from "./exercises.js";
import { initTrainer as initSharedTrainer } from "../../shared/trainer.js";

export { appendStep } from "../../shared/trainer.js";

const $ = (id) => document.getElementById(id);

function roundingNote(ex) {
  return ex.rel ? " (à 1 % près)" : "";
}

function placeholder(ex) {
  if (ex.kind === "coefsN") return "ex. 2 ; 3n-1 ; n/2 ; n+4";
  if (ex.kind === "coefs") return "ex. 2 ; 13 ; 8 ; 10";
  if (ex.labels) return `${ex.labels.join(" ; ")}   ex. ${ex.labels[0] === "σ" ? "11 ; 1" : "4 ; 10"}`;
  return `ex. 12,5${ex.unit ? ` ${ex.unit}` : ""}`;
}

function unreadable(ex) {
  if (ex.kind === "coefsN") return "Je n'arrive pas à lire cette réponse. Écris les 4 coefficients en fonction de $n$, séparés par des « ; », par exemple (n+1)/2 pour $\\frac{n+1}{2}$.";
  if (ex.labels) return `Je n'arrive pas à lire cette réponse. Écris les ${ex.labels.length} nombres dans l'ordre, séparés par des « ; » (${ex.labels.join(" ; ")}).`;
  return "Je n'arrive pas à lire cette réponse. Écris un nombre, par exemple $-814$, $12{,}5$ ou $1{,}2 \\cdot 10^6$ (1,2·10^6).";
}

function wrong(ex, r) {
  if (ex.kind === "coefsN") {
    if (r.proportional) return "L'équation est bien équilibrée, mais simplifie : mets 1 (ou 2) devant l'hydrocarbure.";
    if (r.values.length !== ex.answers.length) return `Il faut 4 coefficients, dans l'ordre ${ex.labels.join(" ; ")}, séparés par des « ; ».`;
  }
  if (r.proportional) return "L'équation est bien équilibrée, mais simplifie : il faut les plus petits coefficients entiers.";
  if (ex.labels && r.values.length !== ex.answers.length) {
    return `Il faut ${ex.answers.length} nombres, dans l'ordre ${ex.labels.join(" ; ")}, séparés par des « ; ».`;
  }
  return "Ce n'est pas ça. Essaie un indice, ou regarde la prochaine étape de la résolution.";
}

/** Picker: kind of exercise, hydrocarbon, number of carbons, combustion. */
function initPicker(trainer) {
  const what = $("pick-what"), family = $("pick-family"), n = $("pick-n"), kind = $("pick-kind");
  // ΔH: alkanes only, complete or CO. Alkenes start at 2 carbons.
  const option = (select, value) => select.querySelector(`option[value="${value}"]`);
  function sync() {
    const energy = what.value === "enthalpy";
    option(family, "alkene").disabled = energy;
    if (energy) family.value = "alkane";
    option(kind, "c").disabled = energy;
    if (energy && kind.value === "c") kind.value = "complete";
    const alkeneBalance = family.value === "alkene" && !energy;
    option(n, "1").disabled = alkeneBalance;
    if (alkeneBalance && n.value === "1") n.value = "2";
  }
  for (const el of [what, family]) el.addEventListener("change", sync);
  sync();
  $("pick-go").addEventListener("click", () => {
    const ex = chosenExercise({ what: what.value, family: family.value, c: n.value, kind: kind.value });
    if (ex) trainer.show(ex);
  });
}

export function initTrainer() {
  const trainer = initSharedTrainer({ TYPES, LEVELS, generate, checkAnswer, roundingNote, placeholder, unreadable, wrong });
  initPicker(trainer);
  return trainer;
}
