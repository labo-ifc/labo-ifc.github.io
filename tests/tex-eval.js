// Numeric evaluator for the TeX written by exp-log/exercises.js, used by the tests to
// check every step of every solution. Only the subset the generators produce is read;
// anything else throws, so a new notation makes the tests fail instead of being skipped.

/** Thrown for a name with no value (Δ, Y_1, P(2)…): that member of an equality is left out. */
export class Unknown extends Error {}

const COMMANDS = ["frac", "tfrac", "dfrac", "sqrt", "ln", "log", "cdot", "times", "left", "right", "big", "Big", "sin", "cos", "Delta", "%"];
const SPACES = /^\\[,;!]|^\\quad(?![a-z])|^\s+/;

function tokenize(tex) {
  const out = [];
  let s = tex;
  while (s.length) {
    let m;
    if ((m = s.match(SPACES))) { s = s.slice(m[0].length); continue; }
    if ((m = s.match(/^\d{1,3}(?:\\,\d{3})+(?:\{,\}\d+)?/) ?? s.match(/^\d+(?:\{,\}\d+|\.\d+)?/))) {
      const text = m[0].replace(/\\,/g, "").replace("{,}", ".");
      out.push({ t: "num", v: Number(text), decimals: (text.split(".")[1] ?? "").length });
      s = s.slice(m[0].length);
      continue;
    }
    if ((m = s.match(/^\\([a-zA-Z]+|%)/))) {
      if (!COMMANDS.includes(m[1])) throw new Error(`unsupported TeX command \\${m[1]} in ${tex}`);
      out.push({ t: "cmd", v: m[1] });
      s = s.slice(m[0].length);
      continue;
    }
    if (/^[a-zA-Z]/.test(s)) { out.push({ t: "id", v: s[0] }); s = s.slice(1); continue; }
    if (/^[-+^_(){}[\]']/.test(s)) { out.push({ t: s[0] }); s = s.slice(1); continue; }
    throw new Error(`unsupported character "${s[0]}" in ${tex}`);
  }
  return out;
}

const VARS = new Set(["x", "y", "t", "i", "Y", "u"]);

/** Parses one member (no = sign) into a function of the environment { x, Y, …, fns }. */
export function compile(tex) {
  const toks = tokenize(tex);
  let pos = 0;
  const peek = () => toks[pos];
  const isCmd = (v) => peek()?.t === "cmd" && peek().v === v;
  const expect = (t) => {
    if (peek()?.t !== t) throw new Error(`expected "${t}" at ${pos} in ${tex}`);
    pos++;
  };
  const group = () => {
    expect("{");
    const e = expr();
    expect("}");
    return e;
  };

  function expr() {
    let left = term();
    while (peek()?.t === "+" || peek()?.t === "-") {
      const op = toks[pos++].t, l = left, r = term();
      left = op === "+" ? (env) => l(env) + r(env) : (env) => l(env) - r(env);
    }
    return left;
  }

  const startsAtom = (k) => k && (k.t === "num" || k.t === "id" || k.t === "(" || k.t === "{"
    || (k.t === "cmd" && ["frac", "tfrac", "dfrac", "sqrt", "ln", "log", "left", "sin", "cos", "Delta"].includes(k.v))
    || (k.t === "cmd" && ["big", "Big"].includes(k.v) && ["(", "["].includes(toks[pos + 1]?.t)));

  function term() {
    let left = unary();
    for (;;) {
      if (isCmd("cdot") || isCmd("times")) pos++;
      else if (!startsAtom(peek())) break;
      const l = left, r = unary();
      left = (env) => l(env) * r(env);
    }
    return left;
  }

  function unary() {
    if (peek()?.t === "-") {
      pos++;
      const a = unary();
      return (env) => -a(env);
    }
    return power();
  }

  function exponent() {
    if (peek()?.t === "{") return group();
    const k = toks[pos++];
    if (k?.t === "num") {
      // ^23 never occurs: a single digit, the rest is a new factor.
      const digits = String(k.v);
      if (digits.length > 1) {
        toks.splice(pos, 0, { t: "num", v: Number(digits.slice(1)), decimals: 0 });
        return () => Number(digits[0]);
      }
      return () => k.v;
    }
    if (k?.t === "id") return variable(k.v);
    throw new Error(`bad exponent in ${tex}`);
  }

  function power() {
    let base = atom();
    if (isCmd("%")) {
      pos++;
      const b = base;
      base = (env) => b(env) / 100;
    }
    if (peek()?.t === "^") {
      pos++;
      const b = base, e = exponent();
      return (env) => b(env) ** e(env);
    }
    return base;
  }

  function variable(name) {
    if (name === "e") return () => Math.E;
    if (!VARS.has(name)) return () => { throw new Unknown(name); };
    return (env) => {
      if (env[name] === undefined) throw new Unknown(name);
      return env[name];
    };
  }

  function logArg() {
    const k = peek();
    if (k?.t === "(" || isCmd("left") || isCmd("big") || isCmd("Big")) {
      // As in the course, \log (x + 1)^2 is the logarithm of the square.
      const a = atom();
      if (peek()?.t !== "^") return a;
      pos++;
      const e = exponent();
      return (env) => a(env) ** e(env);
    }
    return power();
  }

  function atom() {
    const k = toks[pos++];
    if (!k) throw new Error(`unexpected end of ${tex}`);
    if (k.t === "num") return () => k.v;
    if (k.t === "id") {
      if (peek()?.t === "_") {
        pos++;
        exponent(); // Y_1, x_2: a name, not a value
        return () => { throw new Unknown(`${k.v}_`); };
      }
      if (peek()?.t === "(" && ["f", "C", "P"].includes(k.v)) {
        pos++;
        const arg = expr();
        expect(")");
        return (env) => {
          const fn = env.fns?.[k.v];
          if (!fn) throw new Unknown(k.v);
          return fn(arg(env));
        };
      }
      return variable(k.v);
    }
    if (k.t === "(") {
      const e = expr();
      expect(")");
      return e;
    }
    if (k.t === "{") {
      const e = expr();
      expect("}");
      return e;
    }
    if (k.t === "cmd") {
      switch (k.v) {
        case "frac": case "tfrac": case "dfrac": {
          const n = group(), d = group();
          return (env) => n(env) / d(env);
        }
        case "sqrt": {
          let index = () => 2;
          if (peek()?.t === "[") {
            pos++;
            const e = expr();
            expect("]");
            index = e;
          }
          const a = group();
          return (env) => a(env) ** (1 / index(env));
        }
        case "left": case "big": case "Big": {
          const open = toks[pos++]?.t;
          const close = { "(": ")", "[": "]" }[open];
          if (!close) throw new Error(`bad \\${k.v} in ${tex}`);
          const e = expr();
          if (!(isCmd("right") || isCmd("big") || isCmd("Big"))) throw new Error(`missing closing delimiter in ${tex}`);
          pos++;
          expect(close);
          return e;
        }
        case "sin": case "cos": {
          const a = power();
          return k.v === "sin" ? (env) => Math.sin(a(env)) : (env) => Math.cos(a(env));
        }
        case "Delta":
          return () => { throw new Unknown("Δ"); };
        case "ln": case "log": {
          let base = () => (k.v === "ln" ? Math.E : 10);
          if (k.v === "log" && peek()?.t === "_") {
            pos++;
            base = exponent();
          }
          let n = () => 1;
          if (peek()?.t === "^") {
            pos++;
            n = exponent();
          }
          const a = logArg();
          return (env) => (Math.log(a(env)) / Math.log(base(env))) ** n(env);
        }
      }
    }
    throw new Error(`unexpected "${k.v ?? k.t}" in ${tex}`);
  }

  const result = expr();
  if (pos !== toks.length) throw new Error(`trailing "${toks[pos].v ?? toks[pos].t}" in ${tex}`);
  return result;
}

/** Value of a member, or null when it names something without a value (Δ, Y_1…). */
export function evaluateTex(tex, env = {}) {
  try {
    return compile(tex)(env);
  } catch (e) {
    if (e instanceof Unknown) return null;
    throw e;
  }
}

/** Number of decimals of a member that is a plain number ("2{,}35" → 2), else null. */
export function literalDecimals(tex) {
  const toks = tokenize(tex);
  const k = toks[0]?.t === "-" ? toks[1] : toks[0];
  return toks.length === (toks[0]?.t === "-" ? 2 : 1) && k?.t === "num" ? k.decimals : null;
}

/** Splits "a = b \approx c" into members and the relation between each pair. */
export function splitChain(segment) {
  const members = [], relations = [];
  let depth = 0, start = 0;
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    if (ch === "{" && segment[i - 1] !== "\\") depth++;
    if (ch === "}" && segment[i - 1] !== "\\") depth--;
    if (depth) continue;
    if (ch === "=") {
      members.push(segment.slice(start, i));
      relations.push("=");
      start = i + 1;
    } else if (segment.startsWith("\\approx", i)) {
      members.push(segment.slice(start, i));
      relations.push("≈");
      start = i + "\\approx".length;
    }
  }
  members.push(segment.slice(start));
  return { members: members.map((m) => m.trim()), relations };
}

/** Parts of a step that are separate statements. */
export const splitSegments = (tex) =>
  tex.split(/\\;\\(?:Leftrightarrow|Rightarrow)\\;|\\(?:Leftrightarrow|Rightarrow)|\\text\{ ou \}|\\qquad|,\s*\\;/).map((s) => s.trim()).filter(Boolean);
