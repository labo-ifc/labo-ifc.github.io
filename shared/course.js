// Course pages: one chapter per "page" chosen by the URL hash, chapter bar,
// previous/next links, "S'entraîner" buttons and the print button.

/**
 * @param {object} options
 * @param {{ train(choice: string): void }} [options.trainer] trainer opened by [data-train] buttons
 * @param {(chapter: HTMLElement) => void} [options.onShow] called after a chapter is shown
 */
export function initCourse({ trainer, onShow } = {}) {
  // The URL hash names the chapter shown, so links, reloads and the browser's
  // back/forward buttons all work.
  const chapters = [...document.querySelectorAll(".chapter")];
  const links = new Map([...document.querySelectorAll(".chapters a")].map((a) => [a.hash.slice(1), a]));

  for (const [i, section] of chapters.entries()) {
    const pager = document.createElement("nav");
    pager.className = "pager";
    pager.setAttribute("aria-label", "Chapitre précédent ou suivant");
    for (const [target, cls, arrow] of [[chapters[i - 1], "prev", "←"], [chapters[i + 1], "next", "→"]]) {
      if (!target) { pager.append(document.createElement("span")); continue; }
      const a = document.createElement("a");
      a.className = "pager-link " + cls;
      a.href = "#" + target.id;
      a.innerHTML = `<small>${cls === "prev" ? "Précédent" : "Suivant"}</small><span></span>`;
      const title = links.get(target.id).title; // full chapter name; the bar shows a short one
      a.querySelector("span").textContent = cls === "prev" ? `${arrow} ${title}` : `${title} ${arrow}`;
      pager.append(a);
    }
    section.append(pager);
  }

  function showChapter(id) {
    const current = chapters.find((c) => c.id === id) ?? chapters[0];
    for (const c of chapters) c.hidden = c !== current;
    for (const [key, a] of links) {
      if (key === current.id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    links.get(current.id).scrollIntoView({ block: "nearest", inline: "nearest" });
    onShow?.(current);
    window.scrollTo(0, 0);
  }

  addEventListener("hashchange", () => showChapter(location.hash.slice(1)));
  showChapter(location.hash.slice(1));
  // The browser jumps to the #anchor once the page has loaded, past the header: undo that.
  addEventListener("load", () => window.scrollTo(0, 0), { once: true });

  for (const btn of document.querySelectorAll("[data-train]")) {
    btn.addEventListener("click", () => {
      location.hash = "#exercices"; // fires hashchange → showChapter, but synchronously show it now so focus works
      showChapter("exercices");
      trainer?.train(btn.dataset.train);
    });
  }

  document.getElementById("cheat-print")?.addEventListener("click", () => window.print());
  return { showChapter };
}
