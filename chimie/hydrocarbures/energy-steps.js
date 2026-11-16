// Step-by-step solver of the course exercise "énergie libérée par la combustion
// d'un alcane", following the 6 steps of the method. No DOM.

import { alkane, alkaneName, combustion, BONDS, ce, COMBUSTIONS } from "./chem.js";
import { readNumber } from "../../shared/answer.js";
import { numTex } from "../../shared/tex.js";

const fmt = (v) => numTex(v, 1).replace("{,}", ",");

/** "C3H8", "c₃h₈", "H2O" → { C: 3, H: 8 } ; null when unreadable (only C, H, O). */
export function parseFormula(text) {
  const t = text.toUpperCase().replace(/\s+/g, "")
    .replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080));
  if (!/^([CHO]\d*)+$/.test(t)) return null;
  const atoms = {};
  for (const [, el, k] of t.matchAll(/([CHO])(\d*)/g)) atoms[el] = (atoms[el] ?? 0) + (k === "" ? 1 : Number(k));
  return atoms;
}

const sameAtoms = (a, b) => a && ["C", "H", "O"].every((el) => (a[el] ?? 0) === (b[el] ?? 0));

/** A number typed by a student, units and spaces ignored ("−2 042 kJ" → -2042). */
export function parseValue(text) {
  const t = text.replace(/[−–]/g, "-").replace(/\s+/g, "").replace(/kj(\/mol)?$/i, "");
  return t ? readNumber(t) : NaN;
}

/**
 * The exercise for the alkane CnH2n+2 and a combustion "complete" or "co":
 * statement, the 6 steps (fields, expected values, answer in TeX) and the result.
 */
