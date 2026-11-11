// Calculator engine: parses text like "log_2(8) + √3 · 2^-1", evaluates it with
// French error messages, and renders it as TeX. No DOM, no eval: testable in node.
//
// Syntax: + − × ÷ ^ ² ³, parentheses (missing ")" are closed at the end),
// implicit products (2π, 3(1+2), 2√3), decimal comma or point,
// functions √ ∛ ln log exp sin cos tan (log_a(x) for base a), constants π, e and Rép (last result),
// degrees with ° (cos(60°): angles are in radians otherwise),
// and the variable x when `evaluate` gets a value for it (derivatives typed as answers).

export class CalcError extends Error {}

const NAMES = [
  ["racine", "sqrt"], ["sqrt", "sqrt"], ["cbrt", "cbrt"], ["exp", "exp"], ["ln", "ln"], ["log", "log"],
  ["sin", "sin"], ["cos", "cos"], ["tan", "tan"],
  ["pi", "pi"], ["ans", "ans"], ["rép", "ans"], ["rep", "ans"], ["e", "e"], ["x", "x"],
];
const FUNCTIONS = new Set(["sqrt", "cbrt", "exp", "ln", "log", "sin", "cos", "tan"]);
const SYMBOLS = {
  "+": "+", "-": "-", "−": "-", "–": "-", "*": "*", "×": "*", "·": "*", "/": "/", "÷": "/", ":": "/",
  "^": "^", "(": "(", ")": ")", "²": "²", "³": "³", "_": "_", "π": "pi", "√": "sqrt", "∛": "cbrt", "°": "°",
};

function tokenize(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    const space = rest.match(/^\s+/);
    if (space) { i += space[0].length; continue; }
    const num = rest.match(/^(\d+(?:[.,]\d+)?|[.,]\d+)/);
    if (num) {
      tokens.push({ t: "num", value: Number(num[0].replace(",", ".")) });
      i += num[0].length;
      continue;
    }
    if (rest.startsWith("**")) { tokens.push({ t: "^" }); i += 2; continue; }
    const sym = SYMBOLS[text[i]];
    if (sym) {
      tokens.push(FUNCTIONS.has(sym) ? { t: "fn", name: sym } : sym === "pi" ? { t: "const", name: sym } : { t: sym });
      i++;
      continue;
    }
    const lower = rest.toLowerCase();
    const known = NAMES.find(([word]) => lower.startsWith(word));
    if (known) {
      const name = known[1];
      tokens.push(FUNCTIONS.has(name) ? { t: "fn", name } : { t: "const", name });
      i += known[0].length;
      continue;
    }
    const word = rest.match(/^\p{L}+/u)?.[0] ?? text[i];
    throw new CalcError(`Je ne connais pas « ${word} »`);
  }
  return tokens;
}

const startsOperand = (tok) => tok && (tok.t === "num" || tok.t === "const" || tok.t === "fn" || tok.t === "(");

