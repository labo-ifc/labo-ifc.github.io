// Chemistry of the hydrocarbons course. Pure: no DOM.
//
// Formulas are objects of atom counts ({ C: 3, H: 8 }). Semi-developed
// formulas are mhchem strings ("CH2=CH-CH3"; "-", "=", "#" are bonds) to be
// written inside \ce{…}.

/** Molar masses used in the course (g/mol). */
export const MASS = { C: 12, H: 1, O: 16, N: 14, F: 19, Cl: 35.5, Br: 80 };

const ORDER = ["C", "H", "O", "N", "F", "Cl", "Br"];

/** { C: 3, H: 8 } → "C3H8" (for \ce). */
export function ce(formula) {
  return ORDER.filter((el) => formula[el]).map((el) => el + (formula[el] > 1 ? formula[el] : "")).join("");
}

export function molarMass(formula) {
  return Object.entries(formula).reduce((sum, [el, n]) => sum + MASS[el] * n, 0);
}

/** Sum of formulas, each times a coefficient: [[2, {H: 2}], [1, {O: 2}]] → atom totals. */
export function atomTotals(terms) {
  const out = {};
  for (const [k, f] of terms) for (const [el, n] of Object.entries(f)) out[el] = (out[el] ?? 0) + k * n;
  return out;
}

export const alkane = (n) => ({ C: n, H: 2 * n + 2 });
export const alkene = (n) => ({ C: n, H: 2 * n });

const PREFIX = ["", "méth", "éth", "prop", "but", "pent", "hex", "hept", "oct", "non", "déc"];
/** "propane", "but-1-ène" style names for straight chains (n ≤ 10). */
export const alkaneName = (n) => `${PREFIX[n]}ane`;
export const alkeneName = (n) => (n <= 3 ? `${PREFIX[n]}ène` : `${PREFIX[n]}-1-ène`);

// ---------- raffinage ----------

/** Boiling points of the straight-chain alkanes C1…C30 (°C, rounded). */
export const ALKANE_BP = [
  null, -162, -89, -42, -1, 36, 69, 98, 126, 151, 174,
  196, 216, 235, 254, 271, 287, 302, 316, 330, 343,
  357, 369, 380, 391, 402, 412, 422, 432, 441, 450,
];

/**
 * Fractions of the distillation column, from the top (coldest) to the bottom.
 * `carbons` and `percent` follow the course table; the temperature ranges are
 * the plateaus of the column.
 */
export const FRACTIONS = [
  { id: "gaz", name: "Gaz", carbons: "C1 à C4", max: 20, percent: "≈ 1 %", uses: "Chauffage, gaz en bouteille" },
  { id: "essence", name: "Essences", carbons: "C5 à C10", max: 180, percent: "≈ 20 %", uses: "Solvants, matière de base de la pétrochimie, carburants automobiles" },
  { id: "kerosene", name: "Kérosène", carbons: "C11 à C16", max: 255, percent: "≈ 5 %", uses: "Solvants, carburants pour moteurs à réaction" },
  { id: "gazole", name: "Gazole, fioul", carbons: "C17 à C20", max: 355, percent: "≈ 35 %", uses: "Chauffage domestique, moteurs Diesel, centrales thermiques, navires, industrie lourde" },
  { id: "residus", name: "Résidus lourds", carbons: "plus de C20", max: Infinity, percent: "≈ 40 %", uses: "Lubrifiants, graisses, revêtement des routes, toitures" },
];

/** Fraction collected for a boiling temperature (°C). */
export function fractionOf(bp) {
  return FRACTIONS.find((f) => bp < f.max);
}

// ---------- combustions ----------

/** Smallest positive integer that makes every number of the list an integer (halves and quarters only). */
function scaleToIntegers(list) {
  for (const k of [1, 2, 4]) if (list.every((x) => Number.isInteger(x * k))) return k;
  throw new Error("coefficients non entiers");
}

export const COMBUSTIONS = {
  complete: { label: "complète", product: { C: 1, O: 2 }, oxygenPerC: 2 },
  co: { label: "incomplète (CO)", product: { C: 1, O: 1 }, oxygenPerC: 1 },
  c: { label: "incomplète (suie)", product: { C: 1 }, oxygenPerC: 0 },
};

/**
 * Balanced combustion of a hydrocarbon CnHm.
 * Returns { fuel, product, coefs: [fuel, O2, product, H2O], o2PerFuel } with the
 * smallest integer coefficients; `o2PerFuel` may be a half (e.g. 6.5 for C4H10).
 */
