// Exercise UI for this course: the shared trainer with the texts that depend
// on exp-log answers (values, ∅, expressions in x).

import { TYPES, LEVELS, generate, checkAnswer } from "./exercises.js";
import { initTrainer as initSharedTrainer } from "../../shared/trainer.js";

export { appendStep } from "../../shared/trainer.js";

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

function unreadable(ex, r) {
  if (ex.kind === "expr") {
    return `Je n'arrive pas à lire cette expression${r.error ? ` : ${r.error}` : ""}. Écris par exemple $2x \\cdot e^{x^2}$ comme 2x e^(x^2), ou $\\frac{3}{3x+1}$ comme 3/(3x+1).`;
  }
  return "Je n'arrive pas à lire cette réponse. Écris par exemple $3/2$, $-1$, $1 ; 3$ ou $\\emptyset$ (aucune solution).";
}

function wrong(ex, r) {
  if (ex.kind === "expr") return `J'ai lu $f'(x) = ${r.tex}$ : ce n'est pas la bonne dérivée. Essaie un indice, ou regarde la résolution.`;
  if (r.values.length !== ex.solutions.length) {
    const n = ex.solutions.length;
    return n === 0
      ? "Pas tout à fait : cette équation n'a aucune solution ($S = \\emptyset$)."
      : `Pas tout à fait : il y a ${n === 1 ? "une seule solution" : `${n} solutions`}.`;
  }
  return "Ce n'est pas ça. Essaie un indice, ou regarde la prochaine étape de la résolution.";
}

export function initTrainer() {
  return initSharedTrainer({ TYPES, LEVELS, generate, checkAnswer, roundingNote, placeholder, unreadable, wrong });
}
