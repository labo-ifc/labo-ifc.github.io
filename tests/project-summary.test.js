import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSummary, render } from "../scripts/project-summary.js";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("project.json is up to date with index.html", () => {
  assert.equal(read("project.json"), render(buildSummary(read("index.html"))),
    "lancer : node scripts/project-summary.js");
});

test("every subject has a title and at least one tool", () => {
  const { subjects } = buildSummary(read("index.html"));
  assert.ok(subjects.length >= 4);
  for (const s of subjects) {
    assert.ok(s.title && s.tools.length, s.id);
    for (const t of s.tools) assert.ok(t.title && t.summary && t.url.startsWith("https://"), t.title);
  }
});