export function combustion(fuel, kind = "complete") {
  const { product, oxygenPerC } = COMBUSTIONS[kind];
  const n = fuel.C, water = fuel.H / 2;
  const o2PerFuel = (oxygenPerC * n + water) / 2;
  const k = scaleToIntegers([o2PerFuel, water]);
  return { fuel, product, o2PerFuel, factor: k, coefs: [k, o2PerFuel * k, n * k, water * k] };
}

/** Left and right atom totals of a balanced combustion, to check it. */
export function combustionAtoms({ fuel, product, coefs: [a, o, p, w] }) {
  return {
    left: atomTotals([[a, fuel], [o, { O: 2 }]]),
    right: atomTotals([[p, product], [w, { H: 2, O: 1 }]]),
  };
}

/** mhchem equation: "2C4H10 + 13O2 -> 8CO2 + 10H2O" (coefficient 1 omitted). */
export function combustionCe({ fuel, product, coefs }) {
  const c = (k, f) => (k === 1 ? "" : `${k}`) + f;
  return `${c(coefs[0], ce(fuel))} + ${c(coefs[1], "O2")} -> ${c(coefs[2], ce(product))} + ${c(coefs[3], "H2O")}`;
}

// ---------- énergie de liaison ----------

/** Bond energies of the course (kJ/mol). */
export const BONDS = {
  HH: { label: "H-H", tex: "\\ce{H-H}", E: 436 },
  OO: { label: "O=O", tex: "\\ce{O=O}", E: 498 },
  HO: { label: "H-O", tex: "\\ce{H-O}", E: 464 },
  CC: { label: "C-C", tex: "\\ce{C-C}", E: 346 },
  CH: { label: "C-H", tex: "\\ce{C-H}", E: 413 },
  CO2: { label: "C=O (CO₂)", tex: "\\ce{C=O}\\ (\\ce{CO2})", E: 803 },
  CO: { label: "C≡O (CO)", tex: "\\ce{C#O}\\ (\\ce{CO})", E: 1062 },
};

/**
 * Reaction enthalpy of the combustion of an alkane CnH2n+2, complete or giving CO,
 * from bond energies: ΔH = E rupture − E formation, for the balanced equation and
 * per mole of alkane.
 */
export function combustionEnthalpy(n, kind = "complete") {
  const eq = combustion(alkane(n), kind);
  const [a, o, p, w] = eq.coefs;
  const ruptures = [
    { bond: "CC", count: a * (n - 1) },
    { bond: "CH", count: a * (2 * n + 2) },
    { bond: "OO", count: o },
  ].filter((b) => b.count > 0);
  const formations = [
    kind === "complete" ? { bond: "CO2", count: 2 * p } : { bond: "CO", count: p },
    { bond: "HO", count: 2 * w },
  ];
  const sum = (list) => list.reduce((s, b) => s + b.count * BONDS[b.bond].E, 0);
  const rupture = sum(ruptures), formation = sum(formations);
  return { eq, ruptures, formations, rupture, formation, dH: rupture - formation, dHPerMol: (rupture - formation) / a };
}

// ---------- chaînes carbonées (σ, π, additions) ----------

/**
 * A straight carbon chain: `orders[i]` is the bond between carbons i and i+1
 * (1, 2 or 3). Hydrogens fill the remaining valences (4 per carbon).
 */
export function chainHydrogens(orders) {
  const n = orders.length + 1;
  return Array.from({ length: n }, (_, i) => 4 - (orders[i - 1] ?? 0) - (orders[i] ?? 0));
}

export const validChain = (orders) => orders.length >= 1 && chainHydrogens(orders).every((h) => h >= 0);

export function chainFormula(orders) {
  return { C: orders.length + 1, H: chainHydrogens(orders).reduce((a, b) => a + b, 0) };
}

/** σ bonds: one per pair of bonded atoms; π bonds: the extra bonds of double and triple bonds. */
export function sigmaPi(orders) {
  const { C, H } = chainFormula(orders);
  return { sigma: C - 1 + H, pi: orders.reduce((s, o) => s + o - 1, 0) };
}

const BOND_CE = { 1: "-", 2: "=", 3: "#" };
// OH inside the chain goes between brackets: CH3-CH(OH)-CH3, but CH3-CH2OH.
const group = (h, subs = [], last = false) =>
  "C" + (h ? "H" + (h > 1 ? h : "") : "") + subs.map((x) => (x === "OH" && !last ? "(OH)" : x)).join("");

