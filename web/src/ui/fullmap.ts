// Full map mode: the map fills the window for clean screenshots of the whole island.
// Same behaviour in every version (spec: shroomy-shared/FULL-MAP-SPEC.md):
// - hides the panels, notes and map buttons; keeps a slim safety line, the colour key and the credits;
// - fits the whole island, north up and flat;
// - web-address switches: ?full=1 &layer=<general|species code> &day=<0-7> &theme=<light|dark>;
// - <html data-map-ready="1"> once the map has finished drawing, "0" while it redraws.
import type * as maplibregl from "maplibre-gl";
import { SAFETY_LINE } from "./safety";

export const ISLAND: [[number, number], [number, number]] = [[32.25, 34.55], [34.6, 35.7]];

export interface UrlView { full: boolean; layer: string | null; day: number | null; theme: "light" | "dark" | null; }

/** Read the web-address switches once, at start-up. */
export function readUrlView(): UrlView {
  const q = new URLSearchParams(location.search);
  const day = q.get("day");
  const theme = q.get("theme");
  return {
    full: q.get("full") === "1",
    layer: q.get("layer"),
    day: day !== null && /^[0-7]$/.test(day) ? Number(day) : null,
    theme: theme === "light" || theme === "dark" ? theme : null,
  };
}

/** Tell screenshot tools when the map has finished drawing. */
export function trackMapReady(map: maplibregl.Map) {
  const root = document.documentElement;
  root.dataset.mapReady = "0";
  const busy = () => { root.dataset.mapReady = "0"; };
  map.on("dataloading", busy);
  map.on("movestart", busy);
  map.on("styledata", busy);
  map.on("idle", () => { root.dataset.mapReady = "1"; });
}

const EXPAND = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8V3h5M12 3h5v5M17 12v5h-5M8 17H3v-5"
  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/**
 * Adds the "Full map" button and returns `setFull(on)`.
 * `before()` runs when full map opens (e.g. leave 3D) so the map is flat and north-up.
 */
export function mountFullMap(map: maplibregl.Map, opts: { before?: () => void; mapApi: typeof maplibregl }) {
  const root = document.documentElement;
  const stage = document.querySelector<HTMLElement>(".stage")!;

  // Slim safety line + exit button, shown only in full map.
  const line = document.createElement("div");
  line.className = "full-safety";
  line.setAttribute("role", "note");
  line.textContent = SAFETY_LINE;
  const exit = document.createElement("button");
  exit.type = "button";
  exit.className = "full-exit";
  exit.textContent = "Exit full map";
  exit.dataset.tip = "Back to the normal map with the panel. The Esc key also works.";
  stage.append(line, exit);

  const fitIsland = () => map.fitBounds(ISLAND, { padding: 24, duration: 0, bearing: 0, pitch: 0 });

  const setFull = (on: boolean) => {
    if (on) opts.before?.();
    root.classList.toggle("full-map", on);
    btn.setAttribute("aria-pressed", String(on));
    // The layout changed size: let the map catch up, then frame the whole island.
    requestAnimationFrame(() => { map.resize(); if (on) fitIsland(); });
    if (!on) document.dispatchEvent(new Event("full-map-closed"));
  };

  // The button sits with the other map buttons (top right).
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ctrl-full";
  btn.innerHTML = `${EXPAND}<span>Full map</span>`;
  btn.setAttribute("aria-label", "Full map: hide the panels and show the whole island");
  btn.setAttribute("aria-pressed", "false");
  btn.dataset.tip = "Show the whole island on the full screen, for a clean screenshot. Press Esc or \"Exit full map\" to go back.";
  btn.addEventListener("click", () => setFull(true));
  map.addControl({
    onAdd() {
      const div = document.createElement("div");
      div.className = "maplibregl-ctrl maplibregl-ctrl-group ctrl-full-group";
      div.append(btn);
      return div;
    },
    onRemove() { btn.parentElement?.remove(); },
  }, "top-right");

  exit.addEventListener("click", () => setFull(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("full-map") && !document.querySelector("dialog[open]")) setFull(false);
  });
  return setFull;
}