/** Text → syntax tree. Throws CalcError. */
export function parse(text) {
  const tokens = tokenize(text);
  if (!tokens.length) throw new CalcError("Expression vide");
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const incomplete = () => new CalcError("Expression incomplète");

  function expr() {
    let node = term();
    while (peek()?.t === "+" || peek()?.t === "-") node = { type: "bin", op: next().t, l: node, r: term() };
    return node;
  }

  function term() {
    let node = unary();
    for (;;) {
      const tok = peek();
      if (tok?.t === "*" || tok?.t === "/") node = { type: "bin", op: next().t, l: node, r: unary() };
      else if (startsOperand(tok)) {
        if (tok.t === "num") throw new CalcError("Il manque un opérateur entre deux nombres");
        node = { type: "bin", op: "*", implicit: true, l: node, r: power() };
      } else return node;
    }
  }

  function unary() {
    if (peek()?.t === "-") { next(); return { type: "neg", arg: unary() }; }
    if (peek()?.t === "+") { next(); return unary(); }
    return power();
  }

  function power() {
    let node = primary();
    for (;;) {
      if (peek()?.t === "°") { next(); node = { type: "deg", arg: node }; }
      else if (peek()?.t === "²" || peek()?.t === "³") node = { type: "bin", op: "^", l: node, r: { type: "num", value: next().t === "²" ? 2 : 3 } };
      else break;
    }
    if (peek()?.t === "^") { next(); return { type: "bin", op: "^", l: node, r: unary() }; }
    return node;
  }

  function group() {
    next(); // "("
    const arg = expr();
    if (peek()?.t === ")") next();
    else if (peek()) throw new CalcError("Parenthèse fermante attendue");
    return { type: "paren", arg };
  }

  // Argument of a function or base of log_: a parenthesis, or a lone number or constant (ln 2, √3).
  function atom(what) {
    const tok = peek();
    if (!tok) throw incomplete();
    if (tok.t === "(") return group();
    // A lone number keeps its ° (sin 30°).
    const deg = (node) => (peek()?.t === "°" ? (next(), { type: "deg", arg: node }) : node);
    if (tok.t === "num") { next(); return deg({ type: "num", value: tok.value }); }
    if (tok.t === "const") { next(); return deg({ type: "const", name: tok.name }); }
    throw new CalcError(`Il faut une parenthèse après ${what}`);
  }

  function primary() {
    const tok = peek();
    if (!tok) throw incomplete();
    if (tok.t === "num") { next(); return { type: "num", value: tok.value }; }
    if (tok.t === "const") { next(); return { type: "const", name: tok.name }; }
    if (tok.t === "(") return group();
    if (tok.t === "fn") {
      next();
      const label = { sqrt: "√", cbrt: "∛" }[tok.name] ?? tok.name;
      if (tok.name === "log" && peek()?.t === "_") {
        next();
        const base = atom("log_");
        return { type: "log", base, arg: atom(`log_${base.type === "paren" ? "(…)" : "a"}`) };
      }
      return { type: "fn", name: tok.name, arg: atom(label) };
    }
    if (tok.t === ")") throw new CalcError(tokens[pos - 1]?.t === "(" ? "Parenthèses vides" : "Parenthèse fermante en trop");
    throw new CalcError("Expression mal formée");
  }

  const tree = expr();
  if (pos < tokens.length) throw new CalcError(peek().t === ")" ? "Parenthèse fermante en trop" : "Expression mal formée");
  return tree;
}

/** Syntax tree → number. `ans` is the previous result (undefined if none), `x` the variable's value. Throws CalcError. */
export function evaluate(node, ans, x) {
  const ev = (n) => evaluate(n, ans, x);
  switch (node.type) {
    case "num": return node.value;
    case "paren": return ev(node.arg);
    case "neg": return -ev(node.arg);
    case "deg": return (ev(node.arg) * Math.PI) / 180;
    case "const":
      if (node.name === "pi") return Math.PI;
      if (node.name === "e") return Math.E;
      if (node.name === "x") {
        if (x === undefined) throw new CalcError("x n'a pas de valeur : la calculatrice calcule avec des nombres");
        return x;
      }
      if (ans === undefined) throw new CalcError("Rép est vide : fais d'abord un calcul");
      return ans;
    case "fn": {
      const v = ev(node.arg);
      switch (node.name) {
        case "sqrt":
          if (v < 0) throw new CalcError("Pas de racine carrée réelle d'un nombre négatif");
          return Math.sqrt(v);
        case "cbrt": return Math.cbrt(v);
        case "exp": return finite(Math.exp(v));
        case "sin": return Math.sin(v);
        case "cos": return Math.cos(v);
        case "tan": return finite(Math.tan(v));
        case "ln":
        case "log":
          if (v <= 0) throw new CalcError(`${node.name} n'existe que pour un nombre strictement positif`);
          return node.name === "ln" ? Math.log(v) : Math.log10(v);
      }
      break;
    }
    case "log": {
      const a = ev(node.base), x = ev(node.arg);
      if (a <= 0 || a === 1) throw new CalcError("La base d'un logarithme doit être > 0 et ≠ 1");
      if (x <= 0) throw new CalcError("Un logarithme n'existe que pour un nombre strictement positif");
      return Math.log(x) / Math.log(a);
    }
    case "bin": {
      const l = ev(node.l), r = ev(node.r);
      switch (node.op) {
        case "+": return finite(l + r);
        case "-": return finite(l - r);
        case "*": return finite(l * r);
        case "/":
          if (r === 0) throw new CalcError("Division par zéro");
          return finite(l / r);
        case "^":
          if (l === 0 && r < 0) throw new CalcError("0 à une puissance négative : division par zéro");
          if (l < 0 && !Number.isInteger(r)) throw new CalcError("Base négative et exposant non entier : pas de résultat réel");
          return finite(l ** r);
      }
    }
  }
  throw new CalcError("Expression mal formée");
}

