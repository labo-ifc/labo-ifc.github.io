import { test } from "node:test";
import assert from "node:assert/strict";
import { TYPES, LEVELS, generate, parseAnswer, checkAnswer, seeded } from "../chimie/hydrocarbures/exercises.js";
import {
  alkane, alkene, molarMass, combustion, combustionAtoms, combustionEnthalpy, sigmaPi, chainHydrogens,
  addition, chainCe, ALKANE_BP, fractionOf, FRACTIONS, MONOMERS, cracking,
} from "../chimie/hydrocarbures/chem.js";

const RUNS = 300;

function assertWellFormed(ex, label) {
  for (const t of [ex.statement ?? "", ...ex.steps.map((s) => s.tex)]) {
    let depth = 0;
    for (const ch of t.replace(/\\[{}]/g, "")) {
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      assert.ok(depth >= 0, `${label}: unbalanced "}" in ${t}`);
    }
    assert.equal(depth, 0, `${label}: unbalanced "{" in ${t}`);
    assert.ok(!/undefined|NaN|null|Infinity|(?<![\d.])0\/2/.test(t), `${label}: ${t}`);
  }
  for (const t of [ex.text ?? "", ...ex.hints, ...ex.steps.map((s) => s.note)]) {
    assert.equal((t.match(/\$/g) ?? []).length % 2, 0, `${label}: unpaired $ in ${t}`);
    assert.ok(!/undefined|NaN|Infinity/.test(t), `${label}: ${t}`);
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
      assert.ok(ex.statement || ex.text, `${label}: statement`);
      assert.ok(ex.answers.length >= 1 && ex.answers.every(Number.isFinite), `${label}: answers`);
      assertWellFormed(ex, label);
      // The answer typed as shown (French decimals) is accepted.
      const typed = ex.answers.map((a) => String(Math.round(a * 100) / 100).replace(".", ",")).join(" ; ");
      assert.ok(checkAnswer(ex, typed).ok, `${label}: ${typed}`);
      // Hints never give the answer away.
      if (ex.answers.length > 1) for (const h of ex.hints) assert.ok(!h.includes(ex.answers.join(" ; ")), `${label}: ${h}`);
      else {
        const a = String(Math.round(ex.answers[0] * 10) / 10).replace(".", ",");
        if (a.length > 1) for (const h of ex.hints) assert.ok(!h.includes(a), `${label}: hint gives ${a}: ${h}`);
      }
      // A clearly wrong answer is refused.
      assert.ok(!checkAnswer(ex, ex.answers.map((a) => a * 1.5 + 3).join(";")).ok, `${label}: wrong accepted`);
    }
  });
}

test("balanced combustions conserve atoms, with the smallest integers", () => {
  for (const kind of ["complete", "co", "c"]) {
    for (let c = 1; c <= 20; c++) {
      for (const fuel of [alkane(c), ...(c > 1 ? [alkene(c)] : [])]) {
        const eq = combustion(fuel, kind);
        const { left, right } = combustionAtoms(eq);
        for (const el of ["C", "H", "O"]) assert.equal(left[el] ?? 0, right[el] ?? 0, `${kind} C${c}: ${el}`);
        assert.ok(eq.coefs.every(Number.isInteger));
        const gcd = (a, b) => (b ? gcd(b, a % b) : a);
        assert.equal(eq.coefs.reduce(gcd), 1, `${kind} C${c}: not simplified`);
      }
    }
  }
  assert.deepEqual(combustion(alkane(4)).coefs, [2, 13, 8, 10]);
  assert.deepEqual(combustion(alkane(1)).coefs, [1, 2, 1, 2]);
  assert.deepEqual(combustion(alkane(5), "co").coefs, [2, 11, 10, 12]);
  assert.deepEqual(combustion(alkane(5), "c").coefs, [1, 3, 5, 6]);
});

