// Worked examples: a "Voir un exemple" button ([data-example="<type>"]) in a
// .method card opens a full-width panel under the card's row, with the steps
// of a fixed exercise of that type. Shared by course pages.

import { renderMixed } from "./tex.js";
import { appendStep } from "./trainer.js";

// One full-width panel per group of methods; a second click, ✕ or Échap closes it.
/**
 * @param {(type: string) => { text?: string, steps: { tex, note }[] }} example the exercise shown for a type
 * @param {(el, ex) => boolean} [figure] draws the example's figure (false = none)
 */
export function initExamples(example, figure) {
  for (const grid of document.querySelectorAll(".methods")) {
    const panel = document.createElement("div");
    panel.className = "example-panel";
    panel.hidden = true;
    panel.innerHTML = `<div class="example-head"><p class="kicker">Exemple résolu</p><h4></h4>
      <button type="button" class="ghost link" aria-label="Fermer l'exemple">✕</button></div>
      <p class="example-text" hidden></p><div class="example-figure" hidden></div><ol class="steps"></ol>`;
    const title = panel.querySelector("h4");
    const list = panel.querySelector(".steps");
    const text = panel.querySelector(".example-text");
    const fig = panel.querySelector(".example-figure");
    let current = null;

    // Insert the panel after the last card on the active card's row, so it spans the grid right below it.
    const place = () => {
      if (!current) return;
      const card = current.closest(".method");
      const cards = [...grid.querySelectorAll(".method")];
      const rowEnd = cards.filter((c) => c.offsetTop === card.offsetTop).at(-1);
      if (panel.previousElementSibling !== rowEnd) rowEnd.after(panel);
    };
    const close = () => {
      if (!current) return;
      current.setAttribute("aria-expanded", "false");
      current.closest(".method").classList.remove("active");
      current = null;
      panel.hidden = true;
    };
    const open = (btn) => {
      close();
      current = btn;
      btn.setAttribute("aria-expanded", "true");
      const card = btn.closest(".method");
      card.classList.add("active");
      title.textContent = card.querySelector("h3").textContent;
      list.replaceChildren();
      const ex = example(btn.dataset.example);
      text.hidden = !ex.text;
      if (ex.text) renderMixed(text, ex.text);
      fig.replaceChildren();
      fig.hidden = !(figure && figure(fig, ex));
      for (const s of ex.steps) appendStep(list, s);
      panel.hidden = false;
      place();
      panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };

    for (const btn of grid.querySelectorAll("[data-example]")) {
      btn.addEventListener("click", () => (btn === current ? close() : open(btn)));
    }
    panel.querySelector(".example-head button").addEventListener("click", () => {
      const btn = current;
      close();
      btn.focus();
    });
    panel.addEventListener("keydown", (e) => { if (e.key === "Escape") panel.querySelector(".example-head button").click(); });
    new ResizeObserver(place).observe(grid);
  }
}
