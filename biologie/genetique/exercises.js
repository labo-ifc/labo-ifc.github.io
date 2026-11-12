// Exercise generator of the genetics course. Pure: no DOM.
//
// An exercise is { type, prompt, text ($…$ mixed), kind, answers, hints (exactly 3),
// steps [{ tex, note }] }, with kind:
//   "prob"    a probability (answers: [p]) typed as 1/4, 25 % or 0,25;
//   "geno"    a genotype (answers: [key], genes) typed in any allele order;
//   "set"     a list (answers: keys, item: "geno" | "gamete" | "group", genes) in any order;
//   "int"     a whole number; "percent" a percentage (tol);
// or a multiple choice question with `choices` and answers: [index].
// Pedigree exercises carry the tree to draw in `pedigree`.

import {
  dominant, codominant, lethal, abo, xLinked, parseGenotype, parseGamete, genoKey, genoTex, gameteTex,
  gametes, cross, probability, fraction, probTex, sampleCounts,
} from "./genetics.js";
import { MODES, randomPedigree, possibleGenotypes, pedigreeTex, personName } from "./pedigree.js";
import { readNumber } from "../../shared/answer.js";

const randInt = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
function shuffle(rng, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);
/** "une plante" → "une autre plante". */
const other = (ind) => ind.replace(/^(une?) /, "$1 autre ");

/** Multiple choice: the right text and the wrong ones, shuffled. */
function choice(rng, right, wrongs) {
  const choices = shuffle(rng, [right, ...wrongs]);
  return { choices, answers: [choices.indexOf(right)] };
}

/** French integer with a thin space every three digits, for prose. */
const int = (n) => new Intl.NumberFormat("fr-FR").format(n).replace(/\s/g, " ");

// ---------- data: characters with complete dominance ----------
// ind / kid: the individual and its offspring, with phenotypes that agree with them.

const MONO = [
  { org: "Chez le petit pois", L: "L", names: ["graine lisse", "graine ridée"], ind: "une plante", dom: "à graines lisses", rec: "à graines ridées", kid: "une graine", kDom: "lisse", kRec: "ridée", pl: ["lisses", "ridées"], many: "graines" },
  { org: "Chez le petit pois", L: "J", names: ["graine jaune", "graine verte"], ind: "une plante", dom: "à graines jaunes", rec: "à graines vertes", kid: "une graine", kDom: "jaune", kRec: "verte", pl: ["jaunes", "vertes"], many: "graines" },
  { org: "Chez le petit pois", L: "R", names: ["gousse renflée", "gousse ridée"], ind: "une plante", dom: "à gousses renflées", rec: "à gousses ridées", kid: "une plante", kDom: "à gousses renflées", kRec: "à gousses ridées", pl: ["à gousses renflées", "à gousses ridées"] },
  { org: "Chez le lapin", L: "N", names: ["robe noire", "robe blanche"], ind: "un lapin", dom: "noir", rec: "blanc", kid: "un lapereau", kDom: "noir", kRec: "blanc", pl: ["noirs", "blancs"] },
  { org: "Chez la souris", L: "N", names: ["pelage noir", "pelage blanc"], ind: "une souris", dom: "noire", rec: "blanche", kid: "un souriceau", kDom: "noir", kRec: "blanc", pl: ["noirs", "blancs"] },
  { org: "Chez l'être humain", L: "B", names: ["yeux bruns", "yeux bleus"], ind: "une personne", dom: "aux yeux bruns", rec: "aux yeux bleus", kid: "un enfant", kDom: "aux yeux bruns", kRec: "aux yeux bleus", pl: ["aux yeux bruns", "aux yeux bleus"], human: true },
  { org: "Chez l'être humain", L: "R", names: ["taches de rousseur", "sans taches de rousseur"], ind: "une personne", dom: "avec des taches de rousseur", rec: "sans taches de rousseur", kid: "un enfant", kDom: "avec des taches de rousseur", kRec: "sans taches de rousseur", pl: ["avec des taches de rousseur", "sans taches de rousseur"], human: true },
  { org: "Chez la drosophile", L: "L", names: ["ailes longues", "ailes courtes"], ind: "une drosophile", dom: "aux ailes longues", rec: "aux ailes courtes", kid: "une mouche", kDom: "aux ailes longues", kRec: "aux ailes courtes", pl: ["aux ailes longues", "aux ailes courtes"], many: "mouches" },
  { org: "Chez la drosophile", L: "G", names: ["corps gris", "corps noir"], ind: "une drosophile", dom: "grise", rec: "noire", kid: "une mouche", kDom: "grise", kRec: "noire", pl: ["grises", "noires"], many: "mouches" },
  { org: "Chez la tomate", L: "R", names: ["fruit rouge", "fruit jaune"], ind: "un plant", dom: "à fruits rouges", rec: "à fruits jaunes", kid: "un plant", kDom: "à fruits rouges", kRec: "à fruits jaunes", pl: ["à fruits rouges", "à fruits jaunes"] },
];

const many = (s) => s.many ?? "descendants";
const geneOf = (s) => dominant(s.L, s.kDom, s.kRec);
const alleleSentence = (s) =>
  `${s.org}, l'allèle « ${s.names[0]} » ($${s.L}$) domine l'allèle « ${s.names[1]} » ($${s.L.toLowerCase()}$).`;

/** Genotype of one gene from its kind: 2 = homozygous dominant, 1 = heterozygous, 0 = homozygous recessive. */
const pairOf = (L, k) => (k === 2 ? [L, L] : k === 1 ? [L, L.toLowerCase()] : [L.toLowerCase(), L.toLowerCase()]);

/** A parent described in words (or by its genotype, half of the time). */
function describe(rng, s, k) {
  if (rng() < 0.4) return `${s.ind} de génotype $${pairOf(s.L, k).join("")}$`;
  if (k === 2) return `${s.ind} ${s.dom} de lignée pure`;
  if (k === 1) return `${s.ind} ${s.dom} hétérozygote`;
  return `${s.ind} ${s.rec}`;
}

// ---------- Punnett grids in TeX ----------

/** Echiquier de Punnett: gametes of g1 down the side, of g2 across; matching cells boxed. */
function punnettTex(g1, g2, genes, test = () => false) {
  const rows = gametes(g1).map((x) => x.gamete), cols = gametes(g2).map((x) => x.gamete);
  const order = (i, a, b) => [a, b].sort((x, y) => genes[i].alleles.indexOf(x) - genes[i].alleles.indexOf(y));
  let hits = 0;
  const lines = rows.map((r) => {
    const cells = cols.map((c) => {
      const geno = r.map((t, i) => order(i, t, c[i]));
      if (geno.some((p) => p[0] === "Y" && p[1] === "Y")) return "";
      const tex = genoTex(geno);
      if (test(geno)) { hits++; return `\\boxed{${tex}}`; }
      return tex;
    });
    return `${gameteTex(r)} & ${cells.join(" & ")}`;
  });
  const head = `\\begin{array}{c|${"c".repeat(cols.length)}} & ${cols.map(gameteTex).join(" & ")} \\\\ \\hline `;
  return { tex: `${head}${lines.join(" \\\\ ")}\\end{array}`, hits, cells: rows.length * cols.length };
}

const gametesTex = (geno) => [...new Set(gametes(geno).map((x) => gameteTex(x.gamete)))].join(",\\ ");

/** P = k / n, simplified when it can be. */
function probSteps(label, k, n) {
  const p = k / n;
  const simple = probTex(p);
  const raw = n === 1 ? String(k) : `\\frac{${k}}{${n}}`;
  return `P(\\text{${label}}) = ${raw}${raw === simple ? "" : ` = ${simple}`}`;
}

// ---------- 1. Monohybridisme ----------

function monoProbGen(rng) {
  const s = pick(rng, MONO);
  const gene = geneOf(s);
  const A = s.L, a = A.toLowerCase();
  let k1, k2, target, label, test, p;
  do {
    [k1, k2] = [randInt(rng, 0, 2), randInt(rng, 0, 2)];
    target = pick(rng, ["rec", "dom", "het"]);
    test = target === "rec" ? (g) => g[0][0] === a : target === "dom" ? (g) => g[0][0] === A : (g) => g[0][0] !== g[0][1];
    p = probability([gene], [pairOf(A, k1)], [pairOf(A, k2)], test);
  } while (p === 0 || p === 1);
  label = target === "rec" ? s.kRec : target === "dom" ? s.kDom : "hétérozygote";
  const g1 = [pairOf(A, k1)], g2 = [pairOf(A, k2)];
  const grid = punnettTex(g1, g2, [gene], test);
  return {
    type: "monoProb",
    prompt: "Calcule la probabilité",
    text: `${alleleSentence(s)} On croise ${describe(rng, s, k1)} avec ${other(describe(rng, s, k2))}. Quelle est la probabilité qu'${s.kid} soit ${label} ?`,
    kind: "prob",
    answers: [p],
    hints: [
      "Traduis chaque parent en génotype : « de lignée pure » = homozygote, « hétérozygote » = deux allèles différents.",
      "Écris les gamètes de chaque parent (un seul allèle par gamète), puis construis l'échiquier de Punnett.",
      `Compte les cases qui correspondent à « ${label} » et divise par le nombre total de cases.`,
    ],
    steps: [
      { tex: `${genoTex(g1)} \\times ${genoTex(g2)}`, note: "Le croisement, écrit avec les génotypes des parents." },
      { tex: `\\text{gamètes : } ${gametesTex(g1)} \\quad \\text{et} \\quad ${gametesTex(g2)}`, note: "Chaque gamète ne reçoit qu'un des deux allèles (2e loi de Mendel). Un homozygote ne fait qu'une sorte de gamètes." },
      { tex: grid.tex, note: `Échiquier de Punnett : les cases encadrées donnent un descendant « ${label} ».` },
      { tex: probSteps(label, grid.hits, grid.cells), note: "Toutes les cases ont la même probabilité." },
    ],
  };
}

