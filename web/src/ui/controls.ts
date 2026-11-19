// The bottom panel (phones) / side panel (computers). It shows one of three things:
// the start bar (today's date, how to use, rain replay), the card of a tapped square,
// or the rain replay.
import type { Mode, ReplayLayer, View } from "../map/layers";
import { cardHTML, fmtDay, RAKES_TIP, type CardInput, type Meta } from "./card";

const REPLAY_DAYS = 30;
/** Island average per day for each thing the replay can show (null = not in the data). */
export type ReplayData = Record<ReplayLayer, number[] | null>;
const LAYERS: { id: ReplayLayer; label: string; icon: string; color: string; fromZero: boolean; avg: (v: number) => string; tip: string }[] = [
  { id: "rain", label: "Rain", icon: "🌧", color: "#4f97d1", fromZero: true, avg: (v) => `${v.toFixed(1)} mm`,
    tip: "Rain on each day." },
  { id: "temp", label: "Temperature", icon: "🌡", color: "#e08a3c", fromZero: false, avg: (v) => `${v.toFixed(1)} °C`,
    tip: "Average air temperature on each day." },
  { id: "soil", label: "Soil", icon: "💧", color: "#58a593", fromZero: false, avg: (v) => `${Math.round(v)}% water`,
    tip: "How wet the top 7 cm of soil is on each day." },
];

export interface PanelHooks {
  onMode: (p: Panel) => void;              // conditions <-> replay
  onFrame: (p: Panel) => void;             // a new replay day, or another replay layer
  loadRain: () => Promise<ReplayData>;     // island averages per day (loads the replay file once)
  onCardClosed: () => void;
  openSpecies: (code?: string) => void;    // the mushroom cards (lookalikes first)
}

export class Panel {
  mode: Mode = "conditions";
  replayIndex = REPLAY_DAYS - 1;
  layer: ReplayLayer = "rain";
  private playing = false;
  private scrubbing = false;               // a finger or the mouse is dragging the rain timeline
  private resume = false;                  // it was playing when the drag began
  private timer = 0;
  private card: CardInput | null = null;
  private data: ReplayData | null = null;
  private get rain(): number[] | null { return this.data?.[this.layer] ?? null; }
  private rainFailed = false;

