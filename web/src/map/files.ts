// Map file names on the published site.
//
// GitHub Pages compresses .pmtiles files (served as application/octet-stream) and then
// answers byte-range requests with pieces of the COMPRESSED file. The browser unpacks them,
// so PMTiles gets the wrong bytes ("Server returned no content-length…") and parts of the
// map go missing. Files ending in .zip are never compressed there, so the published build
// adds ".zip" (scripts/zip-pmtiles-names.mjs, run after every build). The dev server keeps the real names.
export const pmtiles = (path: string) => (import.meta.env.PROD ? `${path}.zip` : path);