function monoParentsGen(rng) {
  const s = pick(rng, MONO);
  const A = s.L, a = A.toLowerCase();
  const CASES = [
    { cross: [1, 1], ps: [0.75, 0.25] },
    { cross: [1, 0], ps: [0.5, 0.5] },
    { cross: [2, 0], ps: [1, 0] },
  ];
  const c = pick(rng, CASES);
  const n = randInt(rng, 300, 900);
  const [nd, nr] = sampleCounts(rng, c.ps, n);
  const parents = c.cross[1] === 0 ? `${s.ind} ${s.dom} avec ${s.ind} ${s.rec}` : `${s.ind} ${s.dom} avec ${other(`${s.ind} ${s.dom}`)}`;
  const result = nr === 0 ? `uniquement des ${many(s)} ${s.pl[0]} (${int(nd)})` : `${int(nd)} ${many(s)} ${s.pl[0]} et ${int(nr)} ${s.pl[1]}`;
  const tex = (k1, k2) => `$${pairOf(A, k1).join("")} \\times ${pairOf(A, k2).join("")}$`;
  const all = [[1, 1], [1, 0], [2, 0], [2, 1]];
  const right = tex(...c.cross);
  const ratioNote = nr === 0
    ? `Tous les descendants sont ${s.pl[0]} alors qu'un parent est ${s.rec} : c'est l'uniformité de la F1.`
    : `$\\frac{${nd}}{${nr}} \\approx ${(nd / nr).toFixed(1).replace(".", "{,}")}$ : c'est proche de ${c.ps[1] === 0.25 ? "3 pour 1" : "1 pour 1"}.`;
  return {
    type: "monoParents",
    prompt: "Choisis la bonne réponse",
    text: `${alleleSentence(s)} On croise ${parents} et on obtient ${result}. Quels étaient les génotypes des parents ?`,
    ...choice(rng, right, all.filter((x) => tex(...x) !== right).map((x) => tex(...x))),
    hints: [
      "Calcule le rapport entre le nombre de descendants dominants et récessifs.",
      "3 pour 1 : les deux parents sont hétérozygotes. 1 pour 1 : un hétérozygote croisé avec un homozygote récessif.",
      "Un parent qui montre le caractère récessif est forcément homozygote récessif.",
    ],
    steps: [
      { tex: `\\text{${s.pl[0]}} : ${nd} \\qquad \\text{${s.pl[1]}} : ${nr}`, note: "On compte les deux phénotypes de la descendance." },
      { tex: nr === 0 ? `100\\ \\%\\ \\text{${s.pl[0]}}` : `\\frac{${nd}}{${nr}} \\approx ${(nd / nr).toFixed(1).replace(".", "{,}")}`, note: ratioNote },
      { tex: right.slice(1, -1), note: c.cross[1] === 0 && c.cross[0] === 2 ? `Le parent ${s.dom} est de lignée pure : sinon, des descendants ${s.pl[1]} apparaîtraient.` : c.cross[1] === 0 ? `Le parent ${s.rec} est $${a}${a}$ ; l'autre doit porter un allèle $${a}$ pour donner des descendants ${s.pl[1]}.` : `Pour avoir des descendants ${s.pl[1]} ($${a}${a}$), chaque parent ${s.dom} doit porter un allèle $${a}$.` },
    ],
  };
}

function testCrossGen(rng) {
  const s = pick(rng, MONO);
  const gene = geneOf(s);
  const A = s.L, a = A.toLowerCase();
  const het = rng() < 0.5;
  const n = randInt(rng, 20, 80);
  const [nd, nr] = het ? sampleCounts(rng, [0.5, 0.5], n) : [n, 0];
  const result = nr === 0 ? `${int(nd)} ${many(s)}, ${s.many === "descendants" || !s.many ? "tous" : "toutes"} ${s.pl[0]}` : `${int(nd)} ${many(s)} ${s.pl[0]} et ${int(nr)} ${s.pl[1]}`;
  const answer = het ? `${A}${a}` : `${A}${A}`;
  return {
    type: "testCross",
    prompt: "Donne le génotype de l'individu testé",
    text: `${alleleSentence(s)} Pour connaître le génotype d'${s.ind} ${s.dom}, on ${s.ind.startsWith("une ") ? "la" : "le"} croise avec ${s.ind} ${s.rec} (croisement-test). On obtient ${result}. Quel est le génotype de l'individu testé ?`,
    kind: "geno",
    genes: [gene],
    answers: [answer],
    hints: [
      `L'individu ${s.rec} est homozygote récessif : il ne donne que des gamètes $${a}$.`,
      `Les ${many(s)} ${s.pl[1]} ont reçu un allèle $${a}$ de chacun de leurs parents.`,
      "S'il n'y a aucun descendant récessif sur un grand nombre, l'individu testé ne porte (très probablement) pas l'allèle récessif.",
    ],
    steps: [
      { tex: `? \\times ${a}${a}`, note: `Le parent ${s.rec} est forcément $${a}${a}$ et ne donne que des gamètes $${a}$.` },
      { tex: het ? `${A}${a} \\times ${a}${a} \\to \\tfrac12\\ ${A}${a} + \\tfrac12\\ ${a}${a}` : `${A}${A} \\times ${a}${a} \\to 100\\ \\%\\ ${A}${a}`, note: het ? `Des descendants ${s.pl[1]} apparaissent, environ la moitié : l'individu testé a donné des gamètes $${a}$.` : `Pas de ${many(s)} ${s.pl[1]} : l'individu testé ne donne que des gamètes $${A}$.` },
      { tex: `\\text{génotype : } ${answer}`, note: het ? "Il est hétérozygote." : "Il est homozygote (de lignée pure)." },
    ],
  };
}

function monoGenosGen(rng) {
  const s = pick(rng, MONO);
  const gene = geneOf(s);
  const A = s.L, a = A.toLowerCase();
  if (rng() < 0.35) {
    const dom = rng() < 0.7;
    const answers = dom ? [`${A}${A}`, `${A}${a}`] : [`${a}${a}`];
    return {
      type: "monoGenos",
      prompt: "Donne tous les génotypes possibles, séparés par des virgules",
      text: `${alleleSentence(s)} Quels génotypes peut avoir ${s.ind} ${dom ? s.dom : s.rec} ?`,
      kind: "set", item: "geno", genes: [gene], answers,
      hints: [
        "Un individu possède deux allèles du gène, un sur chaque chromosome de la paire.",
        "L'allèle dominant s'exprime dès qu'il est présent, même une seule fois.",
        "L'allèle récessif ne s'exprime que s'il est présent deux fois.",
      ],
      steps: [
        { tex: `${A}${A} \\quad ${A}${a} \\quad ${a}${a}`, note: "Les trois génotypes possibles pour ce gène." },
        { tex: `${A}${A},\\ ${A}${a} \\to \\text{${s.kDom}} \\qquad ${a}${a} \\to \\text{${s.kRec}}`, note: `$${A}$ domine $${a}$ : il suffit d'un $${A}$ pour être ${s.kDom}.` },
        { tex: answers.join(",\\ "), note: dom ? "Deux génotypes possibles : homozygote ou hétérozygote." : "Un seul génotype : homozygote récessif." },
      ],
    };
  }
  let k1, k2;
  do [k1, k2] = [randInt(rng, 0, 2), randInt(rng, 0, 2)]; while (k1 + k2 === 0 || k1 + k2 === 4);
  const g1 = [pairOf(A, k1)], g2 = [pairOf(A, k2)];
  const answers = cross([gene], g1, g2).map((k) => genoKey(k.geno));
  return {
    type: "monoGenos",
    prompt: "Donne tous les génotypes possibles, séparés par des virgules",
    text: `${alleleSentence(s)} Quels génotypes peuvent avoir les descendants du croisement $${genoTex(g1)} \\times ${genoTex(g2)}$ ?`,
    kind: "set", item: "geno", genes: [gene], answers,
    hints: [
      "Écris d'abord les gamètes possibles de chaque parent.",
      "Construis l'échiquier de Punnett.",
      "Chaque génotype différent ne compte qu'une fois dans la réponse.",
    ],
    steps: [
      { tex: `\\text{gamètes : } ${gametesTex(g1)} \\quad \\text{et} \\quad ${gametesTex(g2)}`, note: "Un seul allèle par gamète." },
      { tex: punnettTex(g1, g2, [gene]).tex, note: "Échiquier de Punnett." },
      { tex: answers.join(",\\ "), note: "Les génotypes différents de l'échiquier." },
    ],
  };
}

