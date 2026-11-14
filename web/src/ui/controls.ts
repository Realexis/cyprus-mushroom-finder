// The bottom panel (phones) / side panel (computers). It shows one of three things:
// the start bar (today's date, how to use, rain replay), the card of a tapped square,
// or the rain replay.
import type { Mode, View } from "../map/layers";
import { cardHTML, fmtDay, mapsPinUrl, RAKES_TIP, type CardInput, type Meta } from "./card";

const REPLAY_DAYS = 30;

export interface PanelHooks {
  onMode: (p: Panel) => void;              // conditions <-> replay
  onFrame: (p: Panel) => void;             // a new replay day
  loadRain: () => Promise<number[]>;       // island-average rain per day (loads the rain file once)
  onCardClosed: () => void;
  openSpecies: (code?: string) => void;    // the mushroom cards (lookalikes first)
}

export class Panel {
  mode: Mode = "conditions";
  replayIndex = REPLAY_DAYS - 1;
  private playing = false;
  private timer = 0;
  private card: CardInput | null = null;
  private rain: number[] | null = null;
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
      else if (t.closest("[data-share]")) void shareLocation(t.closest<HTMLElement>("[data-share]")!);
      else if (t.closest("#rating") && this.card) { this.card.open = !this.card.open; this.render(); }
      else if (t.closest("#replay-btn")) this.setMode("replay");
      else if (t.closest("#replay-back")) this.setMode("conditions");
      else if (t.closest("#play")) { if (this.playing) this.stop(); else this.play(); }
      else if (t.closest(".tl")) {                                   // tap a day on the timeline
        const r = t.closest(".tl")!.getBoundingClientRect();
        this.stop();
        this.replayIndex = Math.max(0, Math.min(REPLAY_DAYS - 1, Math.floor(((e as MouseEvent).clientX - r.left) / r.width * REPLAY_DAYS)));
        this.updateReplay(); this.hooks.onFrame(this);
      }
    });
    this.el.addEventListener("input", (e) => {
      const t = e.target as HTMLInputElement;
      if (t.id !== "replay-slider") return;
      this.stop(); this.replayIndex = Number(t.value);
      this.updateReplay(); this.hooks.onFrame(this);
    });
    this.render();
  }

  get view(): View { return { day: this.day, mode: this.mode, replayIndex: this.replayIndex }; }
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
      this.replayIndex = 0;
      this.render();                                                  // shows "Loading the rain…"
      if (!this.rain) {
        try { this.rain = await this.hooks.loadRain(); this.rainFailed = false; }
        catch { this.rainFailed = true; }
        if (this.mode !== "replay") return;
      }
      this.render();
      this.hooks.onMode(this);
      if (this.rain) this.play();
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
      <span class="muted">· island average ${this.rain[i].toFixed(1)} mm</span>`;
    const sl = this.el.querySelector<HTMLInputElement>("#replay-slider");
    if (sl) { sl.value = String(i); sl.setAttribute("aria-valuetext", fmtDay(d, { day: "numeric", month: "long" })); }
    this.el.querySelectorAll<HTMLElement>(".tl i").forEach((b, k) => b.classList.toggle("now", k === i));
  }

  private replayHTML() {
    const back = `<button type="button" class="back-btn" id="replay-back" data-tip="Back to today's growing conditions.">← Back to today's map</button>`;
    if (this.rainFailed) return `${back}<p>The rain could not load. Check your connection and try again.</p>`;
    if (!this.rain) return `${back}<p class="muted">Loading the rain…</p>`;
    const days = this.rain.slice(0, REPLAY_DAYS);
    const max = Math.max(1, ...days);
    const bars = days.map((v) => `<i style="height:${Math.max(2, (v / max) * 40)}px"></i>`).join("");
    return `${back}
      <div class="replay" id="replay">
        <h2 class="panel-h">Rain replay: the last 30 days</h2>
        <div class="replay-row"><button id="play" class="primary-btn" type="button"></button>
          <span id="replay-date" aria-live="polite"></span></div>
        <div class="tl" aria-hidden="true" data-tip="Each bar is one day. Taller bar = more rain over the island. Tap a bar to jump to that day.">${bars}</div>
        <input id="replay-slider" type="range" min="0" max="${REPLAY_DAYS - 1}" step="1" value="${this.replayIndex}"
          aria-label="Day of the rain replay" data-tip="Drag to choose a day of the last 30 days." />
        <p class="muted small">Daily rain for each ~3 km weather square.</p>
      </div>`;
  }

  // ------------------------------------------------------------ render
  private render() {
    this.el.dataset.view = this.mode === "replay" ? "replay" : this.card ? "card" : "start";
    if (this.mode === "replay") {
      this.el.innerHTML = this.replayHTML();
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
        <button type="button" class="chip-btn" id="replay-btn" data-tip="Watch the last 30 days of rain move over the island, day by day.">🌧 Rain replay</button>
      </div>
      <p class="hint"><b>Double tap</b> the map to zoom in. <b>Tap a square</b> to see its conditions.</p>
      <p class="no-rakes" data-tip="${RAKES_TIP}"><b>No rakes.</b> Pick by hand or knife. Put the leaf litter back.</p>`;
  }
}

/** Share a Google Maps pin of the tapped square: the phone's share sheet, else copy the link. */
async function shareLocation(btn: HTMLElement) {
  const url = mapsPinUrl(btn.dataset.share!);
  const text = "A forest spot from Shroomy Lite (growing conditions only). Never eat a wild mushroom based on a map, an app or an AI.";
  const label = btn.querySelector(".share-label");
  const say = (msg: string) => {
    if (!label) return;
    label.textContent = msg;
    setTimeout(() => { label.textContent = "Share location"; }, 2500);
  };
  if (navigator.share) {
    try { await navigator.share({ title: "Shroomy Lite", text, url }); return; }
    catch (e) { if ((e as Error).name === "AbortError") return; }   // closed the share sheet
  }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); say("Link copied"); }
  catch { window.prompt("Copy this link:", url); }
}
