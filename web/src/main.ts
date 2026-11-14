// Shroomy Lite: today's growing conditions, phone first.
// Open the site: the whole island. Double tap: zoom in to the 250 m squares, centred on the
// tapped spot. Tap a square: its card. Same scores as V5 (made by the pipeline, not here).
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles/app.css";

import * as maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { pmtiles } from "./map/files";
import { addOverlays, applyView, setRainData, setReplayFrame, setSelection } from "./map/layers";
import { baseStyle } from "./map/style";
import { Panel } from "./ui/controls";
import { loadCellDetail, words, type CellsIndex, type Meta } from "./ui/card";
import { mountEmergency } from "./ui/safety";
import { applyTheme, systemTheme } from "./ui/theme";
import { hideMapTip as hideTip, mountTips, showAt } from "./ui/tips";
import { renderLegend } from "./ui/legend";
import { mountSpecies } from "./ui/species";
import { FullMap, readUrlView, trackMapReady } from "./ui/fullmap";

const abs = (p: string) => new URL(p, document.baseURI).href;

/** The double tap lands here: the 50 m shade squares show, each about 13 screen pixels wide,
 *  so one solid colour can be tapped (Real, 13 Nov), with ~1.5 km of forest around. */
const SQUARE_ZOOM = 14;
/** Two taps closer than this (time, distance) are a double tap. */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 40;
const CYPRUS: [[number, number], [number, number]] = [[32.27, 34.56], [34.6, 35.7]];

function cyprusToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Nicosia" }).format(new Date());
}

