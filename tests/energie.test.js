import { test } from "node:test";
import assert from "node:assert/strict";
import { energyProblem, checkStep, parseFormula, parseValue } from "../chimie/hydrocarbures/energy-steps.js";
import { combustionEnthalpy } from "../chimie/hydrocarbures/chem.js";

const asText = (v) => (typeof v === "number" ? String(v).replace(".", ",") : v);
const expectedInputs = (step) => Object.fromEntries(Object.entries(step.expected).map(([k, v]) => [k, asText(v)]));

for (const kind of ["complete", "co"]) {
  for (let n = 1; n <= 10; n++) {
    test(`C${n} ${kind}: every step accepts its expected answer and matches chem.js`, () => {
      const p = energyProblem(n, kind);
      assert.equal(p.steps.length, 6);
      p.steps.forEach((step, i) => {
        const r = checkStep(p, i, expectedInputs(step));
        assert.ok(r.ok, `${step.id}: ${r.message}`);
        assert.ok(!/undefined|NaN/.test(step.answerTex + step.task + step.fields.map((f) => f.label).join()), step.id);
      });
      const ref = combustionEnthalpy(n, kind);
      assert.equal(p.rupture, ref.rupture);
      assert.equal(p.formation, ref.formation);
      assert.equal(p.dHPerMol, ref.dHPerMol);
      assert.ok(p.dH < 0);
    });
  }
}

test("propane, complete: values of the course method", () => {
  const p = energyProblem(3, "complete");
  assert.deepEqual(p.steps[1].expected, { a: 1, o: 5, p: 3, w: 4 });
  assert.deepEqual(p.steps[3].expected, { cc: 2, ch: 8, oo: 5, cx: 6, ho: 8 });
  assert.equal(p.dH, 2 * 346 + 8 * 413 + 5 * 498 - (6 * 803 + 8 * 464));
});

test("butane, CO: integer coefficients", () => {
  const p = energyProblem(4, "co");
  assert.deepEqual(p.steps[1].expected, { a: 2, o: 9, p: 8, w: 10 });
  assert.equal(p.dHPerMol, p.dH / 2);
});

test("formulas and numbers typed by students", () => {
  assert.deepEqual(parseFormula("c₃h₈"), { C: 3, H: 8 });
  assert.deepEqual(parseFormula("CH4"), { C: 1, H: 4 });
  assert.equal(parseFormula("NaCl"), null);
  assert.equal(parseValue("−2 042,5 kJ/mol"), -2042.5);
  assert.ok(Number.isNaN(parseValue("abc")));
});

test("useful messages for typical mistakes", () => {
  const p = energyProblem(4, "co");
  const eq = checkStep(p, 0, { fuel: "C4H10", carbon: "CO2", water: "H2O" });
  assert.deepEqual(eq.wrong, ["carbon"]);
  assert.ok(checkStep(p, 0, { fuel: "C4H10", carbon: "H2O", water: "CO" }).ok, "products in either order");

  assert.match(checkStep(p, 1, { a: "1", o: "4,5", p: "4", w: "5" }).message, /entiers/);
  assert.match(checkStep(p, 1, { a: "4", o: "18", p: "16", w: "20" }).message, /simplifie/);
  assert.match(checkStep(p, 1, { a: "2", o: "13", p: "8", w: "10" }).message, /O ne sont pas/);

  assert.match(checkStep(p, 3, { cc: "3", ch: "10", oo: "9", cx: "8", ho: "20" }).message, /une seule molécule/);
  const { rupture, formation, dH, dHPerMol } = p;
  assert.match(checkStep(p, 4, { rupture: String(formation), formation: String(rupture) }).message, /inversé/);
  assert.match(checkStep(p, 5, { dH: String(-dH), dHPerMol: String(-dHPerMol) }).message, /signe/);
  assert.match(checkStep(p, 5, { dH: String(dH), dHPerMol: String(dH) }).message, /divise/);
  assert.ok(checkStep(p, 5, { dH: "", dHPerMol: "1" }).unreadable);
});
