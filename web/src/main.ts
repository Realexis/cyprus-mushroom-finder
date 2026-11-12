import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles/app.css";

import * as maplibregl from "maplibre-gl";
import type { MapGeoJSONFeature } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { addOverlays, applyView, hexProp, set3D, setReplayFrame, type LayerUrls } from "./map/layers";
import { baseStyle, type Theme } from "./map/style";
import { Panel, type HotZone, type Meta } from "./ui/controls";
import { mountEmergency } from "./ui/safety";
import { mountSpecies, speciesByCode } from "./ui/species";
import { CellInfo, cellSpot, hexSpot, type SpotData, type Spots } from "./ui/spot";
import { applyTheme, currentTheme, toggleTheme } from "./ui/theme";
import { hideMapTip as hideTip, mountTips, showAt } from "./ui/tips";
import { words } from "./ui/spot";

const abs = (p: string) => new URL(p, document.baseURI).href;

async function hasPrivateData(): Promise<boolean> {
  try {
    const r = await fetch(abs("private/cells.pmtiles"), { method: "HEAD" });
    return r.ok && (r.headers.get("content-type") ?? "").indexOf("html") < 0;
  } catch { return false; }
}

async function getJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: "no-cache" });
    return r.ok ? ((await r.json()) as T) : null;
  } catch { return null; }
}

function cyprusToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Nicosia" }).format(new Date());
}

/** Island-average daily rain for the replay timeline. */
function islandRain(rain: GeoJSON.FeatureCollection | null, n: number): number[] {
  const sum = new Array(n).fill(0);
  const feats = rain?.features ?? [];
  for (const f of feats) {
    const d = (f.properties as { d: number[] }).d;
    for (let i = 0; i < n; i++) sum[i] += d[i] ?? 0;
  }
  return sum.map((v) => (feats.length ? v / feats.length : 0));
}

/** The "3D" map button. */
class TerrainControl implements maplibregl.IControl {
  private btn!: HTMLButtonElement;
  on = false;
  constructor(private toggle: (on: boolean) => void) {}
  onAdd() {
    const div = document.createElement("div");
    div.className = "maplibregl-ctrl maplibregl-ctrl-group";
    this.btn = document.createElement("button");
    this.btn.type = "button";
    this.btn.className = "ctrl-3d";
    this.btn.addEventListener("click", () => { this.on = !this.on; this.update(); this.toggle(this.on); });
    div.append(this.btn);
    this.update();
    return div;
  }
  update() {
    this.btn.textContent = this.on ? "2D" : "3D";
    this.btn.setAttribute("aria-pressed", String(this.on));
    this.btn.setAttribute("aria-label", this.on ? "Back to the flat 2D map" : "Show the map in 3D");
    this.btn.dataset.tip = this.on
      ? "Back to the flat map."
      : "Tilt the map to see the mountains in 3D. To turn or tilt: drag with the right mouse button, or with two fingers.";
  }
  onRemove() { this.btn.parentElement?.remove(); }
}