/** Semi-developed formula for \ce: [2, 1] → "CH2=CH-CH3". `subs[i]` lists substituents on carbon i. */
export function chainCe(orders, subs = []) {
  const hs = chainHydrogens(orders).map((h, i) => h - (subs[i]?.length ?? 0));
  return hs.map((h, i) => group(h, subs[i], i === orders.length) + (i < orders.length ? BOND_CE[orders[i]] : "")).join("");
}

export function chainFamily(orders) {
  if (orders.includes(3)) return "alcyne";
  if (orders.includes(2)) return "alcène";
  return "alcane";
}

/** Reagents of the addition reactions of the course. */
export const ADDITIONS = {
  H2: { label: "Hydrogénation", reagent: "H2", atoms: ["H", "H"], formula: { H: 2 } },
  H2O: { label: "Hydratation", reagent: "H2O", atoms: ["H", "OH"], formula: { H: 2, O: 1 } },
  Cl2: { label: "Halogénation (dichlore)", reagent: "Cl2", atoms: ["Cl", "Cl"], formula: { Cl: 2 } },
  Br2: { label: "Halogénation (dibrome)", reagent: "Br2", atoms: ["Br", "Br"], formula: { Br: 2 } },
};

/**
 * Addition on the first double bond of a chain. For water, OH goes on the
 * carbon carrying fewer hydrogens (the major product), H on the other one.
 * Returns { orders, subs, ce, formula } of the product.
 */
export function addition(orders, reagentId) {
  const i = orders.indexOf(2);
  if (i < 0) throw new Error("pas de double liaison");
  const { atoms } = ADDITIONS[reagentId];
  const hs = chainHydrogens(orders);
  const product = orders.map((o, k) => (k === i ? 1 : o));
  const subs = product.concat(0).map(() => []);
  let [a, b] = atoms; // a on carbon i, b on carbon i+1
  if (b === "OH" && hs[i] < hs[i + 1]) [a, b] = [b, a];
  for (const [carbon, x] of [[i, a], [i + 1, b]]) if (x !== "H") subs[carbon].push(x);
  const base = chainFormula(product);
  const formula = { ...base };
  // Substituents replace hydrogens of the saturated chain.
  for (const list of subs) for (const x of list) {
    formula.H -= 1;
    if (x === "OH") { formula.O = (formula.O ?? 0) + 1; formula.H += 1; } else formula[x] = (formula[x] ?? 0) + 1;
  }
  return { orders: product, subs, ce: chainCe(product, subs), formula };
}

// ---------- polymères ----------

export const MONOMERS = [
  { id: "PE", monomer: "éthylène", polymer: "polyéthylène", ce: "CH2=CH2", motif: "CH2-CH2", formula: { C: 2, H: 4 } },
  { id: "PP", monomer: "propène", polymer: "polypropylène", ce: "CH2=CH-CH3", motif: "CH2-CH(CH3)", formula: { C: 3, H: 6 } },
  { id: "PVC", monomer: "chlorure de vinyle", polymer: "polychlorure de vinyle", ce: "CH2=CHCl", motif: "CH2-CHCl", formula: { C: 2, H: 3, Cl: 1 } },
  { id: "PS", monomer: "styrène", polymer: "polystyrène", ce: "CH2=CH-C6H5", motif: "CH2-CH(C6H5)", formula: { C: 8, H: 8 } },
  { id: "PTFE", monomer: "tétrafluoroéthylène", polymer: "polytétrafluoroéthylène (Téflon)", ce: "CF2=CF2", motif: "CF2-CF2", formula: { C: 2, F: 4 } },
];

/** Degree of polymerisation: n = M(polymère) / M(monomère). */
export const polymerDegree = (polymerMass, monomer) => polymerMass / molarMass(monomer.formula);

/** Octane number of a mixture of iso-octane (100) and n-heptane (0): its percentage of iso-octane. */
export const octaneOfMix = (isoPercent) => isoPercent;

/** Common fuels and their octane numbers (course table). */
export const OCTANE = [
  { name: "n-heptane", value: 0 },
  { name: "2,4-diméthylpentane", value: 83 },
  { name: "Euro 95", value: 95 },
  { name: "Euro 98", value: 98 },
  { name: "2,2,4-triméthylpentane", value: 100 },
  { name: "Super +", value: 110 },
  { name: "Benzène", value: 117 },
  { name: "Toluène", value: 119 },
];

/** Cracking of CnH2n+2 into an alkane CkH2k+2 and an alkene C(n−k)H2(n−k). */
export function cracking(n, k) {
  return { from: alkane(n), alkane: alkane(k), alkene: alkene(n - k) };
}
