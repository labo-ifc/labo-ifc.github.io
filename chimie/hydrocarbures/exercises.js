// Exercise generator of the hydrocarbons course. Pure: no DOM.
//
// An exercise is { type, prompt, statement (TeX) | text ($…$ mixed), answers,
// labels?, tol | rel, digits, hints (exactly 3), steps [{ tex, note }] }.
// Answers are lists of numbers separated by ";".

import {
  MASS, ce, molarMass, alkane, alkene, alkaneName, alkeneName, combustion, COMBUSTIONS,
  combustionEnthalpy, BONDS, chainCe, chainFormula, sigmaPi, chainHydrogens, ADDITIONS, addition, MONOMERS,
} from "./chem.js";
import { numTex } from "../../shared/tex.js";
import { readNumber } from "../../shared/answer.js";

const randInt = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
/** French number for prose ($…$ is not needed): 1234.5 → "1234,5". */
const fr = (v, d = 2) => numTex(v, d).replace("{,}", ",");
const n = (v, d = 2) => numTex(v, d);

// ---------- raffinage ----------

function crackingGen(rng) {
  const big = randInt(rng, 10, 20), k = randInt(rng, 4, big - 3);
  const from = alkane(big), part = alkane(k), rest = alkene(big - k);
  return {
    type: "cracking",
    prompt: "Complète le craquage : donne le nombre d'atomes C puis H de l'alcène formé",
    statement: `\\ce{${ce(from)} -> ${ce(part)} + C_{?}H_{?}}`,
    labels: ["C", "H"], answers: [rest.C, rest.H],
    hints: [
      "Au cours d'une réaction, aucun atome ne disparaît : il y a autant d'atomes de chaque sorte à gauche et à droite.",
      "Les atomes de carbone qui ne sont pas dans l'alcane formé sont tous dans l'alcène.",
      "Un alcène a deux fois plus d'atomes H que d'atomes C : $\\ce{C_nH_{2n}}$.",
    ],
    steps: [
      { tex: `\\text{C : } ${big} - ${k} = ${rest.C}`, note: `Carbone : ${big} atomes à gauche, ${k} dans $\\ce{${ce(part)}}$.` },
      { tex: `\\text{H : } ${from.H} - ${part.H} = ${rest.H}`, note: "Hydrogène : même raisonnement." },
      { tex: `\\ce{${ce(from)} -> ${ce(part)} + ${ce(rest)}}`, note: `On vérifie : ${rest.H} = 2 × ${rest.C}, c'est bien un alcène.` },
    ],
  };
}

function alkaneFromMassGen(rng) {
  const c = randInt(rng, 2, 10), f = alkane(c), M = molarMass(f);
  return {
    type: "alkaneFromMass",
    prompt: "Trouve la formule brute de l'alcane : donne le nombre d'atomes C puis H",
    text: `Un alcane linéaire a une masse molaire de $${M}\\ \\text{g/mol}$. ($M_\\ce{C} = 12$, $M_\\ce{H} = 1\\ \\text{g/mol}$)`,
    labels: ["C", "H"], answers: [f.C, f.H],
    hints: [
      "Un alcane a pour formule $\\ce{C_nH_{2n+2}}$.",
      "Sa masse molaire est donc $M = 12n + (2n + 2) \\cdot 1$.",
      "Simplifie : $M = 14n + 2$, puis isole $n$.",
    ],
    steps: [
      { tex: `14n + 2 = ${M}`, note: "Masse molaire de $\\ce{C_nH_{2n+2}}$ : $12n + 2n + 2$." },
      { tex: `n = \\frac{${M} - 2}{14} = ${c}`, note: "On isole $n$." },
      { tex: `\\ce{${ce(f)}}`, note: `$2n + 2 = ${f.H}$ atomes d'hydrogène : c'est le ${alkaneName(c)}.` },
    ],
  };
}

// ---------- combustions ----------

/** mhchem coefficient: 1 → "", 6.5 → "13/2"; a string (unknown "?") is kept. */
const coef = (k) => (typeof k === "string" ? k : k === 1 ? "" : Number.isInteger(k) ? `${k}` : `${k * 2}/2`);