export function energyProblem(n, kind = "complete") {
  const fuel = alkane(n);
  const eq = combustion(fuel, kind);
  const [a, o, p, w] = eq.coefs;
  const name = alkaneName(n);
  const co2 = kind === "complete";
  const cBond = co2 ? "CO2" : "CO";
  const product = ce(eq.product);
  const perMolecule = { cc: n - 1, ch: 2 * n + 2, cx: co2 ? 2 : 1, ho: 2 };
  const totals = { cc: a * (n - 1), ch: a * (2 * n + 2), oo: o, cx: p * perMolecule.cx, ho: w * 2 };
  const E = (key) => BONDS[key].E;
  const rupture = totals.cc * E("CC") + totals.ch * E("CH") + totals.oo * E("OO");
  const formation = totals.cx * E(cBond) + totals.ho * E("HO");
  const dH = rupture - formation;
  const dHPerMol = dH / a;
  const bondTex = co2 ? "\\ce{C=O}" : "\\ce{C#O}";
  const coef = (k) => (k === 1 ? "" : `${k}\\,`);

  const steps = [
    {
      id: "equation",
      title: "Équation de combustion",
      task: `Écris la formule de l'alcane et celles des produits de la combustion ${COMBUSTIONS[kind].label}.`,
      fields: [
        { key: "fuel", label: `Formule du ${name}`, placeholder: "ex. C2H6", formula: true },
        { key: "carbon", label: "Produit carboné", placeholder: "ex. CO2", formula: true },
        { key: "water", label: "Autre produit", placeholder: "ex. H2O", formula: true },
      ],
      expected: { fuel: ce(fuel), carbon: product, water: "H2O" },
      answerTex: `\\ce{${ce(fuel)} + O2 -> ${product} + H2O}`,
    },
    {
      id: "balance",
      title: "Pondération",
      task: "Pondère l'équation avec les plus petits coefficients entiers (écris 1 s'il n'y a rien).",
      fields: [
        { key: "a", label: `$\\ce{${ce(fuel)}}$` },
        { key: "o", label: "$\\ce{O2}$" },
        { key: "p", label: `$\\ce{${product}}$` },
        { key: "w", label: "$\\ce{H2O}$" },
      ],
      expected: { a, o, p, w },
      answerTex: `\\ce{${coef(a)}${ce(fuel)} + ${coef(o)}O2 -> ${coef(p)}${product} + ${coef(w)}H2O}`,
    },
    {
      id: "structures",
      title: "Représentation des composés",
      task: "Imagine les formules développées et compte les liaisons dans une seule molécule de chaque composé.",
      fields: [
        { key: "cc", label: `$\\ce{C-C}$ dans une molécule de ${name}` },
        { key: "ch", label: `$\\ce{C-H}$ dans une molécule de ${name}` },
        { key: "cx", label: `$${bondTex}$ dans une molécule de $\\ce{${product}}$` },
        { key: "ho", label: "$\\ce{H-O}$ dans une molécule de $\\ce{H2O}$" },
      ],
      expected: perMolecule,
      answerTex: `${perMolecule.cc}\\ \\ce{C-C},\\ ${perMolecule.ch}\\ \\ce{C-H}\\ ;\\ ${perMolecule.cx}\\ ${bondTex}\\ ;\\ 2\\ \\ce{H-O}`,
    },
    {
      id: "count",
      title: "Nombre de liaisons",
      task: "Compte toutes les liaisons rompues (réactifs) et formées (produits) dans l'équation pondérée.",
      fields: [
        { key: "cc", label: "$\\ce{C-C}$ rompues" },
        { key: "ch", label: "$\\ce{C-H}$ rompues" },
        { key: "oo", label: "$\\ce{O=O}$ rompues" },
        { key: "cx", label: `$${bondTex}$ formées` },
        { key: "ho", label: "$\\ce{H-O}$ formées" },
      ],
      expected: totals,
      answerTex: `\\text{rompues : } ${totals.cc}\\ \\ce{C-C},\\ ${totals.ch}\\ \\ce{C-H},\\ ${totals.oo}\\ \\ce{O=O}\\ ;\\ \\text{formées : } ${totals.cx}\\ ${bondTex},\\ ${totals.ho}\\ \\ce{H-O}`,
    },
    {
      id: "energies",
      title: "Calcul des énergies",
      task: "Multiplie chaque nombre de liaisons par son énergie et additionne.",
      fields: [
        { key: "rupture", label: "$E_\\text{rupture}$", unit: "kJ" },
        { key: "formation", label: "$E_\\text{formation}$", unit: "kJ" },
      ],
      expected: { rupture, formation },
      answerTex: `E_\\text{rupture} = ${[[totals.cc, "CC"], [totals.ch, "CH"], [totals.oo, "OO"]].filter(([k]) => k).map(([k, b]) => `${k} \\cdot ${E(b)}`).join(" + ")} = ${rupture}\\ \\text{kJ}\\ ;\\ `
        + `E_\\text{formation} = ${totals.cx} \\cdot ${E(cBond)} + ${totals.ho} \\cdot ${E("HO")} = ${formation}\\ \\text{kJ}`,
    },
    {
      id: "balance-sheet",
      title: "Bilan",
      task: `Calcule $\\Delta H$ pour l'équation pondérée, puis pour une mole de ${name}.`,
      fields: [
        { key: "dH", label: "$\\Delta H$ de l'équation", unit: "kJ" },
        { key: "dHPerMol", label: `$\\Delta H$ par mole de ${name}`, unit: "kJ/mol" },
      ],
      expected: { dH, dHPerMol },
      answerTex: `\\Delta H = ${rupture} - ${formation} = ${numTex(dH, 1)}\\ \\text{kJ}`
        + (a === 1 ? "" : `\\ ;\\ \\frac{${numTex(dH, 1)}}{${a}} = ${numTex(dHPerMol, 1)}\\ \\text{kJ/mol}`),
    },
  ];

  return {
    n, kind, name, fuel, eq, steps, rupture, formation, dH, dHPerMol,
    statement: `Calcule la quantité d'énergie libérée par la combustion ${COMBUSTIONS[kind].label} du ${name} $(\\ce{${ce(fuel)}})$.`,
    conclusion: `La combustion ${COMBUSTIONS[kind].label} d'une mole de ${name} libère ${fmt(-dHPerMol)} kJ ($\\Delta H = ${numTex(dHPerMol, 1)}\\ \\text{kJ/mol}$).`,
  };
}

/**
 * Checks the answers typed for one step ({ key: text }).
 * Returns { ok, unreadable, wrong: [keys], message }.
 */
