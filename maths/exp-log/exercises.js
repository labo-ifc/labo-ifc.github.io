// Exercise generator for exponential and logarithmic equations. Pure: no DOM.
//
// Every exercise is
//   { type, prompt, statement, hints[], steps[{ tex, note }], solutions[], approx, residual }
// where `statement` and `steps[].tex` are TeX, `hints` and `notes` are text with
// $…$ math (see shared/tex.js), `solutions` are numbers (empty = no solution),
// and `residual(x)` returns [lhs, rhs] so tests can check every solution.

import { fr, mul, pow, value, fracTex } from "../../shared/fraction.js";
import { numTex } from "../../shared/tex.js";
import { parse, evaluate, toTex } from "../../shared/calc.js";

// ---------- small helpers ----------

const int = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (rng, list) => list[Math.floor(rng() * list.length)];

/** "x", "2x", "-x", "3x - 2", "x + 1". */
export function linTex(p, q = 0, v = "x") {
  const head = p === 0 ? "" : p === 1 ? v : p === -1 ? `-${v}` : `${p}${v}`;
  if (q === 0) return head || "0";
  if (!head) return `${q}`;
  return `${head} ${q > 0 ? "+" : "-"} ${Math.abs(q)}`;
}

/** Signed term for sums: (" + ", 3, "2^x") → " + 3 \cdot 2^x"; coefficient 1 is dropped. */
function termTex(coef, factor, first = false) {
  const sign = coef < 0 ? (first ? "-" : " - ") : first ? "" : " + ";
  const c = Math.abs(coef);
  return sign + (factor ? (c === 1 ? factor : `${c} \\cdot ${factor}`) : `${c}`);
}

/** a^{e}, with the exponent left out when it is 1. */
const powTex = (a, e) => (e === "1" ? `${a}` : `${a}^{${e}}`);

/** 1/1000 → "0{,}001" for base 10, otherwise a fraction. */
function valueTex(v, base) {
  if (base === 10 && v.d !== 1 && v.n === 1) return numTex(value(v), 10);
  return fracTex(v);
}

const setTex = (items) => (items.length ? `S = \\{${items.join(" \\, ; \\, ")}\\}` : "S = \\emptyset");
const step = (tex, note = "") => ({ tex, note });

/** "2 \times 2 \times 2" for small positive powers, to show where 8 comes from. */
const productTex = (a, k) => Array(k).fill(a).join(" \\times ");

const SAME_BASE = "Deux puissances de même base sont égales si et seulement si leurs exposants sont égaux : $a^x = a^y \\Leftrightarrow x = y$.";

/** Why rhs = a^k, as a step note. */
function powerReason(a, k, rhsTex) {
  if (k === 0) return `car $a^0 = 1$ pour toute base $a$.`;
  if (k === 1) return `car $a^1 = a$.`;
  if (k > 1 && k <= 5) return `car $${productTex(a, k)} = ${rhsTex}$.`;
  if (k > 1) return `car $${a}^{${k}} = ${rhsTex}$.`;
  return `car $${rhsTex} = \\frac{1}{${powTex(a, String(-k))}} = ${a}^{${k}}$ (rappel : $a^{-n} = \\frac{1}{a^n}$).`;
}

// ---------- même base ----------

function genDirect(rng) {
  const a = pick(rng, [2, 3, 5, 10]);
  const [lo, hi] = { 2: [-4, 6], 3: [-3, 4], 5: [-2, 3], 10: [-5, 5] }[a];
  const k = int(rng, lo, hi);
  const rhs = pow(fr(a), k);
  const rhsTex = valueTex(rhs, a);
  const nudge =
    k < 0 ? "Un nombre entre 0 et 1 s'écrit avec un exposant négatif : $a^{-n} = \\frac{1}{a^n}$."
    : k === 0 ? "Que vaut n'importe quel nombre non nul élevé à la puissance 0 ?"
    : k === 1 ? "Le membre de droite est la base elle-même : à quelle puissance est-elle élevée ?"
    : `Multiplie $${a}$ par lui-même jusqu'à obtenir $${rhsTex}$ : combien de facteurs faut-il ?`;
  return {
    type: "direct",
    statement: `${a}^x = ${rhsTex}`,
    hints: [`Essaie d'écrire $${rhsTex}$ comme une puissance de $${a}$.`, nudge, SAME_BASE],
    steps: [
      step(`${a}^x = ${rhsTex}`, "On cherche à écrire les deux membres comme des puissances de même base."),
      step(`${a}^x = ${a}^{${k}}`, powerReason(a, k, rhsTex)),
      step(`x = ${k}`, SAME_BASE),
      step(setTex([k])),
    ],
    solutions: [k],
    residual: (x) => [a ** x, value(rhs)],
  };
}

function genRoot(rng) {
  const a = pick(rng, [2, 3, 5]);
  const q = pick(rng, [2, 3, 4]);
  const m = int(rng, 1, a === 5 ? 2 : 3);
  if (m % q === 0) return genRoot(rng);
  const inside = a ** m;
  const root = q === 2 ? `\\sqrt{${inside}}` : `\\sqrt[${q}]{${inside}}`;
  const x = fr(m, q);
  const steps = [step(`${a}^x = ${root}`, "Une racine est une puissance à exposant fractionnaire.")];
  if (m > 1) {
    steps.push(step(`${a}^x = ${q === 2 ? `\\sqrt{${a}^{${m}}}` : `\\sqrt[${q}]{${a}^{${m}}}`}`, powerReason(a, m, `${inside}`)));
  }
  steps.push(
    step(`${a}^x = ${m > 1 ? `(${a}^{${m}})` : a}^{\\frac{1}{${q}}}`, `car $\\sqrt[n]{b} = b^{1/n}$${q === 2 ? " (et $\\sqrt{b} = b^{1/2}$)" : ""}.`),
    step(`${a}^x = ${a}^{${fracTex(x)}}`, m > 1 ? "car $(a^n)^p = a^{n \\times p}$." : ""),
    step(`x = ${fracTex(x)}`, SAME_BASE),
    step(setTex([fracTex(x)])),
  );
  return {
    type: "root",
    statement: `${a}^x = ${root}`,
    hints: [
      "Une racine peut s'écrire comme une puissance : $\\sqrt[n]{b} = b^{1/n}$.",
      m > 1 ? `Écris d'abord $${inside}$ comme une puissance de $${a}$.` : `Le nombre sous la racine est déjà $${a}$ lui-même.`,
      "Puis utilise $(a^n)^p = a^{n \\times p}$ et égale les exposants.",
    ],
    steps,
    solutions: [value(x)],
    residual: (v) => [a ** v, inside ** (1 / q)],
  };
}

function genAffine(rng) {
  const a = pick(rng, [2, 3, 5]);
  const p = int(rng, 1, 3);
  const q = int(rng, -3, 3);
  if (p === 1 && q === 0) return genAffine(rng);
  const [lo, hi] = { 2: [-3, 6], 3: [-2, 4], 5: [-1, 3] }[a];
  const k = int(rng, lo, hi);
  const rhs = pow(fr(a), k);
  const rhsTex = fracTex(rhs);
  const lin = linTex(p, q);
  const x = fr(k - q, p);
  const steps = [
    step(`${a}^{${lin}} = ${rhsTex}`, "Le membre de droite est une puissance de la même base."),
    step(`${a}^{${lin}} = ${a}^{${k}}`, powerReason(a, k, rhsTex)),
    step(`${lin} = ${k}`, SAME_BASE),
  ];
  if (q !== 0) steps.push(step(`${linTex(p)} = ${k - q}`, `On isole $x$ : ${q > 0 ? "on soustrait" : "on ajoute"} $${Math.abs(q)}$ des deux côtés.`));
  if (p !== 1) steps.push(step(`x = ${fracTex(x)}`, `On divise par $${p}$.`));
  steps.push(step(setTex([fracTex(x)])));
  return {
    type: "affine",
    statement: `${a}^{${lin}} = ${rhsTex}`,
    hints: [
      `Écris $${rhsTex}$ comme une puissance de $${a}$.`,
      "Égale les exposants : il reste une équation du premier degré.",
      "Isole $x$ comme dans n'importe quelle équation du premier degré.",
    ],
    steps,
    solutions: [value(x)],
    residual: (v) => [a ** (p * v + q), value(rhs)],
  };
}

// ---------- changer de base ----------

const POWER_BASES = { 2: [2, 3, 4], 3: [2, 3], 5: [2, 3] };

function genTransform(rng) {
  const c = pick(rng, [2, 3, 5]);
  const i = pick(rng, POWER_BASES[c]);
  const b = c ** i;
  const k = pick(rng, [1, 1, 2]);
  const [lo, hi] = { 2: [-3, 6], 3: [-2, 4], 5: [-2, 3] }[c];
  const j = int(rng, lo, hi);
  if (j === 0) return genTransform(rng);
  const rhs = pow(fr(c), j);
  const rhsTex = fracTex(rhs);
  const kx = linTex(k);
  const x = fr(j, i * k);
  return {
    type: "transform",
    statement: `${b}^{${kx}} = ${rhsTex}`,
    hints: [
      `$${b}$ et $${rhsTex}$ sont-ils des puissances d'un même nombre ?`,
      `Essaie la base $${c}$ : $${b} = ${c}^{${i}}$.`,
      "Utilise $(a^n)^p = a^{n \\times p}$, puis égale les exposants.",
    ],
    steps: [
      step(`${b}^{${kx}} = ${rhsTex}`, `Les bases sont différentes, mais toutes deux sont des puissances de $${c}$.`),
      step(`(${c}^{${i}})^{${kx}} = ${c}^{${j}}`, `car $${b} = ${c}^{${i}}$ et $${rhsTex} = ${c}^{${j}}$.`),
      step(`${c}^{${linTex(i * k)}} = ${c}^{${j}}`, "car $(a^n)^p = a^{n \\times p}$."),
      step(`${linTex(i * k)} = ${j}`, SAME_BASE),
      step(`x = ${fracTex(x)}`, `On divise par $${i * k}$.`),
      step(setTex([fracTex(x)])),
    ],
    solutions: [value(x)],
    residual: (v) => [b ** (k * v), value(rhs)],
  };
}

function genTwoBases(rng) {
  const c = pick(rng, [2, 3]);
  const [i, j] = pick(rng, c === 2 ? [[1, 2], [1, 3], [2, 3], [3, 2], [2, 1]] : [[1, 2], [2, 1], [1, 3]]);
  const p1 = int(rng, 1, 2), q1 = int(rng, -3, 3);
  const p2 = int(rng, 1, 2), q2 = int(rng, -3, 3);
  const coef = i * p1 - j * p2;
  if (coef === 0) return genTwoBases(rng);
  const x = fr(j * q2 - i * q1, coef);
  const b1 = c ** i, b2 = c ** j;
  const lin1 = linTex(p1, q1), lin2 = linTex(p2, q2);
  const wrap = (e, lin) => (e === 1 ? `${c}^{${lin}}` : `(${c}^{${e}})^{${lin}}`);
  return {
    type: "twoBases",
    statement: `${b1}^{${lin1}} = ${b2}^{${lin2}}`,
    hints: [
      `Écris $${b1}$ et $${b2}$ comme des puissances d'un même nombre.`,
      `Les deux sont des puissances de $${c}$.`,
      "Distribue l'exposant ($(a^n)^p = a^{np}$), égale les exposants et résous l'équation du premier degré.",
    ],
    steps: [
      step(`${b1}^{${lin1}} = ${b2}^{${lin2}}`, `Les deux bases sont des puissances de $${c}$.`),
      step(`${wrap(i, lin1)} = ${wrap(j, lin2)}`, `car ${[[b1, i], [b2, j]].filter(([, e]) => e > 1).map(([b, e]) => `$${b} = ${c}^{${e}}$`).join(" et ")}.`),
      step(`${c}^{${linTex(i * p1, i * q1)}} = ${c}^{${linTex(j * p2, j * q2)}}`, "car $(a^n)^p = a^{n \\times p}$ : on distribue l'exposant."),
      step(`${linTex(i * p1, i * q1)} = ${linTex(j * p2, j * q2)}`, SAME_BASE),
      step(`${linTex(coef)} = ${j * q2 - i * q1}`, "On regroupe les termes en $x$ d'un côté, les nombres de l'autre."),
      step(`x = ${fracTex(x)}`, coef === 1 ? "" : `On divise par $${coef}$.`),
      step(setTex([fracTex(x)])),
    ],
    solutions: [value(x)],
    residual: (v) => [b1 ** (p1 * v + q1), b2 ** (p2 * v + q2)],
  };
}

