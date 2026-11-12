// Our data layers on top of the basemap.
import type { ExpressionSpecification, Map as MlMap } from "maplibre-gl";
import type { Theme } from "./style";

export type Mode = "conditions" | "rain7" | "rain30";

// Score colours: calm at the low end, warm glow at the top (same as the previews).
export const SCORE_STOPS: [number, string][] = [
  [0, "#23413f"], [30, "#3e6b57"], [50, "#7e9f55"], [70, "#d9b44a"], [85, "#ee8e4a"], [100, "#ff6a4d"],
];
export const RAIN7_STOPS: [number, string][] = [[0, "#d9e8f2"], [10, "#9cc9e8"], [25, "#4f97d1"], [50, "#2a5fae"], [80, "#1b2f7a"]];
export const RAIN30_STOPS: [number, string][] = [[0, "#d9e8f2"], [20, "#9cc9e8"], [50, "#4f97d1"], [80, "#2a5fae"], [120, "#1b2f7a"]];

function ramp(prop: ExpressionSpecification, stops: [number, string][]): ExpressionSpecification {
  return ["interpolate", ["linear"], prop, ...stops.flat()] as unknown as ExpressionSpecification;
}

export function scoreColor(day: number): ExpressionSpecification {
  return ramp(["to-number", ["get", `s${day}`], 0], SCORE_STOPS);
}

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

export interface LayerUrls { terrain: string; hexes: string; rain: string; reserves: string; privateCells?: string; }

export function addOverlays(map: MlMap, theme: Theme, urls: LayerUrls, day: number, mode: Mode, priv: boolean) {
  const firstSymbol = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
  if (!map.hasImage("hatch")) map.addImage("hatch", hatch(theme));

  map.addSource("terrain", { type: "raster-dem", url: `pmtiles://${urls.terrain}`, encoding: "terrarium", tileSize: 256,
    attribution: "Copernicus DEM © DLR e.V., © Airbus" });
  map.addLayer({
    id: "hillshade", type: "hillshade", source: "terrain",
    paint: {
      "hillshade-exaggeration": theme === "dark" ? 0.55 : 0.45,
      "hillshade-shadow-color": theme === "dark" ? "#050a08" : "#5b5340",
      "hillshade-highlight-color": theme === "dark" ? "#3a4a41" : "#ffffff",
      "hillshade-accent-color": theme === "dark" ? "#0c1612" : "#8a8270",
    },
  }, firstSymbol);

  map.addSource("rain", { type: "geojson", data: urls.rain, attribution: "Weather: Open-Meteo.com (CC BY 4.0)" });
  map.addLayer({
    id: "rain-fill", type: "fill", source: "rain",
    layout: { visibility: mode === "conditions" ? "none" : "visible" },
    paint: {
      "fill-color": mode === "rain30" ? ramp(["get", "r30"], RAIN30_STOPS) : ramp(["get", "r7"], RAIN7_STOPS),
      "fill-opacity": 0.72, "fill-antialias": false,
    },
  }, firstSymbol);

  map.addSource("hexes", { type: "geojson", data: urls.hexes, generateId: true,
    attribution: "Copernicus Land Monitoring Service · EEA" });
  map.addLayer({
    id: "hex-fill", type: "fill", source: "hexes",
    layout: { visibility: mode === "conditions" && !priv ? "visible" : "none" },
    paint: { "fill-color": scoreColor(day), "fill-opacity": 0.78 },
  }, firstSymbol);
  map.addLayer({
    id: "hex-line", type: "line", source: "hexes",
    layout: { visibility: mode === "conditions" && !priv ? "visible" : "none" },
    paint: { "line-color": theme === "dark" ? "#0c1612" : "#f3f0e7", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.3, 12, 1.2], "line-opacity": 0.7 },
  }, firstSymbol);
  map.addLayer({
    id: "hex-selected", type: "line", source: "hexes",
    filter: ["==", ["id"], -1],
    paint: { "line-color": theme === "dark" ? "#ffffff" : "#1b2620", "line-width": 3 },
  }, firstSymbol);

  if (urls.privateCells) {
    map.addSource("cells", { type: "vector", url: `pmtiles://${urls.privateCells}` });
    map.addLayer({
      id: "cells-fill", type: "fill", source: "cells", "source-layer": "cells",
      filter: ["==", ["get", "closed"], 0],
      layout: { visibility: mode === "conditions" && priv ? "visible" : "none" },
      paint: { "fill-color": scoreColor(day), "fill-opacity": 0.72, "fill-antialias": false },
    }, firstSymbol);
  }

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

export function setDay(map: MlMap, day: number) {
  map.setPaintProperty("hex-fill", "fill-color", scoreColor(day));
  if (map.getLayer("cells-fill")) map.setPaintProperty("cells-fill", "fill-color", scoreColor(day));
}

export function setMode(map: MlMap, mode: Mode, priv: boolean) {
  const v = (on: boolean) => (on ? "visible" : "none");
  map.setLayoutProperty("rain-fill", "visibility", v(mode !== "conditions"));
  if (mode !== "conditions") {
    map.setPaintProperty("rain-fill", "fill-color",
      mode === "rain30" ? ramp(["get", "r30"], RAIN30_STOPS) : ramp(["get", "r7"], RAIN7_STOPS));
  }
  for (const id of ["hex-fill", "hex-line"]) map.setLayoutProperty(id, "visibility", v(mode === "conditions" && !priv));
  if (map.getLayer("cells-fill")) map.setLayoutProperty("cells-fill", "visibility", v(mode === "conditions" && priv));
}
