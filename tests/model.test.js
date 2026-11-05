import { test } from "node:test";
import assert from "node:assert/strict";
import { linspace } from "../shared/numeric.js";
import {
  normalizeAngle, evaluateSinusoid, fitSinusoid, cosPhase, derived,
} from "../sinusoides/model.js";
import { piLabel, piTicks } from "../shared/ticks.js";

const xs = linspace(-10, 10, 1000);
const close = (a, b, tol = 1e-3) =>
  assert.ok(Math.abs(a - b) < tol, `expected ${b}, got ${a}`);

test("normalizeAngle wraps into (−π, π]", () => {
  close(normalizeAngle(3 * Math.PI), Math.PI);
  close(normalizeAngle(-Math.PI), Math.PI);
  close(normalizeAngle(-3 * Math.PI / 2), Math.PI / 2);
  close(normalizeAngle(0.5), 0.5);
});

test("fit recovers exact parameters, including off-grid ω", () => {
  for (const p of [
    { A: 2, omega: 3.3, phi: 0, D: 1 },
    { A: 0.5, omega: 0.7, phi: -1.2, D: -2 },
    { A: 4, omega: 9.1, phi: 2.5, D: 0 },
  ]) {
    const f = fitSinusoid(xs, evaluateSinusoid(p, xs));
    close(f.A, p.A); close(f.omega, p.omega); close(f.phi, p.phi); close(f.D, p.D);
    assert.ok(f.r2 > 0.9999);
  }
});

test("cos(x) is fitted as sin(x + π/2), whose cos form has phase 0", () => {
  const f = fitSinusoid(xs, xs.map(Math.cos));
  close(f.A, 1); close(f.omega, 1); close(f.phi, -Math.PI / 2); close(f.D, 0);
  close(cosPhase(f.phi), 0);
});

test("a negative amplitude becomes a phase shift", () => {
  const f = fitSinusoid(xs, xs.map((x) => -Math.sin(x)));
  close(f.A, 1); close(Math.abs(f.phi), Math.PI);
});

test("constant and too-short inputs give null", () => {
  assert.equal(fitSinusoid(xs, xs.map(() => 2)), null);
  assert.equal(fitSinusoid([1, 2, 3], [1, 2, 3]), null);
});

test("non-finite samples are ignored", () => {
  const ys = xs.map((x, i) => (i % 7 === 0 ? NaN : Math.sin(2 * x)));
  close(fitSinusoid(xs, ys).omega, 2);
});

test("a parabola gets a poor R²", () => {
  assert.ok(fitSinusoid(xs, xs.map((x) => x * x)).r2 < 0.95);
});

test("derived gives the period and the peak nearest 0", () => {
  const { T, xPeak } = derived({ omega: 2, phi: 0 });
  close(T, Math.PI);
  close(xPeak, Math.PI / 4);
  close(Math.sin(2 * xPeak), 1);
});

test("piLabel formats simple fractions of π", () => {
  assert.equal(piLabel(0, 4), "0");
  assert.equal(piLabel(4, 4), "π");
  assert.equal(piLabel(-2, 4), "−π/2");
  assert.equal(piLabel(3, 4), "3π/4");
  assert.equal(piLabel(-6, 2), "−3π");
});

test("piTicks stays readable at every zoom level", () => {
  for (const [lo, hi] of [[-10, 10], [-1, 1], [0, 0.4], [-200, 200]]) {
    const { values, labels } = piTicks(lo, hi);
    assert.ok(values.length >= 2 && values.length <= 10, `${lo}..${hi}: ${values.length}`);
    assert.equal(values.length, labels.length);
    assert.ok(values.every((v) => v >= lo && v <= hi));
  }
  assert.deepEqual(piTicks(-4, 4).labels, ["−π", "−π/2", "0", "π/2", "π"]);
});

test("circlePoint reduces θ = ωx − φ to [0, 2π) and matches the curve", async () => {
  const { circlePoint } = await import("../sinusoides/model.js");
  const p = { A: 2.5, omega: 3, phi: -1.2, D: 0.7 };
  for (const x of [-9.3, -1, 0, 0.4, 7.77]) {
    const c = circlePoint(p, x);
    assert.ok(c.theta >= 0 && c.theta < 2 * Math.PI);
    close(Math.cos(c.theta), c.cos, 1e-9);
    close(Math.sin(c.theta), c.sin, 1e-9);
    close(c.cos ** 2 + c.sin ** 2, 1, 1e-12);
    close(c.y, evaluateSinusoid(p, [x])[0], 1e-9);
  }
  close(circlePoint({ A: 1, omega: 1, phi: 0, D: 0 }, -Math.PI / 2).theta, 3 * Math.PI / 2);
});