function genFractionBase(rng) {
  const [p, q] = pick(rng, [[2, 3], [3, 2], [1, 2], [2, 5], [3, 4], [4, 3], [1, 3], [5, 2]]);
  const k = pick(rng, [-3, -2, -1, 2, 3]);
  const base = fr(p, q);
  const baseTex = `\\left(\\frac{${p}}{${q}}\\right)`;
  const rhs = pow(base, k);
  const rhsTex = fracTex(rhs);
  const reason = k < 0
    ? `car $${rhsTex} = \\left(\\frac{${q}}{${p}}\\right)^{${-k}}$ et $\\left(\\frac{a}{b}\\right)^{-n} = \\left(\\frac{b}{a}\\right)^{n}$.`
    : `car $\\left(\\frac{a}{b}\\right)^n = \\frac{a^n}{b^n}$ : $\\frac{${p}^{${k}}}{${q}^{${k}}} = ${rhsTex}$.`;
  return {
    type: "fractionBase",
    statement: `${baseTex}^x = ${rhsTex}`,
    hints: [
      `Compare $${rhsTex}$ à la base $\\frac{${p}}{${q}}$ : est-ce une puissance de $\\frac{${p}}{${q}}$, ou de son inverse $\\frac{${q}}{${p}}$ ?`,
      "Rappel : $\\left(\\frac{a}{b}\\right)^n = \\frac{a^n}{b^n}$ et $\\left(\\frac{a}{b}\\right)^{-1} = \\frac{b}{a}$.",
      SAME_BASE,
    ],
    steps: [
      step(`${baseTex}^x = ${rhsTex}`, "On cherche à écrire le membre de droite avec la même base."),
      step(`${baseTex}^x = ${baseTex}^{${k}}`, reason),
      step(`x = ${k}`, SAME_BASE),
      step(setTex([k])),
    ],
    solutions: [k],
    residual: (v) => [value(base) ** v, value(rhs)],
  };
}

function genFactor(rng) {
  const a = pick(rng, [2, 3]);
  let u = int(rng, 0, 3), v = int(rng, 0, 3);
  if (u === v) return genFactor(rng);
  const minus = rng() < 0.35;
  if (minus && u < v) [u, v] = [v, u]; // a^(x+u) − a^(x+v) with u > v keeps the factor positive
  const C = minus ? a ** u - a ** v : a ** u + a ** v;
  const x0 = int(rng, -2, 2);
  const ax0 = pow(fr(a), x0);
  const R = mul(ax0, C);
  const moved = !minus && rng() < 0.4; // PDF style: a^(x+u) = R − a^(x+v)
  const e = (s) => (s === 0 ? "x" : `x + ${s}`);
  const t1 = `${a}^{${e(u)}}`, t2 = `${a}^{${e(v)}}`;
  const op = minus ? "-" : "+";
  const lhs = `${t1} ${op} ${t2}`;
  const statement = moved ? `${t1} = ${fracTex(R)} - ${t2}` : `${lhs} = ${fracTex(R)}`;
  const split = (s) => (s === 0 ? `${a}^x` : `${a}^x \\cdot ${a}^{${s}}`);
  const pw = (s) => (s === 0 ? "1" : `${a}^{${s}}`);
  const steps = [step(statement, "Tous les termes contiennent la même exponentielle $a^x$.")];
  if (moved) steps.push(step(`${lhs} = ${fracTex(R)}`, "On regroupe les termes en $x$ dans le membre de gauche."));
  steps.push(
    step(`${split(u)} ${op} ${split(v)} = ${fracTex(R)}`, "car $a^{x+n} = a^x \\cdot a^n$."),
    step(`${a}^x\\,(${pw(u)} ${op} ${pw(v)}) = ${fracTex(R)}`, `On met $${a}^x$ en évidence.`),
    step(`${a}^x \\cdot ${C} = ${fracTex(R)}`, `car $${pw(u)} ${op} ${pw(v)} = ${C}$.`),
    step(`${a}^x = ${fracTex(ax0)}`, `On divise les deux membres par $${C}$.`),
    step(`${a}^x = ${a}^{${x0}}`, powerReason(a, x0, fracTex(ax0))),
    step(`x = ${x0}`, SAME_BASE),
    step(setTex([x0])),
  );
  return {
    type: "factor",
    statement,
    hints: [
      `Utilise $a^{x+n} = a^x \\cdot a^n$ pour faire apparaître $${a}^x$ dans chaque terme.`,
      `Mets $${a}^x$ en évidence.`,
      "Il reste une équation du type $a^x = \\text{nombre}$.",
    ],
    steps,
    solutions: [x0],
    residual: (x) => [a ** (x + u) + (minus ? -1 : 1) * a ** (x + v), value(R)],
  };
}

// ---------- second degré (Y = a^x) ----------

function genQuadratic(rng) {
  const a = pick(rng, [2, 3, 5]);
  const powers = { 2: [0, 1, 2, 3, 4], 3: [0, 1, 2, 3], 5: [0, 1, 2] }[a];
  const r = rng();
  let k1 = pick(rng, powers), k2 = null, Y2;
  if (r < 0.1) Y2 = a ** k1; // double root
  else if (r < 0.4) Y2 = -pick(rng, [1, 2, 3, 4, 6]); // one root gives no solution
  else {
    k2 = pick(rng, powers);
    if (k2 === k1) return genQuadratic(rng);
    Y2 = a ** k2;
  }
  if (r < 0.1) k2 = k1;
  const Y1 = a ** k1;
  const B = -(Y1 + Y2), Cst = Y1 * Y2;
  const D = B * B - 4 * Cst;
  const asSquare = rng() < 0.5; // 4^x instead of 2^{2x}
  const sq = asSquare ? `${a * a}^x` : `${a}^{2x}`;
  const moveConst = rng() < 0.35;
  const left = sq + (B ? termTex(B, `${a}^x`) : "");
  const statement = moveConst ? `${left} = ${-Cst}` : `${left}${termTex(Cst, "")} = 0`;
  const zeroForm = `${left}${termTex(Cst, "")} = 0`;

  const steps = [step(statement, "Les exposants sont $2x$ et $x$ : l'équation cache une équation du second degré.")];
  if (moveConst) steps.push(step(zeroForm, "On ramène tout dans le membre de gauche."));
  steps.push(
    step(`(${a}^x)^2${B ? termTex(B, `${a}^x`) : ""}${termTex(Cst, "")} = 0`,
      asSquare ? `car $${a * a}^x = (${a}^2)^x = (${a}^x)^2$.` : `car $${a}^{2x} = (${a}^x)^2$.`),
    step(`Y^2${B ? termTex(B, "Y") : ""}${termTex(Cst, "")} = 0`, `On pose $Y = ${a}^x$ (avec $Y > 0$, car une exponentielle est toujours positive).`),
    step(`\\Delta = (${B})^2 - 4 \\cdot 1 \\cdot (${Cst}) = ${D}`, "On calcule le discriminant."),
  );
  const roots = D === 0 ? [Y1] : [Y1, Y2].sort((p, q) => q - p);
  steps.push(D === 0
    ? step(`Y = \\frac{${-B}}{2} = ${Y1}`, "$\\Delta = 0$ : une seule racine.")
    : step(`Y = \\frac{${-B} \\pm ${Math.sqrt(D)}}{2} \\;\\Rightarrow\\; Y_1 = ${roots[0]}, \\; Y_2 = ${roots[1]}`, "$\\Delta > 0$ : deux racines."));

  const solutions = [];
  for (const Y of roots) {
    if (Y < 0) {
      steps.push(step(`${a}^x = ${Y}`, "Impossible : une exponentielle est toujours strictement positive. Pas de solution ici."));
    } else {
      const k = Math.round(Math.log(Y) / Math.log(a));
      steps.push(step(`${a}^x = ${Y} = ${a}^{${k}} \\;\\Rightarrow\\; x = ${k}`, `On revient à $Y = ${a}^x$ : $${Y} = ${a}^{${k}}$.`));
      solutions.push(k);
    }
  }
  solutions.sort((p, q) => p - q);
  steps.push(step(setTex(solutions)));
  return {
    type: "quadratic",
    statement,
    hints: [
      `Remarque que ${asSquare ? `$${a * a}^x = (${a}^x)^2$` : `$${a}^{2x} = (${a}^x)^2$`} : c'est une équation du second degré déguisée.`,
      `Pose $Y = ${a}^x$ et résous l'équation en $Y$ avec $\\Delta$.`,
      "Attention : $a^x > 0$, donc une valeur négative de $Y$ ne donne aucune solution.",
    ],
    steps,
    solutions,
    residual: (x) => [a ** (2 * x) + B * a ** x + Cst, 0],
  };
}

// ---------- logarithmes ----------

const logTex = (a) => (a === 10 ? "\\log" : a === "e" ? "\\ln" : `\\log_{${a}}`);
/** log² x is written \log^2 x (base 10) or \log_2^2 x. */
const logPowTex = (a, n) => (n === 1 ? logTex(a) : a === 10 ? `\\log^{${n}}` : a === "e" ? `\\ln^{${n}}` : `\\log_{${a}}^{${n}}`);

/** x^2 + Bx + C, terms with a zero coefficient left out. */
const quadTex = (B, C, v = "x") => `${v}^2${B ? monoTex(B, v) : ""}${C ? monoTex(C, "") : ""}`;

/** Δ and the two roots of v² + Bv + C = 0, for integer roots r1 > r2. */
function deltaSteps(B, C, r1, r2, v = "x") {
  const D = B * B - 4 * C;
  return [
    step(`\\Delta = (${B})^2 - 4 \\cdot 1 \\cdot (${C}) = ${D}`, "On calcule le discriminant."),
    step(`${v} = \\frac{${-B} \\pm ${Math.sqrt(D)}}{2} \\;\\Rightarrow\\; ${v}_1 = ${r1}, \\; ${v}_2 = ${r2}`, "$\\Delta > 0$ : deux racines."),
  ];
}

const CE_NOTE = "Un logarithme n'existe que pour un nombre strictement positif : on commence toujours par les conditions d'existence (C.E.).";

function genLogEval(rng) {
  const a = pick(rng, [2, 3, 5, 10]);
  const [lo, hi] = { 2: [-3, 6], 3: [-2, 4], 5: [-2, 3], 10: [-3, 4] }[a];
  const k = int(rng, lo, hi);
  const N = pow(fr(a), k);
  const NTex = valueTex(N, a);
  const arg = NTex.includes("frac") ? `\\left(${NTex}\\right)` : NTex;
  return {
    type: "logEval",
    prompt: "Calcule",
    statement: `${logTex(a)} ${arg}`,
    hints: [
      `Par définition, $${logTex(a)} N$ est l'exposant qu'il faut donner à $${a}$ pour obtenir $N$.`,
      `Cherche $y$ tel que $${a}^y = ${NTex}$.`,
      k < 0 ? "Un nombre entre 0 et 1 correspond à un exposant négatif." : `Écris $${NTex}$ comme une puissance de $${a}$.`,
    ],
    steps: [
      step(`${logTex(a)} ${arg} = y \\;\\Leftrightarrow\\; ${a}^y = ${NTex}`, `Définition : $\\log_a N = y \\Leftrightarrow a^y = N$${a === 10 ? " (et $\\log$ sans indice signifie $\\log_{10}$)" : ""}.`),
      step(`${a}^y = ${a}^{${k}}`, powerReason(a, k, NTex)),
      step(`y = ${k}`, SAME_BASE),
      step(`${logTex(a)} ${arg} = ${k}`),
    ],
    solutions: [k],
    residual: (y) => [a ** y, value(N)],
  };
}

