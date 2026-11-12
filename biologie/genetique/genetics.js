// Mendelian genetics: genes, gametes, crosses, phenotypes, ratios. Pure: no DOM.
//
// A gene lists its allele tokens ("N", "n"; "A", "B", "O"; "XH", "Xh", "Y") and
// turns a pair of tokens into a phenotype label (null = the individual dies).
// A genotype is an array of pairs, one per gene, each pair in allele order.

/** Complete dominance: alleles [dominant, recessive]. */
export function dominant(letter, dom, rec, extra = {}) {
  const [A, a] = [letter.toUpperCase(), letter.toLowerCase()];
  return { kind: "dom", alleles: [A, a], names: { [A]: dom, [a]: rec }, dom, rec, ...extra, pheno: (p) => (p.includes(A) ? dom : rec) };
}

/** Incomplete dominance or codominance: both alleles show, heterozygotes are "mid". */
export function codominant([A, B], nameA, nameB, mid, extra = {}) {
  return {
    kind: "co", alleles: [A, B], names: { [A]: nameA, [B]: nameB }, mid, ...extra,
    pheno: (p) => (p[0] !== p[1] ? mid : p[0] === A ? nameA : nameB),
  };
}

/** Dominant allele lethal when homozygous (the 2:1 of the course). */
export function lethal(letter, dom, rec, extra = {}) {
  const g = dominant(letter, dom, rec, extra);
  const A = g.alleles[0];
  return { ...g, kind: "lethal", pheno: (p) => (p[0] === A && p[1] === A ? null : p.includes(A) ? dom : rec) };
}

/** ABO blood groups: A = B > O. */
export function abo() {
  return {
    kind: "abo", alleles: ["A", "B", "O"],
    pheno: (p) => (p.includes("A") && p.includes("B") ? "AB" : p.includes("A") ? "A" : p.includes("B") ? "B" : "O"),
  };
}

/**
 * X-linked recessive disease: alleles XH (normal, dominant), Xh, and Y for males.
 * `sick` / `well` are [masculine, feminine] adjectives.
 */
export function xLinked(letter, sick, well = ["sain", "saine"]) {
  const [H, h] = ["X" + letter.toUpperCase(), "X" + letter.toLowerCase()];
  return {
    kind: "x", alleles: [H, h, "Y"], letter: letter.toUpperCase(), sick, well,
    pheno: (p) => {
      const male = p.includes("Y");
      const ill = !p.includes(H);
      return male ? `garçon ${ill ? sick[0] : well[0]}` : `fille ${ill ? sick[1] : well[1]}`;
    },
  };
}

const order = (gene, pair) => [...pair].sort((x, y) => gene.alleles.indexOf(x) - gene.alleles.indexOf(y));

/** "Nn" → [["N", "n"]] for the given genes (tokens: one char, or X + letter, or Y). Null when unreadable. */
export function parseGenotype(genes, text) {
  const tokens = tokenize(genes, text);
  if (!tokens) return null;
  const geno = genes.map(() => []);
  for (const t of tokens) {
    const i = genes.findIndex((g) => g.alleles.includes(t));
    if (i < 0) return null;
    geno[i].push(t);
  }
  if (geno.some((p) => p.length !== 2)) return null;
  if (geno.some((p) => p[0] === "Y" && p[1] === "Y")) return null;
  return geno.map((p, i) => order(genes[i], p));
}

/** "Ab" → ["A", "b"], one token per gene in gene order. Null when unreadable. */
export function parseGamete(genes, text) {
  const tokens = tokenize(genes, text);
  if (!tokens || tokens.length !== genes.length) return null;
  const gam = genes.map(() => null);
  for (const t of tokens) {
    const i = genes.findIndex((g) => g.alleles.includes(t));
    if (i < 0 || gam[i]) return null;
    gam[i] = t;
  }
  return gam;
}

function tokenize(genes, text) {
  const hasX = genes.some((g) => g.kind === "x");
  const isAbo = genes.some((g) => g.kind === "abo");
  let t = text.replace(/[\s^{}()\/|\-–·.,;×*]/g, "");
  if (isAbo) t = t.replace(/0/g, "O");
  // Superscript letters typed from a keyboard map: Xᴴ → XH.
  t = t.replace(/[ᴬᴮᴰᴴᴺᵃᵇᵈʰⁿ]/g, (c) => ({ ᴬ: "A", ᴮ: "B", ᴰ: "D", ᴴ: "H", ᴺ: "N", ᵃ: "a", ᵇ: "b", ᵈ: "d", ʰ: "h", ⁿ: "n" })[c]);
  if (!t) return null;
  const out = [];
  for (let i = 0; i < t.length; i++) {
    if (hasX && t[i] === "X" && i + 1 < t.length) { out.push("X" + t[++i]); continue; }
    out.push(t[i]);
  }
  return out;
}

export const genoKey = (geno) => geno.map((p) => p.join("")).join("");

/** TeX of an allele token: XH → X^{H}. */
export const tokenTex = (t) => (t.length === 2 && t[0] === "X" ? `X^{${t[1]}}` : t);
/** TeX of a genotype: "Nn", "X^{H}X^{h}". */
export const genoTex = (geno) => geno.map((p) => p.map(tokenTex).join("")).join("");
/** TeX of a gamete (one token per gene). */
export const gameteTex = (gam) => gam.map(tokenTex).join("");

