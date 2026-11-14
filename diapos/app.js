// Diapos: slide editor (stage, slide list, inspector, files, presenter).
import { initTheme } from "../shared/theme.js";
import {
  SLIDE_W, SLIDE_H, THEMES, ACCENTS, COLORS, SHAPES, LAYOUTS, palette,
  makeDeck, makeSlide, makeElement, cloneSlide, cloneElement, moveItem,
  resizeBox, rotationTo, snapPosition, cleanDeck, fileName, History,
} from "./model.js";
import { drawSlide, drawElement, drawContent, placeElement } from "./render.js";

const $ = (id) => document.getElementById(id);
const STORE_KEY = "diapos:deck";

const state = { deck: null, index: 0, selected: null, editing: null, clipboard: null };
const history = new History();

// ── Persistence ──

function loadStored() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return cleanDeck(JSON.parse(raw));
  } catch {}
  return makeDeck();
}

let saveTimer = 0;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 400);
}
function saveNow() {
  clearTimeout(saveTimer);
  {
    const status = $("save-status");
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state.deck));
      status.textContent = "Enregistré dans le navigateur";
      status.classList.remove("warn");
    } catch {
      status.textContent = "Trop lourd pour le navigateur : utilise « Enregistrer »";
      status.classList.add("warn");
    }
  }
}
// Never lose the last edits when the tab closes.
addEventListener("pagehide", saveNow);

// ── Changes and undo ──

const slide = () => state.deck.slides[state.index];
const selectedEl = () => slide()?.elements.find((e) => e.id === state.selected) ?? null;

let lastKey = null, lastTime = 0;
/**
 * Applies `fn` to the deck, recording an undo step. Successive changes with the same `key`
 * within a second share one step (typing, sliders). `redraw`: "all" | "element" | "none".
 */
function change(fn, { key = null, redraw = "all" } = {}) {
  const now = performance.now();
  if (!key || key !== lastKey || now - lastTime > 1000) history.push(JSON.stringify(state.deck));
  lastKey = key; lastTime = now;
  fn();
  scheduleSave();
  if (redraw === "all") renderAll();
  else if (redraw === "element") { redrawSelected(); scheduleThumbs(); }
  else scheduleThumbs();
  updateHistoryButtons();
}

function restore(snapshot) {
  if (!snapshot) return;
  state.deck = JSON.parse(snapshot);
  state.index = Math.min(state.index, state.deck.slides.length - 1);
  if (!selectedEl()) state.selected = null;
  lastKey = null;
  scheduleSave();
  renderAll();
}
const undo = () => restore(history.undo(JSON.stringify(state.deck)));
const redo = () => restore(history.redo(JSON.stringify(state.deck)));
function updateHistoryButtons() {
  $("undo").disabled = !history.past.length;
  $("redo").disabled = !history.future.length;
}

// ── Stage ──

const frame = $("stage-frame");
// The selection and guides live in an overlay above the slide, so handles are not clipped at its edges.
let scale = 1, slideNode = null, selNode = null, overlay = null;

function fitStage() {
  const wrap = $("stage-wrap");
  const cs = getComputedStyle(wrap);
  const w = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const h = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  scale = Math.max(0.05, Math.min(w / SLIDE_W, h / SLIDE_H));
  frame.style.width = `${SLIDE_W * scale}px`;
  frame.style.height = `${SLIDE_H * scale}px`;
  for (const n of [slideNode, overlay]) if (n) n.style.transform = `scale(${scale})`;
  frame.style.setProperty("--inv", 1 / scale);
}
new ResizeObserver(fitStage).observe($("stage-wrap"));

function renderStage() {
  state.editing = null;
  slideNode = drawSlide(state.deck, slide());
  overlay = document.createElement("div");
  overlay.className = "overlay";
  for (const n of [slideNode, overlay]) n.style.transform = `scale(${scale})`;
  frame.replaceChildren(slideNode, overlay);
  selNode = null;
  drawSelection();
  $("slide-counter").textContent = `Diapo ${state.index + 1} sur ${state.deck.slides.length}`;
}

