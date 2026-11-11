import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate, parse, evaluate, toTex, formatResult } from "../shared/calc.js";

const value = (text, ans) => {
  const r = calculate(text, ans);
  assert.ok(!r.error, `${text}: ${r.error}`);
  return r.value;
};
const close = (text, want, ans) => {
  const got = value(text, ans);
  assert.ok(Math.abs(got - want) <= 1e-12 * Math.max(1, Math.abs(want)), `${text} = ${got}, attendu ${want}`);
};

test("operations, priorities and signs", () => {
  close("1 + 2 × 3", 7);
  close("(1 + 2) * 3", 9);
  close("7 ÷ 2", 3.5);
  close("8 : 4 : 2", 1);
  close("2 - 3 - 4", -5);
  close("−2^2", -4);
  close("(-2)^2", 4);
  close("2^-1", 0.5);
  close("2^3^2", 512);
  close("2**10", 1024);
  close("3--2", 5);
  close("1,5 + 0.5", 2);
  close(",5 * 4", 2);
});

test("powers, roots, logarithms, constants", () => {
  close("5²", 25);
  close("2³", 8);
  close("√16", 4);
  close("√(9) + sqrt(16)", 7);
  close("racine(2)^2", 2);
  close("∛27", 3);
  close("∛(-8)", -2);
  close("8^(1/3)", 2);
  close("ln(e)", 1);
  close("ln e^2", Math.log(Math.E) ** 2);
  close("ln(e^2)", 2);
  close("log(1000)", 3);
  close("log 0,01", -2);
  close("log_2(8)", 3);
  close("log_2 32", 5);
  close("log_(1/2)(8)", -3);
  close("log_3(243)", 5);
  close("ln(5)/ln(2)", Math.log(5) / Math.log(2));
  close("exp(1)", Math.E);
  close("10^(-3)", 0.001);
  close("π", Math.PI);
  close("pi/2", Math.PI / 2);
});

test("implicit products", () => {
  close("2π", 2 * Math.PI);
  close("3(1 + 2)", 9);
  close("2√9", 6);
  close("(1+1)(2+2)", 8);
  close("2 ln(e)", 2);
  close("2e", 2 * Math.E);
});

test("missing closing parentheses are added at the end", () => {
  close("2 * (3 + 4", 14);
  close("ln(e^(2", 2);
});

test("Rép reuses the previous result", () => {
  close("Rép * 2", 10, 5);
  close("ans + 1", 6, 5);
  close("rep²", 25, 5);
  assert.match(calculate("Rép + 1").error, /Rép est vide/);
});

test("errors are explained in French", () => {
  const error = (text, pattern) => assert.match(calculate(text).error ?? "", pattern, text);
  error("", /vide/);
  error("1 / 0", /zéro/);
  error("0^-1", /zéro/);
  error("√(-4)", /négatif/);
  error("ln(0)", /strictement positif/);
  error("log(-1)", /strictement positif/);
  error("log_1(5)", /base/);
  error("log_(-2)(5)", /base/);
  error("(-4)^(1/2)", /non entier/);
  error("2 +", /incomplète/);
  error("2 3", /opérateur/);
  error("2)", /en trop/);
  error("()", /vides/);
  error("* 3", /mal formée/);
  error("ln -2", /parenthèse/);
  error("x + 1", /x n'a pas de valeur/);
  error("10^400", /trop grand/);
});

test("TeX follows what was typed", () => {
  const tex = (text) => toTex(parse(text));
  assert.equal(tex("log_2(8)"), "\\log_{2}\\left(8\\right)");
  assert.equal(tex("log_2 8"), "\\log_{2} 8");
  assert.equal(tex("ln 2"), "\\ln 2");
  assert.equal(tex("√(1,5)"), "\\sqrt{1{,}5}");
  assert.equal(tex("(1+2)/3"), "\\frac{1 + 2}{3}");
  assert.equal(tex("2^(1/2)"), "{2}^{\\frac{1}{2}}");
  assert.equal(tex("ln(2)^2"), "\\left(\\ln\\left(2\\right)\\right)^{2}");
  assert.equal(tex("3 - -2"), "3 - \\left(-2\\right)");
  assert.equal(tex("2π × Rép"), "2 \\pi \\times \\text{Rép}");
});

test("result formatting", () => {
  assert.deepEqual(formatResult(0.1 + 0.2), { text: "0,3", tex: "0{,}3", exact: true, scientific: false });
  assert.equal(formatResult(1 / 3).text, "0,3333333333");
  assert.equal(formatResult(1 / 3).exact, false);
  assert.equal(formatResult(Math.log(5) / Math.log(2)).text, "2,3219280949");
  assert.equal(formatResult(-0).text, "0");
  assert.equal(formatResult(2 ** 64).tex, "1{,}844674407 \\times 10^{19}");
  assert.equal(formatResult(2 ** 64).scientific, true);
  assert.equal(formatResult(1e-9).text, "1e-9");
});

test("x is a variable when evaluate gets a value, sin/cos/tan are known", () => {
  const node = parse("2x e^(x^2) + sin(x)");
  assert.ok(Math.abs(evaluate(node, 0, 1) - (2 * Math.E + Math.sin(1))) < 1e-12);
  assert.ok(Math.abs(calculate("cos(0) + tan(0)").value - 1) < 1e-12);
  assert.equal(toTex(parse("2x")), "2 x");
});

test("degrees with °", () => {
  assert.ok(Math.abs(calculate("cos(60°)").value - 0.5) < 1e-12);
  assert.ok(Math.abs(calculate("50·10·cos(30°)").value - 250 * Math.sqrt(3)) < 1e-9);
  assert.ok(Math.abs(calculate("sin 90°").value - 1) < 1e-12);
  assert.equal(toTex(parse("cos(60°)")), "\\cos\\left(60^\\circ\\right)");
});
