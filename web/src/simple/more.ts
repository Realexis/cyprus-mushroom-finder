// PROTOTYPE: the one "More" box. Everything that is not the answer lives here.
import type { Meta } from "../ui/controls";
import { cyprusDate, fmtDay, scoreColour } from "./text";

export interface MoreActions { day: (i: number) => void; locate: () => void; theme: () => void; }

const KEY: [string, string, number][] = [
  ["Very good", "80 to 100", 90], ["Good", "65 to 79", 72], ["Fair", "45 to 64", 55], ["Poor", "0 to 44", 25],
];

export function mountMore(opener: HTMLElement, meta: Meta, currentDay: () => number, act: MoreActions) {
  const dlg = document.createElement("dialog");
  dlg.className = "s-more";
  dlg.setAttribute("aria-labelledby", "more-title");
  document.body.append(dlg);

  const render = () => {
    const now = currentDay();
    const today = cyprusDate();
    const days = meta.days.map((d, i) => {
      const name = d.date === today ? "Today" : fmtDay(d.date, { weekday: "short" });
      const date = fmtDay(d.date, { day: "numeric", month: "short" });
      const sure = d.confidence === "high" ? "" : d.confidence === "medium" ? "may change" : "rough guide";
      return `<button type="button" class="s-day${i === now ? " on" : ""}" data-day="${i}" aria-pressed="${i === now}">
        <b>${name}</b><span>${date}</span>${sure ? `<small>${sure}</small>` : ""}</button>`;
    }).join("");
    const key = KEY.map(([w, range, v]) => `<li><i style="background:${scoreColour(v)}"></i><b>${w}</b> <span>${range}</span></li>`).join("");
    dlg.innerHTML = `<div class="s-more-in">
      <div class="s-more-head"><h2 id="more-title">More</h2>
        <button type="button" class="s-close" data-close aria-label="Close">✕</button></div>
      <h3>Pick a day</h3>
      <div class="s-days">${days}</div>
      <button type="button" class="s-wide" data-locate>Show where I am</button>
      <h3>What the colours mean</h3>
      <ul class="s-key">${key}<li><i class="hatch"></i><b>Closed</b> <span>nature reserve</span></li></ul>
      <h3>How the score works</h3>
      <p>The score mixes rain, temperature, soil moisture, the season for the altitude, and shade.</p>
      <p>Each zone is about 2 km wide. A high score means good growing conditions. It never means a mushroom is there.</p>
      <h3>Other things</h3>
      <button type="button" class="s-wide" data-theme>Dark or light screen</button>
      <p class="s-links"><a href="./index.html">Open the full map</a> · <a href="./about.html">About and sources</a></p></div>`;
    dlg.querySelector("[data-close]")!.addEventListener("click", () => dlg.close());
    dlg.querySelectorAll<HTMLButtonElement>("[data-day]").forEach((b) => b.addEventListener("click", () => {
      act.day(Number(b.dataset.day)); dlg.close();
    }));
    dlg.querySelector("[data-locate]")!.addEventListener("click", () => { dlg.close(); act.locate(); });
    dlg.querySelector("[data-theme]")!.addEventListener("click", () => { dlg.close(); act.theme(); });
  };

  opener.addEventListener("click", () => { render(); dlg.showModal(); });
  // Tap outside the box to close it.
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  return dlg;
}
