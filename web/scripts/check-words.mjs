// Safety wording check. The build fails if the site says a mushroom is
// edible or fine to eat anywhere in our source or published data.
// (Safety rule 1 + 7 of the project brief.)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = ["src", "index.html", "about.html", "public/data"];
const BANNED = [/\bedible\b/i, /safe to eat/i, /good to eat/i, /\bsafe\b(?!-area)/i, /find [a-z ]+ here/i];
const EXT = new Set([".ts", ".html", ".css", ".json", ".geojson", ".mjs"]);

const files = [];
const walk = (p) => {
  if (statSync(p).isDirectory()) readdirSync(p).forEach((f) => walk(join(p, f)));
  else if (EXT.has(extname(p))) files.push(p);
};
ROOTS.forEach(walk);

let bad = 0;
for (const f of files) {
  readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    for (const re of BANNED) {
      if (re.test(line)) { console.error(`✗ ${f}:${i + 1}  matches ${re}  →  ${line.trim().slice(0, 120)}`); bad++; }
    }
  });
}
if (bad) { console.error(`\n${bad} banned phrase(s). The site must show growing conditions only.`); process.exit(1); }
console.log(`✓ wording check passed (${files.length} files)`);
