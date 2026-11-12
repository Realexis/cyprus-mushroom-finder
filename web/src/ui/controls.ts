// Bottom sheet (mobile) / side panel (desktop): days, layer switch, species filter,
// rain replay, legend, hotspot zoom list and the spot panel.
import { RAIN1_STOPS, RAIN30_STOPS, RAIN7_STOPS, SCORE_STOPS, SHADE_STOPS, type Filter, type Mode, type View } from "../map/layers";
import { SPECIES, speciesByCode } from "./species";
import { esc, fmtDay, spotHTML, type SpotData } from "./spot";

export interface DayInfo { offset: number; date: string; confidence: "high" | "medium" | "low"; }
export interface Meta {
  weather_run: string; generated_utc: string; model: string; days: DayInfo[]; credits: unknown[];
  rain_days: string[];
  clock: { opens: number; closes: number; soak_mm: number };
  weights: Record<string, number>; season_share: number; general_map_trees: number[];
}
export interface HotZone { hex: string; where: string; lat: number; lon: number; score: number; date: string; }

const CONF_TEXT = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };
const CONF_TIP = {
  high: "Forecast for the next 2 days: usually reliable.",
  medium: "Forecast 3-4 days ahead: it may still change.",
  low: "Forecast 5 or more days ahead: only a rough guide. Check again closer to the day.",
};
const REPLAY_DAYS = 30;

function gradient(stops: [number, string][]) {
  const max = stops[stops.length - 1][0];
  return `linear-gradient(90deg, ${stops.map(([v, c]) => `${c} ${(v / max) * 100}%`).join(", ")})`;
}

export class Panel {
  day = 0;
  mode: Mode = "conditions";
  priv = false;
  species: string | null = null;
  replayIndex = REPLAY_DAYS - 1;
  playing = false;
  private timer = 0;
  private spot: SpotData | null = null;

  constructor(private el: HTMLElement, private meta: Meta, private hasPrivate: boolean,
              private islandRain: number[], private hotZones: HotZone[],
              private onChange: (p: Panel) => void, private onFrame: (p: Panel) => void,
              private openSpecies: (code?: string) => void, private flyTo: (z: HotZone) => void) {
    this.render();
  }

  /** Month of a day offset (1-12), for species season windows. */
  monthOf(day: number) { return Number(this.meta.days[day].date.slice(5, 7)); }

  inSeason = (day: number) => {
    const sp = speciesByCode(this.species);
    return !sp || sp.months.includes(this.monthOf(day));
  };

  get filter(): Filter {
    const sp = speciesByCode(this.species);
    return { code: sp?.code ?? null, trees: sp?.trees ?? [], bands: sp?.bands ?? [],
      inSeason: this.inSeason(this.day), seasonShare: this.meta.season_share };
  }

  get view(): View {
    return { day: this.day, mode: this.mode, priv: this.priv, filter: this.filter, replayIndex: this.replayIndex };
  }

  setSpecies(code: string | null) {
    this.species = code;
    if (this.mode !== "conditions") { this.stop(); this.mode = "conditions"; }
    this.render(); this.onChange(this);
  }

  showSpot(s: SpotData | null, scroll = true) {
    this.spot = s;
    this.renderSpot();
    if (s && scroll) this.el.querySelector("#spot")?.scrollIntoView({ block: "nearest" });
  }

  // ------------------------------------------------------------ rain replay
  private play() {
    if (this.replayIndex >= REPLAY_DAYS - 1) this.replayIndex = 0;
    this.playing = true;
    this.timer = window.setInterval(() => {
      if (this.replayIndex >= REPLAY_DAYS - 1) { this.stop(); return; }
      this.replayIndex++; this.updateReplay(); this.onFrame(this);
    }, 550);
    this.updateReplay();
  }

  private stop() {
    window.clearInterval(this.timer); this.playing = false;
    if (this.el.querySelector("#replay")) this.updateReplay();
  }

