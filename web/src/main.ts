import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles/app.css";

import * as maplibregl from "maplibre-gl";
import type { MapGeoJSONFeature } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { addOverlays, setDay, setMode, type LayerUrls } from "./map/layers";
import { baseStyle, type Theme } from "./map/style";
import { Panel, type Meta } from "./ui/controls";
import { mountEmergency } from "./ui/safety";
import { applyTheme, currentTheme, toggleTheme } from "./ui/theme";

const abs = (p: string) => new URL(p, document.baseURI).href;

async function hasPrivateData(): Promise<boolean> {
  try {
    const r = await fetch(abs("private/cells.pmtiles"), { method: "HEAD" });
    return r.ok && (r.headers.get("content-type") ?? "").indexOf("html") < 0;
  } catch { return false; }
}

function cyprusToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Nicosia" }).format(new Date());
}

async function main() {
  applyTheme(currentTheme());
  mountEmergency([...document.querySelectorAll<HTMLElement>("[data-emergency]")]);

  maplibregl.setWorkerUrl(abs("vendor/maplibre-gl-worker.mjs"));
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);

  const [meta, priv] = await Promise.all([
    fetch(abs("data/meta.json"), { cache: "no-cache" }).then((r) => r.json() as Promise<Meta>),
    hasPrivateData(),
  ]);

  if (meta.weather_run < cyprusToday()) {
    const d = document.getElementById("delayed")!;
    d.textContent = `Data delayed · last update ${meta.weather_run}`;
    d.hidden = false;
  }

  const urls: LayerUrls = {
    terrain: abs("tiles/terrain.pmtiles"), hexes: abs("data/hexes.geojson"),
    rain: abs("data/rain.geojson"), reserves: abs("data/reserves.geojson"),
    privateCells: priv ? abs("private/cells.pmtiles") : undefined,
  };
  const basemap = abs("tiles/basemap.pmtiles");
  let theme: Theme = currentTheme();

  const map = new maplibregl.Map({
    container: "map",
    style: baseStyle(theme, basemap),
    bounds: [[32.25, 34.55], [34.6, 35.7]],
    fitBoundsOptions: { padding: { top: 20, bottom: 20, left: 20, right: 20 } },
    maxBounds: [[29.0, 32.0], [37.8, 38.2]],
    attributionControl: { compact: true },
    cooperativeGestures: false,
  });
  if (import.meta.env.DEV) {
    (window as unknown as { map: unknown }).map = map;
    map.on("error", (e) => console.error("[map]", e.error?.message ?? e));
  }
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), "top-right");

  const sheet = document.getElementById("sheet")!;
  const phone = matchMedia("(max-width: 899px)");
  if (phone.matches) sheet.classList.add("collapsed");
  const panel = new Panel(sheet, meta, priv, (p) => {
    if (!map.isStyleLoaded()) return;
    setDay(map, p.day);
    setMode(map, p.mode, p.priv);
  });

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
    addOverlays(map, theme, urls, panel.day, panel.mode, panel.priv);
  };
  map.once("load", onStyle);

  document.addEventListener("toggle-theme", () => {
    theme = toggleTheme();
    map.setStyle(baseStyle(theme, basemap), { diff: false });
    map.once("style.load", onStyle);
  });

  const pick = (e: maplibregl.MapMouseEvent) => {
    const layersToHit = ["cells-fill", "hex-fill"].filter((id) => map.getLayer(id) &&
      map.getLayoutProperty(id, "visibility") !== "none");
    const f: MapGeoJSONFeature | undefined = map.queryRenderedFeatures(e.point, { layers: layersToHit })[0];
    if (map.getLayer("hex-selected")) {
      map.setFilter("hex-selected", ["==", ["id"], f && f.layer.id === "hex-fill" ? (f.id as number) : -1]);
    }
    panel.showSpot(f ? (f.properties as Record<string, number>) : null, f?.layer.id === "cells-fill" ? "cell" : "hex");
    // Keep the tapped spot in view, above the panel on phones / beside it on desktop.
    if (f) {
      const pad = phone.matches ? { bottom: sheet.offsetHeight, top: 0, left: 0, right: 0 }
        : { left: sheet.offsetWidth + 32, top: 0, bottom: 0, right: 0 };
      map.easeTo({ center: e.lngLat, padding: pad, duration: 400 });
    }
  };
  map.on("click", pick);
  document.addEventListener("spot-closed", () => {
    if (map.getLayer("hex-selected")) map.setFilter("hex-selected", ["==", ["id"], -1]);
  });
  for (const id of ["hex-fill", "cells-fill"]) {
    map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
  }
}

main();