function drawSelection() {
  selNode?.remove();
  selNode = null;
  const el = selectedEl();
  if (!el) return;
  selNode = document.createElement("div");
  selNode.className = "selection";
  for (const h of ["nw", "n", "ne", "e", "se", "s", "sw", "w", "rot"]) {
    const d = document.createElement("div");
    d.className = "handle";
    d.dataset.h = h;
    selNode.append(d);
  }
  placeElement(selNode, el);
  overlay.append(selNode);
}

/** Redraws the selected element in place (after an inspector change). */
function redrawSelected() {
  const el = selectedEl();
  if (!el) return;
  const node = slideNode.querySelector(`[data-id="${el.id}"]`);
  if (node) { drawContent(node, el); placeElement(node, el); }
  if (selNode) placeElement(selNode, el);
}

function select(id) {
  if (state.editing) stopTextEdit();
  state.selected = id;
  drawSelection();
  renderInspector();
}

// Pointer: move, resize, rotate.
function toSlide(ev) {
  const r = frame.getBoundingClientRect();
  return [(ev.clientX - r.left) / scale, (ev.clientY - r.top) / scale];
}

function showGuides(g) {
  overlay.querySelectorAll(".guide").forEach((n) => n.remove());
  if (!g) return;
  if (g.x !== null) {
    const n = document.createElement("div");
    n.className = "guide guide-x";
    n.style.left = `${g.x}px`;
    overlay.append(n);
  }
  if (g.y !== null) {
    const n = document.createElement("div");
    n.className = "guide guide-y";
    n.style.top = `${g.y}px`;
    overlay.append(n);
  }
}

frame.addEventListener("pointerdown", (ev) => {
  if (ev.button !== 0 || ev.target.closest(".text-editor")) return;
  const handle = ev.target.closest(".handle");
  const node = ev.target.closest(".el");
  if (!handle && !node) { select(null); return; }
  if (node && node.dataset.id !== state.selected) select(node.dataset.id);
  const el = selectedEl();
  if (!el) return;
  ev.preventDefault();
  const start = toSlide(ev), box = { x: el.x, y: el.y, w: el.w, h: el.h, rot: el.rot };
  const others = slide().elements.filter((o) => o.id !== el.id);
  const mode = handle ? handle.dataset.h : "move";
  const elNode = slideNode.querySelector(`[data-id="${el.id}"]`);
  let moved = false, next = null;
  frame.setPointerCapture(ev.pointerId);

  const onMove = (e) => {
    const [px, py] = toSlide(e);
    const dx = px - start[0], dy = py - start[1];
    if (!moved && Math.hypot(dx, dy) * scale < 3) return;
    moved = true;
    if (mode === "move") {
      const s = e.altKey ? { x: box.x + dx, y: box.y + dy, guides: null } : snapPosition(box.x + dx, box.y + dy, box.w, box.h, others);
      next = { x: Math.round(s.x), y: Math.round(s.y) };
      showGuides(s.guides);
    } else if (mode === "rot") {
      next = { rot: Math.round(rotationTo(box, px, py, e.shiftKey ? 15 : 0)) };
    } else {
      const keepRatio = el.type === "image" ? !e.shiftKey : e.shiftKey;
      const r = resizeBox(box, mode, dx, dy, { keepRatio });
      next = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) };
    }
    const preview = { ...el, ...next };
    if (mode !== "move" && mode !== "rot" && el.type === "shape") drawContent(elNode, preview);
    placeElement(elNode, preview);
    placeElement(selNode, preview);
  };
  const onUp = () => {
    frame.removeEventListener("pointermove", onMove);
    frame.removeEventListener("pointerup", onUp);
    frame.removeEventListener("pointercancel", onUp);
    showGuides(null);
    if (moved && next) change(() => Object.assign(el, next), { redraw: "element" });
    if (moved) renderInspector();
  };
  frame.addEventListener("pointermove", onMove);
  frame.addEventListener("pointerup", onUp);
  frame.addEventListener("pointercancel", onUp);
});

frame.addEventListener("dblclick", (ev) => {
  const node = ev.target.closest(".el");
  if (!node) return;
  const el = slide().elements.find((e) => e.id === node.dataset.id);
  if (el?.type === "text") startTextEdit(el);
  else if (el?.type === "formula") $("prop-tex")?.focus();
});