  private updateReplay() {
    const i = this.replayIndex;
    const d = this.meta.rain_days[i];
    const btn = this.el.querySelector<HTMLButtonElement>("#play");
    if (btn) {
      btn.innerHTML = this.playing ? "❚❚ Pause" : "▶ Play";
      btn.setAttribute("aria-label", this.playing ? "Pause the rain replay" : "Play the rain replay");
      btn.dataset.tip = this.playing ? "Pause on this day." : "Play the last 30 days of rain, one day at a time.";
    }
    const date = this.el.querySelector("#replay-date");
    if (date) date.innerHTML = `<b>${fmtDay(d, { weekday: "short", day: "numeric", month: "short" })}</b>
      ${i === REPLAY_DAYS - 1 ? "· today" : `· ${REPLAY_DAYS - 1 - i} day${REPLAY_DAYS - 1 - i === 1 ? "" : "s"} ago`}
      <span class="muted">· island average ${this.islandRain[i].toFixed(1)} mm</span>`;
    const sl = this.el.querySelector<HTMLInputElement>("#replay-slider");
    if (sl) { sl.value = String(i); sl.setAttribute("aria-valuetext", fmtDay(d, { day: "numeric", month: "long" })); }
    this.el.querySelectorAll<HTMLElement>(".tl i").forEach((b, k) => b.classList.toggle("now", k === i));
  }

  private replayHTML() {
    const max = Math.max(1, ...this.islandRain.slice(0, REPLAY_DAYS));
    const bars = this.islandRain.slice(0, REPLAY_DAYS).map((v, k) =>
      `<i style="height:${Math.max(2, (v / max) * 40)}px"></i>`).join("");
    return `<div class="replay" id="replay">
      <div class="replay-row"><button id="play" class="primary-btn" type="button"></button>
        <span id="replay-date" aria-live="polite"></span></div>
      <div class="tl" aria-hidden="true" data-tip="Each bar is one day. Taller bar = more rain over the island. Tap a bar to jump to that day.">${bars}</div>
      <input id="replay-slider" type="range" data-tip="Drag to choose a day of the last 30 days." min="0" max="${REPLAY_DAYS - 1}" step="1" value="${this.replayIndex}"
        aria-label="Day of the rain replay" />
      <div class="legend-scale"><span>${fmtDay(this.meta.rain_days[0], { day: "numeric", month: "short" })}</span><span>today</span></div>
      <p class="muted small">Daily rain for each ~3 km weather square, last 30 days.</p>
    </div>`;
  }