function genLogSolve(rng) {
  const a = pick(rng, [2, 3, 5]);
  const c = int(rng, 2, 40);
  // A power of a would be a "même base" exercise, not a logarithm one.
  for (let p = a; p <= c; p *= a) if (p === c) return genLogSolve(rng);
  const sol = Math.log(c) / Math.log(a);
  return {
    type: "logSolve",
    statement: `${a}^x = ${c}`,
    hints: [
      `$${c}$ n'est pas une puissance entière de $${a}$ : la méthode « même base » ne suffit plus.`,
      "Applique le logarithme ($\\ln$ ou $\\log$) aux deux membres.",
      "Rappel : $\\ln(a^x) = x \\ln a$. Donne la réponse arrondie au centième.",
    ],
    steps: [
      step(`${a}^x = ${c}`, `$${c}$ n'est pas une puissance de $${a}$ : on utilise le logarithme.`),
      step(`\\ln(${a}^x) = \\ln ${c}`, "On applique $\\ln$ aux deux membres (ils sont strictement positifs)."),
      step(`x \\ln ${a} = \\ln ${c}`, "car $\\ln(a^x) = x \\ln a$."),
      step(`x = \\frac{\\ln ${c}}{\\ln ${a}}`, `On divise par $\\ln ${a}$ (non nul car $${a} \\neq 1$).`),
      step(`x \\approx ${numTex(sol, 2)}`, "À la calculatrice."),
      step(`S = \\left\\{\\frac{\\ln ${c}}{\\ln ${a}}\\right\\}`),
    ],
    solutions: [sol],
    approx: true,
    residual: (x) => [a ** x, c],
  };
}

function genLogEq(rng) {
  const a = pick(rng, [2, 3, 10]);
  const k = int(rng, 0, a === 10 ? 2 : 3);
  const p = int(rng, 1, 3);
  const q = int(rng, -5, 5);
  const lin = linTex(p, q);
  const ak = a ** k;
  const x = fr(ak - q, p);
  const bound = fr(-q, p);
  const steps = [
    step(`${logTex(a)}(${lin}) = ${k}`, "Un logarithme n'existe que pour un nombre strictement positif."),
    step(`\\text{C.E. : } ${lin} > 0 \\;\\Leftrightarrow\\; x > ${fracTex(bound)}`, "Condition d'existence."),
    step(`${lin} = ${a}^{${k}} = ${ak}`, `Définition : $\\log_a A = k \\Leftrightarrow A = a^k$.`),
  ];
  if (q !== 0) steps.push(step(`${linTex(p)} = ${ak - q}`, `On ${q > 0 ? "soustrait" : "ajoute"} $${Math.abs(q)}$ des deux côtés.`));
  if (p !== 1) steps.push(step(`x = ${fracTex(x)}`, `On divise par $${p}$.`));
  steps.push(
    step(`${fracTex(x)} > ${fracTex(bound)} \\;\\checkmark`, "La solution respecte la condition d'existence."),
    step(setTex([fracTex(x)])),
  );
  return {
    type: "logEq",
    statement: `${logTex(a)}(${lin}) = ${k}`,
    hints: [
      `Commence par la condition d'existence : $${lin} > 0$.`,
      lin === "x"
        ? "Par définition, $\\log_a A = k \\Leftrightarrow A = a^k$ : réécris l'équation sans logarithme."
        : `Par définition, $\\log_a A = k \\Leftrightarrow A = a^k$ : ici $${lin} = ${a}^{${k}}$.`,
      "Résous l'équation du premier degré, puis vérifie la condition d'existence.",
    ],
    steps,
    solutions: [value(x)],
    residual: (v) => [Math.log(p * v + q) / Math.log(a), k],
  };
}

/** C.E., then the rules of logarithms, then a second-degree equation with one root outside the domain. */
function genLogEqRules(rng) {
  return rng() < 0.5 ? logSumEq(rng) : logDoubleEq(rng);
}

// log_a(x + p) + log_a(x + q) = k. Built from a^k = u·v (u < v) and the solution x0;
// the other root x1 = -(p + q) - x0 gives x1 + p = -v < 0, so the C.E. always rejects it.
function logSumEq(rng) {
  const a = pick(rng, [2, 3, 10]);
  const k = int(rng, ...{ 2: [3, 5], 3: [2, 3], 10: [1, 2] }[a]);
  const N = a ** k;
  const pairs = [];
  for (let u = 1; u * u < N; u++) if (N % u === 0) pairs.push([u, N / u]);
  const [u, v] = pick(rng, pairs);
  const x0 = int(rng, -3, 5);
  const p = u - x0, q = v - x0;
  const x1 = -(p + q) - x0;
  const L = logTex(a);
  const A = linTex(1, p), B = linTex(1, q);
  const statement = `${L}(${A}) + ${L}(${B}) = ${k}`;
  const C0 = p * q;
  const steps = [
    step(statement, CE_NOTE),
    step(`\\text{C.E. : } ${A} > 0 \\text{ et } ${B} > 0 \\;\\Leftrightarrow\\; x > ${-p}`,
      `Les deux arguments doivent être positifs : on garde la condition la plus forte. Domaine : $]${-p} \\,;\\, +\\infty[$.`),
    step(`${L}\\big[(${A})(${B})\\big] = ${k}`, "car $\\log_a x + \\log_a y = \\log_a (x \\cdot y)$."),
    step(`${L}\\big[(${A})(${B})\\big] = ${L} ${a}^{${k}}`, `On écrit le nombre comme un logarithme de même base : $${k} = ${L} ${a}^{${k}}$.`),
    step(`(${A})(${B}) = ${N}`, "$\\log_a A = \\log_a B \\Leftrightarrow A = B$ : on enlève les logarithmes."),
    step(`${quadTex(p + q, C0)} = ${N}`, "On développe."),
    step(`${quadTex(p + q, C0 - N)} = 0`, "On ramène tout dans le membre de gauche."),
    ...deltaSteps(p + q, C0 - N, x0, x1),
    step(`x_1 = ${x0} > ${-p} \\;\\checkmark \\qquad x_2 = ${x1} \\leq ${-p} \\;\\text{: rejetée}`,
      `On vérifie les C.E. : avec $x = ${x1}$, $${A}$ vaudrait $${x1 + p}$, et le logarithme d'un nombre négatif n'existe pas.`),
    step(setTex([x0])),
  ];
  return {
    type: "logEqRules",
    statement,
    hints: [
      `Commence par les conditions d'existence : $${A} > 0$ et $${B} > 0$.`,
      `Regroupe les deux logarithmes avec $\\log_a x + \\log_a y = \\log_a (x \\cdot y)$, puis écris $${k} = ${L} ${a}^{${k}}$.`,
      "Développe, résous l'équation du second degré, puis rejette la solution qui ne respecte pas les C.E.",
    ],
    steps,
    solutions: [x0],
    residual: (x) => [(Math.log(x + p) + Math.log(x + q)) / Math.log(a), k],
  };
}

// 2 log x = log(bx + c): x² = bx + c with roots x0 > 0 and x1 < 0; x1 breaks the C.E. x > 0.
function logDoubleEq(rng) {
  const a = pick(rng, [2, 3, 10, "e"]);
  const x0 = int(rng, 1, 6), x1 = -int(rng, 1, 5);
  const b = x0 + x1, c = -x0 * x1;
  if (b === 0) return logDoubleEq(rng);
  const L = logTex(a);
  const lin = linTex(b, c);
  const statement = `2 ${L} x = ${L}(${lin})`;
  const ce = b > 0
    ? step(`\\text{C.E. : } x > 0 \\text{ et } ${lin} > 0 \\;\\Leftrightarrow\\; x > 0`,
      `$${lin} > 0 \\Leftrightarrow x > ${fracTex(fr(-c, b))}$ : la condition $x > 0$ est la plus forte.`)
    : step(`\\text{C.E. : } x > 0 \\text{ et } ${lin} > 0 \\;\\Leftrightarrow\\; 0 < x < ${fracTex(fr(c, -b))}`,
      `$${lin} > 0 \\Leftrightarrow x < ${fracTex(fr(c, -b))}$ : les deux conditions ensemble.`);
  const steps = [
    step(statement, CE_NOTE),
    ce,
    step(`${L}(x^2) = ${L}(${lin})`, "car $r \\log_a x = \\log_a x^r$."),
    step(`x^2 = ${lin}`, "$\\log_a A = \\log_a B \\Leftrightarrow A = B$ : on enlève les logarithmes."),
    step(`${quadTex(-b, -c)} = 0`, "On ramène tout dans le membre de gauche."),
    ...deltaSteps(-b, -c, x0, x1),
    step(`x_1 = ${x0} \\;\\checkmark \\qquad x_2 = ${x1} \\;\\text{: rejetée}`,
      `On vérifie les C.E. : $${x1} < 0$ et $${L} x$ n'existe pas pour $x \\leq 0$.`),
    step(setTex([x0])),
  ];
  return {
    type: "logEqRules",
    statement,
    hints: [
      `Commence par les conditions d'existence : $x > 0$ et $${lin} > 0$.`,
      `Utilise $r \\log_a x = \\log_a x^r$ pour écrire $2 ${L} x = ${L}(x^2)$.`,
      "Deux logarithmes de même base sont égaux si leurs arguments le sont. Résous, puis rejette la solution hors des C.E.",
    ],
    steps,
    solutions: [x0],
    residual: (x) => [2 * Math.log(x), Math.log(b * x + c)],
  };
}

/** log² x + B log x + C = 0 (Y = log x), or log⁴ x + B log² x + C = 0 (Y = log² x). */
function genLogQuadratic(rng) {
  const a = pick(rng, [2, 3, 10]);
  const square = rng() < 0.3;
  let Y1, Y2;
  if (square) {
    [Y1, Y2] = [pick(rng, [1, 4, 9]), pick(rng, [1, 4, 9])];
  } else {
    const [lo, hi] = { 2: [-3, 4], 3: [-2, 3], 10: [-2, 3] }[a];
    [Y1, Y2] = [int(rng, lo, hi), int(rng, lo, hi)];
  }
  if (Y1 === Y2) return genLogQuadratic(rng);
  if (Y1 < Y2) [Y1, Y2] = [Y2, Y1];
  const B = -(Y1 + Y2), C = Y1 * Y2;
  const [hi, lo] = square ? [4, 2] : [2, 1];
  const statement = `${logPowTex(a, hi)} x${B ? termTex(B, `${logPowTex(a, lo)} x`).replace(" \\cdot", "") : ""}${C ? termTex(C, "") : ""} = 0`;
  const Lx = `${logTex(a)} x`;
  const Ytex = `${logPowTex(a, lo)} x`;
  const xTex = (k) => valueTex(pow(fr(a), k), a);
  const steps = [
    step(statement, `${CE_NOTE} Notation : $${logPowTex(a, 2)} x = (${Lx})^2$, à ne pas confondre avec $${logTex(a)} x^2$.`),
    step(`\\text{C.E. : } x > 0`, "Domaine : $]0 \\,;\\, +\\infty[$."),
    step(`${quadTex(B, C, "Y")} = 0`, `On pose $Y = ${Ytex}$ : l'équation devient du second degré.`),
    ...deltaSteps(B, C, Y1, Y2, "Y"),
  ];
  const ks = [];
  for (const Y of [Y1, Y2]) {
    if (square) {
      const m = Math.sqrt(Y);
      steps.push(step(`${Ytex} = ${Y} \\;\\Leftrightarrow\\; ${Lx} = ${m} \\text{ ou } ${Lx} = -${m} \\;\\Leftrightarrow\\; x = ${xTex(m)} \\text{ ou } x = ${xTex(-m)}`,
        `On revient à $Y = ${Ytex}$, puis $${logTex(a)} x = y \\Leftrightarrow x = ${a}^y$.`));
      ks.push(m, -m);
    } else {
      steps.push(step(`${Lx} = ${Y} \\;\\Leftrightarrow\\; x = ${a}^{${Y}} = ${xTex(Y)}`,
        `On revient à $Y = ${Lx}$ : $\\log_a x = y \\Leftrightarrow x = a^y$.`));
      ks.push(Y);
    }
  }
  ks.sort((p, q) => p - q);
  steps.push(
    step(`x > 0 \\;\\checkmark`, "Une puissance de la base est toujours strictement positive : toutes les solutions respectent les C.E."),
    step(setTex(ks.map(xTex))),
  );
  return {
    type: "logQuadratic",
    statement,
    hints: [
      `Condition d'existence : $x > 0$. Puis remarque que $${logPowTex(a, hi)} x = (${Ytex})^2$.`,
      `Pose $Y = ${Ytex}$ et résous l'équation en $Y$ avec $\\Delta$.`,
      `Reviens à $x$ : $${Lx} = y \\Leftrightarrow x = ${a}^y$.${square ? " Attention, $Y$ est un carré : deux valeurs de $\\log x$ pour chaque $Y$." : ""}`,
    ],
    steps,
    solutions: ks.map((k) => value(pow(fr(a), k))),
    residual: (x) => {
      const l = Math.log(x) / Math.log(a);
      return [l ** hi + B * l ** lo + C, 0];
    },
  };
}