// Text is edited in place in a textarea that takes the block's font.
function startTextEdit(el) {
  if (state.selected !== el.id) select(el.id);
  const node = slideNode.querySelector(`[data-id="${el.id}"]`);
  const area = document.createElement("textarea");
  area.className = "text-editor";
  area.value = el.text;
  area.spellcheck = true;
  area.lang = "fr";
  node.replaceChildren(area);
  state.editing = { el, area, node };
  area.focus();
  area.select();
  area.addEventListener("input", () => {
    change(() => { el.text = area.value; }, { key: `text:${el.id}`, redraw: "none" });
    const field = $("prop-text");
    if (field) field.value = area.value;
  });
  area.addEventListener("blur", stopTextEdit);
  area.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); stopTextEdit(); }
    e.stopPropagation();
  });
}
function stopTextEdit() {
  const ed = state.editing;
  if (!ed) return;
  state.editing = null;
  drawContent(ed.node, ed.el);
}

// ── Inserting ──

function insert(el) {
  change(() => {
    // Offset copies so a new block never hides exactly under an existing one.
    while (slide().elements.some((o) => o.x === el.x && o.y === el.y)) { el.x += 30; el.y += 30; }
    slide().elements.push(el);
    state.selected = el.id;
  });
}

const MAX_IMAGE = 1920;
/** Reads an image file as a data URL, downscaled so the deck stays light. */
async function readImage(file) {
  const raw = await new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = ko;
    r.readAsDataURL(file);
  });
  const img = new Image();
  img.src = raw;
  await img.decode();
  let { naturalWidth: w, naturalHeight: h } = img;
  if (/svg|gif/.test(file.type) || Math.max(w, h) <= MAX_IMAGE && file.size < 600e3) return { src: raw, w, h };
  const k = Math.min(1, MAX_IMAGE / Math.max(w, h));
  w = Math.round(w * k); h = Math.round(h * k);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  const src = file.type === "image/png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.88);
  return { src, w, h };
}

async function insertImage(file, at = null) {
  if (!file?.type.startsWith("image/")) return;
  try {
    const { src, w, h } = await readImage(file);
    const k = Math.min(1, 900 / w, 600 / h);
    const el = makeElement("image", { src, w: Math.round(w * k), h: Math.round(h * k) });
    if (at) { el.x = Math.round(at[0] - el.w / 2); el.y = Math.round(at[1] - el.h / 2); }
    insert(el);
  } catch {
    alert("Impossible de lire cette image.");
  }
}

document.querySelector(".toolbar").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-insert]");
  if (!b) return;
  const [type, shape] = b.dataset.insert.split(":");
  if (type === "image") $("image-file").click();
  else insert(makeElement(type, shape ? { shape } : {}));
});
$("image-file").addEventListener("change", (ev) => {
  insertImage(ev.target.files[0]);
  ev.target.value = "";
});

// Drop images (or a .json deck) onto the stage.
frame.addEventListener("dragover", (ev) => {
  if (![...ev.dataTransfer.types].includes("Files")) return;
  ev.preventDefault();
  frame.classList.add("drop");
});
frame.addEventListener("dragleave", () => frame.classList.remove("drop"));
frame.addEventListener("drop", (ev) => {
  ev.preventDefault();
  frame.classList.remove("drop");
  const file = ev.dataTransfer.files[0];
  if (!file) return;
  if (file.name.endsWith(".json")) openFile(file);
  else insertImage(file, toSlide(ev));
});