  // ------------------------------------------------------------ render
  private render() {
    const days = this.meta.days.map((d) => {
      const label = d.offset === 0 ? "Today" : fmtDay(d.date, { weekday: "short" });
      const num = fmtDay(d.date, { day: "numeric", month: "short" });
      return `<button class="day" data-day="${d.offset}" aria-pressed="${d.offset === this.day}"
          aria-label="${label} ${num}, ${CONF_TEXT[d.confidence]}"
          data-tip="Show growing conditions for ${fmtDay(d.date, { weekday: "long", day: "numeric", month: "long" })}. ${CONF_TIP[d.confidence]}">
        <b>${label}</b><span>${num}</span>
        <span class="conf"><i class="dot ${d.confidence}"></i>${d.confidence}</span></button>`;
    }).join("");
    const cur = this.meta.days[this.day];
    const sp = speciesByCode(this.species);
    const rainNote = this.mode === "rain7" || this.mode === "rain30"
      ? `<p class="conf-line">Rain shown is the <b>${this.mode === "rain7" ? "last 7" : "last 30"} days</b>, up to today.</p>` : "";
    const options = [`<option value="">All forest (general map)</option>`,
      ...SPECIES.map((s) => `<option value="${s.code}" ${s.code === this.species ? "selected" : ""}>${esc(s.latin)} · ${esc(s.common)}</option>`)].join("");
    const seasonMsg = sp ? (this.inSeason(this.day)
      ? `<p class="filter-line">Good conditions for <i>${esc(sp.latin)}</i> habitat · <span class="tag">in season ${esc(sp.season_text)}</span></p>`
      : `<p class="filter-line warn-line"><b>Out of season.</b> <i>${esc(sp.latin)}</i> season is ${esc(sp.season_text)}.
          Grey = its habitat, with no score.</p>`) : "";

    this.el.innerHTML = `
      <button class="grip-btn" id="grip" type="button" aria-label="Show more or less" data-tip="Tap to show more or fewer controls."><div class="grip"></div></button>
      <div class="spot" id="spot" hidden></div>
      <h2 id="days-h">Day</h2>
      <div class="days" role="group" aria-labelledby="days-h">${days}</div>
      <p class="conf-line">${fmtDay(cur.date, { weekday: "long", day: "numeric", month: "long" })} ·
        <b>${CONF_TEXT[cur.confidence]}</b></p>
      <div class="sheet-more">
      <h2 id="sp-h"><label for="species">Conditions for</label></h2>
      <div class="sp-row">
        <select id="species" aria-describedby="sp-help" data-tip="Pick a mushroom to colour the map for its habitat: its trees, its altitude and its season. The map never says the mushroom is there.">${options}</select>
        <button id="cards-btn" type="button" class="icon-btn" aria-label="Open species cards" data-tip="Photos, season, trees and the deadly lookalikes for each mushroom.">Species cards</button>
      </div>
      <p id="sp-help" class="muted small">A species changes only the trees, altitude and season that count.</p>
      ${seasonMsg}
      <h2 id="layer-h">Show</h2>
      <div class="seg" role="group" aria-labelledby="layer-h">
        <button data-mode="conditions" aria-pressed="${this.mode === "conditions"}"
          data-tip="Colour the forest by its growing-conditions score, 0 to 100. Tap a zone to see why.">Conditions</button>
        <button data-mode="rain7" aria-pressed="${this.mode === "rain7"}"
          data-tip="All the rain of the last 7 days, in millimetres.">Rain 7 days</button>
        <button data-mode="rain30" aria-pressed="${this.mode === "rain30"}"
          data-tip="All the rain of the last 30 days. The score gives full points from 80 mm.">Rain 30 days</button>
        <button data-mode="replay" aria-pressed="${this.mode === "replay"}"
          data-tip="Watch the last 30 days of rain move over the island, day by day.">Rain replay</button>
      </div>
      ${rainNote}
      ${this.mode === "replay" ? this.replayHTML() : ""}
      ${this.legend()}
      ${this.hasPrivate ? `<label class="private-toggle" data-tip="Show the full 250 m squares and the 50 m hotspot zoom. Works only on this Mac. Never on the public site."><input type="checkbox" id="priv" ${this.priv ? "checked" : ""}>
        Private view: full 250 m detail <span class="tag warn">this Mac only</span></label>` : ""}
      ${this.priv && this.hotZones.length ? this.hotHTML() : ""}
      <div class="links"><a href="about.html" data-tip="Where the data comes from, how the score works, and the picking law.">About the data</a>
        <button id="guide-btn" type="button" data-tip="Show the three-step guide again.">How to use</button>
        <button id="theme-btn" type="button" data-tip="Switch between light and dark colours. Dark is easier on the eyes at night.">Light / dark</button></div>
      </div>`;

    this.el.querySelectorAll<HTMLButtonElement>(".day").forEach((b) =>
      b.addEventListener("click", () => { this.day = Number(b.dataset.day); this.render(); this.onChange(this); }));
    this.el.querySelectorAll<HTMLButtonElement>(".seg button").forEach((b) =>
      b.addEventListener("click", () => {
        this.stop();
        this.mode = b.dataset.mode as Mode;
        if (this.mode === "replay") this.replayIndex = 0;
        this.render(); this.onChange(this);
        if (this.mode === "replay") this.play();
      }));
    this.el.querySelector<HTMLSelectElement>("#species")?.addEventListener("change", (e) =>
      this.setSpecies((e.target as HTMLSelectElement).value || null));
    this.el.querySelector("#cards-btn")?.addEventListener("click", () => this.openSpecies(this.species ?? undefined));
    this.el.querySelector<HTMLInputElement>("#priv")?.addEventListener("change", (e) => {
      this.priv = (e.target as HTMLInputElement).checked; this.spot = null; this.render(); this.onChange(this);
    });
    this.el.querySelector("#play")?.addEventListener("click", () => (this.playing ? this.stop() : this.play()));
    this.el.querySelector<HTMLInputElement>("#replay-slider")?.addEventListener("input", (e) => {
      this.stop(); this.replayIndex = Number((e.target as HTMLInputElement).value);
      this.updateReplay(); this.onFrame(this);
    });
    this.el.querySelector<HTMLElement>(".tl")?.addEventListener("click", (e) => {   // tap a day on the timeline
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      this.stop();
      this.replayIndex = Math.max(0, Math.min(REPLAY_DAYS - 1, Math.floor(((e.clientX - r.left) / r.width) * REPLAY_DAYS)));
      this.updateReplay(); this.onFrame(this);
    });
    this.el.querySelectorAll<HTMLButtonElement>("[data-zone]").forEach((b) =>
      b.addEventListener("click", () => this.flyTo(this.hotZones[Number(b.dataset.zone)])));
    this.el.querySelector("#grip")?.addEventListener("click", () => this.el.classList.toggle("collapsed"));
    this.el.querySelector("#theme-btn")?.addEventListener("click", () => document.dispatchEvent(new Event("toggle-theme")));
    this.el.querySelector("#guide-btn")?.addEventListener("click", () => document.dispatchEvent(new Event("open-guide")));
    if (this.mode === "replay") this.updateReplay();
    this.renderSpot();
  }

