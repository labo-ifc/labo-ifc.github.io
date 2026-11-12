// Pedigrees: modes of inheritance, genotypes compatible with a family tree,
// random trees for the trainer, automatic layout. Pure: no DOM.
//
// A tree is { people: { id: { sex: "m" | "f" | "?", aff, x, g, n } }, families: [{ parents: [a, b], kids: [ids] }] }.
// x is a column (one per symbol), g the generation (0 = I); n the number shown under the symbol.

/** Child genotypes of a mother and a father (sorted: dominant allele first). */
function autosomalKids(m, f) {
  const out = new Set();
  for (const a of m) for (const b of f) out.add([a, b].sort().join(""));
  return [...out];
}

// Genotype keys: "AA", "Aa", "aa"; "XAXa", "XaY"; Y: "XY" or "XYm".
const splitX = (k) => k.match(/X[Aa]|Y|Ym/g);

/** Modes of inheritance: possible genotypes by sex, who is affected, children of a couple. */
export const MODES = {
  AD: {
    label: "Autosomique dominante",
    geno: () => ["AA", "Aa", "aa"],
    aff: (k) => k.includes("A"),
    kids: (m, f) => autosomalKids(m, f),
  },
  AR: {
    label: "Autosomique récessive",
    geno: () => ["AA", "Aa", "aa"],
    aff: (k) => k === "aa",
    kids: (m, f) => autosomalKids(m, f),
  },
  XR: {
    label: "Liée à X, récessive",
    geno: (sex) => (sex === "m" ? ["XAY", "XaY"] : ["XAXA", "XAXa", "XaXa"]),
    aff: (k) => !k.includes("XA"),
    kids: (m, f, sex) => xKids(m, f, sex),
  },
  XD: {
    label: "Liée à X, dominante",
    geno: (sex) => (sex === "m" ? ["XAY", "XaY"] : ["XAXA", "XAXa", "XaXa"]),
    aff: (k) => k.includes("XA"),
    kids: (m, f, sex) => xKids(m, f, sex),
  },
  Y: {
    label: "Liée à Y",
    geno: (sex) => (sex === "m" ? ["XY", "XYm"] : ["XX"]),
    aff: (k) => k === "XYm",
    kids: (m, f, sex) => (sex === "m" ? [f] : ["XX"]),
  },
};

function xKids(m, f, sex) {
  const [fx] = splitX(f);
  const out = new Set();
  for (const a of splitX(m)) out.add(sex === "m" ? `${a}Y` : [a, fx].sort().join(""));
  return [...out];
}

/** TeX of a pedigree genotype key: "XAXa" → "X^{A}X^{a}", "XYm" → "XY^{m}". */
export function pedigreeTex(key) {
  return key.replace(/X([Aa])/g, "X^{$1}").replace("Ym", "Y^{m}");
}

const motherFather = (tree, fam) => {
  const [a, b] = fam.parents;
  return tree.people[a].sex === "f" ? [a, b] : [b, a];
};

/** Genotypes an individual may have from its own phenotype only (unborn or unknown: no constraint). */
function ownCandidates(mode, p) {
  const all = p.sex === "?" ? [] : mode.geno(p.sex);
  return p.aff === undefined ? all : all.filter((k) => mode.aff(k) === p.aff);
}

/** One family: parent pairs that can give every child, and the child genotypes they allow. */
function familyPairs(mode, tree, fam, cand) {
  const [m, f] = motherFather(tree, fam);
  const kids = fam.kids.filter((k) => tree.people[k].sex !== "?");
  const pairs = [];
  for (const gm of cand[m]) {
    for (const gf of cand[f]) {
      const ok = kids.every((k) => mode.kids(gm, gf, tree.people[k].sex).some((g) => cand[k].includes(g)));
      if (ok) pairs.push([gm, gf]);
    }
  }
  return { m, f, kids, pairs };
}

