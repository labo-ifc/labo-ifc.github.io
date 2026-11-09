// Every step of every generated solution is checked numerically, not only the final answer:
// each equality of a step must hold at the solutions, the Δ, Horner and ± computations are
// redone, the final set must match `solutions`, and no root of the equation may be missing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { TYPES, seeded } from "../maths/exp-log/exercises.js";
import { compile, evaluateTex, literalDecimals, splitChain, splitSegments } from "./tex-eval.js";

const RUNS = 2000;
const close = (a, b, rel = 1e-9) => Math.abs(a - b) <= rel * Math.max(1, Math.abs(a), Math.abs(b));

/** Steps that state conditions or rejections rather than equalities. */
const isCondition = (s) => /\\text\{C\.E\.|\\checkmark|[<>]|\\neq|\\leq|\\geq|rejetée/.test(s.tex) || s.note.startsWith("Impossible");
/** From this step on, an equality may hold for one root only. */
const isBranch = (tex) => /\\pm|\\text\{ ou \}|\\Delta|_1|\\begin\{array\}/.test(tex);

/** Checks one chain "a = b ≈ c" at env; returns false when it does not hold, null when nothing to compare. */
function chainHolds(segment, env) {
  const { members, relations } = splitChain(segment);
  const values = members.map((m) => evaluateTex(m, env));
  let compared = false;
  for (let i = 0; i < relations.length; i++) {
    const [a, b] = [values[i], values[i + 1]];
    if (a === null || b === null) continue;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    compared = true;
    if (relations[i] === "=") {
      if (!close(a, b)) return false;
    } else {
      const d = literalDecimals(members[i + 1]) ?? literalDecimals(members[i]);
      const tol = d === null ? 1e-6 * Math.max(1, Math.abs(a)) : 0.5 * 10 ** -d + 1e-9 * Math.max(1, Math.abs(a));
      if (Math.abs(a - b) > tol) return false;
    }
  }
  return compared ? true : null;
}

/** "Y_1 = 4, Y_2 = -2" in a step with "\frac{5 \pm 3}{2}": the two signs must give these roots. */
function checkPlusMinus(tex, label) {
  const seg = splitSegments(tex).find((s) => s.includes("\\pm"));
  const rhs = splitChain(seg).members.at(-1);
  const both = ["+", "-"].map((op) => evaluateTex(rhs.replace("\\pm", op))).sort((p, q) => p - q);
  const named = [...tex.matchAll(/_[12] = ([^,]+?)(?=,|$)/g)].map((m) => evaluateTex(m[1].replace(/\\;$/, "").trim())).sort((p, q) => p - q);
  assert.equal(named.length, 2, `${label}: roots after ± in ${tex}`);
  assert.ok(close(both[0], named[0]) && close(both[1], named[1]), `${label}: ${tex}`);
}

/** Horner table: each sum, each product by the root, and a zero remainder. */
function checkHorner(tex, label) {
  const body = tex.replace(/^\\begin\{array\}\{[^}]*\}/, "").replace(/\\end\{array\}$/, "");
  const rows = body.split(/\\\\(?: \\hline)?/).map((r) => r.split("&").map((c) => c.trim()));
  const [top, mid, bottom] = rows;
  const r = Number(mid[0]);
  const coefs = top.slice(1).map(Number), products = mid.slice(2).map(Number), q = bottom.slice(1).map(Number);
  assert.ok(close(q[0], coefs[0]), `${label}: Horner first column`);
  for (let i = 1; i < coefs.length; i++) {
    assert.ok(close(products[i - 1], r * q[i - 1]), `${label}: Horner product ${i}`);
    assert.ok(close(q[i], coefs[i] + products[i - 1]), `${label}: Horner sum ${i}`);
  }
  assert.ok(close(q.at(-1), 0), `${label}: Horner remainder`);
}

/** "S = \{a \, ; \, b\}" → values. */
function setValues(tex) {
  if (/\\emptyset/.test(tex)) return [];
  const inner = tex.replace(/^S = (\\left)?\\\{/, "").replace(/(\\right)?\\\}$/, "");
  return inner.split("\\, ; \\,").map((item) => evaluateTex(item.trim()));
}

/** Y as defined by a note "On pose $Y = …$", as a function of the environment. */
function substitution(ex) {
  for (const s of ex.steps) {
    const m = s.note.match(/On pose \$Y = ([^$]+)\$/);
    if (m) return compile(m[1]);
  }
  return null;
}

/** Functions defined by a step "f(t) = …" or "C(t) = …" (problems). */
function functions(ex) {
  const fns = {};
  for (const s of ex.steps) {
    const m = s.tex.match(/^([fC])\(t\) = (.+)$/);
    if (m) {
      const body = compile(m[2]);
      fns[m[1]] = (t) => body({ t });
    }
  }
  return fns;
}

/** Environment in which the steps of `ex` are checked, for one of its solutions. */
function environment(ex, sol, Ydef, fns) {
  const env = { x: sol, y: sol, fns };
  // Problems: the solution is a time only when the steps solve for t.
  if (!ex.text || ex.steps.some((s) => /^t[ =]/.test(s.tex))) env.t = sol;
  if (ex.type === "interest") env.i = sol / 100;
  if (Ydef) env.Y = Ydef(env);
  return env;
}

