// The small colour key that always sits on the map: today's growing conditions (with the
// closed nature reserves), the 50 m shade close up, or one day of the replay (rain, temperature or soil wetness).
import { T } from "../i18n";
import { RAIN1_STOPS, SCORE_STOPS, SHADE_STOPS, SHADE_ZOOM, SOIL_STOPS, TEMP_STOPS, type View } from "../map/layers";

const L = T.legend;
const REPLAY_KEY = {
  rain: { ...L.rain, stops: RAIN1_STOPS.slice(1) },
  temp: { ...L.temp, stops: TEMP_STOPS },
  soil: { ...L.soil, stops: SOIL_STOPS },
};

function gradient(stops: [number, string][]) {
  const lo = stops[0][0], hi = stops[stops.length - 1][0];
  return `linear-gradient(90deg, ${stops.map(([v, c]) => `${c} ${((v - lo) / (hi - lo)) * 100}%`).join(", ")})`;
}

export function renderLegend(el: HTMLElement, v: View, zoom: number, hasShade: boolean, hasHeat = false) {
  const replay = v.mode === "replay";
  const shade = !replay && hasShade && !hasHeat && zoom >= SHADE_ZOOM;
  const fine = !replay && hasHeat && zoom >= SHADE_ZOOM;      // Lab: the 50 m heat map is showing
  const k = replay ? REPLAY_KEY[v.layer]
    : shade ? { ...L.shade, stops: SHADE_STOPS }
    : fine ? { ...L.fine, stops: SCORE_STOPS }
    : { ...L.cond, stops: SCORE_STOPS };
  const html = `
    <div class="ml-title">${k.title}</div>
    <div class="ml-bar" style="background:${gradient(k.stops)}" aria-hidden="true"></div>
    <div class="ml-scale"><span>${k.left}</span><span aria-hidden="true">→</span><span>${k.right}</span></div>
    ${shade ? `<div class="ml-note">${L.zoomOut}</div>` : ""}
    ${fine ? `<div class="ml-note">${L.fineNote}</div>` : ""}
    ${replay ? "" : `<div class="ml-closed"><span class="swatch-closed" aria-hidden="true"></span> ${L.reserve}</div>`}`;
  if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; }
  el.dataset.tip = k.tip;
  el.setAttribute("aria-label", L.aria(k.title, k.left, k.right, shade, replay));
}
