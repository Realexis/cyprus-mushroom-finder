// Safety wording check. The build fails if the site says a mushroom is
// edible or fine to eat anywhere in our source or published data.
// (Safety rule 1 + 7 of the project brief.)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = ["src", "index.html", "about.html", "public/data"];
const BANNED = [/\bedible\b/i, /safe to eat/i, /good to eat/i, /\bsafe\b(?!-area)/i, /find [a-z ]+ here/i];
// Greek (the el build): the same rule. Tested on text with the accents taken off and in small
// letters (final ς written σ), so "Βρώσιμο", "ΒΡΩΣΙΜΟ" and "βρωσιμο" are all caught. (\b does not work on Greek letters.)
// Also: never "mushroom map" in Greek (it is a map of growing CONDITIONS).
const BANNED_EL = [
  /βρωσιμ/, /εδωδιμ/, /φαγωσιμ/,                       // edible
  /τρωγεται/, /τρωγονται/, /τρωγετε/,                   // "is eaten / can be eaten"
  /ασφαλ(εσ|η|ησ|εισ|ων|ωσ)(?![α-ω])/,                  // the bare word "safe(ly)"
  /καταλληλ[α-ω]* για (καταναλωση|φαγητο|φαγωμα|μαγειρεμα)/,   // fit for eating
  /(καλ[α-ω]+|νοστιμ[α-ω]+) για (φαγητο|φαγωμα)/,       // good to eat
  /να (φαγωθ|καταναλωθ)/,                               // "can be eaten" (see ALLOWED_EL)
  /(βρειτε|βρεισ|βρεσ|βρισκετε) [α-ω ]+ εδω/, // find … here
  /χαρτ[α-ω]* (των |με )?μανιταρι/,                     // mushroom map
];
// The one sentence that may use "can be eaten": the About page saying the site NEVER says so.
const ALLOWED_EL = [/ποτε δεν λεει οτι ενα μανιταρι μπορει να φαγωθει/];
const plainEl = (line) => line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ς/g, "σ");

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
    if (!/[\u0370-\u03ff]/.test(line)) return;
    let greek = plainEl(line);
    for (const ok of ALLOWED_EL) greek = greek.replace(ok, "");
    for (const re of BANNED_EL) {
      if (re.test(greek)) { console.error(`✗ ${f}:${i + 1}  matches ${re}  →  ${line.trim().slice(0, 120)}`); bad++; }
    }
  });
}
if (bad) { console.error(`\n${bad} banned phrase(s). The site must show growing conditions only.`); process.exit(1); }
console.log(`✓ wording check passed (${files.length} files)`);