/**
 * Genotypes each individual may have under a mode, the tree as a whole being taken into
 * account (constraints propagated family by family until nothing changes; exact on trees
 * without consanguinity loops). An empty list somewhere means the mode is impossible.
 */
export function possibleGenotypes(tree, modeId) {
  const mode = MODES[modeId];
  const cand = Object.fromEntries(Object.entries(tree.people).map(([id, p]) => [id, ownCandidates(mode, p)]));
  for (let changed = true, guard = 0; changed && guard < 50; guard++) {
    changed = false;
    for (const fam of tree.families) {
      const { m, f, kids, pairs } = familyPairs(mode, tree, fam, cand);
      const keep = (id, list) => {
        if (list.length !== cand[id].length) { cand[id] = list; changed = true; }
      };
      keep(m, cand[m].filter((g) => pairs.some((p) => p[0] === g)));
      keep(f, cand[f].filter((g) => pairs.some((p) => p[1] === g)));
      for (const k of kids) {
        const sex = tree.people[k].sex;
        keep(k, cand[k].filter((g) => pairs.some(([gm, gf]) => mode.kids(gm, gf, sex).includes(g))));
      }
    }
  }
  return cand;
}

/** True when the tree can be explained by the mode. */
export function compatible(tree, modeId) {
  const sets = possibleGenotypes(tree, modeId);
  return Object.entries(tree.people).every(([id, p]) => p.sex === "?" || sets[id].length > 0);
}

/** Families that contradict the mode on their own (parents and children only). */
export function conflicts(tree, modeId) {
  const mode = MODES[modeId];
  const cand = Object.fromEntries(Object.entries(tree.people).map(([id, p]) => [id, ownCandidates(mode, p)]));
  return tree.families.filter((fam) => familyPairs(mode, tree, fam, cand).pairs.length === 0);
}

// ───────────── random trees for the trainer ─────────────

const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const randInt = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));

/** A founder's genotype: the disease allele is fairly common so that the tree shows it. */
function founder(rng, modeId, sex, carrier) {
  const mode = MODES[modeId];
  if (modeId === "Y") return sex === "m" && carrier ? "XYm" : sex === "m" ? "XY" : "XX";
  const list = mode.geno(sex);
  // carrier = the founder brings the disease allele, as in the course's examples.
  const ill = modeId === "AD" || modeId === "XD" ? "A" : "a";
  const has = list.filter((k) => (ill === "A" ? k.includes("A") : k.includes("a")));
  const without = list.filter((k) => !has.includes(k));
  if (!carrier) return without[0];
  // Mostly heterozygous carriers: homozygous founders would make the tree trivial.
  const het = has.filter((k) => /Aa|XAXa/.test(k));
  return het.length && rng() < 0.85 ? pick(rng, het) : pick(rng, has);
}

/** One child drawn at random: one allele from each parent. */
function child(rng, modeId, gm, gf, sex) {
  if (modeId === "AD" || modeId === "AR") {
    const a = pick(rng, [gm[0], gm[1]]), b = pick(rng, [gf[0], gf[1]]);
    return [a, b].sort().join("");
  }
  if (modeId === "XR" || modeId === "XD") {
    const a = pick(rng, splitX(gm));
    return sex === "m" ? `${a}Y` : [a, splitX(gf)[0]].sort().join("");
  }
  return MODES[modeId].kids(gm, gf, sex)[0];
}

/**
 * A three-generation family drawn under `modeId`, kept only when none of the modes in
 * `excluded` can explain it: { tree, genotypes }.
 */
export function randomPedigree(rng, modeId, excluded = []) {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const r = buildFamily(rng, modeId);
    const affected = Object.values(r.tree.people).filter((p) => p.aff).length;
    if (affected < 3 || affected > Object.keys(r.tree.people).length - 4) continue;
    if (!compatible(r.tree, modeId)) continue;
    if (excluded.some((m) => compatible(r.tree, m))) continue;
    return r;
  }
  throw new Error(`no tree for ${modeId}`);
}