function balanceSteps(fuel, kind) {
  const eq = combustion(fuel, kind);
  const { product } = eq;
  const p = ce(product), f = ce(fuel);
  const nC = fuel.C, water = fuel.H / 2, half = eq.o2PerFuel;
  const oRight = (product.O ?? 0) * nC + water;
  const line = (o, c, w, a = 1) => `\\ce{${coef(a)}${f} + ${coef(o)}O2 -> ${coef(c)}${p} + ${coef(w)}H2O}`;
  const steps = [
    { tex: line("?", nC, "?"), note: `Carbone : ${nC} atome${nC > 1 ? "s" : ""} C dans $\\ce{${f}}$, donc ${nC} $\\ce{${p}}$ à droite.` },
    { tex: line("?", nC, water), note: `Hydrogène : ${fuel.H} atomes H, donc $${fuel.H} / 2 = ${water}$ molécules d'eau.` },
    {
      tex: line(half, nC, water),
      note: product.O
        ? `Oxygène : à droite, $${nC} \\cdot ${product.O} + ${water} = ${oRight}$ atomes O, donc $${oRight} / 2 = ${n(half)}$ $\\ce{O2}$.`
        : `Oxygène : il n'est que dans l'eau, ${water} atomes O, donc $${water} / 2 = ${n(half)}$ $\\ce{O2}$.`,
    },
  ];
  const [a, o, c, w] = eq.coefs;
  if (eq.factor > 1) steps.push({ tex: line(o, c, w, a), note: `Pas de demi-molécule : on multiplie tout par ${eq.factor}.` });
  const atoms = { C: a * nC, H: a * fuel.H, O: 2 * o };
  steps.push({
    tex: `\\text{C : } ${atoms.C} = ${atoms.C} \\qquad \\text{H : } ${atoms.H} = ${atoms.H} \\qquad \\text{O : } ${atoms.O} = ${atoms.O}`,
    note: "Vérification : autant d'atomes de chaque sorte des deux côtés.",
  });
  return { eq, steps };
}

const PRODUCT_HINT = {
  complete: "chaque atome C du combustible finit dans une molécule de $\\ce{CO2}$",
  co: "chaque atome C du combustible finit dans une molécule de $\\ce{CO}$",
  c: "chaque atome C du combustible finit en suie $\\ce{C}$",
};

function combustionGen(type, kind, family) {
  return (rng) => {
    const c = family === "alkene" ? randInt(rng, 2, 8) : randInt(rng, 1, 10);
    const fuel = family === "alkene" ? alkene(c) : alkane(c);
    const { eq, steps } = balanceSteps(fuel, kind);
    const p = ce(eq.product);
    return {
      type,
      prompt: "Pondère l'équation : donne les 4 coefficients dans l'ordre, les plus petits entiers possibles",
      statement: `\\ce{${ce(fuel)} + O2 -> ${p} + H2O}`,
      labels: [ce(fuel), "O2", p, "H2O"], answers: eq.coefs, kind: "coefs",
      hints: [
        `Commence par le carbone : ${PRODUCT_HINT[kind]}.`,
        "Puis l'hydrogène : chaque molécule d'eau $\\ce{H2O}$ emporte 2 atomes H.",
        "Termine par l'oxygène : compte les O à droite et divise par 2 pour $\\ce{O2}$ ; si tu obtiens une demi-molécule, multiplie tout par 2.",
      ],
      steps,
    };
  };
}

// ---------- énergie ----------

const bondSum = (list) => list.map((b) => `${b.count} \\cdot ${BONDS[b.bond].E}`).join(" + ");