// ---------- outils pour e, ln et polynômes ----------

const paren = (n) => (n < 0 ? `(${n})` : `${n}`);

/** Coefficient written against its factor: (3, "Y^2") → "3Y^2", (−1, "e^x") → "- e^x"; factor "" = constant. */
function monoTex(coef, factor, first = false) {
  const sign = coef < 0 ? (first ? "-" : " - ") : first ? "" : " + ";
  const c = Math.abs(coef);
  return sign + (factor ? (c === 1 ? factor : `${c}${factor}`) : `${c}`);
}

/** Polynomial from its coefficients (highest degree first); `power(k)` is the factor of degree k ≥ 1. */
function polyTex(coefs, power) {
  const n = coefs.length - 1;
  let out = "";
  coefs.forEach((c, i) => {
    if (c) out += monoTex(c, n - i === 0 ? "" : power(n - i), out === "");
  });
  return out || "0";
}

const yPow = (v = "Y") => (k) => (k === 1 ? v : `${v}^${k}`);
const ePow = (k) => (k === 1 ? "e^x" : `e^{${k}x}`);

/** Product (v − r1)(v − r2)… expanded, highest degree first. */
function expand(roots, lead = 1) {
  let p = [lead];
  for (const r of roots) p = [...p, 0].map((c, i) => c - (i ? r * p[i - 1] : 0));
  return p;
}

/** Δ for A·v² + B·v + C = 0 (A > 0, Δ a perfect square when ≥ 0): steps and roots (fractions, largest first). */
function solveQuad(A, B, C, v = "Y") {
  const D = B * B - 4 * A * C;
  const steps = [step(`\\Delta = ${paren(B)}^2 - 4 \\cdot ${A} \\cdot ${paren(C)} = ${D}`, "On calcule le discriminant.")];
  if (D < 0) {
    steps.push(step(`\\Delta = ${D} < 0`, "Pas de racine réelle."));
    return { steps, roots: [] };
  }
  const s = Math.round(Math.sqrt(D));
  if (D === 0) {
    const r = fr(-B, 2 * A);
    steps.push(step(`${v} = \\frac{${-B}}{${2 * A}} = ${fracTex(r)}`, "$\\Delta = 0$ : une seule racine."));
    return { steps, roots: [r] };
  }
  const r1 = fr(-B + s, 2 * A), r2 = fr(-B - s, 2 * A);
  steps.push(step(`${v} = \\frac{${-B} \\pm ${s}}{${2 * A}} \\;\\Rightarrow\\; ${v}_1 = ${fracTex(r1)}, \\; ${v}_2 = ${fracTex(r2)}`, "$\\Delta > 0$ : deux racines."));
  return { steps, roots: [r1, r2] };
}

/** Horner's table dividing a polynomial (highest degree first) by (v − r): TeX table and quotient. */
function horner(coefs, r) {
  const q = [coefs[0]];
  for (let i = 1; i < coefs.length; i++) q.push(coefs[i] + r * q[i - 1]);
  const mid = q.slice(0, -1).map((c) => r * c);
  const tex = `\\begin{array}{c|${"c".repeat(coefs.length)}} & ${coefs.join(" & ")} \\\\ ${r} & & ${mid.join(" & ")} \\\\ \\hline & ${q.join(" & ")} \\end{array}`;
  return { tex, quotient: q.slice(0, -1) };
}

/** ln Y for a positive fraction Y: 0, \ln 3, \ln \frac{9}{2}. */
const lnTex = (Y) => (Y.n === Y.d ? "0" : `\\ln ${fracTex(Y)}`);

const baseValue = (a) => (a === "e" ? Math.E : a);

/** a^Y written simply: 1, e, e^{-1}, 100, 0{,}01, 2^{\frac{5}{3}}, e^{-\frac{1}{3}}. */
function powA(a, Y) {
  if (Y.n === 0) return "1";
  if (Y.d === 1 && a !== "e") return valueTex(pow(fr(a), Y.n), a);
  if (Y.d === 1 && Y.n === 1) return "e";
  return `${a}^{${fracTex(Y)}}`;
}

const sortNum = (list) => [...list].sort((p, q) => p - q);
const uniqFr = (list) => list.filter((r, i) => list.findIndex((s) => s.n === r.n && s.d === r.d) === i);

const EXP_POSITIVE = "Impossible : une exponentielle est toujours strictement positive. Pas de solution ici.";

// ---------- exponentielles avec e et ln ----------

/** "1 - 3x" (as in the course) rather than "-3x + 1". */
const expoTex = (p, q) => (p < 0 && q > 0 ? `${q} - ${p === -1 ? "" : -p}x` : linTex(p, q));

/** m·e^{px+q} + c = d: isolate the exponential, then apply ln. */
function genExpIsolate(rng) {
  const m = pick(rng, [2, 3, 4, 5, 6, 12]);
  const R = pick(rng, [2, 3, 4, 5, 6, 7, 10]);
  const c = int(rng, -9, 9);
  const p = pick(rng, [-3, -2, -1, 1, 2, 3]);
  const q = int(rng, -3, 3);
  const d = m * R + c;
  const e = expoTex(p, q);
  const statement = `${m} \\cdot e^{${e}}${c ? termTex(c, "") : ""} = ${d}`;
  const sol = (Math.log(R) - q) / p;
  // x = (ln R − q) / p, written with a positive denominator.
  const num = p > 0
    ? (q === 0 ? `\\ln ${R}` : `\\ln ${R} ${q > 0 ? "-" : "+"} ${Math.abs(q)}`)
    : (q === 0 ? `-\\ln ${R}` : `${q} - \\ln ${R}`);
  const exact = Math.abs(p) === 1 ? num : `\\frac{${num}}{${Math.abs(p)}}`;
  const steps = [step(statement, "On ne peut pas écrire les deux membres avec la même base : on isole l'exponentielle, puis on applique $\\ln$.")];
  if (c) steps.push(step(`${m} \\cdot e^{${e}} = ${m * R}`, `On ${c > 0 ? "soustrait" : "ajoute"} $${Math.abs(c)}$ des deux côtés.`));
  steps.push(
    step(`e^{${e}} = ${R}`, `On divise par $${m}$ : l'exponentielle est isolée.`),
    step(`\\ln e^{${e}} = \\ln ${R}`, "On applique $\\ln$ aux deux membres (ils sont strictement positifs)."),
    step(`${e} = \\ln ${R}`, "car $\\ln e^y = y$."),
  );
  if (q) steps.push(step(`${linTex(p)} = \\ln ${R} ${q > 0 ? "-" : "+"} ${Math.abs(q)}`, `On ${q > 0 ? "soustrait" : "ajoute"} $${Math.abs(q)}$ des deux côtés.`));
  if (p !== 1) steps.push(step(`x = ${exact}`, `On divise par $${p}$.`));
  steps.push(step(`x \\approx ${numTex(sol, 4)}`, "À la calculatrice."), step(`S = \\left\\{${exact}\\right\\}`));
  return {
    type: "expIsolate",
    statement,
    hints: [
      `Isole d'abord $e^{${e}}$ : ${c ? `${c > 0 ? "soustrais" : "ajoute"} $${Math.abs(c)}$, puis ` : ""}divise par $${m}$.`,
      "Applique $\\ln$ aux deux membres : $\\ln e^y = y$.",
      "Il reste une équation du premier degré. Donne la valeur exacte (avec $\\ln$) ou arrondie au centième.",
    ],
    steps,
    solutions: [sol],
    approx: true,
    residual: (x) => [m * Math.exp(p * x + q) + c, d],
  };
}

/** a^{x² + Bx + C} = a^k: equal exponents, then a second-degree equation. */
function genExpSquare(rng) {
  const a = pick(rng, [2, 3, 5, "e"]);
  let r1 = int(rng, -3, 3), r2 = int(rng, -3, 3);
  if (r1 === r2) return genExpSquare(rng);
  if (r1 < r2) [r1, r2] = [r2, r1];
  const k = a === "e" ? int(rng, -1, 2) : int(rng, 0, { 2: 4, 3: 3, 5: 2 }[a]);
  const B = -(r1 + r2), C0 = r1 * r2;
  const expo = quadTex(B, C0 + k);
  const rhs = a === "e" ? (k === 0 ? "1" : k === 1 ? "e" : k === -1 ? "\\frac{1}{e}" : `e^{${k}}`) : valueTex(pow(fr(a), k), a);
  const statement = `${a}^{${expo}} = ${rhs}`;
  const steps = [step(statement, "L'inconnue est dans l'exposant, et elle y est au carré.")];
  if (a !== "e" || k !== 2) {
    const why = a !== "e" ? powerReason(a, k, rhs)
      : k === 0 ? "car $e^0 = 1$." : k === 1 ? "car $e = e^1$." : "car $\\frac{1}{e} = e^{-1}$.";
    steps.push(step(`${a}^{${expo}} = ${a}^{${k}}`, why));
  }
  steps.push(step(`${expo} = ${k}`, SAME_BASE));
  if (k !== 0) steps.push(step(`${quadTex(B, C0)} = 0`, "On ramène tout dans le membre de gauche."));
  if (B === 0) {
    steps.push(
      step(`x^2 = ${-C0}`, "On isole $x^2$."),
      step(`x = ${r1} \\text{ ou } x = ${r2}`, `Deux nombres ont pour carré $${-C0}$ : $${r1}$ et $${r2}$.`),
    );
  } else steps.push(...deltaSteps(B, C0, r1, r2));
  steps.push(step(setTex([r2, r1])));
  const A = baseValue(a);
  return {
    type: "expSquare",
    statement,
    hints: [
      `Écris $${rhs}$ comme une puissance de $${a}$.`,
      "Égale les exposants : tu obtiens une équation du second degré.",
      "Ramène tout à gauche et résous avec $\\Delta$ (ou en isolant $x^2$).",
    ],
    steps,
    solutions: [r2, r1],
    residual: (x) => [A ** (x * x + B * x + C0 + k), A ** k],
  };
}

/** A·e^{2x} + B·e^x + C = 0 (Y = e^x), or e^{4x} + B·e^{2x} + C = 0 (Y = e^{2x}). */
function genExpQuadE(rng) {
  if (rng() < 0.25) return expQuartic(rng);
  const A = pick(rng, [1, 1, 2, 3]);
  const Y1 = int(rng, 1, 6);
  const s = rng() < 0.5 ? -int(rng, 1, 4) : int(rng, 1, 8);
  if (s === A * Y1) return genExpQuadE(rng);
  const [, B, C] = [A, -(A * Y1 + s), Y1 * s];
  const statement = `${polyTex([A, B, C], ePow)} = 0`;
  const quad = solveQuad(A, B, C);
  const steps = [
    step(statement, "Les exposants sont $2x$ et $x$ : une équation du second degré déguisée."),
    step(`${polyTex([A, B, C], yPow())} = 0`, "On pose $Y = e^x$ (avec $Y > 0$), car $e^{2x} = (e^x)^2$."),
    ...quad.steps,
  ];
  const good = [];
  for (const Y of quad.roots) {
    if (Y.n <= 0) steps.push(step(`e^x = ${fracTex(Y)}`, EXP_POSITIVE));
    else {
      steps.push(step(`e^x = ${fracTex(Y)} \\;\\Leftrightarrow\\; x = ${lnTex(Y)}`, "On revient à $Y = e^x$ et on applique $\\ln$."));
      good.push(Y);
    }
  }
  good.sort((p, q) => value(p) - value(q));
  steps.push(step(setTex(good.map(lnTex)), good.some((Y) => Y.n !== Y.d) ? `Valeurs approchées : ${good.map((Y) => `$${numTex(Math.log(value(Y)), 4)}$`).join(" ; ")}.` : ""));
  return {
    type: "expQuadE",
    statement,
    hints: [
      "Remarque que $e^{2x} = (e^x)^2$ : c'est une équation du second degré en $e^x$.",
      "Pose $Y = e^x$ et résous avec $\\Delta$.",
      "Rejette les $Y \\leq 0$ (une exponentielle est positive), puis $e^x = Y \\Leftrightarrow x = \\ln Y$.",
    ],
    steps,
    solutions: good.map((Y) => Math.log(value(Y))),
    approx: true,
    residual: (x) => [A * Math.exp(2 * x) + B * Math.exp(x) + C, 0],
  };
}