async function main() {
  const urlView = readUrlView();                       // ?full=1 and ?theme=light|dark
  const theme = urlView.theme ?? systemTheme();
  applyTheme(theme);
  // Test copies say so in the header (VITE_PREVIEW_LABEL in web/.env.local, not in git).
  const previewLabel = import.meta.env.VITE_PREVIEW_LABEL as string | undefined;
  if (previewLabel) {
    document.querySelector(".brand-sub")?.insertAdjacentHTML("afterend",
      ` <span class="ver-badge" data-tip="A test copy of the site. Not the live site.">${previewLabel.replace(/[&<>"]/g, "")}</span>`);
  }
  mountTips();
  mountEmergency([...document.querySelectorAll<HTMLElement>("[data-emergency]")]);

  maplibregl.setWorkerUrl(abs("vendor/maplibre-gl-worker.mjs"));
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);

  const [meta, cellsIndex, hasShade] = await Promise.all([
    fetch(abs("data/meta.json"), { cache: "no-cache" }).then((r) => r.json() as Promise<Meta>),
    fetch(abs("data/cells_info.json"), { cache: "no-cache" }).then((r) => (r.ok ? r.json() as Promise<CellsIndex> : null)).catch(() => null),
    // The 50 m shade map is published? (The dev server answers missing files with the HTML page.)
    fetch(abs(pmtiles("tiles/shade50.pmtiles")), { method: "HEAD" })
      .then((r) => r.ok && (r.headers.get("content-type") ?? "").indexOf("html") < 0).catch(() => false),
  ]);

  // Today only: the day in the data that is today in Cyprus (day 0 on a normal morning).
  const today = cyprusToday();
  const found = meta.days.findIndex((d) => d.date === today);
  const day = found >= 0 ? found : 0;
  if (meta.weather_run < today) {
    const d = document.getElementById("delayed")!;
    d.textContent = `Data delayed · last update ${meta.weather_run}`;
    d.dataset.tip = "Today's weather update has not arrived yet. The map shows today from the last good update. It usually updates each morning at about 6:30 am Cyprus time.";
    d.hidden = false;
  }

  // Map files get the data version in their address, so after each daily update the browser
  // fetches fresh pieces instead of mixing in old cached copies (which breaks PMTiles reads).
  const ver = encodeURIComponent(meta.generated_utc);
  const v = (p: string) => `${abs(p)}?v=${ver}`;
  const urls = { terrain: v(pmtiles("tiles/terrain.pmtiles")), cells: v(pmtiles("data/cells.pmtiles")),
    reserves: abs("data/reserves.geojson"), shade: hasShade ? v(pmtiles("tiles/shade50.pmtiles")) : undefined };

  const map = new maplibregl.Map({
    container: "map",
    style: baseStyle(theme, v(pmtiles("tiles/basemap.pmtiles"))),
    bounds: CYPRUS,
    fitBoundsOptions: { padding: 20 },
    maxBounds: [[29.0, 32.0], [37.8, 38.2]],
    maxZoom: 16,
    maxPitch: 0,
    dragRotate: false,                                 // flat, north up: nothing to get lost in
    pitchWithRotate: false,
    doubleClickZoom: false,                            // our own double tap (below)
    attributionControl: { compact: true },
  });
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  if (import.meta.env.DEV) {
    (window as unknown as { map: unknown }).map = map;
    map.on("error", (e) => console.error("[map]", e.error?.message ?? e));
  }
  map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), "top-right");
  const geo = document.querySelector<HTMLButtonElement>(".maplibregl-ctrl-geolocate");
  if (geo) { geo.removeAttribute("title"); geo.dataset.tip = "Show where you are on the map (needs location permission). Your position stays on your phone."; }

  const sheet = document.getElementById("sheet")!;
  const phone = matchMedia("(max-width: 899px)");
  // Fit Cyprus into the part of the map NOT covered by the panel.
  const fitCyprus = () => {
    if (fullMap.on) { fullMap.frame(); return; }
    const pad = phone.matches
      ? { top: 4, right: 4, left: 4, bottom: sheet.offsetHeight + 4 }
      : { top: 24, right: 60, bottom: 24, left: sheet.offsetWidth + 40 };
    map.fitBounds(CYPRUS, { padding: pad, duration: 0 });
  };
  // Full map mode (whole island, flat, north up; for screenshots) and <html data-map-ready>.
  const mapBusy = trackMapReady(map, () => !!map.getLayer("cells-fill"));
  const fullMap = new FullMap(map, { before: () => hideTip(), after: () => fitCyprus(), busy: mapBusy });
  map.addControl(fullMap, "top-right");
  if (urlView.full) fullMap.set(true, false);

  // ------------------------------------------------------------ the panel and the tapped square
  let picked: { i: number; lngLat: maplibregl.LngLat; small: GeoJSON.Geometry | null } | null = null;
  /** Middle of a square (all its pieces: a square can be cut in two where map tiles meet). */
  const middle = (geoms: GeoJSON.Geometry[]): maplibregl.LngLat | null => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const walk = (c: unknown): void => {
      if (Array.isArray(c) && typeof c[0] === "number") {
        const [x, y] = c as number[];
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      } else if (Array.isArray(c)) c.forEach(walk);
    };
    for (const g of geoms) if ("coordinates" in g) walk(g.coordinates);
    return x0 <= x1 ? new maplibregl.LngLat((x0 + x1) / 2, (y0 + y1) / 2) : null;
  };
  const pinEl = document.createElement("div");
  pinEl.className = "pick-pin";
  pinEl.setAttribute("aria-hidden", "true");
  const pin = new maplibregl.Marker({ element: pinEl });
  const applySelection = () => {
    setSelection(map, picked?.i ?? null, picked?.small ?? null);
    // Close up the 50 m outline marks the spot; the ring would hide it.
    if (picked && !picked.small) pin.setLngLat(picked.lngLat).addTo(map); else pin.remove();
  };

  const legendEl = document.getElementById("map-legend")!;
  const openSpecies = mountSpecies(() => Number(meta.days[day].date.slice(5, 7)));
  const panel: Panel = new Panel(sheet, meta, day, {
    onMode: (p) => { mapBusy(); applyView(map, p.view); drawLegend(); },
    onFrame: (p) => setReplayFrame(map, p.view),
    loadRain: async () => {
      const rain = await fetch(abs("data/rain.geojson"), { cache: "no-cache" }).then((r) => {
        if (!r.ok) throw new Error(`rain ${r.status}`);
        return r.json() as Promise<GeoJSON.FeatureCollection>;
      });
      setRainData(map, rain);
      const sum = new Array(30).fill(0);                // island-average rain per day, for the timeline
      for (const f of rain.features) (f.properties as { d: number[] }).d.forEach((x, k) => { if (k < 30) sum[k] += x ?? 0; });
      return sum.map((x) => (rain.features.length ? x / rain.features.length : 0));
    },
    onCardClosed: () => { picked = null; applySelection(); },
    openSpecies,
  });
  const drawLegend = () => renderLegend(legendEl, panel.view, map.getZoom(), hasShade);
  drawLegend();
  map.on("zoom", drawLegend);

  // Keep map buttons above the bottom panel on phones.
  new ResizeObserver(() => document.documentElement.style.setProperty("--sheet-h", `${sheet.offsetHeight + 8}px`))
    .observe(sheet);

  map.once("load", () => {
    addOverlays(map, theme, urls, panel.view);
    fitCyprus();
    document.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
  });

  // Loading message: hide once the map has drawn its layers for the first time.
  const loading = document.getElementById("loading")!;
  const slow = window.setTimeout(() => {
    document.getElementById("loading-text")!.textContent = "Still loading… a slow connection can take a minute.";
  }, 12000);
  map.once("idle", () => {
    window.clearTimeout(slow);
    loading.classList.add("done");
    window.setTimeout(() => (loading.hidden = true), 400);
  });

  /** Open the card of the square under this point (or close the card if there is none). */
  const pick = (point: maplibregl.Point, lngLat: maplibregl.LngLat) => {
    if (panel.mode !== "conditions" || !map.getLayer("cells-fill")) return;
    const f = map.queryRenderedFeatures(point, { layers: ["cells-fill"] })[0];
    if (!f) { panel.closeCard(); return; }
    const props = f.properties as Record<string, number>;
    const i = Number(props.i);
    // Close up, the 50 m shade square under the finger too (terrain only).
    const shadeF = map.getLayer("shade-fill") && map.getZoom() >= 11.5
      ? map.queryRenderedFeatures(point, { layers: ["shade-fill"] })[0] : undefined;
    const shade = shadeF ? (shadeF.properties as Record<string, number>) : undefined;
    // The dot and the view sit in the middle of the tapped square, not where the finger landed.
    const cellParts = map.querySourceFeatures("cells", { sourceLayer: "cells", filter: ["==", ["get", "i"], i] });
    const centre = (shadeF ? middle([shadeF.geometry]) : middle([f.geometry, ...cellParts.map((p) => p.geometry)])) ?? lngLat;
    picked = { i, lngLat: centre, small: shadeF ? shadeF.geometry : null };
    applySelection();
    panel.showCard({ props, shade, detail: null });
    if (cellsIndex) {
      loadCellDetail(abs("data/"), cellsIndex, i, day)
        .then((detail) => { if (picked?.i === i) panel.showCard({ props, shade, detail }, true); })
        .catch(() => { if (picked?.i === i) panel.showCard({ props, shade, detail: null, failed: true }, true); });
    } else panel.showCard({ props, shade, detail: null, failed: true }, true);
    // Keep the tapped square in view, above the panel on phones / beside it on computers.
    const pad = phone.matches ? { bottom: sheet.offsetHeight, top: 0, left: 0, right: 0 }
      : { left: sheet.offsetWidth + 32, top: 0, bottom: 0, right: 0 };
    map.easeTo({ center: centre, padding: pad, duration: 400 });
  };

  /** Double tap: zoom in, centred on that exact spot, to the 250 m squares (or one step closer). */
  const zoomTo = (lngLat: maplibregl.LngLat) => {
    const z = map.getZoom();
    const target = z < SQUARE_ZOOM - 0.25 ? SQUARE_ZOOM : Math.min(map.getMaxZoom(), z + 1);
    const pad = phone.matches ? { bottom: sheet.offsetHeight, top: 0, left: 0, right: 0 }
      : { left: sheet.offsetWidth + 32, top: 0, bottom: 0, right: 0 };
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.easeTo({ center: lngLat, zoom: target, padding: pad, duration: still ? 0 : 700 });
  };

  // One tap waits a moment: if a second tap follows, it was a double tap (zoom), not a pick.
  let pending: { t: number; x: number; y: number; timer: number } | null = null;
  map.on("click", (e) => {
    const now = performance.now();
    if (pending && now - pending.t < DOUBLE_TAP_MS && Math.hypot(e.point.x - pending.x, e.point.y - pending.y) < DOUBLE_TAP_PX) {
      window.clearTimeout(pending.timer);
      pending = null;
      zoomTo(e.lngLat);
      return;
    }
    if (pending) window.clearTimeout(pending.timer);
    const { point, lngLat } = e;
    pending = { t: now, x: point.x, y: point.y, timer: window.setTimeout(() => { pending = null; pick(point, lngLat); }, DOUBLE_TAP_MS) };
  });

  // Mouse only: a small tip with the score while hovering, so you can scan before clicking.
  map.on("mousemove", (e) => {
    if (panel.mode !== "conditions" || !map.getLayer("cells-fill")) return;
    const f = map.queryRenderedFeatures(e.point, { layers: ["cells-fill"] })[0];
    if (!f) { hideTip(); map.getCanvas().style.cursor = ""; return; }
    map.getCanvas().style.cursor = "pointer";
    const s = (f.properties as Record<string, number>)[`s${day}`];
    const r = map.getCanvas().getBoundingClientRect();
    showAt(e.originalEvent.clientX || r.left + e.point.x, (e.originalEvent.clientY || r.top + e.point.y) - 6,
      s === undefined || s === null ? "Not scored here." : `${words(Number(s))} · ${s}/100. Click for details.`);
  });
  map.on("mouseout", () => hideTip());
  map.on("movestart", () => hideTip());
}

main().catch((e) => {
  console.error(e);
  const t = document.getElementById("loading-text");
  if (t) t.textContent = "The map could not load. Check your internet connection, then reload the page.";
  document.getElementById("loading")?.classList.add("failed");
});