// ---------- 2. Cas particuliers ----------

const CODOM = [
  { org: "Chez les bovins", A: "R", B: "B", nA: "roux", nB: "blanc", mid: "rouan", ind: "un bovin", kid: "un veau", what: "les allèles roux ($R$) et blanc ($B$) sont codominants : un animal $RB$ a une robe rouanne" },
  { org: "Chez la belle-de-nuit", A: "V", B: "B", nA: "à fleurs violettes", nB: "à fleurs blanches", mid: "à fleurs roses", ind: "une plante", kid: "une plante", what: "les allèles violet ($V$) et blanc ($B$) montrent une dominance incomplète : une plante $VB$ a des fleurs roses" },
];

function coCrossGen(rng) {
  const s = pick(rng, CODOM);
  const gene = codominant([s.A, s.B], s.nA, s.nB, s.mid);
  const genos = [[s.A, s.A], [s.A, s.B], [s.B, s.B]];
  const names = [s.nA, s.mid, s.nB];
  let i1, i2, t, p;
  do {
    [i1, i2, t] = [randInt(rng, 0, 2), randInt(rng, 0, 2), randInt(rng, 0, 2)];
    p = probability([gene], [genos[i1]], [genos[i2]], (g) => genoKey(g) === genos[t].join(""));
  } while (p === 0 || p === 1 || !(i1 === 1 || i2 === 1));
  const g1 = [genos[i1]], g2 = [genos[i2]];
  const grid = punnettTex(g1, g2, [gene], (g) => genoKey(g) === genos[t].join(""));
  const desc = (i) => `${s.ind} ${names[i]}`;
  return {
    type: "coCross",
    prompt: "Calcule la probabilité",
    text: `${s.org}, ${s.what}. On croise ${desc(i1)} avec ${other(desc(i2))}. Quelle est la probabilité d'obtenir ${s.kid} ${names[t]} ?`,
    kind: "prob", answers: [p],
    hints: [
      "Sans dominance, chaque phénotype correspond à un seul génotype : écris le génotype de chaque parent.",
      "Écris les gamètes, puis construis l'échiquier de Punnett.",
      `Compte les cases ${s.mid.startsWith("à") ? "" : "de génotype "}correspondant au phénotype demandé.`,
    ],
    steps: [
      { tex: `${genoTex(g1)} \\times ${genoTex(g2)}`, note: `${[...new Set([i1, i2])].map((i) => `${cap(s.ind)} ${names[i]} est $${genos[i].join("")}$`).join(" ; ")} : sans dominance, le phénotype révèle le génotype.` },
      { tex: grid.tex, note: `Les cases encadrées donnent ${s.kid} ${names[t]}.` },
      { tex: probSteps(names[t], grid.hits, grid.cells), note: i1 === 1 && i2 === 1 ? "Les phénotypes suivent exactement les génotypes : 1 : 2 : 1 pour deux hétérozygotes." : "Les phénotypes suivent exactement les génotypes : 1 : 1 ici." },
    ],
  };
}

const LETHAL = [
  { org: "Chez la souris", L: "Q", mut: "sans queue", norm: "normale", ind: "une souris", pl: ["sans queue", "normales"], allele: "« sans queue » ($Q$), dominant pour l'aspect de la queue, est létal à l'état homozygote" },
  { org: "Chez la drosophile", L: "G", mut: "aux ailes gauchies", norm: "normale", ind: "une drosophile", pl: ["aux ailes gauchies", "normales"], allele: "« ailes gauchies » ($G$), dominant, est létal à l'état homozygote" },
  { org: "Chez la souris", L: "J", mut: "jaune", norm: "grise", ind: "une souris", pl: ["jaunes", "grises"], allele: "« pelage jaune » ($J$), dominant, est létal à l'état homozygote" },
];

function lethalGen(rng) {
  const s = pick(rng, LETHAL);
  const gene = lethal(s.L, s.mut, s.norm);
  const A = s.L, a = A.toLowerCase();
  const variant = pick(rng, ["mutAlive", "dead", "mutCross"]);
  const both = variant !== "mutCross";
  const g1 = [[A, a]], g2 = both ? [[A, a]] : [[a, a]];
  let p, label, question, test;
  if (variant === "dead") {
    p = probability([gene], g1, g2, (g) => g[0][0] === A && g[0][1] === A, { all: true });
    question = "Quelle proportion des embryons meurt avant la naissance ?";
    label = "mort";
    test = (g) => g[0][0] === A && g[0][1] === A;
  } else {
    test = (g) => g[0].includes(A) && g[0][1] !== A;
    p = probability([gene], g1, g2, test);
    question = `Parmi les descendants qui naissent, quelle proportion est ${s.mut} ?`;
    label = s.mut;
  }
  const grid = punnettTex(g1, g2, [gene], test);
  const surv = variant === "dead" ? grid.cells : grid.cells - (both ? 1 : 0);
  return {
    type: "lethal",
    prompt: "Calcule la proportion",
    text: `${s.org}, l'allèle ${s.allele}. On croise ${both ? `deux individus ${s.pl[0]}` : `${s.ind} ${s.mut} avec ${s.ind} ${s.norm}`}. ${question}`,
    kind: "prob", answers: [p],
    hints: [
      `Un individu ${s.mut} vivant est forcément hétérozygote $${A}${a}$.`,
      `Construis l'échiquier de Punnett : la case $${A}${A}$ correspond à un embryon qui meurt.`,
      variant === "dead" ? "Compte les cases létales sur toutes les cases." : "Ne compte que les cases des individus qui naissent, au numérateur comme au dénominateur.",
    ],
    steps: [
      { tex: `${genoTex(g1)} \\times ${genoTex(g2)}`, note: `Les ${both ? "parents" : "individus"} ${s.pl[0]} sont $${A}${a}$ : $${A}${A}$ ne survit pas.` },
      { tex: grid.tex, note: both ? `La case $${A}${A}$ meurt : il reste 3 cases, dont 2 ${s.pl[0]} et 1 ${s.norm}, d'où le rapport 2 : 1 du cours.` : "Aucune case létale ici : le rapport reste 1 : 1." },
      { tex: probSteps(label, grid.hits, surv), note: variant === "dead" ? "Un quart des embryons est homozygote et meurt." : "On divise par le nombre de descendants viables." },
    ],
  };
}

const ABO = abo();
const ABO_GENOS = [["A", "A"], ["A", "O"], ["B", "B"], ["B", "O"], ["A", "B"], ["O", "O"]];
const groupOf = (pair) => ABO.pheno(pair);
const GROUP_GENOS = { A: [["A", "A"], ["A", "O"]], B: [["B", "B"], ["B", "O"]], AB: [["A", "B"]], O: [["O", "O"]] };
const GROUPS = ["A", "B", "AB", "O"];
const groupsFrom = (pairs1, pairs2) => {
  const out = new Set();
  for (const p1 of pairs1) for (const p2 of pairs2) for (const k of cross([ABO], [p1], [p2])) out.add(groupOf(k.geno[0]));
  return GROUPS.filter((g) => out.has(g));
};

function bloodProbGen(rng) {
  let p1, p2, t, p;
  do {
    [p1, p2, t] = [pick(rng, ABO_GENOS), pick(rng, ABO_GENOS), pick(rng, GROUPS)];
    p = probability([ABO], [p1], [p2], (g) => groupOf(g[0]) === t);
  } while (p === 0 || p === 1);
  const grid = punnettTex([p1], [p2], [ABO], (g) => groupOf(g[0]) === t);
  return {
    type: "bloodProb",
    prompt: "Calcule la probabilité",
    text: `Un homme de génotype $${p1.join("")}$ et une femme de génotype $${p2.join("")}$ attendent un enfant. Quelle est la probabilité qu'il soit de groupe ${t} ?`,
    kind: "prob", answers: [p],
    hints: [
      "$A$ et $B$ sont codominants, $O$ est récessif : $A = B > O$.",
      "Écris les gamètes de chaque parent et construis l'échiquier de Punnett.",
      `Repère les génotypes qui donnent le groupe ${t}, puis compte les cases.`,
    ],
    steps: [
      { tex: `${p1.join("")} \\times ${p2.join("")}`, note: "Le croisement des génotypes." },
      { tex: grid.tex, note: `Les cases encadrées donnent le groupe ${t} (${GROUP_GENOS[t].map((x) => `$${x.join("")}$`).join(" ou ")}).` },
      { tex: probSteps(`groupe ${t}`, grid.hits, grid.cells), note: "Chaque case a la même probabilité." },
    ],
  };
}