  constructor(private el: HTMLElement, private meta: Meta, readonly day: number, private hooks: PanelHooks) {
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || document.querySelector("dialog[open]")) return;
      if (this.card) this.closeCard();
      else if (this.mode === "replay") this.setMode("conditions");
    });
    this.el.addEventListener("click", (e) => {
      const t = e.target as Element;
      const sp = t.closest<HTMLElement>("[data-open-card]");
      if (sp) this.hooks.openSpecies(sp.dataset.openCard || undefined);
      else if (t.closest("[data-card-close]")) this.closeCard();
      else if (t.closest("#rating") && this.card) { this.card.open = !this.card.open; this.render(); }
      else if (t.closest("#replay-btn")) this.setMode("replay");
      else if (t.closest("#replay-back")) this.setMode("conditions");
      else if (t.closest("#play")) { if (this.playing) this.stop(); else this.play(); }
      else if (t.closest("[data-layer]")) {                          // rain / temperature / soil: same day, keeps playing
        const id = t.closest<HTMLElement>("[data-layer]")!.dataset.layer as ReplayLayer;
        if (id === this.layer || !this.data?.[id]) return;
        this.layer = id;
        this.drawLayer();
        this.updateReplay();
        this.hooks.onFrame(this);
      }
    });
    // The rain timeline is one big slider: press anywhere on it and drag (mouse or finger).
    // Dragging holds the replay; letting go carries on playing from that day if it was playing.
    this.el.addEventListener("pointerdown", (e) => {
      const s = (e.target as Element).closest<HTMLElement>("#scrub");
      if (!s || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault();                                             // no text selection, no page drag
      s.focus({ preventScroll: true });
      try { s.setPointerCapture(e.pointerId); } catch { /* an old browser: taps still work */ }
      this.resume = this.playing;
      this.stop();
      this.scrubbing = true;
      s.classList.add("drag");
      this.seek(e.clientX, s);
    });
    this.el.addEventListener("pointermove", (e) => {
      if (!this.scrubbing) return;
      const s = this.el.querySelector<HTMLElement>("#scrub");
      if (s) this.seek(e.clientX, s);
    });
    const release = () => {
      if (!this.scrubbing) return;
      this.scrubbing = false;
      this.el.querySelector("#scrub")?.classList.remove("drag");
      if (this.resume && this.mode === "replay" && this.replayIndex < REPLAY_DAYS - 1) this.play();
      this.resume = false;
    };
    this.el.addEventListener("pointerup", release);
    this.el.addEventListener("pointercancel", release);
    this.el.addEventListener("keydown", (e) => {
      if (!(e.target as Element).closest("#scrub")) return;
      const step: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -7, PageUp: 7,
        Home: -REPLAY_DAYS, End: REPLAY_DAYS };
      if (!(e.key in step)) return;
      e.preventDefault();
      this.stop();
      this.setIndex(this.replayIndex + step[e.key]);
    });
    this.render();
  }

  get view(): View { return { day: this.day, mode: this.mode, replayIndex: this.replayIndex, layer: this.layer }; }
  get cardOpen() { return !!this.card; }

  /** Show (or update) the card of a tapped square. Keeps the breakdown open/closed as it was. */
  showCard(c: Omit<CardInput, "open"> | null, sameSquare = false) {
    this.card = c ? { ...c, open: sameSquare ? !!this.card?.open : false } : null;
    this.render();
    if (c && !sameSquare) this.el.scrollTo({ top: 0 });
  }

  closeCard() {
    if (!this.card) return;
    this.card = null;
    this.render();
    this.hooks.onCardClosed();
  }

  private async setMode(m: Mode) {
    this.stop();
    this.mode = m;
    if (m === "replay") {
      this.card = null;
      this.hooks.onCardClosed();
      this.replayIndex = REPLAY_DAYS - 1;                             // opens still, on today; Play starts from 30 days ago
      this.render();                                                  // shows "Loading the rain…"
      if (!this.data) {
        try { this.data = await this.hooks.loadRain(); this.rainFailed = false; }
        catch { this.rainFailed = true; }
        if (this.mode !== "replay") return;
      }
      if (!this.rain) this.layer = "rain";
      this.render();
      this.hooks.onMode(this);
      return;
    }
    this.render();
    this.hooks.onMode(this);
  }

  // ------------------------------------------------------------ rain replay
  private play() {
    if (this.replayIndex >= REPLAY_DAYS - 1) this.replayIndex = 0;
    this.playing = true;
    this.timer = window.setInterval(() => {
      if (this.replayIndex >= REPLAY_DAYS - 1) { this.stop(); return; }
      this.replayIndex++; this.updateReplay(); this.hooks.onFrame(this);
    }, 550);
    this.updateReplay();
    this.hooks.onFrame(this);
  }

  /** Show one day of the replay (does nothing if it is already showing). */
  private setIndex(i: number) {
    i = Math.max(0, Math.min(REPLAY_DAYS - 1, i));
    if (i === this.replayIndex) return;
    this.replayIndex = i;
    this.updateReplay();
    this.hooks.onFrame(this);
  }

  /** The day under the pointer, read off the bars. */
  private seek(clientX: number, scrub: HTMLElement) {
    const r = (scrub.querySelector(".tl") ?? scrub).getBoundingClientRect();
    if (r.width > 0) this.setIndex(Math.floor(((clientX - r.left) / r.width) * REPLAY_DAYS));
  }

  private stop() {
    window.clearInterval(this.timer);
    this.playing = false;
    if (this.el.querySelector("#replay")) this.updateReplay();
  }

  private updateReplay() {
    const i = this.replayIndex;
    const d = this.meta.rain_days[i];
    const btn = this.el.querySelector<HTMLButtonElement>("#play");
    if (btn) {
      btn.textContent = this.playing ? "❚❚ Pause" : "▶ Play";
      btn.setAttribute("aria-label", this.playing ? "Pause the rain replay" : "Play the rain replay");
    }
    const date = this.el.querySelector("#replay-date");
    const ago = REPLAY_DAYS - 1 - i;
    if (date && this.rain) date.innerHTML = `<b>${fmtDay(d, { weekday: "short", day: "numeric", month: "short" })}</b>
      ${ago === 0 ? "· today" : `· ${ago} day${ago === 1 ? "" : "s"} ago`}
      <span class="muted replay-avg">Island average ${LAYERS.find((l) => l.id === this.layer)!.avg(this.rain[i])}</span>`;
    const sc = this.el.querySelector<HTMLElement>("#scrub");
    if (sc) {
      sc.setAttribute("aria-valuenow", String(i));
      sc.setAttribute("aria-valuetext", fmtDay(d, { day: "numeric", month: "long" }));
      sc.style.setProperty("--at", `${((i + 0.5) / REPLAY_DAYS) * 100}%`);
    }
    this.el.querySelectorAll<HTMLElement>(".tl i").forEach((b, k) => b.classList.toggle("now", k === i));
  }

  /** The chosen layer: mark its button, and size and colour the 30 bars for it. */
  private drawLayer() {
    const days = this.rain;
    if (!days) return;
    const L = LAYERS.find((l) => l.id === this.layer)!;
    this.el.querySelectorAll<HTMLElement>("[data-layer]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.layer === this.layer)));
    const d = days.slice(0, REPLAY_DAYS);
    // rain is counted from zero; temperature and soil show their ups and downs within the 30 days
    const lo = L.fromZero ? 0 : Math.min(...d), hi = L.fromZero ? Math.max(1, ...d) : Math.max(...d);
    const span = hi - lo || 1;
    this.el.querySelectorAll<HTMLElement>(".tl i").forEach((b, k) => {
      const share = (d[k] - lo) / span;
      b.style.height = `${L.fromZero ? Math.max(2, share * 46) : 8 + share * 38}px`;
      b.style.background = L.color;
    });
  }

  private replayHTML() {
    const back = `<button type="button" class="back-btn" id="replay-back" data-tip="Back to today's growing conditions.">← Back to today's map</button>`;
    if (this.rainFailed) return `${back}<p>The replay could not load. Check your connection and try again.</p>`;
    if (!this.data || !this.rain) return `${back}<p class="muted">Loading the replay…</p>`;
    const tabs = LAYERS.filter((l) => this.data![l.id]);
    const seg = tabs.length < 2 ? "" : `<div class="seg" role="group" aria-label="What the replay shows">${tabs.map((l) =>
      `<button type="button" data-layer="${l.id}" data-tip="${l.tip}"><span aria-hidden="true">${l.icon}</span> ${l.label}</button>`).join("")}</div>`;
    return `${back}
      <div class="replay" id="replay">
        <h2 class="panel-h">Replay: the last 30 days</h2>
        ${seg}
        <div class="replay-row"><button id="play" class="primary-btn" type="button"></button>
          <span id="replay-date" aria-live="polite"></span></div>
        <div class="scrub" id="scrub" role="slider" tabindex="0" aria-label="Day of the rain replay"
          aria-valuemin="0" aria-valuemax="${REPLAY_DAYS - 1}" aria-orientation="horizontal"
          data-tip="Each bar is one day. Taller bar = more that day, over the whole island. Drag anywhere here to move through the days.">
          <div class="tl" aria-hidden="true">${"<i></i>".repeat(REPLAY_DAYS)}</div>
          <div class="scrub-track" aria-hidden="true"><span class="scrub-fill"></span><span class="scrub-knob"></span></div>
          <div class="scrub-ends" aria-hidden="true"><span>${REPLAY_DAYS - 1} days ago</span><span>Drag to move</span><span>Today</span></div>
        </div>
        <p class="muted small">Daily values for each ~3 km weather square, from the weather model.</p>
      </div>`;
  }

  // ------------------------------------------------------------ render
  private render() {
    this.el.dataset.view = this.mode === "replay" ? "replay" : this.card ? "card" : "start";
    if (this.mode === "replay") {
      this.el.innerHTML = this.replayHTML();
      this.drawLayer();
      this.updateReplay();
      return;
    }
    if (this.card) {
      this.el.innerHTML = cardHTML(this.card, this.meta, this.day);
      return;
    }
    const d = this.meta.days[this.day];
    this.el.innerHTML = `
      <div class="start-row">
        <p class="today"><b>Today</b> · ${fmtDay(d.date, { weekday: "short", day: "numeric", month: "short" })}</p>
      </div>
      <div class="start-btns">
        <button type="button" class="chip-btn" data-open-card="" data-tip="Photos, season, trees and the deadly lookalikes for each mushroom.">🍄 Mushroom cards</button>
        <button type="button" class="chip-btn" id="replay-btn" data-tip="Watch the last 30 days move over the island, day by day: rain, temperature and soil wetness.">🌧 Weather replay</button>
      </div>
      <p class="hint"><b>Double tap</b> the map to zoom in. <b>Tap a square</b> to see its conditions.</p>
      <p class="no-rakes" data-tip="${RAKES_TIP}"><b>No rakes.</b> Pick by hand or knife. Put the leaf litter back.</p>`;
  }
}
