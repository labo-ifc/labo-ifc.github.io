import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SLIDE_W, SLIDE_H, THEMES, ACCENTS, LAYOUTS, palette, makeDeck, makeSlide, makeElement, cloneSlide,
  moveItem, resizeBox, rotationTo, snapPosition, cleanDeck, fileName, History,
} from "../diapos/model.js";

const close = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `expected ${b}, got ${a}`);
const center = (b) => [b.x + b.w / 2, b.y + b.h / 2];
const rot = (x, y, deg) => {
  const r = (deg * Math.PI) / 180;
  return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
};
// World position of local corner (sx, sy) ∈ {−1, 1}² of a rotated box.
const corner = (b, sx, sy) => {
  const [cx, cy] = center(b);
  const [ox, oy] = rot((sx * b.w) / 2, (sy * b.h) / 2, b.rot || 0);
  return [cx + ox, cy + oy];
};

test("every theme and accent gives a full palette", () => {
  for (const t of Object.keys(THEMES)) for (const a of Object.keys(ACCENTS)) {
    const p = palette(t, a);
    for (const k of ["bg", "text", "muted", "light", "accent", "accent2", "font"]) assert.ok(p[k], `${t}/${a}: ${k}`);
  }
  assert.deepEqual(palette("inconnu", "inconnu"), palette("clair", "maths"));
});

test("layouts make elements inside the slide", () => {
  for (const layout of Object.keys(LAYOUTS)) {
    for (const el of makeSlide(layout).elements) {
      assert.ok(el.x >= 0 && el.y >= 0 && el.x + el.w <= SLIDE_W && el.y + el.h <= SLIDE_H, `${layout}: ${el.type}`);
    }
  }
  const el = makeElement("shape", { shape: "arrow" });
  assert.equal(el.fill, "none");
  assert.equal(el.x, (SLIDE_W - el.w) / 2);
});

test("cloneSlide gives fresh ids and a deep copy", () => {
  const s = makeSlide("titleText");
  const c = cloneSlide(s);
  assert.notEqual(c.id, s.id);
  c.elements.forEach((e, i) => assert.notEqual(e.id, s.elements[i].id));
  c.elements[0].text = "changé";
  assert.notEqual(s.elements[0].text, "changé");
});

test("moveItem reorders in place and ignores out-of-range targets", () => {
  assert.deepEqual(moveItem([1, 2, 3, 4], 0, 2), [2, 3, 1, 4]);
  assert.deepEqual(moveItem([1, 2, 3], 2, 0), [3, 1, 2]);
  assert.deepEqual(moveItem([1, 2, 3], 0, 5), [1, 2, 3]);
});

test("resizeBox keeps the opposite corner fixed, rotated or not", () => {
  for (const r of [0, 30, 90, 200]) {
    const box = { x: 100, y: 100, w: 300, h: 200, rot: r };
    for (const [handle, sx, sy] of [["se", 1, 1], ["nw", -1, -1], ["ne", 1, -1], ["sw", -1, 1]]) {
      const res = { ...resizeBox(box, handle, 37, -23), rot: r };
      const [ax, ay] = corner(box, -sx, -sy), [bx, by] = corner(res, -sx, -sy);
      close(ax, bx); close(ay, by);
    }
  }
});

test("resizeBox: side handles change one dimension, minimum size, ratio", () => {
  const box = { x: 0, y: 0, w: 300, h: 200, rot: 0 };
  assert.deepEqual(resizeBox(box, "e", 50, 999), { x: 0, y: 0, w: 350, h: 200 });
  const n = resizeBox(box, "n", 0, 50);
  assert.deepEqual(n, { x: 0, y: 50, w: 300, h: 150 });
  const tiny = resizeBox(box, "se", -1000, -1000);
  assert.ok(tiny.w >= 20 && tiny.h >= 20);
  const k = resizeBox(box, "se", 150, 0, { keepRatio: true });
  close(k.w / k.h, 1.5);
  assert.equal(k.w, 450);
});

test("rotationTo points the top of the box at the pointer", () => {
  const box = { x: 0, y: 0, w: 100, h: 100 };
  close(rotationTo(box, 50, -100), 0);
  close(rotationTo(box, 200, 50), 90);
  close(rotationTo(box, 50, 300), 180);
  close(rotationTo(box, -100, 50), 270);
  close(rotationTo(box, 200, -90, 15), 45);
});

test("snapPosition snaps to slide centre and other boxes", () => {
  const s = snapPosition(SLIDE_W / 2 - 100 + 4, 300, 200, 100);
  assert.equal(s.x, SLIDE_W / 2 - 100);
  assert.equal(s.guides.x, SLIDE_W / 2);
  assert.equal(s.guides.y, null);
  const o = snapPosition(500, 406, 100, 100, [{ x: 0, y: 400, w: 50, h: 50 }]);
  assert.equal(o.y, 400);
  const far = snapPosition(333, 222, 10, 10);
  assert.deepEqual([far.x, far.y], [333, 222]);
});

test("cleanDeck keeps valid data and drops the rest", () => {
  const deck = makeDeck();
  deck.slides.push(makeSlide("titleFormula"));
  assert.deepEqual(cleanDeck(JSON.parse(JSON.stringify(deck))), deck);

  const dirty = cleanDeck({
    title: 42, theme: "rose", accent: "chimie",
    slides: [{ elements: [
      { type: "text", text: "<b>x</b>", x: "1", size: 1e9, color: "rouge", align: "justify" },
      { type: "image", src: "javascript:alert(1)" },
      { type: "image", src: "data:image/png;base64,AAAA" },
      { type: "script" },
      null,
    ] }, "nope"],
  });
  assert.equal(dirty.title, "Présentation");
  assert.equal(dirty.theme, "clair");
  assert.equal(dirty.accent, "chimie");
  assert.equal(dirty.slides.length, 1);
  const [text, image] = dirty.slides[0].elements;
  assert.equal(dirty.slides[0].elements.length, 2);
  assert.equal(text.text, "<b>x</b>");
  assert.equal(text.x, 0);
  assert.equal(text.size, 400);
  assert.equal(text.color, "text");
  assert.equal(text.align, "left");
  assert.equal(image.src, "data:image/png;base64,AAAA");

  assert.equal(cleanDeck({ slides: [] }).slides.length, 1);
  assert.throws(() => cleanDeck({ title: "x" }));
  assert.throws(() => cleanDeck(null));
});

test("fileName makes a safe .json name", () => {
  assert.equal(fileName("Les ions & sels : révision"), "les-ions-sels-revision.json");
  assert.equal(fileName("   "), "presentation.json");
});

test("History undoes and redoes snapshots", () => {
  const h = new History(3);
  for (const s of ["a", "b", "c", "d"]) h.push(s);
  assert.deepEqual(h.past, ["b", "c", "d"]);
  assert.equal(h.undo("e"), "d");
  assert.equal(h.redo("d"), "e");
  h.undo("e");
  h.push("x");
  assert.equal(h.future.length, 0);
});
