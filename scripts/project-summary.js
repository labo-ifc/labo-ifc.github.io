// Builds project.json (summary of the site read by the portfolio) from index.html.
// Usage: node scripts/project-summary.js
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SITE = "https://labo-ifc.github.io/";

const decode = (s) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const text = (html) => decode(html.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();

export function buildSummary(html) {
  const intro = text(html.match(/<p class="intro">([\s\S]*?)<\/p>/)[1]);
  const subjects = [];
  for (const [, id, body] of html.matchAll(/<section class="subject" id="([\w-]+)"[^>]*>([\s\S]*?)<\/section>/g)) {
    const title = text(body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)[1]);
    const tools = [];
    for (const [, href, card] of body.matchAll(/<a class="panel tool-card" href="([^"]+)">([\s\S]*?)<\/a>/g)) {
      const h3 = card.match(/<h3>([\s\S]*?)<\/h3>/)[1];
      tools.push({
        title: text(h3.replace(/<span class="beta-tag">[\s\S]*?<\/span>/, "")),
        beta: h3.includes("beta-tag"),
        url: SITE + href,
        summary: text(card.match(/<p>([\s\S]*?)<\/p>/)[1]),
      });
    }
    subjects.push({ id, title, tools });
  }
  return { name: "Labo IFC", url: SITE, intro, subjects };
}

export const render = (summary) => JSON.stringify(summary, null, 2) + "\n";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL("../", import.meta.url);
  writeFileSync(new URL("project.json", root), render(buildSummary(readFileSync(new URL("index.html", root), "utf8"))));
}
