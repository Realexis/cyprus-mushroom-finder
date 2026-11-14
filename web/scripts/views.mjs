// data/views.json: the map options, for screenshot robots (?full=1). Shroomy Lite has one:
// today's general map (no species picker, no day buttons).
// Written into dist/data (after a build) and public/data (for the dev server), when they exist.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = "Lab";

for (const dir of ["dist/data", "public/data"].map((d) => resolve(web, d))) {
  const metaFile = resolve(dir, "meta.json");
  if (!existsSync(metaFile)) continue;
  const meta = JSON.parse(readFileSync(metaFile, "utf8"));
  const views = {
    version: VERSION,
    day0: meta.days[0].date,
    layers: [{ id: "all", label: "Growing conditions today", in_season: true }],
  };
  writeFileSync(resolve(dir, "views.json"), JSON.stringify(views, null, 1) + "\n");
  console.log(`✓ ${dir.slice(web.length + 1)}/views.json: ${views.layers.length} option`);
}