async function main() {
  applyTheme(currentTheme());
  mountTips();
  mountEmergency([...document.querySelectorAll<HTMLElement>("[data-emergency]")]);

  maplibregl.setWorkerUrl(abs("vendor/maplibre-gl-worker.mjs"));
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);

  const [meta, priv, spots, rain] = await Promise.all([
    fetch(abs("data/meta.json"), { cache: "no-cache" }).then((r) => r.json() as Promise<Meta>),
    hasPrivateData(),
    getJSON<Spots>(abs("data/spots.json")),
    getJSON<GeoJSON.FeatureCollection>(abs("data/rain.geojson")),
  ]);

  if (meta.weather_run < cyprusToday()) {
    const d = document.getElementById("delayed")!;
    d.textContent = `Data delayed · last update ${meta.weather_run}`;
    d.dataset.tip = "Today's weather update has not arrived yet. The map shows the last good data. It usually updates at 6 am Cyprus time (7 am in summer).";
    d.hidden = false;
  }

  // Private extras (dev server on this Mac only): 250 m details + 50 m hotspot zoom.
  let cellInfo: CellInfo | null = null;
  let hotZones: HotZone[] = [];
  let hotZonesGeo: GeoJSON.FeatureCollection | undefined;
  if (priv) {
    const [im, hz] = await Promise.all([
      getJSON<{ factors: string[]; inputs: string[]; days: number }>(abs("private/cells_info.json")),
      getJSON<{ zones: (HotZone & { ring: number[][] })[] }>(abs("private/hotspot_zones.json")),
    ]);
    if (im) CellInfo.load(abs("private/cells_info.bin"), im).then((c) => (cellInfo = c)).catch(() => {});
    if (hz) {
      hotZones = hz.zones;
      hotZonesGeo = { type: "FeatureCollection", features: hz.zones.map((z) => ({ type: "Feature",
        properties: { where: z.where, score: z.score }, geometry: { type: "Polygon", coordinates: [z.ring] } })) };
    }
  }

  const urls: LayerUrls = {
    terrain: abs("tiles/terrain.pmtiles"), hexes: abs("data/hexes.geojson"),
    rain: abs("data/rain.geojson"), reserves: abs("data/reserves.geojson"),
    privateCells: priv ? abs("private/cells.pmtiles") : undefined,
    hotspots: priv && hotZonesGeo ? abs("private/hotspots.geojson") : undefined,
    hotspotZones: hotZonesGeo,
  };
  const basemap = abs("tiles/basemap.pmtiles");
  let theme: Theme = currentTheme();

  const map = new maplibregl.Map({
    container: "map",
    style: baseStyle(theme, basemap),
    bounds: [[32.25, 34.55], [34.6, 35.7]],
    fitBoundsOptions: { padding: { top: 20, bottom: 20, left: 20, right: 20 } },
    maxBounds: [[29.0, 32.0], [37.8, 38.2]],
    maxPitch: 75,
    attributionControl: { compact: true },
    cooperativeGestures: false,
  });
  if (import.meta.env.DEV) {
    (window as unknown as { map: unknown }).map = map;
    map.on("error", (e) => console.error("[map]", e.error?.message ?? e));
  }
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  const terrainCtl = new TerrainControl((on) => set3D(map, on, theme));
  map.addControl(terrainCtl, "top-right");
  map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), "top-right");
  // Our own tips on MapLibre's buttons (and no second, native browser tooltip).
  const ctlTips: Record<string, string> = {
    ".maplibregl-ctrl-zoom-in": "Zoom in. You can also scroll or pinch.",
    ".maplibregl-ctrl-zoom-out": "Zoom out.",
    ".maplibregl-ctrl-compass": "Turn the map back to north and flat. The needle shows where north is.",
    ".maplibregl-ctrl-geolocate": "Show where you are on the map (needs location permission). Your position stays on your phone.",
  };
  for (const [sel, tip] of Object.entries(ctlTips)) {
    const b = document.querySelector<HTMLElement>(sel);
    if (b) { b.removeAttribute("title"); b.dataset.tip = tip; }
  }

  const sheet = document.getElementById("sheet")!;
  const phone = matchMedia("(max-width: 899px)");
  if (phone.matches) sheet.classList.add("collapsed");

  // ------------------------------------------------------------ the tapped spot
  type Pick = { f: MapGeoJSONFeature; lngLat: maplibregl.LngLat };
  let lastPick: Pick | null = null;
  const buildSpot = (p: Pick): SpotData => {
    const props = p.f.properties as Record<string, number>;
    if (p.f.layer.id === "hot-fill") return { kind: "hot", score: () => null, hot: props };
    if (p.f.layer.id === "cells-fill") {
      const sp = speciesByCode(panel.species);
      const score = (d: number) => {
        if (!sp) return props[`s${d}`] === null || props[`s${d}`] === undefined ? null : Number(props[`s${d}`]);
        if (!sp.trees.includes(Number(props.tree)) || !sp.bands.includes(Number(props.band))) return null;
        return panel.inSeason(d) ? Math.round(Number(props[`b${d}`]) + meta.season_share) : 0;
      };
      return cellSpot(props, cellInfo, score, p.lngLat);
    }
    return hexSpot(props, spots?.spots[Number(props.h)], (d) => hexProp(d, panel.filter), meta.general_map_trees);
  };

  const panel: Panel = new Panel(sheet, meta, priv, islandRain(rain, 30), hotZones,
    (p) => {
      if (!map.isStyleLoaded()) return;
      applyView(map, p.view);
      if (lastPick && p.mode === "conditions") p.showSpot(buildSpot(lastPick), false);
    },
    (p) => { if (map.isStyleLoaded()) setReplayFrame(map, p.view); },
    (code) => openSpecies(code),
    (z) => {
      const pad = phone.matches ? { bottom: sheet.offsetHeight, top: 0, left: 0, right: 0 }
        : { left: sheet.offsetWidth + 32, top: 0, bottom: 0, right: 0 };
      map.flyTo({ center: [z.lon, z.lat], zoom: 13.2, padding: pad, duration: 1600 });
    });
  const openSpecies = mountSpecies(() => panel.monthOf(panel.day), (code) => panel.setSpecies(code));

  // Keep map buttons above the bottom sheet on phones.
  new ResizeObserver(() => document.documentElement.style.setProperty("--sheet-h", `${sheet.offsetHeight + 8}px`))
    .observe(sheet);

  // Fit Cyprus into the part of the map NOT covered by the panel.
  const fitCyprus = () => {
    const pad = phone.matches
      ? { top: 16, right: 16, left: 16, bottom: sheet.offsetHeight + 16 }
      : { top: 24, right: 60, bottom: 24, left: sheet.offsetWidth + 40 };
    map.fitBounds([[32.27, 34.56], [34.6, 35.7]], { padding: pad, duration: 0 });
  };
  map.once("load", () => {
    fitCyprus();
    document.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
  });

  const onStyle = () => {
    addOverlays(map, theme, urls, panel.view);
    if (terrainCtl.on) set3D(map, true, theme, false);
  };
  map.once("load", onStyle);

  document.addEventListener("toggle-theme", () => {
    theme = toggleTheme();
    map.setStyle(baseStyle(theme, basemap), { diff: false });
    map.once("style.load", onStyle);
  });

  const pick = (e: maplibregl.MapMouseEvent) => {
    const layersToHit = ["hot-fill", "cells-fill", "hex-fill"].filter((id) => map.getLayer(id) &&
      map.getLayoutProperty(id, "visibility") !== "none");
    const f: MapGeoJSONFeature | undefined = map.queryRenderedFeatures(e.point, { layers: layersToHit })[0];
    if (map.getLayer("hex-selected")) {
      map.setFilter("hex-selected", ["==", ["id"], f && f.layer.id === "hex-fill" ? (f.id as number) : -1]);
    }
    lastPick = f ? { f, lngLat: e.lngLat } : null;
    panel.showSpot(lastPick ? buildSpot(lastPick) : null);
    // Keep the tapped spot in view, above the panel on phones / beside it on desktop.
    if (f) {
      const pad = phone.matches ? { bottom: sheet.offsetHeight, top: 0, left: 0, right: 0 }
        : { left: sheet.offsetWidth + 32, top: 0, bottom: 0, right: 0 };
      map.easeTo({ center: e.lngLat, padding: pad, duration: 400 });
    }
  };
  map.on("click", pick);
  document.addEventListener("spot-closed", () => {
    lastPick = null;
    if (map.getLayer("hex-selected")) map.setFilter("hex-selected", ["==", ["id"], -1]);
  });
  for (const id of ["hex-fill", "cells-fill", "hot-fill"]) {
    map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; hideTip(); });
  }

  // Hovering the map (mouse only): a small tip with the score, so you can scan before clicking.
  map.on("mousemove", (e) => {
    if (panel.mode !== "conditions") return;
    const ids = ["hot-fill", "cells-fill", "hex-fill"].filter((id) => map.getLayer(id) &&
      map.getLayoutProperty(id, "visibility") !== "none");
    const f = map.queryRenderedFeatures(e.point, { layers: ids })[0];
    if (!f) { hideTip(); return; }
    const r = map.getCanvas().getBoundingClientRect();
    const p = f.properties as Record<string, number>;
    let text: string;
    if (f.layer.id === "hot-fill") text = `Shade ${p.sh}/100 · ${p.el} m. Click for details.`;
    else {
      const sp = speciesByCode(panel.species);
      if (sp && !panel.inSeason(panel.day)) text = `Out of season for ${sp.latin} (${sp.season_text}). Click for details.`;
      else {
        const v = buildSpot({ f, lngLat: e.lngLat }).score(panel.day);
        text = v === null ? "Not scored here. Click for details." : `${v}/100 · ${words(v)}. Click for details.`;
      }
    }
    showAt(e.originalEvent.clientX || r.left + e.point.x, (e.originalEvent.clientY || r.top + e.point.y) - 6, text);
  });
  map.on("mouseout", () => hideTip());
  map.on("movestart", () => hideTip());
}

main();