// Paste: an image from the system clipboard, else a block copied here.
document.addEventListener("paste", (ev) => {
  if (isTyping(ev.target)) return;
  const file = [...(ev.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
  if (file) { ev.preventDefault(); insertImage(file); }
  else if (state.clipboard) { ev.preventDefault(); insert(cloneElement(state.clipboard, 30)); }
});
document.addEventListener("copy", (ev) => {
  if (isTyping(ev.target) || !selectedEl()) return;
  state.clipboard = structuredClone(selectedEl());
  ev.preventDefault();
});
document.addEventListener("cut", (ev) => {
  if (isTyping(ev.target) || !selectedEl()) return;
  state.clipboard = structuredClone(selectedEl());
  ev.preventDefault();
  deleteSelected();
});

function deleteSelected() {
  if (!selectedEl()) return;
  change(() => {
    slide().elements = slide().elements.filter((e) => e.id !== state.selected);
    state.selected = null;
  });
}

// ── Slide list ──

const thumbs = $("thumbs");
let thumbTimer = 0;
const scheduleThumbs = () => { clearTimeout(thumbTimer); thumbTimer = setTimeout(renderThumbs, 250); };
let dragFrom = null;

function renderThumbs() {
  clearTimeout(thumbTimer);
  thumbs.replaceChildren(...state.deck.slides.map((s, i) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "thumb";
    b.setAttribute("aria-label", `Diapo ${i + 1}`);
    if (i === state.index) b.setAttribute("aria-current", "true");
    b.append(drawSlide(state.deck, s));
    b.addEventListener("click", () => goTo(i));
    li.draggable = true;
    li.addEventListener("dragstart", (e) => { dragFrom = i; e.dataTransfer.effectAllowed = "move"; });
    li.addEventListener("dragover", (e) => {
      if (dragFrom === null) return;
      e.preventDefault();
      li.classList.add("drop-before");
    });
    li.addEventListener("dragleave", () => li.classList.remove("drop-before"));
    li.addEventListener("drop", (e) => {
      e.preventDefault();
      li.classList.remove("drop-before");
      if (dragFrom === null || dragFrom === i) return;
      const from = dragFrom, to = from < i ? i - 1 : i;
      dragFrom = null;
      moveSlide(from, to);
    });
    li.addEventListener("dragend", () => { dragFrom = null; });
    li.append(b);
    return li;
  }));
  thumbs.children[state.index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function goTo(i) {
  if (i < 0 || i >= state.deck.slides.length) return;
  state.index = i;
  state.selected = null;
  renderAll();
}

function moveSlide(from, to) {
  if (to < 0 || to >= state.deck.slides.length) return;
  change(() => { moveItem(state.deck.slides, from, to); state.index = to; });
}

for (const [layout, label] of Object.entries(LAYOUTS)) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.addEventListener("click", () => {
    $("add-menu").open = false;
    change(() => {
      state.deck.slides.splice(state.index + 1, 0, makeSlide(layout));
      state.index += 1;
      state.selected = null;
    });
  });
  $("layout-menu").append(b);
}
document.addEventListener("click", (ev) => {
  if (!ev.target.closest("#add-menu")) $("add-menu").open = false;
});

document.querySelector(".slide-actions").addEventListener("click", (ev) => {
  const action = ev.target.closest("[data-slide]")?.dataset.slide;
  const i = state.index;
  if (action === "up") moveSlide(i, i - 1);
  else if (action === "down") moveSlide(i, i + 1);
  else if (action === "duplicate") change(() => { state.deck.slides.splice(i + 1, 0, cloneSlide(slide())); state.index = i + 1; state.selected = null; });
  else if (action === "delete") {
    change(() => {
      state.deck.slides.splice(i, 1);
      if (!state.deck.slides.length) state.deck.slides.push(makeSlide("blank"));
      state.index = Math.min(i, state.deck.slides.length - 1);
      state.selected = null;
    });
  }
});

// ── Inspector ──

const inspector = $("inspector");

function h(tag, props = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (k === "class") n.className = v;
    else if (k in n && !k.includes("-")) n[k] = v;
    else n.setAttribute(k, v);
  }
  n.append(...children.filter((c) => c !== null && c !== undefined));
  return n;
}
const section = (title, ...children) => h("section", {}, h("h2", {}, title), ...children);

/** Edits property `prop` of the selected element. */
function setProp(prop, value, live = false) {
  const el = selectedEl();
  if (!el) return;
  change(() => { el[prop] = value; }, { key: live ? `${prop}:${el.id}` : null, redraw: "element" });
}

function swatches(current, onPick, roles = Object.keys(COLORS)) {
  const p = palette(state.deck.theme, state.deck.accent);
  return h("div", { class: "swatches" }, ...roles.map((role) => {
    const b = h("button", {
      type: "button", title: COLORS[role], "aria-label": COLORS[role], "aria-pressed": String(role === current),
      class: role === "none" ? "none" : "", onclick: () => { onPick(role); renderInspector(); },
    });
    b.style.setProperty("--sw", p[role]);
    return b;
  }));
}

/** Number field for `prop`; `factor` shows the value multiplied (opacity in %). */
function numberField(label, prop, el, { min, max, factor = 1 } = {}) {
  const input = h("input", { type: "number", value: Math.round(el[prop] * factor), step: 1 });
  if (min !== undefined) input.min = min;
  if (max !== undefined) input.max = max;
  input.addEventListener("input", () => {
    let v = parseFloat(input.value);
    if (!Number.isFinite(v)) return;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    setProp(prop, v / factor, true);
  });
  return h("label", {}, label, input);
}

function deckPanel() {
  const themes = h("div", { class: "theme-cards" }, ...Object.entries(THEMES).map(([key, t]) => {
    const p = palette(key, state.deck.accent);
    const b = h("button", {
      type: "button", "aria-pressed": String(key === state.deck.theme),
      onclick: () => change(() => { state.deck.theme = key; }),
    }, t.label);
    b.style.setProperty("--sw-bg", p.bg);
    b.style.setProperty("--sw-fg", p.text);
    b.style.setProperty("--sw-accent", p.accent);
    b.style.setProperty("--sw-font", p.font);
    return b;
  }));
  const accents = h("div", { class: "swatches" }, ...Object.entries(ACCENTS).map(([key, a]) => {
    const b = h("button", {
      type: "button", title: a.label, "aria-label": a.label, "aria-pressed": String(key === state.deck.accent),
      onclick: () => change(() => { state.deck.accent = key; }),
    });
    b.style.setProperty("--sw", THEMES[state.deck.theme].dark ? a.dark : a.light);
    return b;
  }));
  return [
    section("Thème des diapos", themes),
    section("Couleur d'accent", accents),
    section("Raccourcis", h("ul", { class: "shortcuts" },
      h("li", {}, h("kbd", {}, "Double-clic"), " modifier un texte"),
      h("li", {}, h("kbd", {}, "Maj"), " garder les proportions, rotation par 15°"),
      h("li", {}, h("kbd", {}, "Alt"), " déplacer sans aimanter"),
      h("li", {}, h("kbd", {}, "Ctrl+C"), " / ", h("kbd", {}, "Ctrl+V"), " copier, coller (aussi des images)"),
      h("li", {}, h("kbd", {}, "Ctrl+D"), " dupliquer, ", h("kbd", {}, "Suppr"), " supprimer"),
      h("li", {}, h("kbd", {}, "Ctrl+Z"), " annuler, ", h("kbd", {}, "F5"), " présenter"),
    )),
  ];
}

function elementPanel(el) {
  const parts = [];
  if (el.type === "text") {
    const area = h("textarea", { id: "prop-text", value: el.text, spellcheck: true, lang: "fr" });
    area.addEventListener("input", () => setProp("text", area.value, true));
    const align = h("div", { class: "chips" }, ...[["left", "Gauche"], ["center", "Centre"], ["right", "Droite"]].map(([v, l]) =>
      h("button", { type: "button", class: el.align === v ? "active" : "", onclick: () => { setProp("align", v); renderInspector(); } }, l)));
    const style = h("div", { class: "chips" },
      h("button", { type: "button", class: el.bold ? "active" : "", onclick: () => { setProp("bold", !el.bold); renderInspector(); } }, h("b", {}, "Gras")),
      h("button", { type: "button", class: el.italic ? "active" : "", onclick: () => { setProp("italic", !el.italic); renderInspector(); } }, h("i", {}, "Italique")));
    parts.push(section("Texte", area,
      h("p", { class: "hint" }, "Formules entre ", h("code", {}, "$…$"), ", puces avec ", h("code", {}, "- "), " en début de ligne."),
      h("div", { class: "grid4" }, numberField("Taille", "size", el, { min: 8, max: 400 })), style, align));
    parts.push(section("Couleur", swatches(el.color, (c) => setProp("color", c), ["text", "muted", "accent", "accent2", "light", "bg"])));
  } else if (el.type === "formula") {
    const area = h("textarea", { id: "prop-tex", value: el.tex, spellcheck: false });
    area.addEventListener("input", () => setProp("tex", area.value, true));
    parts.push(section("Formule (LaTeX)", area,
      h("p", { class: "hint" }, "Exemples : ", h("code", {}, "\\frac{a}{b}"), ", ", h("code", {}, "\\sqrt{x}"), ", ", h("code", {}, "x^{2}"),
        ", chimie ", h("code", {}, "\\ce{2H2 + O2 -> 2H2O}"), "."),
      h("div", { class: "grid4" }, numberField("Taille", "size", el, { min: 8, max: 400 }))));
    parts.push(section("Couleur", swatches(el.color, (c) => setProp("color", c), ["text", "muted", "accent", "accent2", "light", "bg"])));
  } else if (el.type === "shape") {
    const line = el.shape === "line" || el.shape === "arrow";
    const kind = h("select", { onchange: (e) => { setProp("shape", e.target.value); renderInspector(); } },
      ...Object.entries(SHAPES).map(([v, l]) => h("option", { value: v, selected: v === el.shape }, l)));
    parts.push(section("Forme", h("div", { class: "row" }, h("span", {}, "Type"), kind),
      h("div", { class: "grid4" },
        numberField(line ? "Épaisseur" : "Contour", "strokeWidth", el, { min: 0, max: 80 }),
        line ? null : numberField("Arrondi", "radius", el, { min: 0, max: 1000 }),
        numberField("Opacité %", "opacity", el, { min: 0, max: 100, factor: 100 }))));
    if (!line) parts.push(section("Remplissage", swatches(el.fill, (c) => setProp("fill", c))));
    parts.push(section(line ? "Couleur" : "Contour", swatches(el.stroke, (c) => setProp("stroke", c), line ? ["text", "muted", "accent", "accent2", "light", "bg"] : undefined)));
  } else if (el.type === "image") {
    parts.push(section("Image", h("p", { class: "hint" }, "Les poignées de coin gardent les proportions (Maj pour déformer).")));
  }
  parts.push(section("Position et taille", h("div", { class: "grid4" },
    numberField("X", "x", el), numberField("Y", "y", el),
    numberField("Largeur", "w", el, { min: 20 }), numberField("Hauteur", "h", el, { min: 20 }),
    numberField("Rotation °", "rot", el, { min: 0, max: 359 }))));
  const order = (dir) => change(() => {
    const list = slide().elements, i = list.indexOf(el);
    moveItem(list, i, dir === "front" ? list.length - 1 : dir === "back" ? 0 : i + (dir === "up" ? 1 : -1));
  });
  parts.push(section("Bloc", h("div", { class: "buttons" },
    h("button", { type: "button", class: "ghost", onclick: () => order("front") }, "Premier plan"),
    h("button", { type: "button", class: "ghost", onclick: () => order("back") }, "Arrière-plan"),
    h("button", { type: "button", class: "ghost", onclick: duplicateSelected }, "Dupliquer"),
    h("button", { type: "button", class: "ghost danger", onclick: deleteSelected }, "Supprimer"))));
  return parts;
}

function renderInspector() {
  const el = selectedEl();
  inspector.replaceChildren(...(el ? elementPanel(el) : deckPanel()));
}

function duplicateSelected() {
  const el = selectedEl();
  if (el) insert(cloneElement(el, 30));
}

// ── Files ──

function setDeck(deck) {
  state.deck = deck;
  state.index = 0;
  state.selected = null;
  history.past = []; history.future = [];
  scheduleSave();
  renderAll();
}

async function openFile(file) {
  try {
    const deck = cleanDeck(JSON.parse(await file.text()));
    if (!confirm(`Ouvrir « ${deck.title} » ? La présentation actuelle sera remplacée (pense à l'enregistrer avant).`)) return;
    setDeck(deck);
  } catch (e) {
    alert(e instanceof SyntaxError ? "Ce fichier n'est pas lisible (JSON invalide)." : e.message);
  }
}

$("open-deck").addEventListener("click", () => $("open-file").click());
$("open-file").addEventListener("change", (ev) => {
  if (ev.target.files[0]) openFile(ev.target.files[0]);
  ev.target.value = "";
});
$("save-deck").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.deck)], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(blob), download: fileName(state.deck.title) });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$("new-deck").addEventListener("click", () => {
  if (confirm("Commencer une nouvelle présentation ? L'actuelle sera remplacée (pense à l'enregistrer avant).")) setDeck(makeDeck());
});
$("deck-title").addEventListener("input", (ev) => {
  change(() => { state.deck.title = ev.target.value; }, { key: "title", redraw: "none" });
  document.title = `${state.deck.title || "Diapos"} · Labo IFC`;
});

