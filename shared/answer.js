// Reading numeric answers typed by students. No DOM.

/** One number: "12,5", "-814", "3/2", "1,2·10^6", "1.2e6". NaN when unreadable. */
export function readNumber(p) {
  const t = p.replace(/,/g, ".").replace(/(?:[·*×x]10\^|e)\(?([+-]?\d+)\)?$/, "e$1");
  const m = t.match(/^([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(?:\/(\d+(?:\.\d+)?))?$/);
  if (!m) return NaN;
  return m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1]);
}
