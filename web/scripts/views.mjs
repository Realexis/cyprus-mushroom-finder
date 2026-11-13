// data/views.json: the "Conditions for" menu options, for screenshot robots (?full=1&layer=<id>).
// Same order and the same words as the menu (src/ui/controls.ts) for TODAY (day 0 of meta.json):
// the general map, then species in season, then species out of season (with their season).
// Written into dist/data (after a build) and public/data (for the dev server), when they exist.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const species = JSON.parse(readFileSync(resolve(web, "src/generated/species.json"), "utf8")).species;
const VERSION = "V5";

for (const dir of ["dist/data", "public/data"].map((d) => resolve(web, d))) {
  const metaFile = resolve(dir, "meta.json");
  if (!existsSync(metaFile)) continue;
  const meta = JSON.parse(readFileSync(metaFile, "utf8"));
  const month = Number(meta.days[0].date.slice(5, 7));
  const on = species.filter((s) => s.months.includes(month));
  const off = species.filter((s) => !s.months.includes(month));
  const views = {
    version: VERSION,
    day0: meta.days[0].date,
    layers: [
      { id: "all", label: "All forest (general map)", in_season: true },
      ...on.map((s) => ({ id: s.code, label: `${s.common} · ${s.latin}`, in_season: true })),
      ...off.map((s) => ({ id: s.code, label: `${s.common} · ${s.latin} · ${s.season_text}`, in_season: false })),
    ],
  };
  writeFileSync(resolve(dir, "views.json"), JSON.stringify(views, null, 1) + "\n");
  console.log(`✓ ${dir.slice(web.length + 1)}/views.json: ${views.layers.length} options (${on.length} species in season)`);
}
