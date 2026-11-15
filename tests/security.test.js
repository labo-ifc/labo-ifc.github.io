import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Every page of the site (tests excluded).
function pages(dir = ".") {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name.startsWith(".") || name === "node_modules" || name === "tests") return [];
    if (statSync(path).isDirectory()) return pages(path);
    return name.endsWith(".html") ? [path] : [];
  });
}

test("external scripts and stylesheets are pinned with integrity (SRI)", () => {
  const files = pages();
  assert.ok(files.length >= 7);
  for (const file of files) {
    const html = readFileSync(file, "utf8");
    for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="(?:https?:)?\/\/[^"]*"[^>]*>/g)) {
      if (/^<link\b/.test(tag) && !/rel="stylesheet"/.test(tag)) continue;
      assert.match(tag, /integrity="sha(256|384|512)-[A-Za-z0-9+/=]+"/, `${file}: ${tag}`);
      assert.match(tag, /crossorigin="anonymous"/, `${file}: ${tag}`);
      assert.match(tag, /https:\/\//, `${file}: use https`);
      assert.doesNotMatch(tag, /@latest|\/count\.js"/, `${file}: versioned file required`);
    }
  }
});
