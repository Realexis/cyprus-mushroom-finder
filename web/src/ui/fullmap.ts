// Full map mode: the whole island, north up, flat 2D, nothing else but a slim safety line, the
// colour key, the map credits and an "Exit full map" button. For clean screenshots, built the
// same way in every version (shroomy-shared/FULL-MAP-SPEC.md).
//
// Web-address switches: ?full=1 (open in full map), &theme=light|dark. (Shroomy Lite shows
// today only and has one map, so &layer= and &day= are not used; data/views.json lists "all".)
// When the map has finished drawing, <html data-map-ready="1"> (back to "0" while it redraws).
import type * as maplibregl from "maplibre-gl";
import "../styles/full-map.css";
import { NUMBERS_LINE, SAFETY_LINE, WARN_ICON } from "./safety";
import { hideMapTip } from "./tips";

/** The same frame in every version (spec). */
export const FULL_BOUNDS: [[number, number], [number, number]] = [[32.25, 34.55], [34.6, 35.7]];
const FULL_PAD = 24;

const EXPAND = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor"
  stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`;
const SHRINK = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor"
  stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>`;

export interface UrlView { full: boolean; theme: "light" | "dark" | null; }

/** Read the web-address switches. Unknown values are ignored. */
export function readUrlView(search = location.search): UrlView {
  const q = new URLSearchParams(search);
  const theme = q.get("theme");
  return { full: q.get("full") === "1", theme: theme === "light" || theme === "dark" ? theme : null };
}

/** <html data-map-ready>: "0" now, "1" once the map is idle after the last change AND our forest
 *  layers are in and every tile has loaded (`hasLayers`), so a screenshot never catches an empty map. */
export function trackMapReady(map: maplibregl.Map, hasLayers: () => boolean) {
  const root = document.documentElement;
  let gen = 0;
  const check = (g: number) => {
    if (g !== gen) return;
    if (map.loaded() && hasLayers()) root.dataset.mapReady = "1";
    else map.once("idle", () => check(g));
  };
  const busy = () => {
    const g = ++gen;
    root.dataset.mapReady = "0";
    map.once("idle", () => check(g));
  };
  busy();
  map.on("movestart", busy);
  map.on("styledata", () => { if (root.dataset.mapReady === "1") busy(); });
  map.on("dataloading", () => { if (root.dataset.mapReady === "1") busy(); });
  return busy;
}

/** The "Full map" button (a map control) and the mode itself. */
export class FullMap implements maplibregl.IControl {
  on = false;
  private btn!: HTMLButtonElement;
  private exitBtn: HTMLButtonElement;
  private line: HTMLDivElement;

  constructor(private map: maplibregl.Map, private hooks: { before: () => void; after: () => void;
                                                           busy: () => void }) {
    this.line = document.createElement("div");
    this.line.className = "full-safety";
    this.line.setAttribute("role", "note");
    this.line.innerHTML = `${WARN_ICON}<span>${SAFETY_LINE} <span class="full-numbers">${NUMBERS_LINE}</span></span>`;
    this.exitBtn = document.createElement("button");
    this.exitBtn.type = "button";
    this.exitBtn.className = "full-exit";
    this.exitBtn.innerHTML = `${SHRINK}<span>Exit full map</span>`;
    this.exitBtn.setAttribute("aria-label", "Exit full map (Esc)");
    this.exitBtn.addEventListener("click", () => this.set(false));
    document.querySelector(".stage")?.append(this.line, this.exitBtn);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.on && !document.querySelector("dialog[open]")) this.set(false);
    });
    // Browser full screen or a turned phone: keep the same island frame.
    let t = 0;
    window.addEventListener("resize", () => {
      if (!this.on) return;
      window.clearTimeout(t);
      t = window.setTimeout(() => { this.map.resize(); this.frame(); }, 150);
    });
  }

  onAdd() {
    const div = document.createElement("div");
    div.className = "maplibregl-ctrl maplibregl-ctrl-group full-ctrl";
    this.btn = document.createElement("button");
    this.btn.type = "button";
    this.btn.className = "ctrl-full";
    this.btn.innerHTML = `${EXPAND}<span>Full map</span>`;
    this.btn.setAttribute("aria-label", "Full map: the whole island, nothing else");
    this.btn.dataset.tip = "Show the whole island on the full screen, flat and north up, without the panels. "
      + "Good for screenshots. Press Esc or \"Exit full map\" to come back.";
    this.btn.addEventListener("click", () => this.set(true));
    div.append(this.btn);
    return div;
  }

  onRemove() { this.btn.parentElement?.remove(); }

  /** The whole island, north up, flat, fitted to the whole window (same in every version). */
  frame() {
    this.map.jumpTo({ pitch: 0, bearing: 0 });
    this.map.fitBounds(FULL_BOUNDS, { padding: FULL_PAD, duration: 0, pitch: 0, bearing: 0 });
  }

  /** `focus`: move keyboard focus to the Exit / Full map button (not when opened from the web
   *  address, so screenshots have no focus ring). */
  set(on: boolean, focus = true) {
    if (on === this.on) return;
    this.on = on;
    hideMapTip();
    if (on) this.hooks.before();
    document.documentElement.classList.toggle("full-map", on);
    // Credits written out (licences), not folded into the small (i) button.
    document.querySelector(".maplibregl-ctrl-attrib")?.classList.toggle("maplibregl-compact-show", on);
    this.map.resize();
    if (on) {
      this.frame();
      if (focus) this.exitBtn.focus({ preventScroll: true });
    } else {
      this.hooks.after();
      if (focus) this.btn.focus({ preventScroll: true });
    }
    this.hooks.busy();
  }
}
