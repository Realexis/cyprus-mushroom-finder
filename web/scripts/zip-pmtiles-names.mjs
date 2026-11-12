// After the build has fully finished: rename dist/**/*.pmtiles -> *.pmtiles.zip.
// GitHub Pages compresses .pmtiles and then serves byte ranges of the compressed file,
// which breaks PMTiles; .zip files are never compressed there (see src/map/files.ts).
import { readdirSync, renameSync } from "node:fs";
import { join } from "node:path";
let n = 0;
const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = join(d, e.name);
  if (e.isDirectory()) walk(p);
  else if (p.endsWith(".pmtiles")) { renameSync(p, `${p}.zip`); n++; }
});
walk("dist");
console.log(`✓ ${n} map files renamed to .pmtiles.zip for GitHub Pages`);