function checkDerivative(ex, label) {
  const [fStep, uStep, dStep] = ex.steps;
  const F = compile(fStep.tex.replace(/^f\(x\) = /, ""));
  const [uTex, duTex] = uStep.tex.split("\\qquad").map((s) => s.replace(/^\s*u'? = /, "").trim());
  const U = compile(uTex), dU = compile(duTex);
  const D = compile(dStep.tex.replace(/^f'\(x\) = /, ""));
  const S = compile(ex.statement.replace(/^f\(x\) = /, ""));
  const h = 1e-5;
  for (const x of ex.points) {
    assert.ok(close(F({ x }), ex.f(x), 1e-9), `${label}: f(${x})`);
    assert.ok(close(S({ x }), ex.f(x), 1e-9), `${label}: statement at ${x}`);
    const slope = (U({ x: x + h }) - U({ x: x - h })) / (2 * h);
    assert.ok(close(dU({ x }), slope, 1e-5), `${label}: u'(${x})`);
    assert.ok(close(D({ x }), ex.derivative(x), 1e-9), `${label}: f'(${x})`);
  }
}

/** lhs − rhs of the statement, to look for roots the generator may have missed. */
function statementGap(ex) {
  if (ex.text || ex.prompt === "Calcule") return null;
  const { members } = splitChain(ex.statement);
  if (members.length !== 2) return null;
  const [l, r] = members.map(compile);
  return (x) => l({ x }) - r({ x });
}

const GRID = [
  ...Array.from({ length: 8001 }, (_, i) => -20 + i * 0.005),
  ...Array.from({ length: 1201 }, (_, i) => 10 ** (-6 + i * 0.01)),
].sort((p, q) => p - q);

/** Every sign change of the statement on GRID must be next to a listed solution. */
function checkNoMissingRoot(ex, label) {
  const gap = statementGap(ex);
  if (!gap) return;
  let prev = null, prevX = null;
  for (const x of GRID) {
    let v;
    try {
      v = gap(x);
    } catch {
      v = NaN;
    }
    if (Number.isFinite(v) && Number.isFinite(prev) && Math.sign(v) !== Math.sign(prev) && prev !== 0) {
      // A jump across a pole (log x² near 0) is not a root.
      const mid = gap((x + prevX) / 2);
      const jump = Math.abs(v - prev) > 1e3;
      if (!jump && Number.isFinite(mid)) {
        assert.ok(ex.solutions.some((s) => s >= prevX - 1e-6 && s <= x + 1e-6),
          `${label}: root between ${prevX} and ${x} is not in S = {${ex.solutions.join(" ; ")}}`);
      }
    }
    if (Number.isFinite(v)) [prev, prevX] = [v, x];
    else [prev, prevX] = [null, null];
  }
}

for (const [id, { gen }] of Object.entries(TYPES)) {
  test(`${id}: every step of ${RUNS} solutions is mathematically right`, () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const ex = { prompt: "", approx: false, ...gen(seeded(seed)) };
      const label = `${id} #${seed} (${ex.statement})`;
      if (ex.kind === "expr") {
        checkDerivative(ex, label);
        continue;
      }
      const Ydef = substitution(ex);
      const fns = functions(ex);
      const envs = ex.solutions.map((s) => environment(ex, s, Ydef, fns));
      if (!envs.length) envs.push({ fns });
      let branched = false;
      for (const s of ex.steps) {
        if (s.tex.startsWith("S =")) {
          const got = setValues(s.tex).sort((p, q) => p - q);
          const want = [...ex.solutions].sort((p, q) => p - q);
          assert.equal(got.length, want.length, `${label}: ${s.tex}`);
          got.forEach((g, i) => assert.ok(close(g, want[i]), `${label}: ${s.tex} vs ${want}`));
          continue;
        }
        if (s.tex.startsWith("\\begin{array}")) {
          checkHorner(s.tex, label);
          continue;
        }
        branched ||= isBranch(s.tex);
        if (isCondition(s)) continue;
        if (s.tex.includes("\\pm")) checkPlusMinus(s.tex, label);
        for (const seg of splitSegments(s.tex)) {
          if (seg.includes("\\pm") || /^[A-Za-z]_[12] = /.test(seg)) continue;
          const results = envs.map((env) => chainHolds(seg, env));
          if (results.every((r) => r === null)) continue;
          const ok = branched ? results.some((r) => r === true) : results.every((r) => r !== false);
          assert.ok(ok, `${label}: step "${seg}" fails (${s.note})`);
        }
      }
      if (seed <= 300) checkNoMissingRoot(ex, label);
    }
  });
}

test("hints: exactly three, none of which gives the final answer", () => {
  for (const [id, { gen }] of Object.entries(TYPES)) {
    for (let seed = 1; seed <= RUNS; seed++) {
      const ex = { approx: false, ...gen(seeded(seed)) };
      const label = `${id} #${seed} (${ex.statement})`;
      assert.equal(ex.hints.length, 3, `${label}: ${ex.hints.length} hints`);
      for (const h of ex.hints) {
        assert.ok(!/S = /.test(h), `${label}: hint gives the set: ${h}`);
        for (const [, v, rhs] of h.matchAll(/\$([xt]) = ([^$]+)\$/g)) {
          const value = evaluateTex(rhs);
          assert.ok(value === null || !ex.solutions.some((s) => close(s, value)), `${label}: hint gives ${v}: ${h}`);
        }
      }
    }
  }
});
