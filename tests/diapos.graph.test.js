import { test } from "node:test";
import assert from "node:assert/strict";
import { compileFunction, niceStep, ticks, tickLabel, curvePath, mapper, orthonormal } from "../diapos/graph.js";
import { makeElement, cleanDeck, MAX_FUNCTIONS } from "../diapos/model.js";

const VIEW = { xmin: -5, xmax: 5, ymin: -5, ymax: 5 };
const segments = (d) => (d.match(/M/g) ?? []).length;

test("compileFunction reads calculator syntax and the f(x) = / y = prefix", () => {
  const f = compileFunction("f(x) = 2x^2 - 3");
  assert.equal(f.name, "f");
  assert.equal(f.fn(2), 5);
  assert.equal(compileFunction("y = 3x").name, "y");
  assert.equal(compileFunction("x+1").name, null);
  assert.equal(compileFunction("g(x)=√x").fn(9), 3);
  assert.ok(Math.abs(compileFunction("e^(-x)").fn(1) - Math.exp(-1)) < 1e-12);
  assert.ok(Number.isNaN(compileFunction("ln(x)").fn(-1)), "undefined points are NaN");
  assert.equal(compileFunction("2,5x").fn(2), 5, "decimal comma");
  assert.ok(compileFunction("f(x) = \\frac").error);
  assert.ok(compileFunction("2x+").error);
  assert.equal(compileFunction("  ").error, "Expression vide");
  assert.ok(compileFunction("1/x").tex.includes("\\frac"));
});

test("niceStep, ticks and French labels", () => {
  assert.equal(niceStep(10, 10), 1);
  assert.equal(niceStep(10, 4), 5);
  assert.equal(niceStep(3, 10), 0.5);
  assert.equal(niceStep(250, 10), 50);
  assert.deepEqual(ticks(-1, 1, 0.5), [-1, -0.5, 0, 0.5, 1]);
  assert.deepEqual(ticks(-0.3, 0.3, 0.1), [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3]);
  assert.deepEqual(ticks(5, 1, 1), []);
  assert.equal(tickLabel(-2.5), "−2,5");
  assert.equal(tickLabel(0.1 + 0.2), "0,3");
});

test("curvePath: one piece for continuous curves, cut at asymptotes and holes", () => {
  const path = (expr, view = VIEW) => curvePath(compileFunction(expr).fn, view, 800, 500);
  assert.equal(segments(path("x^2 - 2")), 1);
  assert.equal(segments(path("100x")), 1, "steep but continuous");
  assert.equal(segments(path("1/x")), 2);
  assert.equal(segments(path("tan(x)")), 5, "four asymptotes in [−5 ; 5]");
  assert.equal(segments(path("1/(x-0.3)")), 2, "asymptote between samples");
  assert.equal(segments(path("√(x)")), 1);
  assert.equal(path("x + 100"), "", "curve entirely above the window");
  assert.equal(path("ln(x)", { xmin: -5, xmax: -1, ymin: -5, ymax: 5 }), "", "undefined on the window");
  // Every point stays near the box, even for huge values.
  for (const [, y] of path("e^(10x)").matchAll(/[ML][\d.-]+ ([\d.-]+)/g)) assert.ok(+y >= -500 && +y <= 1000);
});

test("mapper and orthonormal window", () => {
  const { px, py } = mapper(VIEW, 800, 500);
  assert.equal(px(-5), 0);
  assert.equal(px(5), 800);
  assert.equal(py(5), 0);
  assert.equal(py(-5), 500);
  const o = orthonormal({ xmin: -8, xmax: 8, ymin: 0, ymax: 4 }, 800, 400);
  assert.deepEqual([o.ymin, o.ymax], [-2, 6]);
  assert.equal((o.xmax - o.xmin) / 800, (o.ymax - o.ymin) / 400);
});

test("graph elements: defaults are not shared, files are cleaned", () => {
  const a = makeElement("graph"), b = makeElement("graph");
  a.fns.push({ expr: "x", color: "text" });
  assert.equal(b.fns.length, 1, "defaults are deep-copied");

  const deck = cleanDeck({ slides: [{ elements: [
    { type: "graph", x: 0, y: 0, w: 500, h: 400, xmin: 3, xmax: -3, ymin: "a", ymax: 2,
      fns: [{ expr: "x^2", color: "rose" }, null, { expr: 42 }, ...Array(10).fill({ expr: "x", color: "text" })],
      grid: "oui", lineWidth: 999, color: "accent" },
  ] }] });
  const g = deck.slides[0].elements[0];
  assert.deepEqual([g.xmin, g.xmax], [-5, 5], "reversed range falls back to the default");
  assert.equal(g.ymin, -4);
  assert.equal(g.fns.length, MAX_FUNCTIONS, "non-objects dropped, at most MAX_FUNCTIONS kept");
  assert.deepEqual(g.fns[0], { expr: "x^2", color: "accent" }, "unknown colour role → accent");
  assert.equal(g.fns[1].expr, "");
  assert.equal(g.grid, true);
  assert.equal(g.lineWidth, 30);
  assert.equal(g.color, "accent");
});
