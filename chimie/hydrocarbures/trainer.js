// Exercise UI for this course: the shared trainer with the texts that depend
// on hydrocarbon answers (coefficients, numbers with a unit).

import { TYPES, LEVELS, generate, checkAnswer } from "./exercises.js";
import { initTrainer as initSharedTrainer } from "../../shared/trainer.js";

export { appendStep } from "../../shared/trainer.js";

function roundingNote(ex) {
  return ex.rel ? " (à 1 % près)" : "";
}

function placeholder(ex) {
  if (ex.kind === "coefs") return "ex. 2 ; 13 ; 8 ; 10";
  if (ex.labels) return `${ex.labels.join(" ; ")}   ex. ${ex.labels[0] === "σ" ? "11 ; 1" : "4 ; 10"}`;
  return `ex. 12,5${ex.unit ? ` ${ex.unit}` : ""}`;
}

function unreadable(ex) {
  if (ex.labels) return `Je n'arrive pas à lire cette réponse. Écris les ${ex.labels.length} nombres dans l'ordre, séparés par des « ; » (${ex.labels.join(" ; ")}).`;
  return "Je n'arrive pas à lire cette réponse. Écris un nombre, par exemple $-814$, $12{,}5$ ou $1{,}2 \\cdot 10^6$ (1,2·10^6).";
}

function wrong(ex, r) {
  if (r.proportional) return "L'équation est bien équilibrée, mais simplifie : il faut les plus petits coefficients entiers.";
  if (ex.labels && r.values.length !== ex.answers.length) {
    return `Il faut ${ex.answers.length} nombres, dans l'ordre ${ex.labels.join(" ; ")}, séparés par des « ; ».`;
  }
  return "Ce n'est pas ça. Essaie un indice, ou regarde la prochaine étape de la résolution.";
}

export function initTrainer() {
  return initSharedTrainer({ TYPES, LEVELS, generate, checkAnswer, roundingNote, placeholder, unreadable, wrong });
}