export function checkStep(problem, stepIndex, inputs) {
  const step = problem.steps[stepIndex];
  const keys = step.fields.map((f) => f.key);
  const empty = keys.filter((k) => !(inputs[k] ?? "").trim());
  if (empty.length) return { ok: false, unreadable: true, wrong: empty, message: "Remplis toutes les cases de l'étape." };

  if (step.id === "equation") return checkEquation(problem, step, inputs);

  const values = Object.fromEntries(keys.map((k) => [k, parseValue(inputs[k])]));
  const bad = keys.filter((k) => !Number.isFinite(values[k]));
  if (bad.length) return { ok: false, unreadable: true, wrong: bad, message: "Je n'arrive pas à lire ce nombre. Écris par exemple 12, -814 ou 2042,5." };

  if (step.id === "balance") return checkBalance(problem, step, values);

  const tol = step.id === "energies" || step.id === "balance-sheet" ? 0.51 : 0;
  const wrong = keys.filter((k) => Math.abs(values[k] - step.expected[k]) > tol);
  if (!wrong.length) return { ok: true, wrong, message: "Juste !" };

  let message = "Pas tout à fait : vérifie les cases en rouge.";
  if (step.id === "count") {
    const per = problem.steps[2].expected;
    if (wrong.some((k) => k !== "oo" && values[k] === per[k] && per[k] !== step.expected[k])) {
      message = "Tu as compté pour une seule molécule : multiplie par le coefficient de la molécule dans l'équation pondérée.";
    }
  } else if (step.id === "energies") {
    if (Math.abs(values.rupture - step.expected.formation) <= tol && Math.abs(values.formation - step.expected.rupture) <= tol) {
      message = "Tu as inversé : on rompt les liaisons des réactifs et on forme celles des produits.";
    }
  } else if (step.id === "balance-sheet") {
    if (wrong.every((k) => Math.abs(values[k] + step.expected[k]) <= tol)) {
      message = "Bon nombre, mauvais signe : une combustion libère de l'énergie, donc $\\Delta H < 0$.";
    } else if (wrong.includes("dHPerMol") && Math.abs(values.dHPerMol - step.expected.dH) <= tol) {
      message = `Pour une mole, divise par le coefficient du ${problem.name} dans l'équation.`;
    }
  } else if (step.id === "structures" && wrong.includes("cc") && values.cc === problem.n) {
    message = `Une chaîne de ${problem.n} carbones a une liaison $\\ce{C-C}$ de moins que de carbones.`;
  }
  return { ok: false, wrong, message };
}

function checkEquation(problem, step, inputs) {
  const read = Object.fromEntries(step.fields.map((f) => [f.key, parseFormula(inputs[f.key])]));
  const bad = step.fields.map((f) => f.key).filter((k) => !read[k]);
  if (bad.length) return { ok: false, unreadable: true, wrong: bad, message: "Écris une formule avec C, H et O, par exemple C2H6." };
  const want = { fuel: problem.fuel, carbon: problem.eq.product, water: { H: 2, O: 1 } };
  // The two products may be given in either order.
  if (sameAtoms(read.carbon, want.water) && sameAtoms(read.water, want.carbon)) [read.carbon, read.water] = [read.water, read.carbon];
  const wrong = Object.keys(want).filter((k) => !sameAtoms(read[k], want[k]));
  if (!wrong.length) return { ok: true, wrong, message: "Juste !" };
  let message = "Pas tout à fait : vérifie les cases en rouge.";
  if (wrong.includes("fuel")) message = "Un alcane a pour formule $\\mathrm{C}_n\\mathrm{H}_{2n+2}$.";
  else if (wrong.includes("carbon")) {
    message = problem.kind === "complete"
      ? "Combustion complète : tout le carbone devient du dioxyde de carbone."
      : "Combustion incomplète (CO) : le carbone ne gagne qu'un seul oxygène.";
  }
  return { ok: false, wrong, message };
}

function checkBalance(problem, step, v) {
  const keys = ["a", "o", "p", "w"];
  const [a, o, p, w] = keys.map((k) => v[k]);
  const { fuel, product } = problem.eq;
  const left = { C: a * fuel.C, H: a * fuel.H, O: 2 * o };
  const right = { C: p, H: 2 * w, O: p * (product.O ?? 0) + w };
  const unbalanced = ["C", "H", "O"].filter((el) => Math.abs(left[el] - right[el]) > 1e-9);
  if (unbalanced.length) {
    const el = unbalanced[0];
    return {
      ok: false, wrong: keys,
      message: `Les atomes ${el === "O" ? "d'" : "de "}${el} ne sont pas équilibrés : ${fmt(left[el])} à gauche, ${fmt(right[el])} à droite.`,
    };
  }
  if (keys.some((k) => !Number.isInteger(v[k]) || v[k] <= 0)) {
    return { ok: false, wrong: keys, message: "L'équation est équilibrée, mais il faut des coefficients entiers : multiplie tout par 2." };
  }
  if (a !== step.expected.a) {
    return { ok: false, wrong: keys, message: "L'équation est équilibrée, mais simplifie : il faut les plus petits coefficients entiers." };
  }
  return { ok: true, wrong: [], message: "Juste !" };
}