function bloodGroupsGen(rng) {
  const byGeno = rng() < 0.5;
  let g1, g2, pairs1, pairs2, d1, d2;
  if (byGeno) {
    [pairs1, pairs2] = [[pick(rng, ABO_GENOS)], [pick(rng, ABO_GENOS)]];
    d1 = `de génotype $${pairs1[0].join("")}$`;
    d2 = `de génotype $${pairs2[0].join("")}$`;
  } else {
    [g1, g2] = [pick(rng, GROUPS), pick(rng, GROUPS)];
    [pairs1, pairs2] = [GROUP_GENOS[g1], GROUP_GENOS[g2]];
    d1 = `de groupe ${g1}`;
    d2 = `de groupe ${g2}`;
  }
  const answers = groupsFrom(pairs1, pairs2);
  const genosText = (pairs) => pairs.map((x) => x.join("")).join("\\text{ ou }");
  return {
    type: "bloodGroups",
    prompt: "Donne tous les groupes possibles, séparés par des virgules",
    text: `Un homme ${d1} et une femme ${d2} ont un enfant. Quels groupes sanguins (système ABO) l'enfant peut-il avoir ?`,
    kind: "set", item: "group", answers,
    hints: [
      byGeno ? "Écris les gamètes possibles de chaque parent." : "Un groupe A peut être $AA$ ou $AO$, un groupe B $BB$ ou $BO$ : envisage tous les cas.",
      "Combine un allèle de chaque parent dans un échiquier de Punnett.",
      "Traduis chaque génotype obtenu en groupe : $A = B > O$.",
    ],
    steps: [
      { tex: `${genosText(pairs1)} \\quad \\times \\quad ${genosText(pairs2)}`, note: byGeno ? "Les génotypes sont donnés." : "Les génotypes possibles de chaque parent : l'allèle O, récessif, peut être caché." },
      { tex: `\\text{gamètes : } ${[...new Set(pairs1.flat())].join(",\\ ")} \\quad \\text{et} \\quad ${[...new Set(pairs2.flat())].join(",\\ ")}`, note: "Les allèles que chaque parent peut transmettre." },
      { tex: `\\text{groupes possibles : } ${answers.join(",\\ ")}`, note: "Chaque combinaison donne un groupe : $AB$ si A et B se rencontrent, O seulement avec deux allèles O." },
    ],
  };
}

function bloodQcmGen(rng) {
  const yes = rng() < 0.5;
  let g1, g2, t, possible;
  do {
    [g1, g2, t] = [pick(rng, GROUPS), pick(rng, GROUPS), pick(rng, GROUPS)];
    possible = groupsFrom(GROUP_GENOS[g1], GROUP_GENOS[g2]);
  } while (possible.includes(t) !== yes);
  const right = yes ? "Oui" : "Non";
  // A parent's genotype that makes it possible, for the explanation.
  let how = "";
  if (yes) {
    outer: for (const p1 of GROUP_GENOS[g1]) for (const p2 of GROUP_GENOS[g2]) {
      if (cross([ABO], [p1], [p2]).some((k) => groupOf(k.geno[0]) === t)) { how = `$${p1.join("")} \\times ${p2.join("")}$`; break outer; }
    }
  }
  return {
    type: "bloodQcm",
    prompt: "Choisis la bonne réponse",
    text: `Un homme de groupe ${g1} et une femme de groupe ${g2} peuvent-ils avoir un enfant de groupe ${t} ?`,
    ...choice(rng, right, [yes ? "Non" : "Oui"]),
    hints: [
      "Écris les génotypes possibles de chaque parent : l'allèle O peut être caché derrière A ou B.",
      `Écris les génotypes qui donnent le groupe ${t}.`,
      "Cherche si chaque parent peut fournir un des allèles nécessaires.",
    ],
    steps: [
      { tex: `\\text{${g1}} : ${GROUP_GENOS[g1].map((x) => x.join("")).join("\\text{ ou }")} \\qquad \\text{${g2}} : ${GROUP_GENOS[g2].map((x) => x.join("")).join("\\text{ ou }")}`, note: "Les génotypes possibles des parents." },
      { tex: `\\text{${t}} : ${GROUP_GENOS[t].map((x) => x.join("")).join("\\text{ ou }")}`, note: `Les génotypes d'un enfant de groupe ${t}.` },
      { tex: yes ? `\\text{oui}` : `\\text{non}`, note: yes ? `C'est possible, par exemple avec les génotypes ${how}.` : `Aucune combinaison d'allèles des parents ne donne un génotype de groupe ${t}.` },
    ],
  };
}

// ---------- 3. Dihybridisme et polyhybridisme ----------

const DI = [
  { org: "Chez le petit pois", kid: "une plante", genes: [
    { L: "J", names: ["graines jaunes", "graines vertes"], kDom: "à graines jaunes", kRec: "à graines vertes" },
    { L: "R", names: ["gousses renflées", "gousses ridées"], kDom: "à gousses renflées", kRec: "à gousses ridées" }] },
  { org: "Chez la drosophile", kid: "une mouche", genes: [
    { L: "G", names: ["corps gris", "corps noir"], kDom: "au corps gris", kRec: "au corps noir" },
    { L: "L", names: ["ailes longues", "ailes courtes"], kDom: "aux ailes longues", kRec: "aux ailes courtes" }] },
  { org: "Chez le lapin", kid: "un lapereau", genes: [
    { L: "N", names: ["poil noir", "poil brun"], kDom: "au poil noir", kRec: "au poil brun" },
    { L: "C", names: ["poil court", "poil long"], kDom: "au poil court", kRec: "au poil long" }] },
  { org: "Chez la tomate", kid: "un plant", genes: [
    { L: "R", names: ["fruits rouges", "fruits jaunes"], kDom: "à fruits rouges", kRec: "à fruits jaunes" },
    { L: "G", names: ["taille géante", "taille naine"], kDom: "de taille géante", kRec: "de taille naine" }] },
  { org: "Chez l'être humain", kid: "un enfant", genes: [
    { L: "D", names: ["doigts courts", "doigts longs"], kDom: "aux doigts courts", kRec: "aux doigts longs" },
    { L: "V", names: ["cheveux plantés en V", "cheveux plantés droits"], kDom: "aux cheveux plantés en V", kRec: "aux cheveux plantés droits" }] },
];

const diSentence = (s) => `${s.org}, ${s.genes.map((g) => `« ${g.names[0]} » ($${g.L}$) domine « ${g.names[1]} » ($${g.L.toLowerCase()}$)`).join(" et ")}.`;

function diProbGen(rng) {
  const s = pick(rng, DI);
  const genes = s.genes.map((g) => dominant(g.L, g.kDom, g.kRec));
  let ks1, ks2, want, p;
  do {
    ks1 = [randInt(rng, 0, 2), randInt(rng, 0, 2)];
    ks2 = [randInt(rng, 0, 2), randInt(rng, 0, 2)];
    want = [rng() < 0.5, rng() < 0.5]; // true = dominant phenotype
    const test = (g) => g.every((pair, i) => pair.includes(s.genes[i].L) === want[i]);
    p = probability(genes, s.genes.map((g, i) => pairOf(g.L, ks1[i])), s.genes.map((g, i) => pairOf(g.L, ks2[i])), test);
  } while (p === 0 || p === 1 || (ks1[0] !== 1 && ks2[0] !== 1) || (ks1[1] !== 1 && ks2[1] !== 1));
  const g1 = s.genes.map((g, i) => pairOf(g.L, ks1[i])), g2 = s.genes.map((g, i) => pairOf(g.L, ks2[i]));
  const label = s.genes.map((g, i) => (want[i] ? g.kDom : g.kRec)).join(" et ");
  const per = s.genes.map((g, i) => probability([genes[i]], [g1[i]], [g2[i]], (x) => x[0].includes(g.L) === want[i]));
  return {
    type: "diProb",
    prompt: "Calcule la probabilité",
    text: `${diSentence(s)} On croise $${genoTex(g1)} \\times ${genoTex(g2)}$. Quelle est la probabilité d'obtenir ${s.kid} ${label} ?`,
    kind: "prob", answers: [p],
    hints: [
      "Les deux gènes sont indépendants (3e loi de Mendel) : traite chaque caractère séparément.",
      "Pour chaque gène, fais un petit croisement monohybride et calcule la probabilité du phénotype voulu.",
      "Multiplie les deux probabilités.",
    ],
    steps: [
      ...s.genes.map((g, i) => ({
        tex: `${g1[i].join("")} \\times ${g2[i].join("")} \\;\\Rightarrow\\; P(\\text{${want[i] ? g.kDom : g.kRec}}) = ${probTex(per[i])}`,
        note: `Gène ${g.L} seul : ${want[i] ? `au moins un allèle $${g.L}$` : `deux allèles $${g.L.toLowerCase()}$`}.`,
      })),
      { tex: `P = ${per.map(probTex).join(" \\times ")} = ${probTex(p)}`, note: "Gènes indépendants : les probabilités se multiplient." },
    ],
  };
}

const LETTERS = ["A", "B", "C", "D", "E", "G", "J", "L", "R", "T", "V"];

