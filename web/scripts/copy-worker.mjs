// Copy MapLibre's worker (and the shared chunk it imports) into public/vendor/,
// so the worker loads the same way in dev and on the live site.
import { copyFileSync, mkdirSync } from "node:fs";
const src = "node_modules/maplibre-gl/dist/";
mkdirSync("public/vendor", { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(src + f, "public/vendor/" + f);
console.log("✓ MapLibre worker copied to public/vendor/");