// ── Presenter ──

const presenter = $("presenter");
let presentIndex = 0, cursorTimer = 0;

function drawPresent() {
  const f = $("present-frame");
  const k = Math.min(innerWidth / SLIDE_W, innerHeight / SLIDE_H);
  f.style.width = `${SLIDE_W * k}px`;
  f.style.height = `${SLIDE_H * k}px`;
  const n = state.deck.slides.length;
  if (presentIndex >= n) {
    f.replaceChildren(h("div", { class: "end" }, "Fin de la présentation · Échap pour quitter"));
    $("present-count").textContent = "";
    return;
  }
  const node = drawSlide(state.deck, state.deck.slides[presentIndex]);
  node.style.transform = `scale(${k})`;
  f.replaceChildren(node);
  $("present-count").textContent = `${presentIndex + 1} / ${n}`;
}

function present() {
  stopTextEdit();
  presentIndex = state.index;
  presenter.hidden = false;
  drawPresent();
  try { Promise.resolve(presenter.requestFullscreen?.()).catch(() => {}); } catch {}
}
function stopPresenting() {
  if (presenter.hidden) return;
  presenter.hidden = true;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  goTo(Math.min(presentIndex, state.deck.slides.length - 1));
}
function step(d) {
  presentIndex = Math.max(0, Math.min(state.deck.slides.length, presentIndex + d));
  drawPresent();
}