function gametesGen(rng) {
  const n = rng() < 0.6 ? 2 : 3;
  const letters = shuffle(rng, LETTERS).slice(0, n).sort();
  const genes = letters.map((L) => dominant(L, L, L.toLowerCase()));
  let ks;
  do ks = letters.map(() => randInt(rng, 0, 2)); while (!ks.includes(1));
  const geno = letters.map((L, i) => pairOf(L, ks[i]));
  const answers = gametes(geno).map((x) => x.gamete.join(""));
  return {
    type: "gametes",
    prompt: "Donne tous les gamètes, séparés par des virgules",
    text: `Quels gamètes peut produire un individu de génotype $${genoTex(geno)}$ (gènes indépendants) ?`,
    kind: "set", item: "gamete", genes, answers,
    hints: [
      "Un gamète reçoit un seul allèle de chaque gène.",
      "Pour un gène homozygote, il n'y a qu'un choix ; pour un gène hétérozygote, deux.",
      "Combine les choix de chaque gène (arbre ou tableau) : le nombre de gamètes est le produit des choix.",
    ],
    steps: [
      { tex: letters.map((L, i) => `${geno[i].join("")} \\to ${[...new Set(geno[i])].join(",\\ ")}`).join(" \\qquad "), note: "Les allèles possibles, gène par gène." },
      { tex: `${letters.map((_, i) => new Set(geno[i]).size).join(" \\times ")} = ${answers.length}\\ \\text{gamète${answers.length > 1 ? "s" : ""}}`, note: "Gènes indépendants : chaque choix se combine avec tous les autres." },
      { tex: answers.join(",\\ "), note: "Chaque gamète a la même probabilité." },
    ],
  };
}

function polyProbGen(rng) {
  const n = rng() < 0.6 ? 3 : 4;
  const letters = ["A", "B", "C", "D"].slice(0, n);
  const genes = letters.map((L) => dominant(L, L, L.toLowerCase()));
  const same = rng() < 0.5;
  const ks1 = letters.map(() => (same ? 1 : randInt(rng, 0, 2)));
  const ks2 = same ? ks1 : letters.map(() => randInt(rng, 0, 2));
  if (!ks1.includes(1) && !ks2.includes(1)) ks1[0] = 1;
  const g1 = letters.map((L, i) => pairOf(L, ks1[i])), g2 = letters.map((L, i) => pairOf(L, ks2[i]));
  // Target genotype: one possible child genotype per gene.
  let target, per, p;
  do {
    target = letters.map((L, i) => pick(rng, cross([genes[i]], [g1[i]], [g2[i]]).map((k) => k.geno[0])));
    per = letters.map((L, i) => probability([genes[i]], [g1[i]], [g2[i]], (x) => x[0].join("") === target[i].join("")));
    p = per.reduce((a, b) => a * b, 1);
  } while (p === 1);
  return {
    type: "polyProb",
    prompt: "Calcule la probabilité",
    text: `Deux individus $${genoTex(g1)}$ et $${genoTex(g2)}$ ont un descendant (gènes indépendants). Quelle est la probabilité qu'il soit de génotype $${genoTex(target)}$ ?`,
    kind: "prob", answers: [p],
    hints: [
      "Ne construis pas un immense échiquier : traite chaque gène séparément.",
      "Pour chaque gène, calcule la probabilité d'obtenir la paire d'allèles voulue avec un petit échiquier 2 × 2.",
      "Les gènes étant indépendants, multiplie les probabilités obtenues.",
    ],
    steps: [
      ...letters.map((L, i) => ({
        tex: `${g1[i].join("")} \\times ${g2[i].join("")} \\;\\Rightarrow\\; P(${target[i].join("")}) = ${probTex(per[i])}`,
        note: `Gène ${L}.`,
      })),
      { tex: `P = ${per.map(probTex).join(" \\times ")} = ${probTex(p)}`, note: "Les probabilités de chaque caractère se multiplient." },
    ],
  };
}

function classesGen(rng) {
  const n = randInt(rng, 2, 6);
  const what = pick(rng, ["pheno", "geno", "gam", "cells"]);
  const Q = {
    pheno: { q: "combien de classes phénotypiques obtient-on en F2", a: 2 ** n, f: `2^{${n}}`, why: "Chaque caractère donne 2 phénotypes (dominant ou récessif)." },
    geno: { q: "combien de classes génotypiques obtient-on en F2", a: 3 ** n, f: `3^{${n}}`, why: "Chaque gène donne 3 génotypes (homozygote dominant, hétérozygote, homozygote récessif)." },
    gam: { q: "combien de sortes de gamètes produit un hybride de la F1", a: 2 ** n, f: `2^{${n}}`, why: "Chaque gène hétérozygote offre 2 allèles possibles au gamète." },
    cells: { q: "combien de cases compte l'échiquier de Punnett de la F2", a: 4 ** n, f: `2^{${n}} \\times 2^{${n}} = 4^{${n}}`, why: "Chaque parent F1 produit $2^n$ sortes de gamètes, une ligne ou une colonne par gamète." },
  }[what];
  return {
    type: "classes",
    prompt: "Donne un nombre entier",
    text: `On croise deux lignées pures qui diffèrent par ${n} caractères (${n} paires d'allèles indépendantes, dominance complète), puis on croise les hybrides F1 entre eux. ${cap(Q.q)} ?`,
    kind: "int", answers: [Q.a],
    hints: [
      "Pense d'abord au cas d'un seul caractère (monohybridisme), puis de deux (dihybridisme).",
      "Monohybridisme : 2 phénotypes, 3 génotypes, 2 sortes de gamètes pour l'hybride.",
      "Avec des gènes indépendants, chaque caractère multiplie le nombre de possibilités.",
    ],
    steps: [
      { tex: `n = ${n}`, note: "Nombre de paires d'allèles." },
      { tex: Q.f, note: Q.why },
      { tex: `${Q.f.split(" = ")[0]} = ${int(Q.a).replace(/ /g, "\\,")}`, note: "Tableau des ségrégations du cours." },
    ],
  };
}

const FLY = [
  { L: "G", dom: "grises", rec: "noires", trait: "couleur" },
  { L: "L", dom: "aux ailes longues", rec: "aux ailes courtes", trait: "ailes" },
];
// Per gene: a cross and what it gives (dominant share).
const DI_CROSSES = [[1, 1, 0.75], [1, 0, 0.5], [0, 0, 0], [2, 0, 1]];

function diParentsGen(rng) {
  const right = FLY.map(() => pick(rng, DI_CROSSES));
  const n = randInt(rng, 200, 600);
  const parts = FLY.map((g, i) => {
    const share = right[i][2];
    if (share === 1) return `toutes sont ${g.dom}`;
    if (share === 0) return `toutes sont ${g.rec}`;
    const [d, r] = sampleCounts(rng, [share, 1 - share], n);
    return `${int(d)} sont ${g.dom} et ${int(r)} ${g.rec}`;
  });
  const tex = (combo) => {
    const p1 = FLY.map((g, i) => pairOf(g.L, combo[i][0]).join("")).join("");
    const p2 = FLY.map((g, i) => pairOf(g.L, combo[i][1]).join("")).join("");
    return `$${p1} \\times ${p2}$`;
  };
  const rightTex = tex(right);
  const wrongs = new Set();
  while (wrongs.size < 3) {
    const combo = FLY.map(() => pick(rng, DI_CROSSES));
    const t = tex(combo);
    if (t !== rightTex) wrongs.add(t);
  }
  const why = (c, g) => (c[2] === 0.75 ? `3 pour 1 : $${g.L}${g.L.toLowerCase()} \\times ${g.L}${g.L.toLowerCase()}$` : c[2] === 0.5 ? `1 pour 1 : $${g.L}${g.L.toLowerCase()} \\times ${g.L.toLowerCase()}${g.L.toLowerCase()}$` : c[2] === 0 ? `uniquement récessives : les deux parents sont $${g.L.toLowerCase()}${g.L.toLowerCase()}$` : `uniquement dominantes : ici $${g.L}${g.L} \\times ${g.L.toLowerCase()}${g.L.toLowerCase()}$`);
  return {
    type: "diParents",
    prompt: "Choisis la bonne réponse",
    text: `Chez la drosophile, « corps gris » ($G$) domine « corps noir » ($g$) et « ailes longues » ($L$) domine « ailes courtes » ($l$). Un croisement donne ${int(n)} mouches : ${parts[0]} ; pour les ailes, ${parts[1]}. Quels génotypes parentaux sont compatibles ?`,
    ...choice(rng, rightTex, [...wrongs]),
    hints: [
      "Les deux gènes sont indépendants : analyse la couleur et les ailes séparément.",
      "3 pour 1 : deux hétérozygotes. 1 pour 1 : un hétérozygote et un homozygote récessif.",
      "Uniquement des récessifs : les deux parents sont homozygotes récessifs ; uniquement des dominants : au moins un parent homozygote dominant.",
    ],
    steps: [
      { tex: `\\text{couleur}`, note: cap(why(right[0], FLY[0])) + "." },
      { tex: `\\text{ailes}`, note: cap(why(right[1], FLY[1])) + "." },
      { tex: rightTex.slice(1, -1), note: "On regroupe les deux gènes pour chaque parent." },
    ],
  };
}

// ---------- 4. Linkage ----------