// e^{4x} + B e^{2x} + C = 0 with Y = e^{2x} a perfect square, so x = ½ ln Y = ln √Y.
function expQuartic(rng) {
  const m1 = int(rng, 1, 5);
  const Y2 = rng() < 0.4 ? -int(rng, 1, 5) : int(rng, 1, 5) ** 2;
  const Y1 = m1 * m1;
  if (Y1 === Y2) return expQuartic(rng);
  const B = -(Y1 + Y2), C = Y1 * Y2;
  const statement = `${polyTex([1, B, C], (k) => (k === 1 ? "e^{2x}" : "e^{4x}"))} = 0`;
  const quad = solveQuad(1, B, C);
  const steps = [
    step(statement, "Les exposants sont $4x$ et $2x$ : une équation du second degré déguisée."),
    step(`${polyTex([1, B, C], yPow())} = 0`, "On pose $Y = e^{2x}$ (avec $Y > 0$), car $e^{4x} = (e^{2x})^2$."),
    ...quad.steps,
  ];
  const good = [];
  for (const Y of quad.roots) {
    if (Y.n <= 0) steps.push(step(`e^{2x} = ${fracTex(Y)}`, EXP_POSITIVE));
    else {
      const m = Math.round(Math.sqrt(Y.n));
      steps.push(step(`e^{2x} = ${Y.n} \\;\\Leftrightarrow\\; 2x = \\ln ${Y.n} \\;\\Leftrightarrow\\; x = ${m === 1 ? "0" : `\\tfrac{1}{2} \\ln ${Y.n} = \\ln ${m}`}`,
        m === 1 ? "$e^{2x} = 1 = e^0$." : `car $\\tfrac{1}{2} \\ln ${Y.n} = \\ln ${Y.n}^{1/2} = \\ln ${m}$.`));
      good.push(m);
    }
  }
  good.sort((p, q) => p - q);
  steps.push(step(setTex(good.map((m) => (m === 1 ? "0" : `\\ln ${m}`)))));
  return {
    type: "expQuadE",
    statement,
    hints: [
      "Remarque que $e^{4x} = (e^{2x})^2$.",
      "Pose $Y = e^{2x}$ et résous avec $\\Delta$.",
      "Rejette les $Y \\leq 0$, puis $e^{2x} = Y \\Leftrightarrow x = \\frac{1}{2} \\ln Y$.",
    ],
    steps,
    solutions: good.map((m) => Math.log(m)),
    approx: true,
    residual: (x) => [Math.exp(4 * x) + B * Math.exp(2 * x) + C, 0],
  };
}

// ---------- logarithmes avec exposants ----------

/** log_a (x + p)² = k: C.E. x ≠ −p, two solutions ±. */
function genLogSquareArg(rng) {
  const [a, m] = pick(rng, [[2, 2], [2, 4], [2, 8], [3, 3], [3, 9], [10, 10], [10, 100]]);
  const k = Math.round(2 * Math.log(m) / Math.log(a));
  const p = int(rng, -4, 4);
  const lin = linTex(1, p);
  const arg = p === 0 ? "x^2" : `(${lin})^2`;
  const L = logTex(a);
  const statement = `${L} ${arg} = ${k}`;
  const [s1, s2] = [-m - p, m - p];
  const steps = [
    step(statement, CE_NOTE),
    step(`\\text{C.E. : } ${arg} > 0 \\;\\Leftrightarrow\\; x \\neq ${-p}`, "Un carré est toujours positif ou nul : il suffit qu'il ne soit pas nul."),
    step(`${arg} = ${a}^{${k}} = ${m * m}`, "Définition : $\\log_a A = k \\Leftrightarrow A = a^k$."),
    step(`${lin} = ${m} \\text{ ou } ${lin} = -${m}`, `Deux nombres ont pour carré $${m * m}$ : $${m}$ et $-${m}$.`),
  ];
  if (p !== 0) steps.push(step(`x = ${s2} \\text{ ou } x = ${s1}`, `On ${p > 0 ? "soustrait" : "ajoute"} $${Math.abs(p)}$.`));
  steps.push(
    step(`${s2} \\neq ${-p} \\;\\checkmark \\qquad ${s1} \\neq ${-p} \\;\\checkmark`,
      `Les deux solutions respectent la C.E. Attention : écrire $${L} ${arg} = 2 ${L} ${p === 0 ? "x" : `(${lin})`}$ aurait fait perdre la solution négative (cette règle demande $${p === 0 ? "x" : lin} > 0$).`),
    step(setTex([s1, s2])),
  );
  return {
    type: "logSquareArg",
    statement,
    hints: [
      `C.E. : $${arg} > 0$. Un carré n'est jamais négatif : il suffit qu'il ne soit pas nul.`,
      `Par définition, $${arg} = ${a}^{${k}}$.`,
      `Un carré égal à $${m * m}$ : il y a deux possibilités, une positive et une négative.`,
    ],
    steps,
    solutions: [s1, s2],
    residual: (x) => [Math.log((x + p) ** 2) / Math.log(a), k],
  };
}

/** m·log²x + (B/n)·log xⁿ = −C: log xⁿ = n·log x, then Y = log x. */
function genLogMixed(rng) {
  const a = pick(rng, [10, "e", 2]);
  const A = pick(rng, [1, 2, 3]);
  const Y1 = int(rng, -2, 2);
  const s = int(rng, -4, 4);
  const B = -(A * Y1 + s), C = Y1 * s;
  const ns = [2, 3].filter((n) => B !== 0 && B % n === 0);
  if (!ns.length || s === A * Y1) return genLogMixed(rng);
  const n = pick(rng, ns);
  const L = logTex(a), Lx = `${L} x`;
  const statement = `${monoTex(A, `${logPowTex(a, 2)} x`, true)}${monoTex(B / n, `${L} x^${n}`)} = ${-C}`;
  const quad = solveQuad(A, B, C);
  const steps = [
    step(statement, `${CE_NOTE} Ne pas confondre $${logPowTex(a, 2)} x = (${Lx})^2$ et $${L} x^2 = 2 ${Lx}$.`),
    step("\\text{C.E. : } x > 0", "Domaine : $]0 \\,;\\, +\\infty[$."),
    step(`${monoTex(A, `${logPowTex(a, 2)} x`, true)}${monoTex(B, Lx)} = ${-C}`, `car $\\log_a x^r = r \\log_a x$ : $${L} x^${n} = ${n} ${Lx}$.`),
    step(`${polyTex([A, B, C], yPow())} = 0`, `On pose $Y = ${Lx}$ et on ramène tout dans le membre de gauche.`),
    ...quad.steps,
  ];
  for (const Y of quad.roots) steps.push(step(`${Lx} = ${fracTex(Y)} \\;\\Leftrightarrow\\; x = ${powA(a, Y)}`, `On revient à $Y = ${Lx}$ : $\\log_a x = y \\Leftrightarrow x = a^y$.`));
  const roots = [...quad.roots].sort((p, q) => value(p) - value(q));
  steps.push(
    step("x > 0 \\;\\checkmark", "Une puissance de la base est toujours strictement positive : toutes les solutions respectent la C.E."),
    step(setTex(roots.map((Y) => powA(a, Y)))),
  );
  const base = baseValue(a);
  return {
    type: "logMixed",
    statement,
    hints: [
      `C.E. : $x > 0$. Puis transforme $${L} x^${n}$ avec $\\log_a x^r = r \\log_a x$.`,
      `Pose $Y = ${Lx}$ : l'équation devient du second degré.`,
      `Reviens à $x$ : $${Lx} = y \\Leftrightarrow x = ${a}^y$.`,
    ],
    steps,
    solutions: roots.map((Y) => base ** value(Y)),
    approx: a === "e" || roots.some((Y) => Y.d !== 1),
    residual: (x) => {
      const l = Math.log(x) / Math.log(base);
      return [A * l * l + B * l, -C];
    },
  };
}

/** log_a(x + p) = k + log_{a²}(rx + s): change of base, then a second-degree equation. */
function genLogBaseChange(rng) {
  const a = pick(rng, [2, 3]);
  const twoK = pick(rng, [0, 1, 2]);
  const c = a ** twoK;
  const x0 = int(rng, 1, 6), x1 = int(rng, -6, 0);
  const S = x0 + x1, P = x0 * x1;
  const ps = [];
  for (let p = -x0 + 1; p < -x1; p++) {
    if ((S + 2 * p) % c === 0 && (p * p - P) % c === 0 && S + 2 * p !== 0) ps.push(p);
  }
  if (!ps.length) return genLogBaseChange(rng);
  const p = pick(rng, ps);
  const r = (S + 2 * p) / c, s = (p * p - P) / c;
  const a2 = a * a;
  const u = linTex(1, p), v = linTex(r, s);
  const uSq = p === 0 ? "x^2" : `(${u})^2`;
  const kTex = twoK === 1 ? "0{,}5" : "1";
  const L = logTex(a), L2 = logTex(a2);
  const statement = twoK ? `${L}(${u}) = ${kTex} + ${L2}(${v})` : `${L}(${u}) = ${L2}(${v})`;
  // Domain: x > −p and rx + s > 0.
  const bound = fr(-s, r);
  const lo = r > 0 && value(bound) > -p ? bound : fr(-p);
  const hi = r < 0 ? bound : null;
  const domTex = hi ? `${fracTex(lo)} < x < ${fracTex(hi)}` : `x > ${fracTex(lo)}`;
  const steps = [
    step(statement, CE_NOTE),
    step(`\\text{C.E. : } ${u} > 0 \\text{ et } ${v} > 0 \\;\\Leftrightarrow\\; ${domTex}`, `Les deux arguments doivent être strictement positifs : domaine $]${fracTex(lo)} \\,;\\, ${hi ? fracTex(hi) : "+\\infty"}[$.`),
    step(`${L2}(${v}) = \\frac{${L}(${v})}{${L} ${a2}} = \\frac{1}{2} ${L}(${v})`, `Les bases sont différentes : on change de base, car $${L} ${a2} = 2$ ($${a2} = ${a}^2$).`),
    step(`2 ${L}(${u}) = ${twoK ? `${twoK} + ` : ""}${L}(${v})`, "On multiplie les deux membres par 2."),
  ];
  if (twoK) {
    steps.push(
      step(`${L} ${uSq} = ${L} ${c} + ${L}(${v})`, `car $r \\log_a x = \\log_a x^r$ et $${twoK} = ${L} ${a}^{${twoK}} = ${L} ${c}$.`),
      step(`${L} ${uSq} = ${L}\\big[${c}(${v})\\big]`, "car $\\log_a x + \\log_a y = \\log_a (x \\cdot y)$."),
      step(`${uSq} = ${c}(${v})`, "$\\log_a A = \\log_a B \\Leftrightarrow A = B$ : on enlève les logarithmes."),
    );
  } else {
    steps.push(
      step(`${L} ${uSq} = ${L}(${v})`, "car $r \\log_a x = \\log_a x^r$."),
      step(`${uSq} = ${v}`, "$\\log_a A = \\log_a B \\Leftrightarrow A = B$ : on enlève les logarithmes."),
    );
  }
  const B = 2 * p - c * r, C = p * p - c * s;
  steps.push(
    step(`${quadTex(2 * p, p * p)} = ${linTex(c * r, c * s)}`, "On développe."),
    step(`${quadTex(B, C)} = 0`, "On ramène tout dans le membre de gauche."),
    ...deltaSteps(B, C, x0, x1),
    step(`x_1 = ${x0} \\;\\checkmark \\qquad x_2 = ${x1} \\;\\text{: rejetée}`, `On vérifie les C.E. : avec $x = ${x1}$, $${u}$ vaudrait $${x1 + p}$ et le logarithme d'un nombre négatif ou nul n'existe pas.`),
    step(setTex([x0])),
  );
  return {
    type: "logBaseChange",
    statement,
    hints: [
      `Commence par les C.E. : $${u} > 0$ et $${v} > 0$.`,
      `Ramène tout en base $${a}$ : $${L2} A = \\frac{${L} A}{${L} ${a2}} = \\frac{1}{2} ${L} A$.`,
      `Multiplie par 2, regroupe les logarithmes${twoK ? ` (écris $${twoK} = ${L} ${c}$)` : ""}, enlève-les et résous avec $\\Delta$. Vérifie les C.E.`,
    ],
    steps,
    solutions: [x0],
    residual: (x) => [Math.log(x + p) / Math.log(a), twoK / 2 + Math.log(r * x + s) / Math.log(a2)],
  };
}

