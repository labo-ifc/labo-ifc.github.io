// Calculator widget: input line, live preview, keypad and short history.
// The maths lives in calc.js; this file only builds and wires the DOM.
// Every part has a fixed size: a long or tall formula shrinks to fit its
// line, then scrolls, so the keypad never moves while typing.

import { calculate } from "./calc.js";
import { renderTex } from "./tex.js";

// [label, text inserted, tooltip]. "|" marks where the caret lands.
const KEYS = [
  ["ln", "ln(|)", "Logarithme népérien (base e)"],
  ["log", "log(|)", "Logarithme décimal (base 10)"],
  ["logₐ", "log_|()", "Logarithme de base a : log_2(8) = 3"],
  ["eˣ", "e^(|)", "e puissance x"],
  ["10ˣ", "10^(|)", "10 puissance x"],
  ["x²", "²", "Au carré"],
  ["xʸ", "^", "Puissance : 2^5"],
  ["√", "√(|)", "Racine carrée"],
  ["∛", "∛(|)", "Racine cubique"],
  ["ⁿ√", "^(1/|)", "Racine n-ième : x^(1/n)"],
  ["7"], ["8"], ["9"], ["(", "(", "Parenthèse ouvrante"], [")", ")", "Parenthèse fermante"],
  ["4"], ["5"], ["6"], ["×", "×", "Multiplier"], ["÷", "÷", "Diviser"],
  ["1"], ["2"], ["3"], ["+", "+", "Additionner"], ["−", "-", "Soustraire"],
  ["0"], [",", ",", "Virgule décimale"], ["π", "π", "Pi"], ["e", "e", "Nombre e ≈ 2,718"], ["Rép", "Rép", "Résultat précédent"],
];

const HISTORY_SIZE = 5;
const MIN_SCALE = 0.6; // a formula never shrinks below 60 % of its size: past that, it scrolls

const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

/**
 * A screen line of fixed size. Its content shrinks to fit, down to MIN_SCALE,
 * then scrolls; `scrollTo` says which end stays visible ("start" or "end").
 */
function screenLine(tag, className, scrollTo, props = {}) {
  const content = el("span", { className: "calc-fit" });
  const line = el(tag, { className, ...props }, content);

  function fit() {
    content.style.fontSize = "";
    let scale = 1;
    // Wrapped text reflows when it shrinks, hence a few passes.
    for (let pass = 0; pass < 3; pass++) {
      const ratio = Math.min(line.clientWidth / content.offsetWidth, line.clientHeight / content.offsetHeight);
      if (!(ratio < 1) || scale === MIN_SCALE) break; // also stops on NaN: line hidden or empty
      scale = Math.max(MIN_SCALE, scale * ratio * 0.98);
      content.style.fontSize = `${scale}em`;
    }
    line.scrollLeft = scrollTo === "end" ? line.scrollWidth : 0;
  }

  /** Shows TeX, or plain text with `asText`; `state` is an extra class on the line. */
  function show(value = "", { asText = false, state = "" } = {}) {
    line.className = state ? `${className} ${state}` : className;
    if (asText || !value) content.textContent = value;
    else renderTex(content, value);
    fit();
  }

  return { line, show, fit };
}

/**
 * Builds a calculator inside `root`. With `onUse(text)`, a button sends the
 * current result elsewhere (e.g. into an exercise's answer field).
 */
/** Function keys for physics (degrees): they replace the first two rows of KEYS. */
export const PHYSICS_KEYS = [
  ["x²", "²", "Au carré"],
  ["xʸ", "^", "Puissance : 2^5"],
  ["√", "√(|)", "Racine carrée"],
  ["10ˣ", "10^(|)", "10 puissance x"],
  ["ⁿ√", "^(1/|)", "Racine n-ième : x^(1/n)"],
  ["sin", "sin(|°)", "Sinus d'un angle en degrés : sin(30°)"],
  ["cos", "cos(|°)", "Cosinus d'un angle en degrés : cos(60°)"],
  ["tan", "tan(|°)", "Tangente d'un angle en degrés : tan(45°)"],
  ["°", "°", "Degrés (sans °, l'angle est en radians)"],
  ["ln", "ln(|)", "Logarithme népérien (base e)"],
];

/**
 * @param {HTMLElement} root
 * @param {object} [options]
 * @param {(text: string) => void} [options.onUse] "Utiliser comme réponse"
 * @param {Array} [options.functionKeys] 10 keys replacing the default function keys (ex. PHYSICS_KEYS)
 * @param {string} [options.placeholder] example shown in the empty input
 */