function enthalpyGen(type, kind) {
  return (rng) => {
    const c = kind === "complete" ? randInt(rng, 1, 5) : randInt(rng, 1, 4);
    const r = combustionEnthalpy(c, kind);
    const [a] = r.eq.coefs;
    const name = alkaneName(c);
    const used = ["CC", "CH", "OO", kind === "complete" ? "CO2" : "CO", "HO"].filter((b) => c > 1 || b !== "CC");
    const data = used.map((b) => `$${BONDS[b].tex}$ : ${BONDS[b].E}`).join(" ; ");
    const product = kind === "complete" ? "CO2" : "CO";
    const steps = [
      { tex: `\\ce{${coef(a)}${ce(alkane(c))} + ${coef(r.eq.coefs[1])}O2 -> ${coef(r.eq.coefs[2])}${product} + ${coef(r.eq.coefs[3])}H2O}`, note: "On pondère l'équation de combustion." },
      {
        tex: `E_\\text{rupture} = ${bondSum(r.ruptures)} = ${r.rupture}\\ \\text{kJ}`,
        note: `Liaisons rompues : ${c > 1 ? `$${c - 1}$ C–C et ` : ""}$${2 * c + 2}$ C–H par molécule de ${name} (×${a}), une O=O par $\\ce{O2}$.`,
      },
      {
        tex: `E_\\text{formation} = ${bondSum(r.formations)} = ${r.formation}\\ \\text{kJ}`,
        note: kind === "complete"
          ? "Liaisons formées : 2 C=O par $\\ce{CO2}$, 2 H–O par $\\ce{H2O}$."
          : "Liaisons formées : une C≡O par $\\ce{CO}$, 2 H–O par $\\ce{H2O}$.",
      },
      { tex: `\\Delta H = ${r.rupture} - ${r.formation} = ${r.dH}\\ \\text{kJ}`, note: "$\\Delta H = E_\\text{rupture} - E_\\text{formation}$ pour l'équation pondérée." },
    ];
    if (a > 1) steps.push({ tex: `\\Delta H = \\frac{${r.dH}}{${a}} = ${n(r.dHPerMol, 1)}\\ \\text{kJ/mol}`, note: `L'équation brûle ${a} moles de ${name} : on divise par ${a}.` });
    steps.push({ tex: `\\Delta H = ${n(r.dHPerMol, 1)}\\ \\text{kJ/mol} < 0`, note: "Négatif : la réaction libère de l'énergie (exothermique)." });
    return {
      type,
      prompt: "Calcule ΔH en kJ par mole d'alcane",
      text: `À l'aide des énergies de liaison, calcule $\\Delta H$ de la combustion ${COMBUSTIONS[kind].label} du ${name}. Énergies de liaison (kJ/mol) : ${data}.`,
      answers: [r.dHPerMol], tol: 1, digits: 1, unit: "kJ/mol",
      hints: [
        "Commence par pondérer l'équation de combustion.",
        `Dessine les molécules : un alcane $\\ce{C_nH_{2n+2}}$ a $n - 1$ liaisons C–C et $2n + 2$ liaisons C–H ; ${kind === "complete" ? "$\\ce{CO2}$ a 2 liaisons C=O" : "$\\ce{CO}$ a une liaison C≡O"}, $\\ce{H2O}$ a 2 liaisons H–O.`,
        "$\\Delta H = E_\\text{rupture} - E_\\text{formation}$, puis divise par le coefficient de l'alcane pour avoir l'énergie par mole.",
      ],
      steps,
    };
  };
}

const FUELS = [
  { name: "méthane", pc: 50 },
  { name: "propane", pc: 46 },
  { name: "butane", pc: 46 },
  { name: "polypropylène", pc: 50 },
  { name: "essence", pc: 47, rho: 0.75, liquid: true },
  { name: "gazole", pc: 45, rho: 0.84, liquid: true },
];