// ---------- troisième degré (Horner) ----------

/** Factorisation steps for a cubic in Y (integer `hornerRoot`, or Y = 0 put in evidence): steps and roots (fractions). */
function cubicSteps(coefs, hornerRoot, v = "Y") {
  const P = (k) => (k === 1 ? v : `${v}^${k}`);
  if (coefs[3] === 0) {
    const q = coefs.slice(0, 3);
    const quad = solveQuad(...q, v);
    return {
      steps: [
        step(`${v}\\,(${polyTex(q, P)}) = 0`, `Pas de terme indépendant : on met $${v}$ en évidence.`),
        step(`${v} = 0 \\text{ ou } ${polyTex(q, P)} = 0`, "Un produit est nul si et seulement si un de ses facteurs est nul."),
        ...quad.steps,
      ],
      roots: uniqFr([fr(0), ...quad.roots]),
    };
  }
  const r = hornerRoot;
  const h = horner(coefs, r);
  const quad = solveQuad(...h.quotient, v);
  return {
    steps: [
      step(`P(${r}) = ${coefs.map((c, i) => `${paren(c)} \\cdot ${paren(r)}^${3 - i}`).slice(0, 3).join(" + ")} + ${paren(coefs[3])} = 0`,
        `On cherche une racine parmi les diviseurs du terme indépendant $${coefs[3]}$ : $${v} = ${r}$ convient.`),
      step(h.tex, `Horner : on divise par $(${linTex(1, -r, v)})$ ; le dernier nombre est le reste, nul.`),
      step(`(${linTex(1, -r, v)})(${polyTex(h.quotient, P)}) = 0`, "Un produit est nul si et seulement si un de ses facteurs est nul."),
      ...quad.steps,
    ],
    roots: uniqFr([fr(r), ...quad.roots]),
  };
}

/** A·e^{3x} + B·e^{2x} + C·e^x + D = 0 with Y = e^x, Horner, negative roots rejected. */
function genExpCubic(rng) {
  const A = pick(rng, [1, 1, 2]);
  const r1 = pick(rng, [1, 2, 3, -1, -2]);
  const r2 = pick(rng, [-3, -2, -1, 1, 2, 3, 4]);
  const s = pick(rng, [-5, -3, -2, -1, 1, 2, 3, 5, 9]);
  const Y3 = s / A;
  if (r1 === r2 || r1 === Y3 || r2 === Y3 || Math.max(r1, r2, Y3) <= 0) return genExpCubic(rng);
  const coefs = expand([r1, r2], 1);
  const poly = [A, coefs[1] * A - s, coefs[2] * A - s * coefs[1], -s * coefs[2]];
  const statement = `${polyTex(poly, ePow)} = 0`;
  const cubic = cubicSteps(poly, r1);
  const steps = [
    step(statement, "Les exposants sont $3x$, $2x$ et $x$ : une équation du troisième degré déguisée."),
    step(`${polyTex(poly, yPow())} = 0`, "On pose $Y = e^x$ (avec $Y > 0$), car $e^{kx} = (e^x)^k$."),
    ...cubic.steps,
  ];
  const good = [];
  for (const Y of [...cubic.roots].sort((p, q) => value(q) - value(p))) {
    if (Y.n <= 0) steps.push(step(`e^x = ${fracTex(Y)}`, EXP_POSITIVE));
    else {
      steps.push(step(`e^x = ${fracTex(Y)} \\;\\Leftrightarrow\\; x = ${lnTex(Y)}`, "On revient à $Y = e^x$ et on applique $\\ln$."));
      good.push(Y);
    }
  }
  good.sort((p, q) => value(p) - value(q));
  steps.push(step(setTex(good.map(lnTex))));
  return {
    type: "expCubic",
    statement,
    hints: [
      "Pose $Y = e^x$ : tu obtiens une équation du troisième degré en $Y$.",
      `Cherche une racine parmi les diviseurs de $${poly[3]}$ et applique Horner.`,
      "Résous le second degré restant, rejette les $Y \\leq 0$, puis $x = \\ln Y$.",
    ],
    steps,
    solutions: good.map((Y) => Math.log(value(Y))),
    approx: true,
    residual: (x) => [poly.reduce((acc, c, i) => acc + c * Math.exp((3 - i) * x), 0), 0],
  };
}

/** log³x + B log²x + C log x + D = 0 with Y = log x, Horner or Y in evidence. */
function genLogCubic(rng) {
  const a = pick(rng, [10, "e", 2]);
  const roots = [int(rng, -2, 3), int(rng, -2, 3), int(rng, -2, 3)];
  const poly = expand(roots, 1);
  const nonzero = roots.filter((r) => r !== 0).sort((p, q) => Math.abs(p) - Math.abs(q));
  if (poly[3] !== 0 && !nonzero.length) return genLogCubic(rng);
  const L = logTex(a), Lx = `${L} x`;
  const lp = (k) => (k === 1 ? Lx : `${logPowTex(a, k)} x`);
  // The course writes 2·log x as log x² (« log x² + log³x = 4 log²x »).
  const asSquare = poly[2] !== 0 && poly[2] % 2 === 0 && rng() < 0.5;
  const left = monoTex(poly[0], lp(3), true) + (poly[1] ? monoTex(poly[1], lp(2)) : "") + (poly[2] ? monoTex(asSquare ? poly[2] / 2 : poly[2], asSquare ? `${L} x^2` : Lx) : "") + (poly[3] ? monoTex(poly[3], "") : "");
  const statement = `${left} = 0`;
  const cubic = cubicSteps(poly, nonzero[0]);
  const steps = [step(statement, `${CE_NOTE} Notation : $${logPowTex(a, 3)} x = (${Lx})^3$.`), step("\\text{C.E. : } x > 0", "Domaine : $]0 \\,;\\, +\\infty[$.")];
  if (asSquare) steps.push(step(`${polyTex(poly, lp)} = 0`, `car $${L} x^2 = 2 ${Lx}$.`));
  steps.push(step(`${polyTex(poly, yPow())} = 0`, `On pose $Y = ${Lx}$.`), ...cubic.steps);
  const ys = [...cubic.roots].sort((p, q) => value(p) - value(q));
  for (const Y of ys) steps.push(step(`${Lx} = ${fracTex(Y)} \\;\\Leftrightarrow\\; x = ${powA(a, Y)}`, `On revient à $Y = ${Lx}$ : $\\log_a x = y \\Leftrightarrow x = a^y$.`));
  steps.push(
    step("x > 0 \\;\\checkmark", "Une puissance de la base est toujours strictement positive : toutes les solutions respectent la C.E."),
    step(setTex(ys.map((Y) => powA(a, Y)))),
  );
  const base = baseValue(a);
  return {
    type: "logCubic",
    statement,
    hints: [
      `C.E. : $x > 0$. Pose $Y = ${Lx}$${asSquare ? ` (et écris $${L} x^2 = 2 ${Lx}$)` : ""}.`,
      poly[3] === 0 ? "Pas de terme indépendant : mets $Y$ en évidence." : `Cherche une racine parmi les diviseurs de $${poly[3]}$ et applique Horner.`,
      `Résous le second degré restant, puis $${Lx} = y \\Leftrightarrow x = ${a}^y$.`,
    ],
    steps,
    solutions: ys.map((Y) => base ** value(Y)),
    approx: a === "e",
    residual: (x) => {
      const l = Math.log(x) / Math.log(base);
      return [poly.reduce((acc, c, i) => acc + c * l ** (3 - i), 0), 0];
    },
  };
}

// ---------- dérivées ----------

// Inner functions u(x): TeX, text the calculator reads, values and derivative.
const poly1 = (k, c) => ({ tex: linTex(k, c), text: `${k}x${c ? (c > 0 ? `+${c}` : c) : ""}`, f: (x) => k * x + c, d: () => k, dTex: `${k}`, dText: `${k}` });
const INNER_EXP = [
  (rng) => poly1(pick(rng, [2, 3, 4, 5, -2, -3]), 0),
  () => ({ tex: "x^2", text: "x^2", f: (x) => x * x, d: (x) => 2 * x, dTex: "2x", dText: "2x" }),
  () => ({ tex: "x^3", text: "x^3", f: (x) => x ** 3, d: (x) => 3 * x * x, dTex: "3x^2", dText: "3x^2" }),
  (rng) => {
    const p = int(rng, 1, 5), q = pick(rng, [-3, -2, 2, 3]);
    return { tex: `${p} ${q < 0 ? "-" : "+"} ${Math.abs(q)}x`, text: `${p}${q < 0 ? "-" : "+"}${Math.abs(q)}x`, f: (x) => p + q * x, d: () => q, dTex: `${q}`, dText: `${q}` };
  },
  (rng) => {
    const k = pick(rng, [2, 3, 5]), c = pick(rng, [-3, -1, 1, 2]);
    return { tex: quadTex(0, c).replace("x^2", `${k}x^2`), text: `${k}x^2${c > 0 ? "+" : ""}${c}`, f: (x) => k * x * x + c, d: (x) => 2 * k * x, dTex: `${2 * k}x`, dText: `${2 * k}x` };
  },
  (rng) => {
    const b = pick(rng, [1, 2, 3, -1]);
    return { tex: quadTex(b, 0), text: `x^2${b > 0 ? "+" : ""}${b}x`, f: (x) => x * x + b * x, d: (x) => 2 * x + b, dTex: linTex(2, b), dText: `2x${b > 0 ? "+" : ""}${b}` };
  },
  () => ({ tex: "-\\frac{1}{x}", text: "-1/x", f: (x) => -1 / x, d: (x) => 1 / (x * x), dTex: "\\frac{1}{x^2}", dText: "1/x^2" }),
];
const INNER_LOG = [
  (rng) => {
    const k = pick(rng, [1, 2, 3]), c = pick(rng, [1, 2, 4, 5]);
    const tex = `${k === 1 ? "" : k}x^2 + ${c}`;
    return { tex, text: `${k}x^2+${c}`, f: (x) => k * x * x + c, d: (x) => 2 * k * x, dTex: `${2 * k}x`, dText: `${2 * k}x` };
  },
  () => ({ tex: "1 - x^2", text: "1-x^2", f: (x) => 1 - x * x, d: (x) => -2 * x, dTex: "-2x", dText: "-2x" }),
  (rng) => {
    const k = pick(rng, [2, 3, 5]), c = pick(rng, [-1, 1, 3]);
    return { tex: linTex(k, c), text: `${k}x${c > 0 ? "+" : ""}${c}`, f: (x) => k * x + c, d: () => k, dTex: `${k}`, dText: `${k}` };
  },
  () => ({ tex: "x^2 - x + 1", text: "x^2-x+1", f: (x) => x * x - x + 1, d: (x) => 2 * x - 1, dTex: "2x - 1", dText: "2x-1" }),
  () => ({ tex: "x^3 + 1", text: "x^3+1", f: (x) => x ** 3 + 1, d: (x) => 3 * x * x, dTex: "3x^2", dText: "3x^2" }),
  () => ({ tex: "\\sin x", text: "sin(x)", f: Math.sin, d: Math.cos, dTex: "\\cos x", dText: "cos(x)" }),
];
const SAMPLE_X = [-2.3, -1.4, -0.7, 0.4, 0.9, 1.6, 2.2, 2.9];

/** Points where the answer is compared with the derivative. */
const samplePoints = (ok) => SAMPLE_X.filter(ok);

