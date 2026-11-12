// Exercise UI for this course: the shared trainer with the texts that depend on
// genetics answers (probability, genotype, list, number or multiple choice).

import { TYPES, LEVELS, generate, checkAnswer } from "./exercises.js";
import { initTrainer as initSharedTrainer } from "../../shared/trainer.js";
import { drawPedigree } from "./pedigree-svg.js";

const xGene = (ex) => ex.genes?.some((g) => g.kind === "x");

function roundingNote(ex) {
  return ex.kind === "percent" ? " (en %, à 0,1 près)" : "";
}

function placeholder(ex) {
  if (ex.choices) return "";
  if (ex.kind === "prob") return "ex. 3/16, 0,25 ou 25 %";
  if (ex.kind === "geno") return xGene(ex) ? "ex. XAXa ou XaY" : "ex. Aa";
  if (ex.kind === "int") return "ex. 8";
  if (ex.kind === "percent") return "ex. 12,5";
  return { gamete: "ex. AB, Ab, aB", group: "ex. A, AB, O", geno: "ex. AA, Aa" }[ex.item];
}

function unreadable(ex, r) {
  if (ex.kind === "prob") {
    return r.range
      ? "Une probabilité est comprise entre 0 et 1 (ou entre 0 et 100 %)."
      : "Je n'arrive pas à lire cette probabilité. Écris une fraction (3/16), un nombre décimal (0,1875) ou un pourcentage (18,75 %).";
  }
  if (ex.kind === "geno") {
    return xGene(ex)
      ? "Je n'arrive pas à lire ce génotype. Écris les chromosomes avec leur allèle : XAXa pour une femme, XaY pour un homme."
      : "Je n'arrive pas à lire ce génotype. Écris deux allèles par gène, avec les lettres de l'énoncé : par exemple Aa.";
  }
  if (ex.kind === "int" || ex.kind === "percent") return "Écris un nombre, par exemple 12,5.";
  const what = { gamete: "un gamète (un allèle de chaque gène, par exemple AB)", group: "un groupe sanguin (A, B, AB ou O)", geno: "un génotype (deux allèles, par exemple Aa)" }[ex.item];
  return r.bad ? `« ${r.bad} » n'est pas ${what}. Sépare les réponses par des virgules.` : `Écris au moins ${what}.`;
}

function wrong(ex, r) {
  if (ex.choices) return "Ce n'est pas la bonne réponse. Relis l'énoncé ou demande un indice.";
  const v = r.values[0], a = ex.answers[0];
  if (ex.kind === "prob") {
    if (Math.abs(v - (1 - a)) < 0.006) return "C'est la probabilité du contraire : relis bien ce qui est demandé.";
    return "Ce n'est pas ça. Vérifie les gamètes et compte à nouveau les cases de l'échiquier.";
  }
  if (ex.kind === "set") {
    if (r.missing && !r.extra) return `C'est juste, mais il en manque ${r.missing}.`;
    if (r.extra && !r.missing) return `${r.extra === 1 ? "Une réponse est" : `${r.extra} réponses sont`} en trop.`;
    return "Ce n'est pas ça : certaines réponses manquent, d'autres sont en trop.";
  }
  return "Ce n'est pas ça. Essaie un indice, ou regarde la prochaine étape de la résolution.";
}

/** Pedigree exercises show their tree; the individual asked about is ringed. */
export function figure(el, ex) {
  if (!ex.pedigree) return false;
  el.append(drawPedigree(ex.pedigree, { picked: ex.highlight }));
  return true;
}

export function initTrainer() {
  return initSharedTrainer({ TYPES, LEVELS, generate, checkAnswer, roundingNote, placeholder, unreadable, wrong, figure });
}
