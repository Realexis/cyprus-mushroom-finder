// The small colour key that always sits on the map: today's growing conditions (with the
// closed nature reserves) at every zoom, or the rain of one day during the rain replay.
// Lite: one colour scale for the conditions, so a colour always matches the score on the card.
import { RAIN1_STOPS, SCORE_STOPS, type View } from "../map/layers";

function gradient(stops: [number, string][]) {
  const lo = stops[0][0], hi = stops[stops.length - 1][0];
  return `linear-gradient(90deg, ${stops.map(([v, c]) => `${c} ${((v - lo) / (hi - lo)) * 100}%`).join(", ")})`;
}

export function renderLegend(el: HTMLElement, v: View) {
  const replay = v.mode === "replay";
  const k = replay
    ? { title: "Rain that day", stops: RAIN1_STOPS.slice(1), left: "0.5 mm", right: "30+ mm",
        tip: "Rain on the day shown in the replay. Pale = a little, dark blue = a lot." }
    : { title: "Growing conditions today", stops: SCORE_STOPS, left: "Poor", right: "Very good",
        tip: "Colour of each 250 m forest square: how good the growing conditions are today, from poor (dark green) to very good (orange-red). Not a sign that mushrooms are there. Hatched grey = nature reserve, closed to picking." };
  const html = `
    <div class="ml-title">${k.title}</div>
    <div class="ml-bar" style="background:${gradient(k.stops)}" aria-hidden="true"></div>
    <div class="ml-scale"><span>${k.left}</span><span aria-hidden="true">→</span><span>${k.right}</span></div>
    ${replay ? "" : `<div class="ml-closed"><span class="swatch-closed" aria-hidden="true"></span> Reserve: <b>closed</b></div>`}`;
  if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; }
  el.dataset.tip = k.tip;
  el.setAttribute("aria-label", `Colour key: ${k.title}, from ${k.left} to ${k.right}.${replay ? "" : " Hatched grey: nature reserve, closed."}`);
}