function heatGen(rng) {
  const fuel = pick(rng, FUELS);
  const pcText = `pouvoir calorifique : $${fuel.pc}\\ \\text{MJ/kg}$`;
  let text, m, first;
  if (fuel.liquid) {
    const V = randInt(rng, 2, 12) * 5;
    m = V * fuel.rho;
    text = `Un réservoir contient $${V}\\ \\text{L}$ de ${fuel.name} (masse volumique : $${n(fuel.rho)}\\ \\text{kg/L}$ ; ${pcText}). Quelle énergie libère sa combustion complète ?`;
    first = { tex: `m = \\rho \\cdot V = ${n(fuel.rho)} \\cdot ${V} = ${n(m)}\\ \\text{kg}`, note: "La masse à partir du volume." };
  } else {
    const grams = randInt(rng, 2, 40) * 50;
    m = grams / 1000;
    text = `Quelle énergie libère la combustion complète de $${grams}\\ \\text{g}$ de ${fuel.name} (${pcText}) ?`;
    first = { tex: `m = ${grams}\\ \\text{g} = ${n(m, 3)}\\ \\text{kg}`, note: "Le pouvoir calorifique est donné par kilogramme : on convertit." };
  }
  const Q = m * fuel.pc;
  return {
    type: "heat",
    prompt: "Calcule l'énergie libérée en MJ",
    text, answers: [Q], rel: 0.01, digits: 1, unit: "MJ",
    hints: [
      "Le pouvoir calorifique est l'énergie libérée par kilogramme de combustible brûlé.",
      fuel.liquid ? "Calcule d'abord la masse de combustible : $m = \\rho \\cdot V$." : "Attention aux unités : la masse doit être en kilogrammes.",
      "L'énergie est proportionnelle à la masse : $Q = m \\cdot PC$.",
    ],
    steps: [
      first,
      { tex: `Q = m \\cdot PC = ${n(m, 3)} \\cdot ${fuel.pc}`, note: "Énergie = masse × pouvoir calorifique." },
      { tex: `Q = ${n(Q, 1)}\\ \\text{MJ}`, note: `Soit ${fr(Q * 1e6 / 1e9, 3)} GJ, ou ${fr(Q * 1000, 0)} kJ.` },
    ],
  };
}

// ---------- alcènes ----------

/** Random straight chain with one or two multiple bonds. */
function randomChain(rng) {
  for (;;) {
    const c = randInt(rng, 2, 6);
    const orders = Array(c - 1).fill(1);
    const i = randInt(rng, 0, c - 2);
    orders[i] = rng() < 0.3 ? 3 : 2;
    if (c >= 5 && rng() < 0.35) {
      const j = randInt(rng, 0, c - 2);
      if (Math.abs(j - i) > 1) orders[j] = 2;
    }
    if (chainHydrogens(orders).every((h) => h >= 0)) return orders;
  }
}

function sigmaPiGen(rng) {
  const orders = randomChain(rng);
  const { C, H } = chainFormula(orders);
  const { sigma, pi } = sigmaPi(orders);
  const multiple = orders.filter((o) => o > 1);
  const piNote = multiple.map((o) => (o === 2 ? "1 (double)" : "2 (triple)")).join(" + ");
  return {
    type: "sigmaPi",
    prompt: "Compte les liaisons : donne le nombre de liaisons σ puis π",
    statement: `\\ce{${chainCe(orders)}}`,
    labels: ["σ", "π"], answers: [sigma, pi],
    hints: [
      "Toute liaison simple est une liaison σ.",
      "Une double liaison = 1 σ + 1 π ; une triple liaison = 1 σ + 2 π.",
      "Il y a exactement une liaison σ entre deux atomes liés : compte les paires d'atomes liés, sans oublier les liaisons C–H.",
    ],
    steps: [
      { tex: `\\ce{${ce({ C, H })}} : ${C}\\ \\text{C et } ${H}\\ \\text{H}`, note: "On compte les atomes." },
      { tex: `\\text{C–H : } ${H} \\qquad \\text{C–C : } ${C - 1}`, note: "Chaque H est lié à un C ; une chaîne de " + C + " carbones a " + (C - 1) + " liaisons carbone–carbone." },
      { tex: `\\sigma = ${H} + ${C - 1} = ${sigma}`, note: "Une liaison σ par paire d'atomes liés." },
      { tex: `\\pi = ${multiple.map((o) => o - 1).join(" + ")} = ${pi}`, note: `Les liaisons en plus des doubles et triples : ${piNote}.` },
    ],
  };
}

