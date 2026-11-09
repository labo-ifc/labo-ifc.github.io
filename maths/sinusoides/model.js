// Pure math: no DOM, no libraries. Everything here is covered by tests/.
//
// Convention used throughout: y = A·sin(ωx − φ) + D

export const TAU = 2 * Math.PI;

/** Wrap an angle into (−π, π]. */
export function normalizeAngle(a) {
  let r = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  if (r <= -Math.PI) r += TAU;
  return r;
}

export function evaluateSinusoid({ A, omega, phi, D }, xs) {
  return xs.map((x) => A * Math.sin(omega * x - phi) + D);
}

/** Phase of the equivalent cosine form: A·sin(ωx − φ) = A·cos(ωx − (φ + π/2)). */
export function cosPhase(phi) {
  return normalizeAngle(phi + Math.PI / 2);
}

/** Period, plus the peak closest to x = 0 (where ωx − φ = π/2 + 2πk). */
export function derived({ omega, phi }) {
  const T = TAU / omega;
  const first = (phi + Math.PI / 2) / omega;
  const xPeak = first - Math.round(first / T) * T;
  return { T, xPeak };
}

/**
 * Least squares for a fixed ω: y ≈ a·sin(ωx) + b·cos(ωx) + c.
 * Solves the 3×3 normal equations directly.
 */
function linearFit(xs, ys, omega) {
  let ss = 0, sc = 0, s1 = 0, cc = 0, c1 = 0, n = xs.length;
  let ys_ = 0, yc = 0, y1 = 0;
  for (let i = 0; i < n; i++) {
    const s = Math.sin(omega * xs[i]);
    const c = Math.cos(omega * xs[i]);
    const y = ys[i];
    ss += s * s; sc += s * c; s1 += s;
    cc += c * c; c1 += c;
    ys_ += y * s; yc += y * c; y1 += y;
  }
  const coef = solve3(
    [[ss, sc, s1], [sc, cc, c1], [s1, c1, n]],
    [ys_, yc, y1],
  );
  if (!coef) return null;
  const [a, b, c] = coef;
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const r = ys[i] - (a * Math.sin(omega * xs[i]) + b * Math.cos(omega * xs[i]) + c);
    sse += r * r;
  }
  return { a, b, c, sse };
}

/** Cramer's rule; returns null for a (near-)singular system. */
function solve3(M, v) {
  const det = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const d = det(M);
  if (!Number.isFinite(d) || Math.abs(d) < 1e-12) return null;
  return [0, 1, 2].map((col) => det(M.map((row, i) => row.map((x, j) => (j === col ? v[i] : x)))) / d);
}

/**
 * Fit y = A·sin(ωx − φ) + D to sampled data.
 *
 * ω is found by scanning the residual over a grid (a Lomb–Scargle style
 * periodogram, which needs no FFT and no evenly spaced samples), then refined
 * with a golden-section search. A, φ and D then come out of the linear fit.
 *
 * Returns { A, omega, phi, D, r2 } with A > 0 and φ in (−π, π], or null when
 * there is not enough usable data.
 */
export function fitSinusoid(xsIn, ysIn, { omegaMax = 30 } = {}) {
  const xs = [], ys = [];
  for (let i = 0; i < xsIn.length; i++) {
    if (Number.isFinite(ysIn[i])) { xs.push(xsIn[i]); ys.push(ysIn[i]); }
  }
  if (xs.length < 10) return null;

  const mean = ys.reduce((s, y) => s + y, 0) / ys.length;
  const sst = ys.reduce((s, y) => s + (y - mean) ** 2, 0);
  if (sst < 1e-12) return null;

  const span = xs[xs.length - 1] - xs[0];
  // Need a full period in view (otherwise a parabola or a line passes for a
  // sinusoid), and stay under the sampling limit.
  const omegaMin = TAU / span;
  const nyquist = Math.PI / ((span / (xs.length - 1)) * 2);
  const hi = Math.min(omegaMax, nyquist);
  const step = Math.PI / span / 8; // well under the width of a residual dip

  let best = null;
  for (let w = omegaMin; w <= hi; w += step) {
    const f = linearFit(xs, ys, w);
    if (f && (!best || f.sse < best.sse)) best = { ...f, omega: w };
  }
  if (!best) return null;

  // Golden-section refinement of ω around the best grid point.
  const sse = (w) => linearFit(xs, ys, w)?.sse ?? Infinity;
  let lo = Math.max(omegaMin, best.omega - step), up = Math.min(hi, best.omega + step);
  const g = (Math.sqrt(5) - 1) / 2;
  let x1 = up - g * (up - lo), x2 = lo + g * (up - lo);
  let f1 = sse(x1), f2 = sse(x2);
  for (let i = 0; i < 60; i++) {
    if (f1 < f2) { up = x2; x2 = x1; f2 = f1; x1 = up - g * (up - lo); f1 = sse(x1); }
    else { lo = x1; x1 = x2; f1 = f2; x2 = lo + g * (up - lo); f2 = sse(x2); }
  }
  const omega = (lo + up) / 2;
  const fit = linearFit(xs, ys, omega) ?? best;

  // a·sin + b·cos = A·sin(ωx − φ)  ⇒  a = A·cos φ, b = −A·sin φ
  const A = Math.hypot(fit.a, fit.b);
  const phi = normalizeAngle(Math.atan2(-fit.b, fit.a));
  return { A, omega, phi, D: fit.c, r2: 1 - fit.sse / sst };
}

/**
 * Point of the unit circle reached at abscissa x: θ = ωx − φ, reduced to
 * [0, 2π), with its cosine, sine and the curve value y = A·sin θ + D.
 */
export function circlePoint({ A, omega, phi, D }, x) {
  const raw = omega * x - phi;
  const theta = ((raw % TAU) + TAU) % TAU;
  const sin = Math.sin(raw), cos = Math.cos(raw);
  return { theta, cos, sin, y: A * sin + D };
}
