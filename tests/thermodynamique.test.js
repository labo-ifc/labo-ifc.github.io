import { test } from "node:test";
import assert from "node:assert/strict";
import { TYPES, LEVELS, generate, parseAnswer, checkAnswer, seeded } from "../physique/thermodynamique/exercises.js";
import {
  kinetic, potential, fallSpeed, riseHeight, fallState, heat, toKelvin, toCelsius, cosDeg, work, internalEnergyChange,
  FORMS, FORM_SITUATIONS, CONVERSIONS, HEAT_MODES, HEAT_SITUATIONS,
} from "../physique/thermodynamique/physics.js";

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
    assert.equal((t.match(/\$/g) ?? []).length % 2, 0, `${label}: unpaired $ in ${t}`);
    assert.ok(!/undefined|NaN|Infinity|\[object/.test(t), `${label}: ${t}`);
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
      assert.equal(ex.answers.length, 1);
      assert.ok(Number.isFinite(ex.answers[0]), `${label}: answer`);
      assertWellFormed(ex, label);
      if (ex.choices) {
        assert.ok(ex.choices.length >= 3, `${label}: choices`);
        assert.equal(new Set(ex.choices).size, ex.choices.length, `${label}: duplicate choices`);
        assert.ok(checkAnswer(ex, String(ex.answers[0])).ok);
        for (let i = 0; i < ex.choices.length; i++) if (i !== ex.answers[0]) assert.ok(!checkAnswer(ex, String(i)).ok);
        continue;
      }
      assert.ok(ex.unit, `${label}: unit`);
      const typed = String(Math.round(ex.answers[0] * 100) / 100).replace(".", ",");
      assert.ok(checkAnswer(ex, typed).ok, `${label}: ${typed}`);
      assert.ok(checkAnswer(ex, `${typed} ${ex.unit}`).ok, `${label}: ${typed} ${ex.unit}`);
      const a = String(Math.round(ex.answers[0] * 10) / 10).replace(".", ",");
      if (a.length > 1) for (const h of ex.hints) assert.ok(!h.includes(a), `${label}: hint gives ${a}: ${h}`);
      assert.ok(!checkAnswer(ex, String(ex.answers[0] * 1.5 + 3)).ok, `${label}: wrong accepted`);
    }
  });
}

test("mechanics", () => {
  assert.equal(kinetic(2, 3), 9);
  assert.ok(Math.abs(potential(1, 10) - 98.1) < 1e-9);
  assert.ok(Math.abs(kinetic(1, fallSpeed(5)) - potential(1, 5)) < 1e-9);
  assert.ok(Math.abs(riseHeight(fallSpeed(7)) - 7) < 1e-9);
  const s = fallState(2, 10, 0.8);
  assert.ok(Math.abs(s.ep + s.ec - s.em) < 1e-9);
  assert.ok(fallState(2, 10, 99).landed);
  assert.equal(fallState(2, 10, 99).h, 0);
});

test("heat, temperature, work, first law", () => {
  assert.equal(heat(2, 4185, 20, 30), 83700);
  assert.ok(heat(1, 450, 80, 20) < 0);
  assert.equal(toCelsius(toKelvin(25)), 25);
  assert.equal(cosDeg(90), 0);
  assert.equal(work(10, 5, 60), 25);
  assert.equal(internalEnergyChange(500, -200), 300);
});

test("notion data is consistent", () => {
  for (const s of FORM_SITUATIONS) assert.ok(FORMS[s.form], s.what);
  for (const s of HEAT_SITUATIONS) assert.ok(HEAT_MODES[s.mode], s.what);
  assert.equal(new Set(CONVERSIONS.map((c) => c.chain.join())).size, CONVERSIONS.length);
});

test("answers with units", () => {
  assert.deepEqual(parseAnswer("-1050 J", "J"), { value: -1050 });
  assert.deepEqual(parseAnswer("2,5 kJ", "J"), { value: 2500 });
  assert.deepEqual(parseAnswer("36 km/h", "m/s"), { value: 10 });
  assert.deepEqual(parseAnswer("1,2·10^5", "J"), { value: 120000 });
  assert.deepEqual(parseAnswer("250 g", "kg"), { value: 0.25 });
  assert.deepEqual(parseAnswer("12 m", "J"), { badUnit: "m" });
  assert.equal(parseAnswer("abc", "J"), null);
  assert.equal(parseAnswer("", "J"), null);
  for (let i = 0; i < 50; i++) assert.ok(generate("level:1", seeded(i)).choices);
  for (let i = 0; i < 50; i++) assert.equal(generate("work", seeded(i)).type, "work");
});