function additionMassGen(rng) {
  const c = randInt(rng, 2, 5);
  const orders = [2, ...Array(c - 2).fill(1)];
  const reagent = pick(rng, Object.keys(ADDITIONS));
  const add = ADDITIONS[reagent];
  const product = addition(orders, reagent);
  const fA = alkene(c), MA = molarMass(fA), MR = molarMass(add.formula), MP = molarMass(product.formula);
  const m = randInt(rng, 2, 40) * 5;
  const askProduct = rng() < 0.6;
  const mol = m / MA;
  const target = askProduct ? MP : MR;
  const answer = mol * target;
  const what = askProduct ? "de produit obtenue" : `de $\\ce{${add.reagent}}$ nécessaire`;
  const unit = (f) => Object.entries(f).map(([el, k]) => `${k > 1 ? k + " \\cdot " : ""}${MASS[el]}`).join(" + ");
  return {
    type: "additionMass",
    prompt: "Calcule la masse en g",
    text: `${add.label} : on fait réagir $${m}\\ \\text{g}$ de ${alkeneName(c)} $\\ce{${chainCe(orders)}}$ avec du $\\ce{${add.reagent}}$ en excès. Quelle est la masse ${what} ? ($M$ en g/mol : C 12, H 1, O 16, Cl 35,5, Br 80)`,
    answers: [answer], rel: 0.01, digits: 1, unit: "g",
    hints: [
      "Écris l'équation : le réactif s'additionne sur la double liaison, qui devient simple.",
      "Une mole d'alcène réagit avec une mole de réactif et donne une mole de produit.",
      "Calcule la quantité de matière d'alcène $n = \\frac{m}{M}$, puis la masse cherchée $m = n \\cdot M$.",
    ],
    steps: [
      { tex: `\\ce{${chainCe(orders)} + ${add.reagent} -> ${product.ce}}`, note: reagent === "H2O" && c > 2 ? "Le groupe OH se fixe sur le carbone qui porte le moins d'hydrogènes (produit majoritaire)." : "Addition sur la double liaison." },
      { tex: `M(\\ce{${ce(fA)}}) = ${unit(fA)} = ${MA}\\ \\text{g/mol}`, note: "Masse molaire de l'alcène." },
      { tex: `n = \\frac{${m}}{${MA}} \\approx ${n(mol, 3)}\\ \\text{mol}`, note: "Quantité de matière d'alcène ; la même quantité de produit (proportions 1 : 1)." },
      { tex: `M(\\ce{${askProduct ? ce(product.formula) : add.reagent}}) = ${unit(askProduct ? product.formula : add.formula)} = ${n(target, 1)}\\ \\text{g/mol}`, note: askProduct ? "Masse molaire du produit." : "Masse molaire du réactif." },
      { tex: `m = n \\cdot M = \\frac{${m}}{${MA}} \\cdot ${n(target, 1)} \\approx ${n(answer, 1)}\\ \\text{g}`, note: "On garde la fraction pour ne pas cumuler les arrondis." },
    ],
  };
}

// ---------- polymères ----------

function degreeGen(rng) {
  const mono = pick(rng, MONOMERS);
  const M0 = molarMass(mono.formula);
  const kg = randInt(rng, 5, 60) * 10;
  const deg = (kg * 1000) / M0;
  return {
    type: "degree",
    prompt: "Calcule le degré de polymérisation n (arrondi à l'unité)",
    text: `Un ${mono.polymer} a une masse molaire moyenne de $${kg}\\ \\text{kg/mol}$. Son monomère est le ${mono.monomer} $\\ce{${mono.ce}}$. ($M$ en g/mol : C 12, H 1, F 19, Cl 35,5)`,
    answers: [deg], tol: 1, digits: 0,
    hints: [
      "Le degré de polymérisation $n$ est le nombre de monomères enchaînés dans une macromolécule.",
      "Calcule la masse molaire du monomère, et exprime les deux masses dans la même unité.",
      "$n = \\frac{M(\\text{polymère})}{M(\\text{monomère})}$.",
    ],
    steps: [
      { tex: `M(\\ce{${ce(mono.formula)}}) = ${M0}\\ \\text{g/mol}`, note: `Masse molaire du ${mono.monomer}.` },
      { tex: `M(\\text{${mono.id}}) = ${kg}\\ \\text{kg/mol} = ${kg * 1000}\\ \\text{g/mol}`, note: "Même unité que le monomère." },
      { tex: `n = \\frac{${kg * 1000}}{${M0}} \\approx ${Math.round(deg)}`, note: `Environ ${fr(Math.round(deg), 0)} motifs par macromolécule.` },
    ],
  };
}

