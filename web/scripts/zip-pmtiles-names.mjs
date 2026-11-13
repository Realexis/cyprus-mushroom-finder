// After the build has fully finished: rename dist/**/*.pmtiles and *.bin -> *.zip.
// GitHub Pages compresses these and then serves byte ranges of the compressed file,
// which breaks PMTiles and our square details; .zip files are never compressed there
// (see src/map/files.ts).
import { readdirSync, renameSync } from "node:fs";
import { join } from "node:path";
let n = 0;
const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = join(d, e.name);
  if (e.isDirectory()) walk(p);
  else if (p.endsWith(".pmtiles") || p.endsWith(".bin")) { renameSync(p, `${p}.zip`); n++; }
});
walk("dist");
console.log(`✓ ${n} map and data files renamed to .zip for GitHub Pages`);
