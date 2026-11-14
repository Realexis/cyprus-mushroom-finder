// The 50 m heat map picture has the ORIGINAL score colours baked in (scripts/lab-heat50.py).
// A design with its own score colours reads that same picture and swaps every colour for its own
// colour of the same score, in the browser. So the 250 m squares, the 50 m patches, the colour key
// and the card keep one scale, and trying a new scale needs no new map file.
// (Exploration shortcut. A design that goes live should get its own picture from the script.
//  The swap finds each pixel's score by its colour, and can be one point off in rare cases.)
import { addProtocol } from "maplibre-gl";
import { PMTiles } from "pmtiles";
import type { Stops } from "../designs/types";

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
function at(stops: Stops, v: number): number[] {
  let k = 0;
  while (k < stops.length - 2 && v > stops[k + 1][0]) k++;
  const [a, ca] = stops[k], [b, cb] = stops[k + 1];
  const t = Math.max(0, Math.min(1, (v - a) / (b - a))), A = hex(ca), B = hex(cb);
  return A.map((x, i) => x + (B[i] - x) * t);
}
function opacityAt(pairs: number[], v: number): number {
  let k = 0;
  while (k < pairs.length - 4 && v > pairs[k + 2]) k += 2;
  const t = Math.max(0, Math.min(1, (v - pairs[k]) / (pairs[k + 2] - pairs[k])));
  return pairs[k + 1] + (pairs[k + 3] - pairs[k + 1]) * t;
}

export interface HeatTiles { tiles: string[]; minzoom: number; maxzoom: number; bounds: [number, number, number, number]; }

export async function recolouredHeat(url: string, from: Stops, fromOpacity: number[], to: Stops, toOpacity: number[]): Promise<HeatTiles> {
  const file = new PMTiles(url);
  const h = await file.getHeader();
  // score -> the colour in the picture, and -> the design's colour
  const src: number[][] = [], dst: number[][] = [];
  for (let s = 0; s <= 100; s++) {
    src.push([...at(from, s).map(Math.round), Math.round(opacityAt(fromOpacity, s) * 255)]);
    dst.push([...at(to, s).map(Math.round), Math.round(opacityAt(toOpacity, s) * 255)]);
  }
  const seen = new Map<number, number>();
  const scoreOf = (r: number, g: number, b: number, a: number): number => {
    const key = ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
    let s = seen.get(key);
    if (s === undefined) {
      let best = Infinity;
      s = 0;
      for (let k = 0; k <= 100; k++) {
        const c = src[k], d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2 + 4 * (c[3] - a) ** 2;
        if (d < best) { best = d; s = k; }
      }
      seen.set(key, s);
    }
    return s;
  };
  addProtocol("heat50x", async (req) => {
    const [z, x, y] = req.url.replace("heat50x://", "").split("/").map(Number);
    const tile = await file.getZxy(z, x, y);
    if (!tile) return { data: null as unknown as ArrayBuffer };      // no picture here (as the pmtiles reader answers)
    const bmp = await createImageBitmap(new Blob([tile.data]), { premultiplyAlpha: "none" });
    const cv = new OffscreenCanvas(bmp.width, bmp.height);
    const g = cv.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(bmp, 0, 0);
    const img = g.getImageData(0, 0, cv.width, cv.height), p = img.data;
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] === 0) continue;
      const c = dst[scoreOf(p[i], p[i + 1], p[i + 2], p[i + 3])];
      p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2]; p[i + 3] = c[3];
    }
    g.putImageData(img, 0, 0);
    return { data: await (await cv.convertToBlob({ type: "image/png" })).arrayBuffer() };
  });
  return { tiles: ["heat50x://{z}/{x}/{y}"], minzoom: h.minZoom, maxzoom: h.maxZoom, bounds: [h.minLon, h.minLat, h.maxLon, h.maxLat] };
}