  private hotHTML() {
    const item = (z: HotZone, i: number) => `<li><button type="button" class="zone-btn" data-zone="${i}"
      data-tip="Fly to this zone and show its shade at 50 m. Best day: ${fmtDay(z.date, { weekday: "long", day: "numeric", month: "long" })}, score ${z.score}.">
      <span><b>${esc(z.where)}</b><br><span class="muted">best ${fmtDay(z.date, { weekday: "short", day: "numeric" })}</span></span>
      <span class="zone-score">${z.score}</span></button></li>`;
    const top = this.hotZones.slice(0, 5).map(item).join("");
    const rest = this.hotZones.slice(5).map((z, k) => item(z, k + 5)).join("");
    return `<div class="hot">
      <h2>Hotspot zoom · 50 m terrain <span class="tag warn">private</span></h2>
      <p class="muted small">The top zones of the next 8 days. Zoom in to see shade at 50 m: cool slopes,
        valley bottoms and little autumn sun. Terrain only, no finer weather.</p>
      <ul class="zones">${top}</ul>
      ${rest ? `<details><summary>${this.hotZones.length - 5} more zones</summary><ul class="zones">${rest}</ul></details>` : ""}
      <div class="legend-bar" style="background:${gradient(SHADE_STOPS)}" data-tip="Pale = sunny and exposed. Dark blue = deep shade: north-east slopes, valley bottoms, little autumn sun."></div>
      <div class="legend-scale"><span>sunny</span><span>deep shade</span></div>
    </div>`;
  }

  private legend() {
    if (this.mode === "conditions") {
      const sp = speciesByCode(this.species);
      return `<div class="legend" aria-label="Score colours from 0 to 100">
        <div class="legend-bar" style="background:${gradient(SCORE_STOPS)}" data-tip="Score colours. Dark green = poor growing conditions. Orange-red = very good. It is about conditions, never about a mushroom being there."></div>
        <div class="legend-scale"><span>0 · poor</span><span>50</span><span>100 · very good</span></div>
        <div class="legend-row" data-tip="Nature reserves are closed to picking. They always score 0."><span class="swatch closed"></span> Nature reserve: <b>CLOSED</b>, score 0</div>
        ${sp ? `<div class="legend-row" data-tip="Grey = this mushroom's habitat, but the month is outside its season, so there is no score."><span class="swatch oos"></span> Out of season (habitat only)</div>` : ""}
        <div class="legend-row">${this.priv ? "Each square = 250 m (private)" : "Each hexagon ≈ 2 km. Exact spots are never shown publicly."}</div>
        ${sp ? "" : `<div class="legend-row muted">"Other broadleaf" forest is not scored here (no partner tree). It counts for morels.</div>`}
      </div>`;
    }
    const stops = this.mode === "replay" ? RAIN1_STOPS : this.mode === "rain7" ? RAIN7_STOPS : RAIN30_STOPS;
    const max = stops[stops.length - 1][0];
    return `<div class="legend" aria-label="Rain colours in millimetres">
      <div class="legend-bar" style="background:${gradient(stops)}" data-tip="Rain colours. Pale = dry. Dark blue = a lot of rain."></div>
      <div class="legend-scale"><span>0 mm</span><span>${max / 2} mm</span><span>${max}+ mm${this.mode === "replay" ? " a day" : ""}</span></div></div>`;
  }

  private renderSpot() {
    const el = this.el.querySelector<HTMLElement>("#spot");
    if (!el) return;
    const s = this.spot;
    if (!s || this.mode !== "conditions") { el.hidden = true; return; }
    const sp = speciesByCode(this.species);
    el.innerHTML = spotHTML(s, { meta: this.meta, day: this.day,
      species: sp ? { code: sp.code, latin: sp.latin, season_text: sp.season_text } : null, inSeason: this.inSeason });
    el.querySelector("#spot-close")?.addEventListener("click", () => {
      this.showSpot(null); document.dispatchEvent(new Event("spot-closed"));
    });
    el.hidden = false;
  }
}