function polymerCO2Gen(rng) {
  const mono = pick(rng, MONOMERS.filter((m) => !m.formula.Cl && !m.formula.F));
  const motif = mono.formula, M0 = molarMass(motif);
  const t = pick(rng, [0.5, 1, 2, 5, 10, 25, 100, 1100]);
  const k = motif.C, eq = combustion(motif);
  const out = (t * k * 44) / M0;
  const [a, o, c, w] = eq.coefs;
  return {
    type: "polymerCO2",
    prompt: "Calcule la masse de CO₂ en tonnes",
    text: `Quelle masse de $\\ce{CO2}$ libère la combustion complète de $${n(t)}$ tonne${t >= 2 ? "s" : ""} de ${mono.polymer} $\\left[\\text{–}\\ce{${mono.motif}}\\text{–}\\right]_n$ ? ($M$ en g/mol : C 12, H 1, O 16)`,
    answers: [out], rel: 0.01, digits: 2, unit: "t",
    hints: [
      "Raisonne sur un motif : il brûle comme une petite molécule de même formule brute.",
      `Chaque atome C du motif donne une molécule de $\\ce{CO2}$.`,
      "Les masses sont proportionnelles : compare la masse d'un motif à la masse du $\\ce{CO2}$ qu'il produit.",
    ],
    steps: [
      { tex: `\\ce{${coef(a)}${ce(motif)} + ${coef(o)}O2 -> ${coef(c)}CO2 + ${coef(w)}H2O}`, note: "Combustion complète d'un motif (pour le polymère, tout est multiplié par $n$)." },
      { tex: `M(\\ce{${ce(motif)}}) = ${M0}\\ \\text{g/mol} \\qquad M(\\ce{CO2}) = 44\\ \\text{g/mol}`, note: "Masses molaires." },
      { tex: `${M0}\\ \\text{g de motif} \\longrightarrow ${k} \\cdot 44 = ${k * 44}\\ \\text{g de } \\ce{CO2}`, note: `Un motif donne ${k} $\\ce{CO2}$.` },
      { tex: `m(\\ce{CO2}) = ${n(t)} \\cdot \\frac{${k * 44}}{${M0}} \\approx ${n(out, 2)}\\ \\text{t}`, note: "Règle de trois, directement en tonnes." },
    ],
  };
}

function styreneGen(rng) {
  const t = pick(rng, [0.5, 1, 2, 3, 5, 10]);
  const y = pick(rng, [100, 100, 90, 80, 75]);
  const out = (t * 104 / 78) * (y / 100);
  const yieldText = y === 100 ? "théoriquement" : `avec un rendement de $${y}\\ \\%$`;
  const steps = [
    { tex: "\\ce{C6H6 + CH3-CH2Cl -> C6H5-CH=CH2 + HCl + H2}", note: "Une mole de benzène donne une mole de styrène." },
    { tex: "M(\\ce{C6H6}) = 6 \\cdot 12 + 6 = 78\\ \\text{g/mol} \\qquad M(\\ce{C8H8}) = 8 \\cdot 12 + 8 = 104\\ \\text{g/mol}", note: "Masses molaires." },
    { tex: `m = ${n(t)} \\cdot \\frac{104}{78} \\approx ${n(t * 104 / 78, 3)}\\ \\text{t}`, note: "Proportions 1 : 1 en moles, donc masses dans le rapport 104/78." },
  ];
  if (y < 100) steps.push({ tex: `m = ${n(t * 104 / 78, 3)} \\cdot ${n(y / 100)} \\approx ${n(out, 2)}\\ \\text{t}`, note: `On n'obtient que ${y} % de la masse théorique.` });
  return {
    type: "styrene",
    prompt: "Calcule la masse de styrène en tonnes",
    text: `Le styrène se fabrique à partir de benzène : $\\ce{C6H6 + CH3-CH2Cl -> C6H5-CH=CH2 + HCl + H2}$. Quelle masse de styrène obtient-on ${yieldText} à partir de $${n(t)}$ tonne${t >= 2 ? "s" : ""} de benzène ? ($M$ en g/mol : C 12, H 1)`,
    answers: [out], rel: 0.01, digits: 2, unit: "t",
    hints: [
      "Lis les coefficients de l'équation : combien de moles de styrène pour une mole de benzène ?",
      "Calcule les masses molaires du benzène $\\ce{C6H6}$ et du styrène $\\ce{C8H8}$.",
      y === 100 ? "Masses proportionnelles : multiplie la masse de benzène par le rapport des masses molaires." : "Masses proportionnelles au rapport des masses molaires ; applique ensuite le rendement.",
    ],
    steps,
  };
}

