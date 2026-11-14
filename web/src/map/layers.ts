// Our data layers on top of the basemap: hill shading, today's 250 m forest squares,
// the 50 m shade squares close up, the rain replay and the closed nature reserves. (Shroomy Lite: today only.)
import type { ExpressionSpecification, Map as MlMap } from "maplibre-gl";
import type { Theme } from "./style";

export type Mode = "conditions" | "replay";

/** What the map shows: today's score (day = index in meta.days), or one day of the rain replay. */
export interface View { day: number; mode: Mode; replayIndex: number; }

// Score colours: calm at the low end, warm glow at the top (same as V5).
export const SCORE_STOPS: [number, string][] = [
  [0, "#23413f"], [30, "#3e6b57"], [50, "#7e9f55"], [70, "#d9b44a"], [85, "#ee8e4a"], [100, "#ff6a4d"],
];
export const RAIN1_STOPS: [number, string][] = [[0, "rgba(217,232,242,0)"], [0.5, "#cfe3f0"], [3, "#9cc9e8"], [8, "#4f97d1"], [15, "#2a5fae"], [30, "#1b2f7a"]];

// Shade (50 m, close up): sunny = pale sand, deep shade = deep teal (same as V5).
export const SHADE_STOPS: [number, string][] = [[0, "#f1e3b5"], [35, "#b9c98f"], [55, "#5f9e86"], [75, "#2f6f78"], [100, "#183a5a"]];
/** From this zoom the 50 m shade squares cover the forest (they fade in from 11.5). */
export const SHADE_ZOOM = 12;

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function ramp(prop: ExpressionSpecification, stops: [number, string][]): ExpressionSpecification {
  return ["interpolate", ["linear"], prop, ...stops.flat()] as unknown as ExpressionSpecification;
}

const cellColor = (v: View) => ramp(["to-number", ["get", `s${v.day}`], 0], SCORE_STOPS);
const rainColor = (v: View) => ramp(["to-number", ["at", v.replayIndex, ["get", "d"]], 0], RAIN1_STOPS);

function hatch(theme: Theme): ImageData {
  const s = 16, c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  g.fillStyle = theme === "dark" ? "rgba(140,146,143,0.30)" : "rgba(120,126,123,0.25)";
  g.fillRect(0, 0, s, s);
  g.strokeStyle = theme === "dark" ? "rgba(214,219,216,0.85)" : "rgba(70,76,73,0.85)";
  g.lineWidth = 2;
  for (const o of [-s, 0, s]) { g.beginPath(); g.moveTo(o, s); g.lineTo(o + s, 0); g.stroke(); }
  return g.getImageData(0, 0, s, s);
}

export interface LayerUrls { terrain: string; reserves: string; cells: string; shade?: string; soft?: string; }

