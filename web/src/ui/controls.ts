// Bottom sheet (mobile) / side panel (desktop): days, layer switch, legend, spot card.
import { RAIN30_STOPS, RAIN7_STOPS, SCORE_STOPS, type Mode } from "../map/layers";

export interface DayInfo { offset: number; date: string; confidence: "high" | "medium" | "low"; }
export interface Meta {
  weather_run: string; generated_utc: string; model: string; days: DayInfo[]; credits: unknown[];
  clock: { opens: number; closes: number; soak_mm: number };
}

/** The mushroom clock in plain words (same rules as pipeline/shroomy/score/clock.py). */
export function clockSentence(daysSince: number, c: Meta["clock"]): { text: string; open: boolean } {
  if (daysSince < 0) return { text: `No soaking rain (${c.soak_mm} mm+) in the last month. Fruiting window closed.`, open: false };
  if (daysSince < c.opens) {
    const k = c.opens - daysSince;
    return { text: `Soaking rain ${daysSince} days ago. Window opens in ${k} day${k === 1 ? "" : "s"}.`, open: false };
  }
  if (daysSince <= c.closes) {
    const k = c.closes - daysSince;
    return { text: `Soaking rain ${daysSince} days ago. Window OPEN, about ${k} more day${k === 1 ? "" : "s"}.`, open: true };
  }
  return { text: `Last soaking rain was ${daysSince} days ago. Fruiting window has closed.`, open: false };
}

const TREES: Record<number, string> = {
  1: "Calabrian pine (likely)", 2: "Troodos black pine (likely)", 3: "Golden oak (likely)",
  4: "Other broadleaf", 5: "Tripylos cedar zone (closed)",
};
const CONF_TEXT = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

const fmtDay = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { ...opts, timeZone: "Asia/Nicosia" });

function gradient(stops: [number, string][]) {
  const max = stops[stops.length - 1][0];
  return `linear-gradient(90deg, ${stops.map(([v, c]) => `${c} ${(v / max) * 100}%`).join(", ")})`;
}

function scoreColour(v: number) {
  let c = SCORE_STOPS[0][1];
  for (const [s, col] of SCORE_STOPS) if (v >= s) c = col;
  return c;
}

function words(v: number) {
  if (v >= 80) return "Very good growing conditions";
  if (v >= 65) return "Good growing conditions";
  if (v >= 45) return "Fair growing conditions";
  return "Poor growing conditions";
}

export class Panel {
  day = 0;
  mode: Mode = "conditions";
  priv = false;
  private spotProps: Record<string, number> | null = null;
  private spotKind: "hex" | "cell" = "hex";

  constructor(private el: HTMLElement, private meta: Meta, private hasPrivate: boolean,
              private onChange: (p: Panel) => void) {
    this.render();
  }

  showSpot(props: Record<string, number> | null, kind: "hex" | "cell") {
    this.spotProps = props; this.spotKind = kind;
    this.renderSpot();
  }

  private render() {
    const days = this.meta.days.map((d) => {
      const label = d.offset === 0 ? "Today" : fmtDay(d.date, { weekday: "short" });
      const num = fmtDay(d.date, { day: "numeric", month: "short" });
      return `<button class="day" data-day="${d.offset}" aria-pressed="${d.offset === this.day}"
          aria-label="${label} ${num}, ${CONF_TEXT[d.confidence]}">
        <b>${label}</b><span>${num}</span>
        <span class="conf"><i class="dot ${d.confidence}"></i>${d.confidence}</span></button>`;
    }).join("");
    const cur = this.meta.days[this.day];
    const rainNote = this.mode === "conditions" ? "" :
      `<p class="conf-line">Rain shown is the <b>${this.mode === "rain7" ? "last 7" : "last 30"} days</b>, up to today.</p>`;

    this.el.innerHTML = `
      <button class="grip-btn" id="grip" type="button" aria-label="Show more or less"><div class="grip"></div></button>
      <div class="spot" id="spot" hidden></div>
      <h2 id="days-h">Day</h2>
      <div class="days" role="group" aria-labelledby="days-h">${days}</div>
      <p class="conf-line">${fmtDay(cur.date, { weekday: "long", day: "numeric", month: "long" })} ·
        <b>${CONF_TEXT[cur.confidence]}</b></p>
      <div class="sheet-more">
      <h2 id="layer-h">Show</h2>
      <div class="seg" role="group" aria-labelledby="layer-h">
        <button data-mode="conditions" aria-pressed="${this.mode === "conditions"}">Conditions</button>
        <button data-mode="rain7" aria-pressed="${this.mode === "rain7"}">Rain 7 days</button>
        <button data-mode="rain30" aria-pressed="${this.mode === "rain30"}">Rain 30 days</button>
      </div>
      ${rainNote}
      ${this.legend()}
      ${this.hasPrivate ? `<label class="private-toggle"><input type="checkbox" id="priv" ${this.priv ? "checked" : ""}>
        Private view: full 250 m detail <span class="tag warn">this Mac only</span></label>` : ""}
      <div class="links"><a href="about.html">About the data</a>
        <button id="theme-btn" type="button">Light / dark</button></div>
      </div>`;

    this.el.querySelectorAll<HTMLButtonElement>(".day").forEach((b) =>
      b.addEventListener("click", () => { this.day = Number(b.dataset.day); this.render(); this.onChange(this); }));
    this.el.querySelectorAll<HTMLButtonElement>(".seg button").forEach((b) =>
      b.addEventListener("click", () => { this.mode = b.dataset.mode as Mode; this.render(); this.onChange(this); }));
    this.el.querySelector<HTMLInputElement>("#priv")?.addEventListener("change", (e) => {
      this.priv = (e.target as HTMLInputElement).checked; this.render(); this.onChange(this);
    });
    this.el.querySelector("#grip")?.addEventListener("click", () => this.el.classList.toggle("collapsed"));
    this.el.querySelector("#theme-btn")?.addEventListener("click", () => document.dispatchEvent(new Event("toggle-theme")));
    this.renderSpot();
  }