$("present").addEventListener("click", present);
presenter.addEventListener("click", (ev) => {
  if (presentIndex >= state.deck.slides.length) return stopPresenting();
  step(ev.clientX < innerWidth / 3 ? -1 : 1);
});
presenter.addEventListener("pointermove", () => {
  presenter.classList.add("cursor");
  clearTimeout(cursorTimer);
  cursorTimer = setTimeout(() => presenter.classList.remove("cursor"), 2000);
});
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) stopPresenting();
});
addEventListener("resize", () => { if (!presenter.hidden) drawPresent(); });

// ── Keyboard ──

const isTyping = (t) => t instanceof HTMLElement && (t.matches("input, textarea, select") || t.isContentEditable);

document.addEventListener("keydown", (ev) => {
  if (!presenter.hidden) {
    if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(ev.key)) step(1);
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(ev.key)) step(-1);
    else if (ev.key === "Home") { presentIndex = 0; drawPresent(); }
    else if (ev.key === "End") { presentIndex = state.deck.slides.length - 1; drawPresent(); }
    else if (ev.key === "Escape") stopPresenting();
    else return;
    ev.preventDefault();
    return;
  }
  if (ev.key === "F5") { ev.preventDefault(); present(); return; }
  if (isTyping(ev.target)) return;
  const mod = ev.ctrlKey || ev.metaKey;
  const el = selectedEl();
  if (mod && ev.key.toLowerCase() === "z") { ev.preventDefault(); ev.shiftKey ? redo() : undo(); }
  else if (mod && ev.key.toLowerCase() === "y") { ev.preventDefault(); redo(); }
  else if (mod && ev.key.toLowerCase() === "d") { ev.preventDefault(); duplicateSelected(); }
  else if ((ev.key === "Delete" || ev.key === "Backspace") && el) { ev.preventDefault(); deleteSelected(); }
  else if (ev.key === "Escape") select(null);
  else if (ev.key === "Enter" && el?.type === "text") { ev.preventDefault(); startTextEdit(el); }
  else if (el && ev.key.startsWith("Arrow")) {
    ev.preventDefault();
    const d = ev.shiftKey ? 10 : 1;
    const [dx, dy] = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[ev.key];
    change(() => { el.x += dx; el.y += dy; }, { key: `nudge:${el.id}`, redraw: "element" });
  } else if (ev.key === "PageDown" || (!el && ev.key === "ArrowDown")) { ev.preventDefault(); goTo(state.index + 1); }
  else if (ev.key === "PageUp" || (!el && ev.key === "ArrowUp")) { ev.preventDefault(); goTo(state.index - 1); }
});

$("undo").addEventListener("click", undo);
$("redo").addEventListener("click", redo);

// ── Start ──

function renderAll() {
  $("deck-title").value = state.deck.title;
  document.title = `${state.deck.title || "Diapos"} · Labo IFC`;
  renderStage();
  renderThumbs();
  renderInspector();
  updateHistoryButtons();
}

initTheme($("theme-toggle"));
state.deck = loadStored();
fitStage();
renderAll();
