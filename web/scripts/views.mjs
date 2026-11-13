// Writes public/data/views.json: the "Conditions for" menu, for screenshot tools (full map mode).
// Labels match the menu exactly; "in_season" uses the build date's month in Cyprus.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("src/generated/species.json", "utf8"));
const month = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Nicosia", month: "numeric" }).format(new Date()));
const layers = [{ id: "general", label: "All forest (general map)", in_season: true }];
for (const s of data.species) {
  const on = s.months.includes(month);
  layers.push({ id: s.code, label: `${s.common} · ${s.latin}${on ? "" : ` · ${s.season_text}`}`, in_season: on });
}
mkdirSync("public/data", { recursive: true });
writeFileSync("public/data/views.json", JSON.stringify({
  version: "V3",
  how: "Open <site>/?full=1&layer=<id>&day=<0-7>&theme=<light|dark>; wait for <html data-map-ready=\"1\">.",
  layers,
}, null, 1));
console.log(`✓ views.json: ${layers.length} map choices`);