  private legend() {
    if (this.mode === "conditions") {
      return `<div class="legend" aria-label="Score colours from 0 to 100">
        <div class="legend-bar" style="background:${gradient(SCORE_STOPS)}"></div>
        <div class="legend-scale"><span>0 · poor</span><span>50</span><span>100 · very good</span></div>
        <div class="legend-row"><span class="swatch closed"></span> Nature reserve: <b>CLOSED</b>, score 0</div>
        <div class="legend-row">${this.priv ? "Each square = 250 m (private)" : "Each hexagon ≈ 2 km. Exact spots are never shown publicly."}</div>
      </div>`;
    }
    const stops = this.mode === "rain7" ? RAIN7_STOPS : RAIN30_STOPS;
    const max = stops[stops.length - 1][0];
    return `<div class="legend" aria-label="Rain colours in millimetres">
      <div class="legend-bar" style="background:${gradient(stops)}"></div>
      <div class="legend-scale"><span>0 mm</span><span>${max / 2} mm</span><span>${max}+ mm</span></div></div>`;
  }

  private renderSpot() {
    const el = this.el.querySelector<HTMLElement>("#spot");
    if (!el) return;
    const p = this.spotProps;
    if (!p || this.mode !== "conditions") { el.hidden = true; return; }
    const v = Number(p[`s${this.day}`] ?? 0);
    const bars = this.meta.days.map((d) => {
      const s = Number(p[`s${d.offset}`] ?? 0);
      return `<i title="${fmtDay(d.date, { weekday: "short", day: "numeric" })}: ${s}"
        style="height:${Math.max(4, s * 0.44)}px;background:${scoreColour(s)};${d.offset === this.day ? "outline:2px solid var(--ink)" : ""}"></i>`;
    }).join("");
    const extra = this.spotKind === "cell"
      ? `<p class="muted">${TREES[p.tree] ?? "Forest"} · ${p.elev} m</p>` : `<p class="muted">Average over this ~2 km hexagon of forest.</p>`;
    el.innerHTML = `
      <div class="spot-head"><span><b>${words(v)}</b></span><span class="spot-score">${v}<small style="font-size:1rem">/100</small></span></div>
      ${extra}
      ${p[`p${this.day}`] !== undefined ? (() => {
        const c = clockSentence(Number(p[`p${this.day}`]), this.meta.clock);
        return `<p class="clock ${c.open ? "open" : ""}"><span aria-hidden="true">⏱</span> <b>Mushroom clock:</b> ${c.text}</p>`;
      })() : ""}
      <div class="spark" aria-label="Score for the next 8 days">${bars}</div>
      <p class="muted">Next 8 days · growing conditions only.
        <button class="link-btn" id="spot-close" type="button">Close</button></p>`;
    el.querySelector("#spot-close")?.addEventListener("click", () => {
      this.showSpot(null, "hex"); document.dispatchEvent(new Event("spot-closed"));
    });
    el.hidden = false;
  }
}