const wrapSum = (t) => (/[+-]/.test(t.slice(1)) ? `(${t})` : t);

function genDerivExp(rng) {
  const a = pick(rng, ["e", "e", 2, 3, 5]);
  const u = pick(rng, INNER_EXP)(rng);
  const isE = a === "e";
  const f = `${a}^{${u.tex}}`;
  const factor = u.dTex === "1" ? "" : `${wrapSum(u.dTex)} \\cdot `;
  const answerTex = isE ? `${factor}e^{${u.tex}}` : `${factor}${a}^{${u.tex}} \\cdot \\ln ${a}`;
  const answer = isE ? `(${u.dText})*e^(${u.text})` : `(${u.dText})*${a}^(${u.text})*ln(${a})`;
  const A = baseValue(a);
  return {
    type: "derivExp",
    kind: "expr",
    prompt: "Dérive",
    statement: `f(x) = ${f}`,
    hints: [
      isE ? "Formule : $(e^u)' = u' \\cdot e^u$." : "Formule : $(a^u)' = u' \\cdot a^u \\cdot \\ln a$.",
      `Ici $u = ${u.tex}$ : que vaut $u'$ ?`,
      isE ? "L'exponentielle reste telle quelle, on la multiplie par $u'$." : `N'oublie pas le facteur $\\ln ${a}$.`,
    ],
    steps: [
      step(`f(x) = ${f}`, `Une exponentielle${isE ? " de base $e$" : ""} dont l'exposant est une fonction de $x$ : ${isE ? "$(e^u)' = u' \\cdot e^u$" : "$(a^u)' = u' \\cdot a^u \\cdot \\ln a$"}.`),
      step(`u = ${u.tex} \\qquad u' = ${u.dTex}`, "On repère l'exposant $u$ et on le dérive."),
      step(`f'(x) = ${answerTex}`, isE ? "On applique la formule." : `On applique la formule ; $\\ln ${a}$ est une constante.`),
    ],
    answerTex,
    answer,
    f: (x) => A ** u.f(x),
    derivative: (x) => u.d(x) * A ** u.f(x) * Math.log(A),
    points: samplePoints((x) => x !== 0 && Math.abs(u.f(x)) < 30),
    solutions: [],
  };
}

function genDerivLog(rng) {
  const a = pick(rng, ["e", "e", 2, 3, 5, 10]);
  const u = pick(rng, INNER_LOG)(rng);
  const isE = a === "e";
  const L = logTex(a);
  const arg = u.tex === "\\sin x" ? "\\sin x" : `(${u.tex})`;
  const f = `${L} ${arg}`;
  const den = isE ? u.tex : `(${u.tex}) \\ln ${a}`;
  const answerTex = `\\frac{${u.dTex}}{${den}}`;
  const answer = isE ? `(${u.dText})/(${u.text})` : `(${u.dText})/((${u.text})*ln(${a}))`;
  const A = baseValue(a);
  return {
    type: "derivLog",
    kind: "expr",
    prompt: "Dérive",
    statement: `f(x) = ${f}`,
    hints: [
      isE ? "Formule : $(\\ln u)' = \\frac{u'}{u}$." : "Formule : $(\\log_a u)' = \\frac{u'}{u \\cdot \\ln a}$.",
      `Ici $u = ${u.tex}$ : que vaut $u'$ ?`,
      isE ? "Dérivée de l'argument divisée par l'argument." : `Divise aussi par $\\ln ${a}$.`,
    ],
    steps: [
      step(`f(x) = ${f}`, `Un logarithme dont l'argument est une fonction de $x$ : ${isE ? "$(\\ln u)' = \\frac{u'}{u}$" : "$(\\log_a u)' = \\frac{u'}{u \\cdot \\ln a}$"}.`),
      step(`u = ${u.tex} \\qquad u' = ${u.dTex}`, "On repère l'argument $u$ et on le dérive."),
      step(`f'(x) = ${answerTex}`, isE ? "On applique la formule." : `On applique la formule ; $\\ln ${a}$ est une constante (changement de base : $\\log_a u = \\frac{\\ln u}{\\ln a}$).`),
    ],
    answerTex,
    answer,
    f: (x) => Math.log(u.f(x)) / Math.log(A),
    derivative: (x) => u.d(x) / (u.f(x) * Math.log(A)),
    points: samplePoints((x) => u.f(x) > 0.05),
    solutions: [],
  };
}

// ---------- problèmes ----------

/** "1 234,5" for statements (French grouping with a thin space), at most `digits` decimals. */
const nText = (v, digits = 2) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(v).replace(/[\s\u202f]/g, "\u202f");
/** Same, for TeX. */
const nTex = (v, digits = 2) => nText(v, digits).replace(",", "{,}").replace(/\u202f/g, "\\,");

/** Rounds to 2 significant digits: a "nice" target value for a statement. */
const nice = (v) => {
  const e = 10 ** (Math.floor(Math.log10(v)) - 1);
  return Math.round(v / e) * e;
};

const gcd = (p, q) => (q ? gcd(q, p % q) : p);

/** N / m written exactly: a decimal when it has at most 6 decimals, otherwise the reduced fraction. */
function ratioTex(N, m, asArg = false) {
  const r = N / m;
  if (Number(r.toFixed(6)) === r) return nTex(r, 6);
  const g = Number.isInteger(N) && Number.isInteger(m) ? gcd(N, m) : 1;
  const tex = `\\frac{${nTex(N / g, 6)}}{${nTex(m / g, 6)}}`;
  return asArg ? `\\left(${tex}\\right)` : tex;
}

// Growth by a factor per period: f(t) = m · factor^(t/T).
const GROWTH = [
  { m: [500, 1000, 2000, 4000, 8000], factor: 2, T: [3, 4, 5, 6, 8], unit: "heures", what: "bactéries", count: true,
    intro: (m, T) => `Une culture compte $${nTex(m)}$ bactéries ; leur nombre double toutes les $${T}$ heures.` },
  { m: [10, 12, 15, 20, 25], factor: [3, 5, 7], T: [2, 3, 4, 5], unit: "jours", what: "animaux contaminés", count: true,
    intro: (m, T, f) => `Un virus touche aujourd'hui $${m}$ animaux d'un élevage ; le nombre d'animaux contaminés est multiplié par $${f}$ tous les $${T}$ jours.` },
  { m: [50, 80, 120, 200, 500], factor: 0.5, T: [4, 6, 8, 12, 30], unit: "ans", what: "grammes", count: false,
    intro: (m, T) => `La demi-vie d'un isotope radioactif est de $${T}$ ans : sa masse est divisée par 2 tous les $${T}$ ans. On en possède $${m}$ g.` },
  { m: [0.5, 1, 2], factor: [1.04, 1.05, 1.07], T: [1], unit: "ans", what: "mètres", count: false,
    intro: (m, T, f) => `Un arbre de $${nTex(m)}$ m grandit de $${nTex((f - 1) * 100)}\\,\\%$ par an.` },
  { m: [22, 40, 550], factor: [0.94, 0.97, 0.98], T: [1, 4], unit: "ans", what: "millions de km²", count: false,
    intro: (m, T, f) => `Une surface de $${m}$ millions de km² diminue de $${nTex((1 - f) * 100)}\\,\\%$ ${T === 1 ? "par an" : `tous les $${T}$ ans`}.` },
];

const factorTex = (f) => (f === 0.5 ? "\\left(\\frac{1}{2}\\right)" : nTex(f, 2));
const expoT = (T) => (T === 1 ? "t" : `\\frac{t}{${T}}`);