function recombGen(rng) {
  const rf = randInt(rng, 4, 30) / 100;
  const n = randInt(rng, 400, 1200);
  const [p1, p2, r1, r2] = sampleCounts(rng, [(1 - rf) / 2, (1 - rf) / 2, rf / 2, rf / 2], n);
  const pct = Math.round(((r1 + r2) / n) * 1000) / 10;
  return {
    type: "recomb",
    prompt: "Calcule la fréquence de recombinaison",
    text: `Chez la drosophile, $V$ (ailes normales) domine $v$ (ailes vestigiales) et $R$ (corps gris) domine $r$ (corps noir). Une femelle F1 $VR/vr$ est croisée avec un mâle $vr/vr$ (croisement-test). On obtient ${int(p1)} mouches grises à ailes normales, ${int(p2)} noires à ailes vestigiales, ${int(r1)} grises à ailes vestigiales et ${int(r2)} noires à ailes normales. Quelle est la fréquence de recombinaison entre les deux gènes ?`,
    kind: "percent", answers: [pct], tol: 0.11,
    hints: [
      "Repère les phénotypes parentaux (les plus nombreux) et les phénotypes recombinés (les plus rares).",
      "Les recombinés viennent d'un crossing-over entre les deux gènes pendant la méiose.",
      "Fréquence de recombinaison = nombre de recombinés ÷ total, en pourcentage.",
    ],
    steps: [
      { tex: `\\text{parentaux : } ${p1} + ${p2} = ${p1 + p2}`, note: "Mêmes associations d'allèles que les parents : $VR$ et $vr$." },
      { tex: `\\text{recombinés : } ${r1} + ${r2} = ${r1 + r2}`, note: "Nouvelles associations : $Vr$ et $vR$." },
      { tex: `\\frac{${r1 + r2}}{${n}} \\times 100 \\approx ${String(pct).replace(".", "{,}")}\\ \\%`, note: `Les gènes sont liés, à environ ${String(Math.round(pct)).replace(".", ",")} centimorgans (cM) l'un de l'autre.` },
    ],
  };
}

function linkedQcmGen(rng) {
  const kind = pick(rng, ["free", "full", "partial"]);
  const n = randInt(rng, 400, 1000);
  const ps = { free: [0.25, 0.25, 0.25, 0.25], full: [0.5, 0.5, 0, 0], partial: [0.42, 0.42, 0.08, 0.08] }[kind];
  if (kind === "partial") {
    const rf = randInt(rng, 6, 30) / 100;
    ps.splice(0, 4, (1 - rf) / 2, (1 - rf) / 2, rf / 2, rf / 2);
  }
  const [a, b, c, d] = sampleCounts(rng, ps, n);
  const labels = {
    free: "Les gènes sont indépendants (sur des chromosomes différents)",
    full: "Les gènes sont liés, sans recombinaison observée",
    partial: "Les gènes sont liés, avec des recombinaisons (crossing-over)",
  };
  const shown = [[a, "au corps brun et aux ailes longues"], [b, "au corps ébène et aux ailes vestigiales"], [c, "au corps brun et aux ailes vestigiales"], [d, "au corps ébène et aux ailes longues"]]
    .filter(([k]) => k > 0).map(([k, t]) => `${int(k)} ${t}`);
  return {
    type: "linkedQcm",
    prompt: "Choisis la bonne réponse",
    text: `On croise des drosophiles de lignées pures, au corps brun et aux ailes longues avec d'autres au corps ébène et aux ailes vestigiales. Le croisement-test d'une F1 donne : ${shown.join(", ")}. Que peut-on conclure ?`,
    ...choice(rng, labels[kind], Object.values(labels).filter((t) => t !== labels[kind])),
    hints: [
      "Gènes indépendants : le croisement-test donne 4 phénotypes en proportions égales (1 : 1 : 1 : 1).",
      "Gènes liés : les phénotypes parentaux sont nettement majoritaires.",
      "Les phénotypes recombinés rares viennent d'un crossing-over entre les deux gènes.",
    ],
    steps: [
      { tex: `\\text{parentaux : } ${a + b} \\qquad \\text{recombinés : } ${c + d}`, note: "On sépare les associations des parents des nouvelles associations." },
      { tex: `\\frac{${c + d}}{${n}} \\approx ${Math.round(((c + d) / n) * 100)}\\ \\%`, note: kind === "free" ? "Environ 50 % de recombinés : les quatre classes sont équivalentes." : kind === "full" ? "Aucun recombiné : les allèles restent toujours associés." : "Moins de 50 % de recombinés : les gènes sont liés, mais un crossing-over les sépare parfois." },
      { tex: `\\text{conclusion}`, note: `${labels[kind]}.` },
    ],
  };
}

// ---------- 5. Lié au sexe et arbres généalogiques ----------

const XDISEASES = [
  { name: "l'hémophilie", fem: true, L: "H", sick: ["hémophile", "hémophile"] },
  { name: "le daltonisme", L: "D", sick: ["daltonien", "daltonienne"] },
  { name: "la myopathie de Duchenne", fem: true, L: "M", sick: ["atteint", "atteinte"] },
];

function xProbGen(rng) {
  const d = pick(rng, XDISEASES);
  const gene = xLinked(d.L, d.sick);
  const H = `X${d.L}`, h = `X${d.L.toLowerCase()}`;
  const MOTHERS = [[[H, H], "saine et non porteuse"], [[H, h], "saine mais porteuse"], [[h, h], d.sick[1]]];
  const FATHERS = [[[H, "Y"], "sain"], [[h, "Y"], d.sick[0]]];
  const ill = (g) => !g[0].includes(H);
  const QUESTIONS = [
    { q: "qu'un enfant soit atteint", cond: () => true, test: ill, label: "atteint" },
    { q: "qu'un fils soit atteint", cond: (g) => g[0].includes("Y"), test: ill, label: "fils atteint" },
    { q: "qu'une fille soit porteuse saine", cond: (g) => !g[0].includes("Y"), test: (g) => g[0][0] === H && g[0][1] === h, label: "fille porteuse" },
    { q: "que l'enfant soit un garçon atteint", cond: () => true, test: (g) => g[0].includes("Y") && ill(g), label: "garçon atteint" },
  ];
  let m, f, Q, p;
  do {
    [m, f, Q] = [pick(rng, MOTHERS), pick(rng, FATHERS), pick(rng, QUESTIONS)];
    const kids = cross([gene], [m[0]], [f[0]]).filter((k) => Q.cond(k.geno));
    const total = kids.reduce((s, k) => s + k.p, 0);
    p = kids.filter((k) => Q.test(k.geno)).reduce((s, k) => s + k.p, 0) / total;
  } while (p === 0 || p === 1);
  const grid = punnettTex([m[0]], [f[0]], [gene], (g) => Q.cond(g) && Q.test(g));
  const condCells = cross([gene], [m[0]], [f[0]]).filter((k) => Q.cond(k.geno)).length;
  const counted = Q.label.startsWith("fils") || Q.label.startsWith("fille");
  const [k, n] = fraction(p);
  return {
    type: "xProb",
    prompt: "Calcule la probabilité",
    text: `${cap(d.name)} est ${d.fem ? "due" : "dû"} à un allèle récessif porté par le chromosome X. Une femme ${m[1]} et un homme ${f[1]} attendent un enfant. Quelle est la probabilité ${Q.q} ?`,
    kind: "prob", answers: [p],
    hints: [
      `Écris les génotypes avec $X^{${d.L}}$ (normal), $X^{${d.L.toLowerCase()}}$ (malade) et $Y$ : un homme n'a qu'un X.`,
      "Le père donne son X à ses filles et son Y à ses fils ; la mère donne un de ses deux X.",
      counted ? `On ne regarde que les ${Q.label.startsWith("fils") ? "garçons" : "filles"} : les autres cases ne comptent pas au dénominateur.` : "Construis l'échiquier de Punnett et compte les cases qui conviennent sur toutes les cases.",
    ],
    steps: [
      { tex: `${genoTex([m[0]])} \\times ${genoTex([f[0]])}`, note: `Mère ${m[1]}, père ${f[1]}.` },
      { tex: grid.tex, note: "Échiquier de Punnett : les cases encadrées répondent à la question." },
      { tex: counted ? `P = \\frac{${grid.hits}}{${condCells}}${grid.hits / condCells === p && `\\frac{${grid.hits}}{${condCells}}` !== probTex(p) ? ` = ${probTex(p)}` : ""}` : probSteps(Q.label, grid.hits, grid.cells), note: counted ? `Parmi les ${condCells} cases ${Q.label.startsWith("fils") ? "de garçons" : "de filles"} seulement.` : `Soit ${k} chance${k > 1 ? "s" : ""} sur ${n}.` },
    ],
  };
}