function buildFamily(rng, modeId) {
  const people = {};
  const families = [];
  const genotypes = {};
  let next = 0;
  const add = (sex, g, geno) => {
    const id = `p${next++}`;
    people[id] = { sex, g, aff: MODES[modeId].aff(geno) };
    genotypes[id] = geno;
    return id;
  };
  const sexes = () => (rng() < 0.5 ? "m" : "f");

  // Generation I: one parent brings the allele.
  const recessive = modeId === "AR" || modeId === "XR";
  const fromFather = modeId === "Y" ? true : rng() < 0.5;
  // Two carriers in generation I: needed to tell a dominant trait from a recessive one.
  const both = modeId !== "Y" && rng() < (modeId === "AR" ? 0.6 : 0.5);
  const father = add("m", 0, founder(rng, modeId, "m", fromFather || both));
  const mother = add("f", 0, founder(rng, modeId, "f", !fromFather || both));
  const top = { parents: [father, mother], kids: [] };
  families.push(top);

  const nKids = randInt(rng, 3, 5);
  for (let i = 0; i < nKids; i++) {
    const sex = sexes();
    top.kids.push(add(sex, 1, child(rng, modeId, genotypes[mother], genotypes[father], sex)));
  }
  // Two or three children of generation II have a family of their own.
  const married = [...top.kids].sort(() => rng() - 0.5).slice(0, randInt(rng, 2, 3));
  for (const kid of top.kids) {
    if (!married.includes(kid)) continue;
    const sex = people[kid].sex === "m" ? "f" : "m";
    // Spouses mostly bring no disease allele, sometimes they do.
    const spouse = add(sex, 1, founder(rng, modeId, sex, modeId !== "Y" && rng() < (recessive ? 0.45 : 0.3)));
    const fam = { parents: people[kid].sex === "m" ? [kid, spouse] : [spouse, kid], kids: [] };
    const [gm, gf] = people[kid].sex === "f" ? [genotypes[kid], genotypes[spouse]] : [genotypes[spouse], genotypes[kid]];
    const n = randInt(rng, 2, 4);
    for (let i = 0; i < n; i++) {
      const s = sexes();
      fam.kids.push(add(s, 2, child(rng, modeId, gm, gf, s)));
    }
    fam.spouse = spouse;
    families.push(fam);
  }
  const tree = { people, families };
  layout(tree);
  return { tree, genotypes };
}

/**
 * Columns for a three-generation tree built as above: each child of generation II takes a
 * block wide enough for its own children, its spouse beside it; generation I is centred.
 */
export function layout(tree) {
  const [top, ...below] = tree.families;
  let x = 0;
  for (const kid of top.kids) {
    const fam = below.find((f) => f.parents.includes(kid));
    if (!fam) { tree.people[kid].x = x++; continue; }
    const width = Math.max(2, fam.kids.length);
    const start = x + (width - 2) / 2;
    const spouse = fam.parents.find((p) => p !== kid);
    // Husband on the left, wife on the right.
    const [left, right] = tree.people[kid].sex === "m" ? [kid, spouse] : [spouse, kid];
    tree.people[left].x = start;
    tree.people[right].x = start + 1;
    fam.kids.forEach((k, i) => { tree.people[k].x = x + (width - fam.kids.length) / 2 + i; });
    x += width + 0.5;
  }
  const xs = top.kids.map((k) => tree.people[k].x);
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
  tree.people[top.parents[0]].x = mid - 0.5;
  tree.people[top.parents[1]].x = mid + 0.5;
  // Numbers per generation, left to right.
  for (const g of [0, 1, 2]) {
    Object.values(tree.people).filter((p) => p.g === g).sort((a, b) => a.x - b.x).forEach((p, i) => { p.n = i + 1; });
  }
  return tree;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
/** "II-3": generation and number of an individual. */
export const personName = (p) => `${ROMAN[p.g]}-${p.n}`;
export { ROMAN };