// ---------- catalogue ----------

export const TYPES = {
  cracking: { label: "Craquage", level: 1, gen: crackingGen },
  alkaneFromMass: { label: "Formule d'un alcane par sa masse molaire", level: 1, gen: alkaneFromMassGen },
  combComplete: { label: "Combustion complète d'un alcane", level: 2, gen: combustionGen("combComplete", "complete", "alkane") },
  combCO: { label: "Combustion incomplète (CO)", level: 2, gen: combustionGen("combCO", "co", "alkane") },
  combC: { label: "Combustion incomplète (suie)", level: 2, gen: combustionGen("combC", "c", "alkane") },
  combAlkene: { label: "Combustion complète d'un alcène", level: 2, gen: combustionGen("combAlkene", "complete", "alkene") },
  enthalpy: { label: "ΔH d'une combustion complète", level: 3, gen: enthalpyGen("enthalpy", "complete") },
  enthalpyCO: { label: "ΔH d'une combustion incomplète (CO)", level: 3, gen: enthalpyGen("enthalpyCO", "co") },
  heat: { label: "Énergie et pouvoir calorifique", level: 3, gen: heatGen },
  sigmaPi: { label: "Liaisons σ et π", level: 4, gen: sigmaPiGen },
  additionMass: { label: "Masses dans une addition", level: 4, gen: additionMassGen },
  degree: { label: "Degré de polymérisation", level: 5, gen: degreeGen },
  polymerCO2: { label: "CO₂ de la combustion d'un plastique", level: 5, gen: polymerCO2Gen },
  styrene: { label: "Synthèse du styrène", level: 5, gen: styreneGen },
};

export const LEVELS = [
  { id: 1, label: "Raffinage" },
  { id: 2, label: "Combustions" },
  { id: 3, label: "Énergie" },
  { id: 4, label: "Alcènes" },
  { id: 5, label: "Polymères" },
];

export function generate(choice = "all", rng = Math.random) {
  let ids = Object.keys(TYPES);
  if (choice.startsWith("level:")) ids = ids.filter((id) => TYPES[id].level === Number(choice.slice(6)));
  else if (choice !== "all") ids = [choice];
  return TYPES[pick(rng, ids)].gen(rng);
}

// ---------- answers ----------

/** "2 ; 13 ; 8 ; 10", "-2044 kJ/mol", "1,5 t" → numbers, or null when unreadable. */
export function parseAnswer(text) {
  const t = text.toLowerCase().replace(/[−–]/g, "-").replace(/\s+/g, "")
    .replace(/(kj\/mol|kj|mj|gj|kg|g|t|tonnes?|σ|π|c|h)(?=;|$)/g, "");
  if (!t) return null;
  const parts = t.split(";").filter(Boolean);
  const values = parts.map(readNumber);
  return values.length && values.every(Number.isFinite) ? values : null;
}

const close = (ex, v, a) => Math.abs(v - a) <= Math.max(ex.tol ?? 1e-9, ex.rel ? Math.abs(a) * ex.rel : 0);

export function checkAnswer(ex, text) {
  const values = parseAnswer(text);
  if (!values) return { ok: false, values: null };
  const ok = values.length === ex.answers.length && values.every((v, i) => close(ex, v, ex.answers[i]));
  // Balanced but not with the smallest integers (or with a half).
  const proportional = !ok && ex.kind === "coefs" && values.length === ex.answers.length
    && values.every((v) => v > 0) && values.every((v, i) => Math.abs(v / values[0] - ex.answers[i] / ex.answers[0]) < 1e-9);
  return { ok, values, proportional };
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