/** Gametes of a genotype, independent assortment: [{ gamete: [tokens], p }]. */
export function gametes(geno) {
  let out = [{ gamete: [], p: 1 }];
  for (const pair of geno) {
    const kinds = pair[0] === pair[1] ? [[pair[0], 1]] : [[pair[0], 0.5], [pair[1], 0.5]];
    out = out.flatMap(({ gamete, p }) => kinds.map(([t, q]) => ({ gamete: [...gamete, t], p: p * q })));
  }
  return out;
}

/** Distinct gametes of a genotype, as keys: AaBB → ["AB", "aB"]. */
export const gameteKeys = (geno) => gametes(geno).map((g) => g.gamete.join(""));

/** All offspring of a cross with their probability, merged by genotype. */
export function cross(genes, g1, g2) {
  const out = new Map();
  for (const a of gametes(g1)) {
    for (const b of gametes(g2)) {
      const geno = genes.map((gene, i) => order(gene, [a.gamete[i], b.gamete[i]]));
      // A Y can only come from the father; two Y never meet.
      if (geno.some((p) => p[0] === "Y" && p[1] === "Y")) continue;
      const key = genoKey(geno);
      const cur = out.get(key);
      if (cur) cur.p += a.p * b.p;
      else out.set(key, { geno, p: a.p * b.p });
    }
  }
  return [...out.values()];
}

/** Phenotype label of a genotype ("noir, poil court"), null if it dies. */
export function phenotype(genes, geno) {
  const parts = genes.map((g, i) => g.pheno(geno[i]));
  return parts.includes(null) ? null : parts.join(", ");
}

/**
 * Offspring grouped by phenotype ("pheno") or genotype ("geno"), among survivors:
 * { classes: [{ key, label, p }] (most frequent first), dead: share that dies }.
 */
export function distribution(genes, g1, g2, by = "pheno") {
  const kids = cross(genes, g1, g2);
  const dead = kids.filter((k) => phenotype(genes, k.geno) === null).reduce((s, k) => s + k.p, 0);
  const groups = new Map();
  for (const k of kids) {
    const label = phenotype(genes, k.geno);
    if (label === null) continue;
    const key = by === "geno" ? genoKey(k.geno) : label;
    const g = groups.get(key) ?? { key, label: by === "geno" ? genoKey(k.geno) : label, geno: k.geno, p: 0 };
    g.p += k.p / (1 - dead);
    groups.set(key, g);
  }
  const classes = [...groups.values()].sort((a, b) => b.p - a.p || a.key.localeCompare(b.key));
  return { classes, dead };
}

/** Probability that an offspring matches `test(geno)` (among survivors unless `all`). */
export function probability(genes, g1, g2, test, { all = false } = {}) {
  const kids = cross(genes, g1, g2);
  const alive = kids.filter((k) => all || phenotype(genes, k.geno) !== null);
  const total = alive.reduce((s, k) => s + k.p, 0);
  return alive.filter((k) => test(k.geno)).reduce((s, k) => s + k.p, 0) / total;
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** Smallest whole numbers in the same proportions: [0.75, 0.25] → [3, 1]. */
export function ratio(ps) {
  for (let d = 1; d <= 4096; d++) {
    const n = ps.map((p) => p * d);
    if (n.every((x) => Math.abs(x - Math.round(x)) < 1e-9)) {
      const ints = n.map(Math.round);
      const g = ints.reduce(gcd);
      return ints.map((x) => x / g);
    }
  }
  return ps;
}

/** Exact fraction of a probability: 0.1875 → [3, 16]. */
export function fraction(p) {
  for (let d = 1; d <= 4096; d++) {
    const n = p * d;
    if (Math.abs(n - Math.round(n)) < 1e-9) {
      const g = gcd(Math.round(n), d) || 1;
      return [Math.round(n) / g, d / g];
    }
  }
  return [p, 1];
}

/** TeX of a probability: 0.25 → "\frac{1}{4}", 1 → "1", 0 → "0". */
export function probTex(p) {
  const [n, d] = fraction(p);
  return d === 1 ? String(n) : `\\frac{${n}}{${d}}`;
}

/** Percentage for prose: 0.1875 → "18,75 %". */
export function percent(p) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(p * 100)} %`;
}

/** Random counts close to the expected proportions (Mendel-like data). */
export function sampleCounts(rng, ps, n) {
  const counts = ps.map(() => 0);
  for (let i = 0; i < n; i++) {
    let r = rng(), k = 0;
    while (k < ps.length - 1 && r >= ps[k]) r -= ps[k++];
    counts[k]++;
  }
  return counts;
}

// Down syndrome risk by maternal age (course table, middle of each range: 1 in N births).
export const DOWN_RISK = [
  { age: 20, oneIn: 1550 },
  { age: 30, oneIn: 950 },
  { age: 35, oneIn: 375 },
  { age: 40, oneIn: 100 },
  { age: 45, oneIn: 25 },
];

/** "1 in N" at any age from 20 to 45, interpolated geometrically between the table rows. */
export function downRisk(age) {
  const rows = DOWN_RISK;
  if (age <= rows[0].age) return rows[0].oneIn;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    if (age === b.age) return b.oneIn;
    if (age < b.age) {
      const t = (age - a.age) / (b.age - a.age);
      return Math.exp(Math.log(a.oneIn) + t * (Math.log(b.oneIn) - Math.log(a.oneIn)));
    }
  }
  return rows.at(-1).oneIn;
}