export function addOverlays(map: MlMap, theme: Theme, urls: LayerUrls, v: View) {
  const firstSymbol = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
  if (!map.hasImage("hatch")) map.addImage("hatch", hatch(theme));

  map.addSource("terrain", { type: "raster-dem", url: `pmtiles://${urls.terrain}`, encoding: "terrarium",
    tileSize: 256, attribution: "Copernicus DEM © DLR e.V., © Airbus" });
  map.addLayer({
    id: "hillshade", type: "hillshade", source: "terrain",
    paint: {
      "hillshade-exaggeration": theme === "dark" ? 0.55 : 0.45,
      "hillshade-shadow-color": theme === "dark" ? "#050a08" : "#5b5340",
      "hillshade-highlight-color": theme === "dark" ? "#3a4a41" : "#ffffff",
      "hillshade-accent-color": theme === "dark" ? "#0c1612" : "#8a8270",
    },
  }, firstSymbol);

  // Rain replay: the 30 days of rain load only when the replay is first opened (setRainData).
  map.addSource("rain", { type: "geojson", data: EMPTY, attribution: "Weather: Open-Meteo.com (CC BY 4.0)" });
  map.addLayer({
    id: "rain-fill", type: "fill", source: "rain",
    layout: { visibility: v.mode === "replay" ? "visible" : "none" },
    paint: { "fill-color": rainColor(v), "fill-opacity": 0.72, "fill-antialias": false },
  }, firstSymbol);

  // Today's 250 m forest squares. Closed reserves and forest with no partner tree are not drawn.
  const SEL_HALO = theme === "dark" ? "#0c1612" : "#ffffff";
  const SEL_CORE = theme === "dark" ? "#ffffff" : "#1b2620";
  const selW = (a: number, b: number) => ["interpolate", ["linear"], ["zoom"], 7, a, 12, b] as unknown as ExpressionSpecification;
  map.addSource("cells", { type: "vector", url: `pmtiles://${urls.cells}`,
    attribution: "Copernicus Land Monitoring Service · EEA" });
  map.addLayer({
    id: "cells-fill", type: "fill", source: "cells", "source-layer": "cells",
    filter: ["all", ["==", ["get", "closed"], 0], ["==", ["get", "g"], 1]],
    layout: { visibility: v.mode === "conditions" ? "visible" : "none" },
    paint: { "fill-color": cellColor(v), "fill-opacity": 0.72, "fill-antialias": false },
  }, firstSymbol);
  // 50 m shade squares (island-wide, terrain only) when zoomed in: the double tap lands here.
  // Under the selection outline, so the tapped 250 m square still shows.
  const shadeOn = ["interpolate", ["linear"], ["zoom"], 11.5, 0, 12.3, 0.85] as unknown as ExpressionSpecification;
  if (urls.shade) {
    map.addSource("shade", { type: "vector", url: `pmtiles://${urls.shade}` });
    map.addLayer({
      id: "shade-fill", type: "fill", source: "shade", "source-layer": "hotspots", minzoom: 11.5,
      layout: { visibility: v.mode === "conditions" ? "visible" : "none" },
      paint: { "fill-color": ramp(["get", "sh"], SHADE_STOPS), "fill-opacity": shadeOn, "fill-antialias": false },
    }, firstSymbol);
    // Spots with no shade square (no forest at 50 m) show today's conditions colour of their
    // 250 m square: drawn as a soft picture (scripts/lite-soft-orange.py, made daily) so they
    // fade into the shade around them. The 250 m squares stay underneath, invisible, for taps.
    if (urls.soft) {
      map.addSource("soft", { type: "raster", url: `pmtiles://${urls.soft}`, tileSize: 256 });
      map.addLayer({
        id: "soft", type: "raster", source: "soft", minzoom: 11.5,
        layout: { visibility: v.mode === "conditions" ? "visible" : "none" },
        paint: { "raster-opacity": shadeOn, "raster-resampling": "linear", "raster-fade-duration": 150 },
      }, firstSymbol);
      map.setPaintProperty("cells-fill", "fill-opacity",
        ["interpolate", ["linear"], ["zoom"], 11.5, 0.72, 12.3, 0]);
    }
  }
  map.addLayer({ id: "cells-selected-halo", type: "line", source: "cells", "source-layer": "cells",
    filter: ["==", ["get", "i"], -1], paint: { "line-color": SEL_HALO, "line-width": selW(5, 8) } }, firstSymbol);
  map.addLayer({ id: "cells-selected", type: "line", source: "cells", "source-layer": "cells",
    filter: ["==", ["get", "i"], -1], paint: { "line-color": SEL_CORE, "line-width": selW(2, 3.5) } }, firstSymbol);

  // The tapped 50 m shade square (close up): one solid colour, outlined.
  map.addSource("picked", { type: "geojson", data: EMPTY });
  map.addLayer({ id: "picked-halo", type: "line", source: "picked", paint: { "line-color": SEL_HALO, "line-width": 5 } }, firstSymbol);
  map.addLayer({ id: "picked-core", type: "line", source: "picked", paint: { "line-color": SEL_CORE, "line-width": 2.5 } }, firstSymbol);

  map.addSource("reserves", { type: "geojson", data: urls.reserves,
    attribution: "Nature reserves: EEA NatDA (CC BY 4.0)" });
  map.addLayer({ id: "reserve-fill", type: "fill", source: "reserves", paint: { "fill-pattern": "hatch" } }, firstSymbol);
  map.addLayer({ id: "reserve-line", type: "line", source: "reserves",
    paint: { "line-color": theme === "dark" ? "#d6dbd8" : "#464c49", "line-width": 1.4 } }, firstSymbol);
  map.addLayer({
    id: "reserve-label", type: "symbol", source: "reserves", minzoom: 9.5,
    layout: { "text-field": ["concat", "CLOSED\n", ["get", "name"]], "text-font": ["Noto Sans Medium"],
      "text-size": 13, "text-max-width": 9, "symbol-placement": "point" },
    paint: { "text-color": theme === "dark" ? "#f2f4f3" : "#1b2620",
      "text-halo-color": theme === "dark" ? "#3a403d" : "#ffffff", "text-halo-width": 1.6 },
  });
}

/** Switch between today's scores and the rain replay. */
export function applyView(map: MlMap, v: View) {
  const replay = v.mode === "replay";
  map.setLayoutProperty("rain-fill", "visibility", replay ? "visible" : "none");
  map.setLayoutProperty("cells-fill", "visibility", replay ? "none" : "visible");
  for (const id of ["shade-fill", "soft"]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", replay ? "none" : "visible");
  }
  if (replay) map.setPaintProperty("rain-fill", "fill-color", rainColor(v));
}

/** Fast path for the rain replay: only the colour changes. */
export function setReplayFrame(map: MlMap, v: View) {
  map.setPaintProperty("rain-fill", "fill-color", rainColor(v));
}

export function setRainData(map: MlMap, rain: GeoJSON.FeatureCollection) {
  (map.getSource("rain") as { setData?: (d: GeoJSON.FeatureCollection) => void } | undefined)?.setData?.(rain);
}

/** Outline what was tapped: the 50 m shade square close up (`small`), else the 250 m square
 *  (by cell index), or nothing. */
export function setSelection(map: MlMap, cellIndex: number | null, small: GeoJSON.Geometry | null = null) {
  for (const id of ["cells-selected", "cells-selected-halo"]) {
    if (map.getLayer(id)) map.setFilter(id, ["==", ["get", "i"], small ? -1 : cellIndex ?? -1]);
  }
  (map.getSource("picked") as { setData?: (d: GeoJSON.FeatureCollection) => void } | undefined)?.setData?.(
    small ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: small }] } : EMPTY);
}