function xGenoGen(rng) {
  const d = pick(rng, XDISEASES);
  const gene = xLinked(d.L, d.sick);
  const [H, h] = [d.L, d.L.toLowerCase()];
  const CASES = [
    { who: `Un homme ${d.sick[0]}`, a: `X${h}Y`, why: "Un homme n'a qu'un X : s'il est malade, ce X porte l'allèle malade." },
    { who: "Un homme sain", a: `X${H}Y`, why: "Un homme sain a forcément l'allèle normal sur son unique X." },
    { who: `Une femme ${d.sick[1]}`, a: `X${h}X${h}`, why: "Maladie récessive : une femme atteinte a deux allèles malades." },
    { who: `Une femme saine dont le père est ${d.sick[0]}`, a: `X${H}X${h}`, why: `Son père lui a donné son X, qui porte $${h}$ ; elle est saine, donc son autre X porte $${H}$.` },
    { who: `Une femme saine qui a un fils ${d.sick[0]}`, a: `X${H}X${h}`, why: `Un fils reçoit son X de sa mère : elle porte $${h}$, et elle est saine, donc aussi $${H}$.` },
    { who: `Le père d'une fille ${d.sick[1]}`, a: `X${h}Y`, why: `Une fille reçoit un X de son père : pour qu'elle soit $X^{${h}}X^{${h}}$, il doit porter $${h}$ sur son X.` },
    { who: `Une fille d'un homme ${d.sick[0]} et d'une femme ${d.sick[1]}`, a: `X${h}X${h}`, why: "Ses deux parents n'ont que des X malades à lui transmettre." },
  ];
  const c = pick(rng, CASES);
  const geno = parseGenotype([gene], c.a);
  return {
    type: "xGeno",
    prompt: "Donne le génotype",
    text: `${cap(d.name)} est ${d.fem ? "due" : "dû"} à un allèle récessif $${h}$ porté par le chromosome X (allèle normal $${H}$). On considère ${c.who[0].toLowerCase()}${c.who.slice(1)}. Quel est son génotype ?`,
    kind: "geno", genes: [gene], answers: [c.a],
    hints: [
      `Écris le génotype avec les chromosomes : $X^{${H}}$, $X^{${h}}$ et $Y$ (par exemple « XHY » au clavier).`,
      "Un homme a un X (de sa mère) et un Y (de son père) ; une femme a deux X, un de chaque parent.",
      "Le père transmet toujours son X à ses filles et son Y à ses fils.",
    ],
    steps: [
      { tex: c.who.startsWith("Un homme") || c.who.startsWith("Le père") ? "X\\,?\\,Y" : "X\\,?\\,X\\,?", note: c.who.startsWith("Un homme") || c.who.startsWith("Le père") ? "C'est un homme : un X et un Y." : "C'est une femme : deux X." },
      { tex: "\\text{raisonnement}", note: c.why },
      { tex: genoTex(geno), note: "Le génotype." },
    ],
  };
}

/** Couples of the tree with their phenotypes, to explain a pedigree. */
function witnesses(tree) {
  const P = tree.people;
  const out = { healthyToSick: null, sickToHealthy: null, sickDaughterHealthyFather: null, sickMotherHealthySon: null, sickFatherHealthyDaughter: null, sickSonHealthyMother: null };
  for (const fam of tree.families) {
    const [a, b] = fam.parents;
    const father = P[a].sex === "m" ? a : b, mother = father === a ? b : a;
    for (const k of fam.kids) {
      const kid = P[k];
      if (!P[a].aff && !P[b].aff && kid.aff) out.healthyToSick ??= [father, mother, k];
      if (P[a].aff && P[b].aff && !kid.aff) out.sickToHealthy ??= [father, mother, k];
      if (kid.sex === "f" && kid.aff && !P[father].aff) out.sickDaughterHealthyFather ??= [father, k];
      if (kid.sex === "m" && !kid.aff && P[mother].aff) out.sickMotherHealthySon ??= [mother, k];
      if (kid.sex === "f" && !kid.aff && P[father].aff) out.sickFatherHealthyDaughter ??= [father, k];
      if (kid.sex === "m" && kid.aff && !P[mother].aff) out.sickSonHealthyMother ??= [mother, k];
    }
  }
  return out;
}

const nm = (tree, id) => personName(tree.people[id]);
const PED_HINTS = [
  "Cherche un couple de parents sains qui a un enfant atteint, ou un couple de parents atteints qui a un enfant sain.",
  "Deux parents sains qui ont un enfant atteint portent un allèle caché : il est récessif. Deux parents atteints qui ont un enfant sain : l'allèle est dominant.",
  "Pour une maladie récessive liée à X, le père d'une fille atteinte est forcément atteint, et le fils d'une mère atteinte aussi.",
];

function domRecSteps(tree, dominantMode) {
  const w = witnesses(tree);
  if (dominantMode) {
    const [f, m, k] = w.sickToHealthy;
    return { tex: `${nm(tree, f)} \\times ${nm(tree, m)} \\to ${nm(tree, k)}`, note: `${nm(tree, f)} et ${nm(tree, m)}, tous deux atteints, ont un enfant sain (${nm(tree, k)}) : ils portaient chacun un allèle normal caché. L'allèle de la maladie est **dominant**.`.replace(/\*\*/g, "") };
  }
  const [f, m, k] = w.healthyToSick;
  return { tex: `${nm(tree, f)} \\times ${nm(tree, m)} \\to ${nm(tree, k)}`, note: `${nm(tree, f)} et ${nm(tree, m)}, tous deux sains, ont un enfant atteint (${nm(tree, k)}) : ils portaient chacun l'allèle de la maladie sans l'exprimer. L'allèle est récessif.` };
}

function pedigreeModeGen(rng) {
  const mode = pick(rng, ["AD", "AR"]);
  const { tree } = randomPedigree(rng, mode, ["AD", "AR", "XR", "XD"].filter((m) => m !== mode));
  const w = witnesses(tree);
  const right = MODES[mode].label;
  const wrongs = ["AD", "AR", "XR", "XD"].filter((m) => m !== mode).map((m) => MODES[m].label);
  let xStep;
  if (mode === "AR") {
    const [a, b] = w.sickDaughterHealthyFather ?? w.sickMotherHealthySon;
    xStep = w.sickDaughterHealthyFather
      ? `${nm(tree, b)} est une fille atteinte dont le père (${nm(tree, a)}) est sain : impossible si le gène était sur X (le père lui aurait donné un X malade). Le gène est autosomique.`
      : `${nm(tree, a)} est une mère atteinte qui a un fils sain (${nm(tree, b)}) : impossible si le gène était sur X (elle n'a que des X malades à donner). Le gène est autosomique.`;
    xStep = { tex: `${nm(tree, a)} \\to ${nm(tree, b)}`, note: xStep };
  } else {
    const [a, b] = w.sickFatherHealthyDaughter ?? w.sickSonHealthyMother;
    xStep = w.sickFatherHealthyDaughter
      ? `${nm(tree, a)}, un père atteint, a une fille saine (${nm(tree, b)}) : impossible si l'allèle dominant était sur X (il lui aurait donné son X). Le gène est autosomique.`
      : `${nm(tree, b)}, un fils atteint, a une mère saine (${nm(tree, a)}) : impossible si l'allèle dominant était sur X (son X vient de sa mère). Le gène est autosomique.`;
    xStep = { tex: `${nm(tree, a)} \\to ${nm(tree, b)}`, note: xStep };
  }
  return {
    type: "pedigreeMode",
    prompt: "Choisis la bonne réponse",
    text: "Dans cet arbre, les symboles noircis sont les personnes atteintes (carré : homme, rond : femme). Quel mode de transmission explique cet arbre ?",
    pedigree: tree,
    ...choice(rng, right, wrongs),
    hints: PED_HINTS,
    steps: [
      domRecSteps(tree, mode === "AD"),
      xStep,
      { tex: `\\text{${right.toLowerCase()}}`, note: "Un seul mode reste possible." },
    ],
  };
}

function pedigreeAlleleGen(rng) {
  const mode = pick(rng, ["AD", "AR", "XR", "XD"]);
  const dom = mode === "AD" || mode === "XD";
  const { tree } = randomPedigree(rng, mode, dom ? ["AR", "XR"] : ["AD", "XD"]);
  const right = dom ? "Dominant" : "Récessif";
  return {
    type: "pedigreeAllele",
    prompt: "Choisis la bonne réponse",
    text: "Dans cet arbre, les symboles noircis sont les personnes atteintes. L'allèle responsable de la maladie est-il dominant ou récessif ?",
    pedigree: tree,
    ...choice(rng, right, [dom ? "Récessif" : "Dominant", "On ne peut pas conclure"]),
    hints: PED_HINTS,
    steps: [
      domRecSteps(tree, dom),
      { tex: dom ? "\\text{dominant}" : "\\text{récessif}", note: dom ? "Un allèle récessif ne peut pas être caché chez deux parents atteints (ils seraient homozygotes et n'auraient que des enfants atteints)." : "Un allèle dominant s'exprimerait chez au moins un des parents." },
      { tex: `\\text{allèle ${right.toLowerCase()}}`, note: "Un seul couple bien choisi suffit à conclure." },
    ],
  };
}

