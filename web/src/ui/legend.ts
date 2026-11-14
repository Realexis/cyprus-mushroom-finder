// The small colour key that always sits on the map: today's growing conditions (with the
// closed nature reserves), the 50 m shade when that extra layer is on and the map is close up,
// or the rain of one day during the rain replay. One scale at a time, so a colour always means
// what the key says.
import { RAIN1_STOPS, SCORE_STOPS, SHADE_STOPS, SHADE_ZOOM, type View } from "../map/layers";

function gradient(stops: [number, string][]) {
  const lo = stops[0][0], hi = stops[stops.length - 1][0];
  return `linear-gradient(90deg, ${stops.map(([v, c]) => `${c} ${((v - lo) / (hi - lo)) * 100}%`).join(", ")})`;
}

export function renderLegend(el: HTMLElement, v: View, zoom: number, shadeOn: boolean) {
  const replay = v.mode === "replay";
  const shade = !replay && shadeOn && zoom >= SHADE_ZOOM;
  const zoomIn = !replay && shadeOn && !shade;
  const k = replay
    ? { title: "Rain that day", stops: RAIN1_STOPS.slice(1), left: "0.5 mm", right: "30+ mm",
        tip: "Rain on the day shown in the replay. Pale = a little, dark blue = a lot." }
    : shade ? { title: "Shade (50 m)", stops: SHADE_STOPS, left: "Sunny", right: "Deep shade",
        tip: "The shade layer is on: close up, the forest shows shade in 50 m squares (cool north-east slopes, valley bottoms, little autumn sun). Shade keeps the ground moist. Terrain only, no finer weather. Switch the layer off to see the growing conditions again." }
    : { title: "Growing conditions today", stops: SCORE_STOPS, left: "Poor", right: "Very good",
        tip: "Colour of each 250 m forest square: how good the growing conditions are today, from poor (dark green) to very good (orange-red). Not a sign that mushrooms are there. Hatched grey = nature reserve, closed to picking." };
  const html = `
    <div class="ml-title">${k.title}</div>
    <div class="ml-bar" style="background:${gradient(k.stops)}" aria-hidden="true"></div>
    <div class="ml-scale"><span>${k.left}</span><span aria-hidden="true">→</span><span>${k.right}</span></div>
    ${zoomIn ? `<div class="ml-note">Zoom in to see the shade</div>` : ""}
    ${replay ? "" : `<div class="ml-closed"><span class="swatch-closed" aria-hidden="true"></span> Reserve: <b>closed</b></div>`}`;
  if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; }
  el.dataset.tip = k.tip;
  el.setAttribute("aria-label", `Colour key: ${k.title}, from ${k.left} to ${k.right}.${zoomIn ? " Zoom in to see the shade." : ""}${replay ? "" : " Hatched grey: nature reserve, closed."}`);
}