function genGrowth(rng) {
  const sc = pick(rng, GROWTH);
  const m = pick(rng, sc.m);
  const T = pick(rng, sc.T);
  const f = Array.isArray(sc.factor) ? pick(rng, sc.factor) : sc.factor;
  const model = (t) => m * f ** (t / T);
  const modelTex = `f(t) = ${nTex(m)} \\cdot ${factorTex(f)}^{${expoT(T)}}`;
  const unitOne = sc.unit.replace(/s$/, "");
  const why = f === 0.5 ? `la masse est multipliée par $\\frac{1}{2}$ toutes les $${T}$ ${sc.unit}`
    : f < 1 ? `diminuer de $${nTex((1 - f) * 100)}\\,\\%$, c'est multiplier par $${nTex(f)}$`
    : f > 1 && f < 2 ? `augmenter de $${nTex((f - 1) * 100)}\\,\\%$, c'est multiplier par $${nTex(f)}$`
    : `on multiplie par $${f}$ toutes les $${T}$ ${sc.unit}`;
  const steps = [step(modelTex, `Modèle $f(t) = m \\cdot a^{t}$ : valeur de départ $m = ${nTex(m)}$, et ${why}${T > 1 ? ` (l'exposant compte les périodes de $${T}$ ${sc.unit})` : ""}.`)];
  const digitsValue = sc.count ? 0 : 2;
  if (rng() < 0.5) {
    const t = pick(rng, [2, 3, 5, 7, 10, 15, 20]);
    const v = model(t);
    steps.push(
      step(`f(${t}) = ${nTex(m)} \\cdot ${factorTex(f)}^{${T === 1 ? t : `\\frac{${t}}{${T}}`}}`, `On remplace $t$ par $${t}$.`),
      step(`f(${t}) \\approx ${nTex(v, digitsValue)}`, `À la calculatrice, arrondi ${sc.count ? "à l'unité" : "au centième"}.`),
    );
    return {
      type: "growth",
      prompt: "Résous le problème",
      text: `${sc.intro(m, T, f)} Modélise la situation, puis calcule la quantité (en ${sc.what}) après $${t}$ ${sc.unit}.`,
      statement: modelTex,
      hints: [
        "Modèle : $f(t) = m \\cdot a^{t}$, avec $m$ la valeur de départ.",
        `Écris $f(t)$ : ${why}.`,
        `Calcule $f(${t})$ à la calculatrice.`,
      ],
      steps,
      solutions: [v],
      approx: true,
      digits: digitsValue,
      residual: (x) => [x, model(t)],
    };
  }
  // Time to reach a target value.
  const tStar = (T > 1 ? T : 5) * (1.3 + 2.4 * rng());
  const N = nice(model(tStar));
  const t = (T * Math.log(N / m)) / Math.log(f);
  steps.push(
    step(`${nTex(m)} \\cdot ${factorTex(f)}^{${expoT(T)}} = ${nTex(N)}`, "On cherche $t$ tel que $f(t)$ atteigne la valeur demandée."),
    step(`${factorTex(f)}^{${expoT(T)}} = ${ratioTex(N, m)}`, `On divise par $${nTex(m)}$ : l'exponentielle est isolée.`),
    step(`${expoT(T)} \\cdot \\log ${factorTex(f)} = \\log ${ratioTex(N, m, true)}`, "On applique $\\log$ aux deux membres : $\\log a^y = y \\log a$."),
    step(`t = \\frac{${T === 1 ? "" : `${T} \\cdot `}\\log ${ratioTex(N, m, true)}}{\\log ${factorTex(f)}} \\approx ${nTex(t, 2)}`, `On isole $t$. Réponse : environ $${nTex(t, 2)}$ ${sc.unit}.`),
  );
  return {
    type: "growth",
    prompt: "Résous le problème",
    text: `${sc.intro(m, T, f)} Au bout de combien ${/^[aeiouh]/.test(sc.unit) ? "d'" : "de "}${sc.unit} la quantité atteindra-t-elle $${nTex(N)}$ ${sc.what} ?`,
    statement: modelTex,
    hints: [
      "Modèle : $f(t) = m \\cdot a^{t}$, avec $m$ la valeur de départ.",
      `Pose $f(t) = ${nTex(N)}$ et isole la puissance.`,
      `Applique $\\log$ : $\\log a^y = y \\log a$, puis isole $t$ (en ${unitOne}s).`,
    ],
    steps,
    solutions: [t],
    approx: true,
    digits: 2,
    residual: (x) => [model(x), N],
  };
}

function genInterest(rng) {
  const C0 = pick(rng, [1000, 2500, 4750, 5000, 8700, 10000, 40000]);
  const pct = pick(rng, [2, 2.5, 3, 3.5, 4, 5, 5.5]);
  const i = pct / 100;
  const a = 1 + i;
  const iTex = nTex(i, 3), aTex = nTex(a, 3);
  const intro = `On place $${nTex(C0)}$ € à intérêts composés au taux annuel de $${nTex(pct)}\\,\\%$.`;
  const model = (t) => C0 * a ** t;
  const modelTex = `C(t) = ${nTex(C0)} \\cdot ${aTex}^{t}`;
  const first = step(modelTex, `Intérêts composés : $C(t) = C_0 (1 + i)^t$ avec $C_0 = ${nTex(C0)}$ et $i = ${iTex}$ (les intérêts produisent à leur tour des intérêts).`);
  const kind = pick(rng, ["value", "time", "double", "rate", "simple"]);
  const base = { type: "interest", prompt: "Résous le problème", approx: true, digits: 2 };
  if (kind === "value" || kind === "simple") {
    const n = pick(rng, [5, 8, 10, 13, 15, 20]);
    if (kind === "simple") {
      const v = C0 * (1 + i * n);
      return {
        ...base,
        text: `On place $${nTex(C0)}$ € à intérêts simples au taux annuel de $${nTex(pct)}\\,\\%$. De quel capital disposera-t-on après $${n}$ ans (en €) ?`,
        statement: `C(t) = ${nTex(C0)} \\cdot (1 + ${iTex} \\, t)`,
        hints: ["Intérêts simples : les intérêts sont calculés seulement sur le capital de départ.", "$C(t) = C_0 (1 + i \\, t)$.", `Remplace $t$ par $${n}$.`],
        steps: [
          step(`C(t) = ${nTex(C0)} \\cdot (1 + ${iTex} \\, t)`, "Intérêts simples : chaque année rapporte le même montant, $C_0 \\cdot i$."),
          step(`C(${n}) = ${nTex(C0)} \\cdot (1 + ${iTex} \\cdot ${n})`, `On remplace $t$ par $${n}$.`),
          step(`C(${n}) = ${nTex(v)}`, "Réponse en euros."),
        ],
        solutions: [v],
        residual: (x) => [x, C0 * (1 + i * n)],
      };
    }
    const v = model(n);
    return {
      ...base,
      text: `${intro} De quel capital disposera-t-on après $${n}$ ans (en €) ?`,
      statement: modelTex,
      hints: ["Intérêts composés : $C(t) = C_0 (1 + i)^t$.", `Ici $1 + i = ${aTex}$.`, `Calcule $C(${n})$.`],
      steps: [first, step(`C(${n}) = ${nTex(C0)} \\cdot ${aTex}^{${n}}`, `On remplace $t$ par $${n}$.`), step(`C(${n}) \\approx ${nTex(v)}`, "À la calculatrice, arrondi au centime.")],
      solutions: [v],
      residual: (x) => [x, model(n)],
    };
  }
  if (kind === "rate") {
    const n = pick(rng, [5, 8, 10, 12]);
    const Cn = Math.round(model(n) * 100) / 100;
    const rate = ((Cn / C0) ** (1 / n) - 1) * 100;
    return {
      ...base,
      text: `Un capital de $${nTex(C0)}$ € placé à intérêts composés est devenu $${nTex(Cn)}$ € après $${n}$ ans. Quel est le taux annuel (en %) ?`,
      statement: `${nTex(C0)} \\cdot (1 + i)^{${n}} = ${nTex(Cn)}`,
      hints: ["Écris $C_0 (1 + i)^n = C_n$ et isole $(1 + i)^n$.", `Prends la racine $${n}$-ième : $(1 + i) = \\left(\\frac{C_n}{C_0}\\right)^{1/${n}}$.`, "Donne le taux en pour cent."],
      steps: [
        step(`${nTex(C0)} \\cdot (1 + i)^{${n}} = ${nTex(Cn)}`, "Intérêts composés : $C(t) = C_0 (1 + i)^t$, ici l'inconnue est le taux $i$."),
        step(`(1 + i)^{${n}} = \\frac{${nTex(Cn)}}{${nTex(C0)}}`, `On divise par $${nTex(C0)}$.`),
        step(`1 + i = \\left(\\frac{${nTex(Cn)}}{${nTex(C0)}}\\right)^{\\frac{1}{${n}}} \\approx ${nTex(1 + rate / 100, 4)}`, `On élève à la puissance $\\frac{1}{${n}}$ (racine $${n}$-ième).`),
        step(`i \\approx ${nTex(rate / 100, 4)} = ${nTex(rate)}\\,\\%`, "Le taux, en pour cent."),
      ],
      solutions: [rate],
      residual: (x) => [C0 * (1 + x / 100) ** n, Cn],
    };
  }
  const target = kind === "double" ? 2 * C0 : nice(model(pick(rng, [6, 9, 11, 14])));
  const t = Math.log(target / C0) / Math.log(a);
  return {
    ...base,
    text: kind === "double"
      ? `${intro} Au bout de combien d'années le capital aura-t-il doublé ?`
      : `${intro} Au bout de combien d'années disposera-t-on de $${nTex(target)}$ € ?`,
    statement: modelTex,
    hints: ["Intérêts composés : $C(t) = C_0 (1 + i)^t$.", `Pose $C(t) = ${nTex(target)}$ et isole $${aTex}^t$.`, "Applique $\\log$ aux deux membres et isole $t$."],
    steps: [
      first,
      step(`${nTex(C0)} \\cdot ${aTex}^{t} = ${nTex(target)}`, kind === "double" ? "Doubler, c'est atteindre $2 C_0$." : "On cherche $t$ tel que $C(t)$ atteigne le montant demandé."),
      step(`${aTex}^{t} = ${ratioTex(target, C0)}`, `On divise par $${nTex(C0)}$.`),
      step(`t \\cdot \\log ${aTex} = \\log ${ratioTex(target, C0, true)}`, "On applique $\\log$ aux deux membres."),
      step(`t = \\frac{\\log ${ratioTex(target, C0, true)}}{\\log ${aTex}} \\approx ${nTex(t)}`, `Environ $${nTex(t)}$ ans, soit $${Math.floor(Math.round(t * 12) / 12)}$ ans et $${Math.round(t * 12) % 12}$ mois.`),
    ],
    solutions: [t],
    residual: (x) => [model(x), target],
  };
}

// ---------- catalogue ----------

export const TYPES = {
  direct: { label: "Même base", level: 1, gen: genDirect },
  root: { label: "Racines", level: 1, gen: genRoot },
  affine: { label: "Exposant ax + b", level: 1, gen: genAffine },
  transform: { label: "Changer de base", level: 2, gen: genTransform },
  fractionBase: { label: "Base fractionnaire", level: 2, gen: genFractionBase },
  twoBases: { label: "Deux bases", level: 2, gen: genTwoBases },
  factor: { label: "Mise en évidence", level: 2, gen: genFactor },
  quadratic: { label: "Second degré (Y = aˣ)", level: 3, gen: genQuadratic },
  logEval: { label: "Calculer un logarithme", level: 4, gen: genLogEval },
  logSolve: { label: "aˣ = c avec ln", level: 4, gen: genLogSolve },
  logEq: { label: "Équation logarithmique", level: 4, gen: genLogEq },
  logEqRules: { label: "Équation log : C.E. et règles", level: 4, gen: genLogEqRules },
  logQuadratic: { label: "Équation log : Y = log x", level: 4, gen: genLogQuadratic },
  expIsolate: { label: "Isoler puis ln", level: 3, gen: genExpIsolate },
  expSquare: { label: "Exposant x²", level: 3, gen: genExpSquare },
  expQuadE: { label: "Second degré en eˣ", level: 3, gen: genExpQuadE },
  logSquareArg: { label: "log x² = k", level: 4, gen: genLogSquareArg },
  logMixed: { label: "log² x et log x²", level: 4, gen: genLogMixed },
  logBaseChange: { label: "Bases différentes", level: 4, gen: genLogBaseChange },
  expCubic: { label: "3e degré en eˣ", level: 5, gen: genExpCubic },
  logCubic: { label: "3e degré en ln x", level: 5, gen: genLogCubic },
  derivExp: { label: "Dériver aᵘ et eᵘ", level: 6, gen: genDerivExp },
  derivLog: { label: "Dériver ln u et logₐ u", level: 6, gen: genDerivLog },
  growth: { label: "Croissance et décroissance", level: 7, gen: genGrowth },
  interest: { label: "Intérêts", level: 7, gen: genInterest },
};

export const LEVELS = [
  { id: 1, label: "Facile" },
  { id: 2, label: "Moyen" },
  { id: 3, label: "Difficile" },
  { id: 4, label: "Logarithmes" },
  { id: 5, label: "Troisième degré" },
  { id: 6, label: "Dérivées" },
  { id: 7, label: "Problèmes" },
];

/** `choice` is a type id, "level:<n>" or "all". */
export function generate(choice = "all", rng = Math.random) {
  let ids = Object.keys(TYPES);
  if (choice.startsWith("level:")) ids = ids.filter((id) => TYPES[id].level === Number(choice.slice(6)));
  else if (choice !== "all") ids = [choice];
  const type = pick(rng, ids);
  return { prompt: "Résous l'équation", approx: false, ...TYPES[type].gen(rng) };
}

// ---------- answers ----------

const EMPTY = /^(∅|aucune?|impossible|pasdesolution|vide|s=∅|s=\{\})$/;

/** One value: a number ("1,5", "-3/2") or an exact expression read by the calculator ("ln 3", "e/2", "3e^2"). */
function readValue(p) {
  const m = p.replace(",", ".").match(/^(-?\d+(?:\.\d+)?)(?:\/(-?\d+(?:\.\d+)?))?$/);
  if (m) return m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1]);
  try {
    return evaluate(parse(p), 0);
  } catch {
    return NaN;
  }
}

/** "x = 3/2", "1 ; 3", "{-1 ; 2}", "1,5", "ln 3", "±2", "∅" → numbers, or null when unreadable. */
export function parseAnswer(text) {
  const t = text.toLowerCase().replace(/\s+/g, "").replace(/[−–]/g, "-").replace(/[€%]|eur(os?)?$/g, "");
  if (!t) return null;
  if (EMPTY.test(t)) return [];
  const body = t.replace(/^s=/, "").replace(/^[{(\[]|[})\]]$/g, "");
  const parts = body.split(/;|ou|et/).map((p) => p.replace(/^[a-z]=/, "")).filter(Boolean);
  if (!parts.length) return null;
  const out = [];
  for (const p of parts) {
    const pm = p.startsWith("±") || p.startsWith("+-");
    const v = readValue(pm ? p.replace(/^(±|\+-)/, "") : p);
    if (!Number.isFinite(v)) return null;
    out.push(...(pm ? [-v, v] : [v]));
  }
  return out;
}

/** Derivative typed as an expression in x: compared with the exact derivative at several points. */
function checkExpression(exercise, text) {
  const t = text.trim().replace(/^(f'\s*\(\s*x\s*\)|f'|y')\s*=/i, "");
  if (!t.trim()) return { ok: false, values: null };
  let node;
  try {
    node = parse(t);
    evaluate(node, 0, exercise.points[0]);
  } catch (e) {
    return { ok: false, values: null, error: e.message };
  }
  const ok = exercise.points.every((x) => {
    let got;
    try {
      got = evaluate(node, 0, x);
    } catch {
      return false;
    }
    const want = exercise.derivative(x);
    return Math.abs(got - want) <= 1e-6 * Math.max(1, Math.abs(want));
  });
  return { ok, values: [], tex: toTex(node) };
}

/** { ok, values } — values null when the input could not be read; `tex` for an expression. */
export function checkAnswer(exercise, text) {
  if (exercise.kind === "expr") return checkExpression(exercise, text);
  const values = parseAnswer(text);
  if (!values) return { ok: false, values: null };
  // Approximations are expected rounded (to 2 decimals by default, `digits` for problems).
  const tol = exercise.approx ? 0.6 * 10 ** -(exercise.digits ?? 2) : 1e-6;
  const want = [...new Set(exercise.solutions)];
  const got = [...new Set(values.map((v) => Math.round(v * 1e9) / 1e9))];
  const ok = got.length === want.length && want.every((w) => got.some((g) => Math.abs(g - w) <= tol));
  return { ok, values };
}

/** Seeded generator (mulberry32), so a given exercise can be reproduced in tests. */
export function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