function pedigreeGenoGen(rng) {
  const mode = pick(rng, ["AR", "AR", "XR", "AD"]);
  for (;;) {
    const { tree } = randomPedigree(rng, mode, []);
    const sets = possibleGenotypes(tree, mode);
    // Someone whose genotype is certain but not given away by the phenotype alone.
    const ids = Object.keys(tree.people).filter((id) => {
      const p = tree.people[id];
      const own = MODES[mode].geno(p.sex).filter((k) => MODES[mode].aff(k) === p.aff);
      return sets[id].length === 1 && own.length > 1;
    });
    if (!ids.length) continue;
    const id = pick(rng, ids);
    const p = tree.people[id];
    const key = sets[id][0];
    const gene = mode === "XR" ? xLinked("A", ["atteint", "atteinte"]) : dominant("A", "A", "a");
    const own = MODES[mode].geno(p.sex).filter((k) => MODES[mode].aff(k) === p.aff);
    const fam = tree.families.find((f) => f.kids.includes(id));
    const kidsFams = tree.families.filter((f) => f.parents.includes(id));
    const sickKid = kidsFams.flatMap((f) => f.kids).find((k) => tree.people[k].aff !== p.aff || (mode !== "AD" && tree.people[k].aff));
    const parentWhy = fam && fam.parents.find((x) => tree.people[x].aff !== (mode === "AD" ? true : false) || (mode !== "AD" && tree.people[x].aff));
    const relative = sickKid ?? parentWhy;
    const why = relative
      ? `${personName(tree.people[relative])} (${tree.people[relative].aff ? "atteint" : "sain"}${tree.people[relative].sex === "f" ? "e" : ""}) ${sickKid ? `est son enfant : ${personName(p)} a dû lui transmettre ${mode === "AD" ? "l'allèle normal" : "l'allèle de la maladie"}` : `est son ${tree.people[relative].sex === "f" ? "parent : elle" : "parent : il"} lui a transmis ${mode === "AD" ? "un allèle normal" : "l'allèle de la maladie"}`}.`
      : "Les autres génotypes rendent la descendance ou les parents impossibles.";
    return {
      type: "pedigreeGeno",
      prompt: "Donne le génotype",
      text: `Dans cet arbre, les symboles noircis sont les personnes atteintes. La transmission est ${MODES[mode].label[0].toLowerCase()}${MODES[mode].label.slice(1)} ; on note ${mode === "XR" ? "$X^A$ l'allèle normal et $X^a$ l'allèle de la maladie" : mode === "AD" ? "$A$ l'allèle de la maladie et $a$ l'allèle normal" : "$A$ l'allèle normal et $a$ l'allèle de la maladie"}. Quel est le génotype de ${personName(p)} ?`,
      pedigree: tree,
      highlight: id,
      kind: "geno", genes: [gene], answers: [key],
      hints: [
        `Commence par le phénotype de ${personName(p)} : quels génotypes sont possibles ?`,
        `Regarde ensuite ses parents et ses enfants : que lui ont-ils donné, que leur a-t-${p.sex === "f" ? "elle" : "il"} transmis ?`,
        mode === "XR" ? "Un fils reçoit son X de sa mère ; une fille reçoit un X de chaque parent." : "Chaque enfant reçoit un allèle de chacun de ses deux parents.",
      ],
      steps: [
        { tex: own.map(pedigreeTex).join("\\text{ ou }"), note: `${personName(p)} est ${p.aff ? "atteint" : "sain"}${p.sex === "f" ? "e" : ""} : génotypes possibles d'après son seul phénotype.` },
        { tex: `\\text{famille de ${personName(p)}}`, note: why },
        { tex: pedigreeTex(key), note: "Un seul génotype reste possible." },
      ],
    };
  }
}

// ---------- registry ----------

export const TYPES = {
  monoProb: { label: "Probabilité d'un croisement", level: 1, gen: monoProbGen },
  monoParents: { label: "Retrouver les parents", level: 1, gen: monoParentsGen },
  testCross: { label: "Croisement-test", level: 1, gen: testCrossGen },
  monoGenos: { label: "Génotypes possibles", level: 1, gen: monoGenosGen },
  coCross: { label: "Codominance", level: 2, gen: coCrossGen },
  lethal: { label: "Gènes létaux", level: 2, gen: lethalGen },
  bloodProb: { label: "Groupe sanguin : probabilité", level: 2, gen: bloodProbGen },
  bloodGroups: { label: "Groupes sanguins possibles", level: 2, gen: bloodGroupsGen },
  bloodQcm: { label: "Groupe sanguin : possible ou non ?", level: 2, gen: bloodQcmGen },
  gametes: { label: "Gamètes d'un génotype", level: 3, gen: gametesGen },
  diProb: { label: "Probabilité en dihybridisme", level: 3, gen: diProbGen },
  polyProb: { label: "Polyhybridisme", level: 3, gen: polyProbGen },
  classes: { label: "Nombre de classes", level: 3, gen: classesGen },
  diParents: { label: "Génotypes parentaux (dihybridisme)", level: 3, gen: diParentsGen },
  recomb: { label: "Fréquence de recombinaison", level: 4, gen: recombGen },
  linkedQcm: { label: "Gènes liés ou indépendants ?", level: 4, gen: linkedQcmGen },
  xProb: { label: "Lié à X : probabilité", level: 5, gen: xProbGen },
  xGeno: { label: "Lié à X : génotype", level: 5, gen: xGenoGen },
  pedigreeAllele: { label: "Arbre : dominant ou récessif ?", level: 5, gen: pedigreeAlleleGen },
  pedigreeMode: { label: "Arbre : mode de transmission", level: 5, gen: pedigreeModeGen },
  pedigreeGeno: { label: "Arbre : génotype d'un individu", level: 5, gen: pedigreeGenoGen },
};

export const LEVELS = [
  { id: 1, label: "Monohybridisme" },
  { id: 2, label: "Cas particuliers" },
  { id: 3, label: "Dihybridisme et polyhybridisme" },
  { id: 4, label: "Linkage" },
  { id: 5, label: "Lié au sexe et arbres" },
];

export function generate(choiceId = "all", rng = Math.random) {
  let ids = Object.keys(TYPES);
  if (choiceId.startsWith("level:")) ids = ids.filter((id) => TYPES[id].level === Number(choiceId.slice(6)));
  else if (choiceId !== "all") ids = [choiceId];
  return TYPES[pick(rng, ids)].gen(rng);
}

// ---------- answers ----------

/** "1/4", "0,25", "25 %", "1 sur 4" → 0.25; NaN when unreadable. */
export function parseProb(text) {
  let t = text.toLowerCase().replace(/\s+/g, "").replace(/sur/g, "/").replace(/^p=/, "");
  const pct = t.endsWith("%");
  if (pct) t = t.slice(0, -1);
  const v = readNumber(t);
  if (!Number.isFinite(v)) return NaN;
  return pct ? v / 100 : v;
}

/** One item of a list answer → its key, or null. */
function parseItem(ex, text) {
  if (ex.item === "group") {
    const t = text.toUpperCase().replace(/0/g, "O").replace(/^GROUPE/, "");
    const k = t === "BA" ? "AB" : t;
    return GROUPS.includes(k) ? k : null;
  }
  if (ex.item === "gamete") {
    const g = parseGamete(ex.genes, text);
    return g ? g.join("") : null;
  }
  const g = parseGenotype(ex.genes, text);
  return g ? genoKey(g) : null;
}

/** { ok, values } (values null = unreadable), plus missing / extra for lists. */
export function checkAnswer(ex, text) {
  if (ex.choices) {
    const i = /^\d+$/.test(text.trim()) ? Number(text) : NaN;
    return { ok: i === ex.answers[0], values: Number.isInteger(i) ? [i] : null };
  }
  if (ex.kind === "prob") {
    const v = parseProb(text);
    if (!Number.isFinite(v) || v < 0 || v > 1) return { ok: false, values: null, range: Number.isFinite(v) };
    return { ok: Math.abs(v - ex.answers[0]) <= 0.006, values: [v] };
  }
  if (ex.kind === "int" || ex.kind === "percent") {
    const t = text.replace(/\s+/g, "").replace(/(%|cm|cM|centimorgans?)$/i, "");
    const v = readNumber(t);
    if (!Number.isFinite(v)) return { ok: false, values: null };
    const tol = ex.kind === "int" ? 1e-9 : ex.tol;
    return { ok: Math.abs(v - ex.answers[0]) <= tol, values: [v] };
  }
  if (ex.kind === "geno") {
    const g = parseGenotype(ex.genes, text);
    if (!g) return { ok: false, values: null };
    return { ok: genoKey(g) === ex.answers[0], values: [genoKey(g)] };
  }
  // Lists: separated by commas, semicolons, spaces or "et".
  const parts = text.split(/[;,]|\s+et\s+|\s+/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return { ok: false, values: null };
  const keys = parts.map((p) => parseItem(ex, p));
  const bad = parts.find((p, i) => keys[i] === null);
  if (bad !== undefined) return { ok: false, values: null, bad };
  const got = [...new Set(keys)];
  const missing = ex.answers.filter((k) => !got.includes(k)).length;
  const extra = got.filter((k) => !ex.answers.includes(k)).length;
  return { ok: missing === 0 && extra === 0, values: got, missing, extra };
}

/** The right answer, as a student could type it (tests). */
export function answerText(ex) {
  if (ex.choices) return String(ex.answers[0]);
  if (ex.kind === "prob") { const [n, d] = fraction(ex.answers[0]); return d === 1 ? String(n) : `${n}/${d}`; }
  if (ex.kind === "int" || ex.kind === "percent") return String(ex.answers[0]).replace(".", ",");
  if (ex.kind === "geno") return ex.answers[0];
  return ex.answers.join(", ");
}

/** Small deterministic generator (mulberry32), for tests and worked examples. */
export function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
