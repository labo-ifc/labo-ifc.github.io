// Exercise UI for this course: the shared trainer with the texts that depend
// on energy answers (a number with a unit, or a multiple choice).

import { TYPES, LEVELS, generate, checkAnswer } from "./exercises.js";
import { initTrainer as initSharedTrainer } from "../../shared/trainer.js";

const near = (v, a) => Math.abs(v - a) <= Math.abs(a) * 0.01 + 1e-9;

function roundingNote(ex) {
  return ex.rel ? " (à 1 % près)" : "";
}

function placeholder(ex) {
  if (ex.choices) return "";
  const sample = { J: "-1250", "m/s": "12,5", m: "4,8", kg: "0,75", N: "120", "°C": "36,5", K: "310,15" }[ex.unit] ?? "12,5";
  return `ex. ${sample} ${ex.unit}`;
}

function unreadable(ex, r) {
  if (r.badUnit) return `L'unité « ${r.badUnit} » ne convient pas ici : la réponse est en ${ex.unit}.`;
  return `Je n'arrive pas à lire cette réponse. Écris un nombre, éventuellement suivi de son unité : par exemple $-1250$, $12{,}5\\ \\text{${ex.unit}}$ ou $1{,}2 \\cdot 10^5$ (1,2·10^5).`;
}

function wrong(ex, r) {
  if (ex.choices) return "Ce n'est pas la bonne réponse. Relis l'énoncé ou demande un indice.";
  const v = r.values[0], a = ex.answers[0];
  if (a !== 0 && near(-v, a)) return "La valeur est bonne, mais pas le signe : reçu = positif, cédé ou fourni = négatif.";
  if (a !== 0 && (near(v, a * 1000) || near(v, a / 1000))) return "Un facteur 1000 de trop ou de moins : vérifie la conversion des unités (g → kg, mL → L, kJ → J).";
  if (a !== 0 && [3.6, 12.96].some((k) => near(v, a * k) || near(v, a / k))) return "Vérifie la vitesse : en km/h, il faut d'abord la diviser par 3,6 pour l'avoir en m/s.";
  return "Ce n'est pas ça. Essaie un indice, ou regarde la prochaine étape de la résolution.";
}

export function initTrainer() {
  return initSharedTrainer({ TYPES, LEVELS, generate, checkAnswer, roundingNote, placeholder, unreadable, wrong });
}
