import { test } from "node:test";
import assert from "node:assert/strict";
import { TYPES, LEVELS, generate, checkAnswer, answerText, parseProb, seeded } from "../biologie/genetique/exercises.js";
import {
  dominant, codominant, lethal, abo, xLinked, parseGenotype, parseGamete, genoKey, genoTex, cross, distribution,
  probability, ratio, fraction, probTex, percent, downRisk,
} from "../biologie/genetique/genetics.js";
import { MODES, possibleGenotypes, compatible, conflicts, randomPedigree, personName } from "../biologie/genetique/pedigree.js";

const RUNS = 300;

function assertWellFormed(ex, label) {
  for (const t of ex.steps.map((s) => s.tex)) {
    let depth = 0;
    for (const ch of t.replace(/\\[{}]/g, "")) {
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      assert.ok(depth >= 0, `${label}: unbalanced "}" in ${t}`);
    }
    assert.equal(depth, 0, `${label}: unbalanced "{" in ${t}`);
    assert.ok(!/undefined|NaN|null|Infinity/.test(t), `${label}: ${t}`);
  }
  for (const t of [ex.text, ...ex.hints, ...ex.steps.map((s) => s.note), ...(ex.choices ?? [])]) {
    assert.equal(typeof t, "string", `${label}: ${t}`);
    assert.equal((t.match(/\$/g) ?? []).length % 2, 0, `${label}: unpaired $ in ${t}`);
    assert.ok(!/undefined|NaN|Infinity|\[object|null/.test(t), `${label}: ${t}`);
  }
}

for (const [id, { gen, level }] of Object.entries(TYPES)) {
  test(`${id}: ${RUNS} generated exercises are well formed and accept their answer`, () => {
    assert.ok(LEVELS.some((l) => l.id === level));
    for (let seed = 1; seed <= RUNS; seed++) {
      const ex = gen(seeded(seed));
      const label = `${id} #${seed}`;
      assert.equal(ex.type, id);
      assert.equal(ex.hints.length, 3, `${label}: exactly 3 hints`);
      assert.ok(ex.steps.length >= 3, `${label}: steps`);
      assert.ok(ex.text, `${label}: text`);
      assertWellFormed(ex, label);
      if (ex.choices) {
        assert.ok(ex.choices.length >= 2, `${label}: choices`);
        assert.equal(new Set(ex.choices).size, ex.choices.length, `${label}: duplicate choices`);
        assert.ok(checkAnswer(ex, String(ex.answers[0])).ok);
        for (let i = 0; i < ex.choices.length; i++) if (i !== ex.answers[0]) assert.ok(!checkAnswer(ex, String(i)).ok);
        continue;
      }
      const typed = answerText(ex);
      assert.ok(checkAnswer(ex, typed).ok, `${label}: ${typed}`);
      if (ex.kind === "prob") {
        const p = ex.answers[0];
        assert.ok(p > 0 && p < 1, `${label}: p = ${p}`);
        assert.ok(checkAnswer(ex, String(p).replace(".", ",")).ok, `${label}: decimal`);
        assert.ok(checkAnswer(ex, `${p * 100} %`).ok, `${label}: percent`);
        const tex = probTex(p), pc = percent(p);
        for (const h of ex.hints) assert.ok(!h.includes(tex) && !h.includes(pc), `${label}: hint gives ${tex}: ${h}`);
        assert.ok(!checkAnswer(ex, String(Math.min(1, p + 0.1))).ok || p + 0.1 > 1, `${label}: wrong accepted`);
      }
      if (ex.kind === "geno") {
        const g = parseGenotype(ex.genes, ex.answers[0]);
        assert.ok(g, `${label}: answer parses`);
        const tex = genoTex(g);
        for (const h of ex.hints) assert.ok(!h.includes(`$${tex}$`), `${label}: hint gives ${tex}`);
        assert.ok(checkAnswer(ex, [...typed].reverse().join("").replace(/([A-Za-z])X/g, "X$1")).values !== undefined);
      }
      if (ex.kind === "set") {
        assert.ok(ex.answers.length >= 1, `${label}: list`);
        assert.ok(checkAnswer(ex, [...ex.answers].reverse().join(" ; ")).ok, `${label}: order`);
        if (ex.answers.length > 1) assert.ok(!checkAnswer(ex, ex.answers.slice(1).join(", ")).ok, `${label}: partial accepted`);
      }
      if (ex.kind === "int" || ex.kind === "percent") assert.ok(!checkAnswer(ex, String(ex.answers[0] * 2 + 5)).ok);
      if (ex.pedigree) assert.ok(Object.keys(ex.pedigree.people).length >= 6);
    }
  });
}

test("levels and choices", () => {
  for (let i = 0; i < 50; i++) assert.equal(TYPES[generate("level:2", seeded(i)).type].level, 2);
  for (let i = 0; i < 20; i++) assert.equal(generate("gametes", seeded(i)).type, "gametes");
});

test("crosses and ratios", () => {
  const N = dominant("N", "noir", "blanc");
  const F1 = [["N", "n"]];
  assert.deepEqual(distribution([N], F1, F1).classes.map((c) => c.p), [0.75, 0.25]);
  assert.deepEqual(ratio(distribution([N], F1, F1, "geno").classes.map((c) => c.p)), [2, 1, 1]);
  const C = dominant("C", "court", "long");
  const di = [["N", "n"], ["C", "c"]];
  assert.deepEqual(ratio(distribution([N, C], di, di).classes.map((c) => c.p)), [9, 3, 3, 1]);
  const R = codominant(["R", "B"], "roux", "blanc", "rouan");
  assert.deepEqual(ratio(distribution([R], [["R", "B"]], [["R", "B"]]).classes.map((c) => c.p)), [2, 1, 1]);
  const Q = lethal("Q", "sans queue", "normale");
  const d = distribution([Q], [["Q", "q"]], [["Q", "q"]]);
  assert.equal(d.dead, 0.25);
  assert.deepEqual(ratio(d.classes.map((c) => c.p)), [2, 1]);
  assert.equal(probability([abo()], [["A", "O"]], [["B", "O"]], (g) => genoKey(g) === "OO"), 0.25);
  const H = xLinked("H", ["hémophile", "hémophile"]);
  const kids = cross([H], [["XH", "Xh"]], [["XH", "Y"]]);
  assert.equal(kids.length, 4);
  assert.deepEqual(fraction(0.1875), [3, 16]);
  assert.equal(probTex(1 / 16), "\\frac{1}{16}");
});

test("genotype parsing", () => {
  const N = dominant("N", "noir", "blanc");
  assert.equal(genoKey(parseGenotype([N], "nN")), "Nn");
  assert.equal(parseGenotype([N], "NNn"), null);
  assert.equal(genoKey(parseGenotype([abo()], "0A")), "AO");
  const H = xLinked("H", ["hémophile", "hémophile"]);
  assert.equal(genoKey(parseGenotype([H], "Y Xh")), "XhY");
  assert.equal(genoKey(parseGenotype([H], "X^hX^H")), "XHXh");
  assert.equal(parseGenotype([H], "YY"), null);
  const C = dominant("C", "court", "long");
  assert.deepEqual(parseGamete([N, C], "cN"), ["N", "c"]);
  assert.equal(parseGamete([N, C], "NC c"), null);
});

test("answers", () => {
  for (const t of ["1/4", "0,25", "25 %", "25%", "1 sur 4", "0.25"]) assert.equal(parseProb(t), 0.25, t);
  const ex = { kind: "set", item: "group", answers: ["A", "B", "AB", "O"] };
  assert.ok(checkAnswer(ex, "0, BA, b et a").ok);
  assert.equal(checkAnswer(ex, "A, B").missing, 2);
  assert.equal(checkAnswer(ex, "A, Z").values, null);
});

test("pedigrees", () => {
  // Two healthy parents, one affected son: recessive only.
  const tree = {
    people: { f: { sex: "m", aff: false, g: 0, n: 1 }, m: { sex: "f", aff: false, g: 0, n: 2 }, k: { sex: "m", aff: true, g: 1, n: 1 } },
    families: [{ parents: ["f", "m"], kids: ["k"] }],
  };
  assert.ok(compatible(tree, "AR") && compatible(tree, "XR"));
  assert.ok(!compatible(tree, "AD") && !compatible(tree, "XD"));
  assert.equal(conflicts(tree, "AD").length, 1);
  assert.deepEqual(possibleGenotypes(tree, "AR").m, ["Aa"]);
  assert.deepEqual(possibleGenotypes(tree, "XR").m, ["XAXa"]);
  assert.equal(personName(tree.people.k), "II-1");
  for (const mode of ["AD", "AR", "XR", "XD"]) {
    const { tree: t, genotypes } = randomPedigree(seeded(3), mode, []);
    const sets = possibleGenotypes(t, mode);
    for (const id of Object.keys(t.people)) assert.ok(sets[id].includes(genotypes[id]), `${mode} ${id}`);
    assert.ok(Object.values(t.people).every((p) => Number.isFinite(p.x) && p.n >= 1));
  }
  assert.ok(MODES.Y.aff("XYm"));
});

test("Down syndrome risk", () => {
  assert.equal(downRisk(20), 1550);
  assert.equal(downRisk(40), 100);
  assert.ok(downRisk(37) < 375 && downRisk(37) > 100);
  assert.equal(downRisk(50), 25);
});