export function initCalculator(root, { onUse, functionKeys, placeholder = "ex. log_2(8)   ·   ln(5)/ln(2)" } = {}) {
  let ans; // last confirmed result, used by Rép
  let shown = null; // result on screen, what "Utiliser comme réponse" sends
  const history = [];

  const input = el("input", {
    type: "text",
    className: "calc-input",
    spellcheck: false,
    autocomplete: "off",
    placeholder,
    ariaLabel: "Calcul",
  });
  const preview = screenLine("div", "calc-line calc-preview", "end", { ariaHidden: "true" });
  const result = screenLine("output", "calc-line calc-result", "start", { ariaLive: "polite" });
  const use = el("button", { type: "button", className: "ghost calc-use", textContent: "→ Utiliser comme réponse", hidden: true });
  const keypad = el("div", { className: "calc-keys" });
  const historyList = el("ol", { className: "calc-history", ariaLabel: "Calculs précédents" });

  const keys = functionKeys ? [...functionKeys, ...KEYS.slice(10)] : KEYS;
  for (const [label, insert = label, title] of keys) {
    const key = el("button", { type: "button", textContent: label, title: title ?? "" });
    if (/^[\d,]$/.test(label)) key.className = "digit";
    key.dataset.insert = insert;
    keypad.append(key);
  }
  const clear = el("button", { type: "button", className: "action", textContent: "C", title: "Tout effacer (Échap)" });
  const back = el("button", { type: "button", className: "action", textContent: "⌫", title: "Effacer un caractère" });
  const equals = el("button", { type: "button", className: "primary equals", textContent: "=", title: "Calculer (Entrée)" });
  keypad.append(clear, back, equals);

  const screen = el("div", { className: "calc-screen" }, input, preview.line, result.line);
  root.classList.add("calculator");
  root.append(screen);
  // The button's row is always there, so showing the button moves nothing.
  if (onUse) root.append(el("div", { className: "calc-actions" }, use));
  root.append(keypad, historyList);

  // Refit when the width changes (narrow screens, calculator shown again)
  // and once KaTeX's fonts arrive, since they change the formulas' size.
  const refit = () => { preview.fit(); result.fit(); };
  new ResizeObserver(refit).observe(screen);
  document.fonts?.addEventListener("loadingdone", refit);

  /** Live view: TeX of what is typed and its value; errors only after "=". */
  function update(confirmed = false) {
    const text = input.value;
    use.hidden = true;
    shown = null;
    if (!text.trim()) {
      preview.show();
      result.show();
      return null;
    }
    const r = calculate(text, ans);
    if (r.error) {
      if (confirmed) {
        preview.show();
        result.show(r.error, { asText: true, state: "error" });
      } else {
        result.show("…", { asText: true, state: "pending" });
      }
      return null;
    }
    preview.show(r.tex);
    result.show(`${r.result.exact ? "=" : "\\approx"} ${r.result.tex}`);
    use.hidden = !onUse || r.result.scientific;
    shown = r.result.text;
    return r;
  }

  function confirm() {
    const r = update(true);
    if (!r) return;
    ans = r.value;
    if (history[0]?.text !== input.value) {
      history.unshift({ text: input.value, ...r });
      history.length = Math.min(history.length, HISTORY_SIZE);
      renderHistory();
    }
  }

  function renderHistory() {
    historyList.replaceChildren(...history.map((h) => {
      const item = el("button", { type: "button", title: "Reprendre ce calcul" });
      renderTex(item, `${h.tex} ${h.result.exact ? "=" : "\\approx"} ${h.result.tex}`);
      item.addEventListener("click", () => {
        input.value = h.text;
        update();
        input.focus();
      });
      return el("li", {}, item);
    }));
  }

  function insert(text) {
    const caret = text.indexOf("|");
    const clean = text.replace("|", "");
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.setRangeText(clean, start, end, "end");
    if (caret >= 0) input.setSelectionRange(start + caret, start + caret);
    update();
  }

  function backspace() {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    if (start !== end) input.setRangeText("", start, end, "end");
    else if (start > 0) input.setRangeText("", start - 1, start, "end");
    update();
  }

  function reset() {
    input.value = "";
    update();
  }

  // Keep the caret in the input: keys must not take the focus.
  keypad.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) e.preventDefault(); });
  keypad.addEventListener("click", (e) => {
    const key = e.target.closest("button");
    if (!key) return;
    if (key === equals) confirm();
    else if (key === clear) reset();
    else if (key === back) backspace();
    else insert(key.dataset.insert);
  });

  input.addEventListener("input", () => update());
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); confirm(); }
    if (e.key === "Escape") reset();
  });
  use.addEventListener("click", () => { if (shown) onUse(shown); });

  return { input };
}
