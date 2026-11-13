// Shroomy Lite: leave out the published files Lite never reads (the ~2 km zones, the zone
// details, the top zones and the 8-day summary). Smaller site, faster upload.
import { rmSync } from "node:fs";
const UNUSED = ["data/hexes.geojson", "data/spots.json",
  "data/hotspot_zones.json", "data/summary.json"];
for (const f of UNUSED) rmSync(`dist/${f}`, { force: true });
console.log(`✓ ${UNUSED.length} files Lite does not use left out of dist/`);
