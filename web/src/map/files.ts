// File names on the published site.
//
// GitHub Pages compresses binary files (served as application/octet-stream) and then
// answers byte-range requests with pieces of the COMPRESSED file. The browser unpacks them,
// so PMTiles (and our square details) get the wrong bytes. Files ending in .zip are never
// compressed there, so the published build adds ".zip" to every .pmtiles and .bin file
// (scripts/zip-pmtiles-names.mjs, run after every build). The dev server keeps the real names.
export const served = (path: string) => (import.meta.env.PROD ? `${path}.zip` : path);
export const pmtiles = served;