test("combustion enthalpies from bond energies", () => {
  assert.equal(combustionEnthalpy(1).dHPerMol, -814);
  assert.equal(combustionEnthalpy(3).dHPerMol, -2044);
  // Independent count per mole: (n−1) C–C, (2n+2) C–H, (3n+1)/2 O=O → n CO2, n+1 H2O.
  for (let c = 1; c <= 8; c++) {
    const rupture = (c - 1) * 346 + (2 * c + 2) * 413 + ((3 * c + 1) / 2) * 498;
    assert.equal(combustionEnthalpy(c).dHPerMol, rupture - (2 * c * 803 + 2 * (c + 1) * 464));
    const ruptureCO = (c - 1) * 346 + (2 * c + 2) * 413 + ((2 * c + 1) / 2) * 498;
    assert.equal(combustionEnthalpy(c, "co").dHPerMol, ruptureCO - (c * 1062 + 2 * (c + 1) * 464));
  }
});

test("σ and π bonds", () => {
  assert.deepEqual(sigmaPi([3]), { sigma: 3, pi: 2 }); // CH≡CH
  assert.deepEqual(sigmaPi([1, 1, 2]), { sigma: 11, pi: 1 }); // CH3-CH2-CH=CH2
  assert.deepEqual(sigmaPi([2]), { sigma: 5, pi: 1 });
  assert.deepEqual(chainHydrogens([2, 1]), [2, 1, 3]);
});

test("additions on alkenes", () => {
  assert.equal(chainCe([2, 1]), "CH2=CH-CH3");
  assert.equal(addition([2, 1], "H2O").ce, "CH3-CH(OH)-CH3");
  assert.equal(addition([2], "H2O").ce, "CH3-CH2OH");
  assert.equal(addition([2, 1], "H2").ce, "CH3-CH2-CH3");
  assert.equal(addition([2], "Br2").ce, "CH2Br-CH2Br");
  for (const r of ["H2", "H2O", "Cl2", "Br2"]) {
    for (let c = 2; c <= 6; c++) {
      const orders = [2, ...Array(c - 2).fill(1)];
      const p = addition(orders, r);
      assert.equal(molarMass(p.formula), molarMass(alkene(c)) + { H2: 2, H2O: 18, Cl2: 71, Br2: 160 }[r]);
    }
  }
});

test("refining data and cracking", () => {
  for (let c = 2; c <= 30; c++) assert.ok(ALKANE_BP[c] > ALKANE_BP[c - 1]);
  assert.equal(fractionOf(ALKANE_BP[3]).id, "gaz");
  assert.equal(fractionOf(ALKANE_BP[8]).id, "essence");
  assert.equal(fractionOf(ALKANE_BP[30]).id, "residus");
  assert.equal(FRACTIONS.length, 5);
  const k = cracking(16, 8);
  assert.equal(k.alkane.C + k.alkene.C, 16);
  assert.equal(k.alkane.H + k.alkene.H, 34);
  assert.equal(molarMass(MONOMERS.find((m) => m.id === "PE").formula), 28);
});

test("answers", () => {
  assert.deepEqual(parseAnswer("2 ; 13 ; 8 ; 10"), [2, 13, 8, 10]);
  assert.deepEqual(parseAnswer("−2044 kJ/mol"), [-2044]);
  assert.deepEqual(parseAnswer("1,5 t"), [1.5]);
  assert.deepEqual(parseAnswer("1,2·10^6"), [1200000]);
  assert.deepEqual(parseAnswer("13/2"), [6.5]);
  assert.equal(parseAnswer("abc"), null);
  assert.equal(parseAnswer(""), null);
  const ex = TYPES.combComplete.gen(seeded(3));
  const doubled = ex.answers.map((a) => 2 * a).join(";");
  const r = checkAnswer(ex, doubled);
  assert.ok(!r.ok && r.proportional);
  for (let i = 0; i < 50; i++) assert.ok(generate("level:2", seeded(i)).kind === "coefs");
});