function finite(v) {
  if (!Number.isFinite(v)) throw new CalcError("Résultat trop grand");
  return v;
}

const frNum = (v) => String(v).replace(".", ",");
const texNum = (v) => frNum(v).replace(",", "{,}");
const unwrap = (n) => (n.type === "paren" ? n.arg : n);

/** Syntax tree → TeX, close to what the user typed. */
export function toTex(node) {
  switch (node.type) {
    case "num": return texNum(node.value);
    case "const": return { pi: "\\pi", e: "e", x: "x", ans: "\\text{Rép}" }[node.name];
    case "paren": return `\\left(${toTex(node.arg)}\\right)`;
    case "neg": return `-${toTex(node.arg)}`;
    case "deg": return `${toTex(node.arg)}^\\circ`;
    case "fn": {
      const arg = toTex(node.arg), inner = toTex(unwrap(node.arg));
      if (node.name === "sqrt") return `\\sqrt{${inner}}`;
      if (node.name === "cbrt") return `\\sqrt[3]{${inner}}`;
      if (node.name === "exp") return `e^{${inner}}`;
      return `\\${node.name}${node.arg.type === "paren" ? arg : ` ${arg}`}`;
    }
    case "log": return `\\log_{${toTex(unwrap(node.base))}}${node.arg.type === "paren" ? "" : " "}${toTex(node.arg)}`;
    case "bin": {
      const l = toTex(node.l);
      const r = toTex(node.r);
      if (node.op === "/") return `\\frac{${toTex(unwrap(node.l))}}{${toTex(unwrap(node.r))}}`;
      if (node.op === "^") {
        const wrap = ["bin", "neg", "log"].includes(node.l.type) || (node.l.type === "fn" && !["sqrt", "cbrt"].includes(node.l.name));
        return `${wrap ? `\\left(${l}\\right)` : `{${l}}`}^{${toTex(unwrap(node.r))}}`;
      }
      if (node.op === "*") return node.implicit ? `${l} ${r}` : `${l} \\times ${r}`;
      const right = node.r.type === "neg" ? `\\left(${r}\\right)` : r;
      return `${l} ${node.op} ${right}`;
    }
  }
  return "";
}

/**
 * Result for display: text (French decimal comma, reusable as an answer), TeX,
 * and whether it is rounded. Very large or small numbers use scientific notation.
 */
export function formatResult(v) {
  if (Object.is(v, -0) || Math.abs(v) < 1e-300) v = 0;
  const abs = Math.abs(v);
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-6)) {
    const [mantissa, exponent] = v.toExponential(9).split("e");
    const m = frNum(Number(mantissa));
    const exp = Number(exponent);
    return { text: `${m}e${exp}`, tex: `${m.replace(",", "{,}")} \\times 10^{${exp}}`, exact: Number(v.toExponential(9)) === v, scientific: true };
  }
  const shown = Number(v.toFixed(10));
  const clean = Number(shown.toPrecision(12)); // drops float noise: 0.1 + 0.2 → 0.3
  const exact = Math.abs(clean - v) <= 1e-12 * Math.max(1, abs);
  return { text: frNum(clean), tex: texNum(clean), exact, scientific: false };
}

/** One-shot helper: { value, tex, result } or { error }. */
export function calculate(text, ans) {
  try {
    const tree = parse(text);
    const value = evaluate(tree, ans);
    return { value, tex: toTex(tree), result: formatResult(value) };
  } catch (e) {
    if (e instanceof CalcError) return { error: e.message };
    throw e;
  }
}
