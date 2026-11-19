// The card for one tapped 250 m forest square, in Real's order (LITE-BRIEF.md):
// 1 rating word (tap: the score breakdown), 2 mushrooms in season here, 3 place facts,
// 4 Google Maps link, 5 the mushroom clock. Today only. Growing conditions only.
import { SCORE_STOPS } from "../map/layers";
import { served } from "../map/files";
import { inSeasonHere, nameLines } from "./species";
import { heat50, type Heat50 } from "../map/heat50";
import { T } from "../i18n";

export interface DayInfo { offset: number; date: string; confidence: "high" | "medium" | "low"; }
export interface Meta {
  weather_run: string; generated_utc: string; model: string; days: DayInfo[];
  credits: { name: string; credit: string; licence: string; status: string; use: string }[];
  rain_days: string[];
  clock: { opens: number; closes: number; soak_mm: number; later_opens?: number | null;
    /** First day of rain the clock can see, when later than 1 September. */
    counted_from?: string | null };
  weights: Record<string, number>;
  /** Score x (biggest 3-day rain in the last `days` days / full_at_mm, never above 1). */
  water_gate?: { enabled: boolean; full_at_mm: number; days: number };
  /** Lab: the 50 m heat map is on (set by main.ts when data/heat50.json fits this update). */
  heat50?: Heat50;
}

const C = T.card;
const TREES = C.trees, BANDS = C.bands, FACTOR_LABEL = C.factorLabel, FACTOR_TIP = C.factorTip;
export const RAKES_TIP = C.rakesTip;

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export const fmtDay = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(T.locale, { ...opts, timeZone: "Asia/Nicosia" });

/** The map's colour for a score: the same smooth scale the map draws (Lab: was the nearest step
 *  below, so the card's colour chip did not match the patch that was tapped). */
export function scoreColour(v: number) {
  const x = Math.max(SCORE_STOPS[0][0], Math.min(SCORE_STOPS[SCORE_STOPS.length - 1][0], v));
  let k = 0;
  while (k < SCORE_STOPS.length - 2 && x > SCORE_STOPS[k + 1][0]) k++;
  const [a, ca] = SCORE_STOPS[k], [b, cb] = SCORE_STOPS[k + 1];
  const t = (x - a) / (b - a);
  const ch = (c: string, i: number) => parseInt(c.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(ch(ca, i) + (ch(cb, i) - ch(ca, i)) * t)).join(", ")})`;
}

/** The four rating words (Real's choice for Lite, 13 Nov 2026: four words, same cut-offs as V5). */
export function words(v: number) {
  if (v >= 80) return C.words.veryGood;
  if (v >= 65) return C.words.good;
  if (v >= 45) return C.words.fair;
  return C.words.poor;
}

/** The mushroom clock in plain words (same rules as pipeline/shroomy/score/clock.py and V5).
 *  opens = days after this soaking rain the window opens (18 for the season's first rain,
 *  2 for a later one). */
export function clockSentence(daysSince: number, c: Meta["clock"], opens = c.opens): { text: string; open: boolean } {
  if (daysSince < 0) return { text: C.clockNone(c.soak_mm), open: false };
  if (daysSince < opens) {
    return { text: C.clockWait(daysSince, opens - daysSince), open: false };
  }
  if (daysSince <= c.closes) {
    return { text: C.clockOpen(daysSince, c.closes - daysSince), open: true };
  }
  return { text: C.clockClosed(daysSince), open: false };
}

function clockTip(c: Meta["clock"]): string {
  return c.later_opens == null
    ? C.clockTip(c.soak_mm, c.opens, c.closes)
    : C.clockTipLater(c.soak_mm, c.opens, c.later_opens, c.closes);
}

// ---------------------------------------------------------------- square details (read on tap)
// cells_info.bin holds every square's score parts for every day (~10 MB). Lite reads only the
// tapped square's bytes (a "range request", about 0.2 kB) instead of the whole file.
export interface CellsIndex { factors: string[]; inputs: string[]; days: number; }
export interface CellDetail {
  factors: number[] | null;            // 0..1, in meta weight order; null = no parts stored
  inputs: number[];                    // rain_30d_mm, pulse_mm, t7_mean_c, soil_percentile, frost_days, rain3_max_mm, gate_pct, rain3_age_d
  road: [number, number];              // metres to the nearest forest track, road (-1 = none)
  access: { lat: number; lon: number } | null;   // the square's middle; null = in or by a reserve
}

async function readBytes(url: string, start: number, length: number): Promise<ArrayBuffer> {
  const r = await fetch(url, { headers: { Range: `bytes=${start}-${start + length - 1}` } });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  const buf = await r.arrayBuffer();
  // 206 = just our bytes. 200 = the server sent the whole file: cut our part out.
  return r.status === 206 ? buf : buf.slice(start, start + length);
}

export async function loadCellDetail(base: string, ix: CellsIndex, i: number, day: number): Promise<CellDetail> {
  const nf = ix.factors.length, ni = ix.inputs.length;
  const stride = ix.days * (nf + ni) + 2;               // int16 values per square
  const [a, ra] = await Promise.all([
    readBytes(served(`${base}cells_info.bin`), i * stride * 2, stride * 2).then((b) => new Int16Array(b)),
    readBytes(served(`${base}cells_road.bin`), i * 8, 8).then((b) => new Float32Array(b)).catch(() => null),
  ]);
  const o = day * (nf + ni);
  const f = [...a.subarray(o, o + nf)];
  const lat = ra?.[0], lon = ra?.[1];
  return {
    factors: f.some((x) => x < 0) ? null : f.map((x) => x / 100),
    inputs: [...a.subarray(o + nf, o + nf + ni)].map((x) => x / 10),
    road: [a[stride - 2], a[stride - 1]],
    access: lat !== undefined && lon !== undefined && Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null,
  };
}

// ---------------------------------------------------------------- the score breakdown (as V5)
/** Rain in whole mm, but with one decimal just under the soaking line (19.9 mm is not 20 mm). */
const rainMM = (mm: number, soak: number) => (mm < soak && Math.round(mm) >= soak ? T.num(mm) : String(Math.round(mm)));

function factorText(name: string, inp: number[] | null, f: number, date: string, soak: number): string {
  if (name === "season_altitude") return T.monthLong[Number(date.slice(5, 7)) - 1];
  if (name === "shade") return `${Math.round(f * 100)}/100`;
  if (!inp) return "";
  const [r30, pulse, t7, soil, frost] = inp;
  switch (name) {
    case "rain_total": return `${Math.round(r30)} mm`;
    case "rain_pulse": return C.in3days(rainMM(pulse, soak));
    case "temperature": return `${C.tempAvg(T.num(t7))}${frost >= 1 ? C.frost(Math.round(frost)) : ""}`;
    case "soil_moisture": return C.soilPct(Math.round(soil));
  }
  return "";
}

/** The water gate in plain words: one text line under the six parts (scoring.yaml score.water_gate). */
function gateRow(inp: number[] | null, meta: Meta): string {
  const g = meta.water_gate;
  if (!g?.enabled || !inp || inp.length < 6) return "";
  const mm = inp[5];
  const raw = inp.length >= 8 ? inp[6] : Math.max(0, Math.min(1, mm / g.full_at_mm)) * 100;
  // Never round a small cut up to "no cut" (19.9 mm is not 20 mm; the clock agrees).
  const full = raw >= 100;
  const pct = full ? 100 : Math.min(99, Math.round(raw));
  // Just under the line: show the decimal, so "20 mm" never appears for 19.9 mm.
  const mmText = rainMM(mm, g.full_at_mm);
  const age = inp.length >= 8 ? Math.round(inp[7]) : -1;
  const ago = C.gateAgo(age);
  const word = full ? C.gateWord.yes : mm < 2 ? C.gateWord.no : C.gateWord.partly;
  let val: string;
  if (full) val = C.gateFull(mmText, ago);
  else if (mm < 2) val = C.gateNone(pct);
  else if (mm >= g.full_at_mm) val = C.gateOld(mmText, ago, pct);
  else val = C.gateShort(mmText, ago, g.full_at_mm, pct);
  const tip = C.gateTip(g.days, g.full_at_mm);
  return `<li class="why-row" data-tip="${esc(tip)}">
      <div class="why-top"><span>${C.gateLabel(word)}</span></div>
      <div class="why-val">${esc(val)}</div></li>`;
}

function breakdown(d: CellDetail | null, meta: Meta, day: number): string {
  if (!d) return `<p class="muted small">${C.loadingParts}</p>`;
  if (!d.factors) return `<p class="muted small">${C.noParts}</p>`;
  const date = meta.days[day].date;
  const rows = Object.keys(meta.weights).map((n, i) => {
    const f = d.factors![i];
    const pct = Math.round(Math.max(0, Math.min(1, f)) * 100);
    const w = Math.round(meta.weights[n] * 100);
    return `<li class="why-row" data-tip="${esc(FACTOR_TIP[n])} ${C.countsTip(w)}">
      <div class="why-top"><span>${FACTOR_LABEL[n]}</span><span class="muted">${C.counts(w)}</span></div>
      <div class="why-bar" role="img" aria-label="${C.barLabel(FACTOR_LABEL[n], pct)}"><i style="width:${pct}%;background:${scoreColour(pct)}"></i></div>
      <div class="why-val">${esc(factorText(n, d.inputs, f, date, meta.clock.soak_mm))}</div></li>`;
  }).join("") + gateRow(d.inputs, meta);
  return `<ul class="why-list">${rows}</ul>`;
}

// ---------------------------------------------------------------- the card
const ll = (lat: number, lon: number) => `${lat.toFixed(5)},${lon.toFixed(5)}`;
const mapsDirectionsUrl = (lat: number, lon: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${ll(lat, lon)}&travelmode=driving`;
const mapsPinUrl = (lat: number, lon: number) =>
  `https://www.google.com/maps/search/?api=1&query=${ll(lat, lon)}`;
const dist = (x: number) => (x < 0 ? "–" : x < 1000 ? `${Math.round(x / 10) * 10} m` : `${(x / 1000).toFixed(1)} km`);

export interface CardInput {
  props: Record<string, number>;       // the square's map properties (tree, band, elev, s<day>, p<day>, o<day>)
  shade?: Record<string, number>;      // the 50 m shade square tapped, close up (sh, fa, va, ls, el)
  detail: CellDetail | null;           // null while loading
  failed?: boolean;                    // the details could not load
  open: boolean;                       // score breakdown shown?
}

export function cardHTML(c: CardInput, meta: Meta, day: number): string {
  const p = c.props;
  const raw = p[`s${day}`];
  const square = raw === undefined || raw === null ? null : Number(raw);     // the 250 m square's score
  const d = c.detail;
  // Lab, the 50 m heat map: a tapped 50 m patch has its own number (the square's score, moved by
  // how much shadier the patch is than its square). It needs the square's shade part, which comes
  // with the details, so the number waits for them rather than showing one value and then another.
  const fine = !!meta.heat50 && !!c.shade && square !== null;
  const shadeIx = Object.keys(meta.weights).indexOf("shade");
  const sq = d?.factors && shadeIx >= 0 ? Math.round(d.factors[shadeIx] * 100) : null;   // square shade, 0-100
  const patch = fine && sq !== null ? heat50(square!, Number(c.shade!.sh), sq, meta.heat50!.shade_strength) : null;
  const waiting = fine && !d && !c.failed;
  const v = patch ?? square;
  const month = Number(meta.days[day].date.slice(5, 7));
  
  // 1. Rating word. Tap it for the score breakdown.
  const fineNote = patch !== null
    ? `<p class="muted small fine-note" data-tip="${C.fineTip}">
        ${C.fineNote(patch, square!, Number(c.shade!.sh), sq!)}</p>`
    : fine && !waiting ? `<p class="muted small fine-note">${C.fineFail}</p>` : "";
  const rating = v === null
    ? `<p class="rating-none"><b>${C.notScored}</b></p>`
    : waiting ? `<p class="rating-none"><b>${C.working}</b></p>`
    : `<button type="button" class="rating" id="rating" aria-expanded="${c.open}" aria-controls="why"
        data-tip="${C.ratingTip}">
        <i class="rating-swatch" style="background:${scoreColour(v)}" aria-hidden="true"></i>
        <span class="rating-text"><span class="rating-word">${words(v)}</span>
          <span class="rating-sub">${C.ratingSub(v)}</span></span>
        <span class="rating-more" aria-hidden="true">${c.open ? "▴" : "▾"}</span></button>
      <div class="why" id="why" ${c.open ? "" : "hidden"}>
        <p class="muted small">${C.why}${patch !== null ? C.whyWhole : ""}</p>
        ${breakdown(d, meta, day)}</div>${fineNote}`;

  // 2. Mushrooms in season here (this square's trees and altitude, this month): photo and name.
  const sp = inSeasonHere(Number(p.tree), Number(p.band), month);
  const season = `<h3 class="card-h">${C.inSeasonHere(month)}</h3>
    ${sp.length ? `<ul class="sp-list">${sp.map((s) => `<li><button type="button" class="sp-open" data-open-card="${s.code}"
        data-tip="${C.openCardTip}">
        ${s.photos[0] ? `<img class="sp-thumb" src="${esc(s.photos[0].url)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : `<span class="sp-thumb"></span>`}
        <span class="sp-name">${nameLines(s)[0]}<span class="sp-common">${nameLines(s)[1]}</span></span>
        <span class="sp-open-go" aria-hidden="true">›</span></button></li>`).join("")}</ul>
      <p class="muted small">${C.fitNote}</p>`
      : `<p class="muted small">${C.noneInSeason(month)}</p>`}`;

  // 3. Place facts.
  const road = d ? C.road(dist(d.road[0]), dist(d.road[1])) : c.failed ? "–" : C.loading;
  const facts = `<ul class="facts">
    <li data-tip="${C.treesTip}"><span aria-hidden="true">🌲</span> <b>${C.treesLabel}</b> ${TREES[Number(p.tree)] ?? C.forest}</li>
    <li data-tip="${C.altTip}"><span aria-hidden="true">⛰</span> <b>${C.altLabel}</b> ${Number(p.elev).toLocaleString(T.locale)} m · ${C.band(BANDS[Number(p.band)] ?? "")}</li>
    <li data-tip="${C.nearTip}"><span aria-hidden="true">🚙</span> <b>${C.nearLabel}</b> ${road}</li>
    ${c.shade ? `<li data-tip="${C.shadeTip(c.shade.fa, c.shade.va, c.shade.ls)}"><span aria-hidden="true">🌗</span> <b>${C.shadeLabel}</b> ${c.shade.sh}/100</li>` : ""}</ul>`;

  // 4. Google Maps link (free, no key). None for squares in or by a nature reserve.
  // Lab (Real, 14 Nov 2026): the two buttons V5 had, side by side: drive there + share the location.
  const maps = d?.access ? `<div class="maps-link">
      <div class="maps-btns">
        <a class="maps-btn primary" href="${mapsDirectionsUrl(d.access.lat, d.access.lon)}" target="_blank" rel="noopener"
          data-tip="${C.driveTip}">
          <span class="maps-main"><span aria-hidden="true">🚗</span> ${C.drive}</span>
          <span class="maps-warn"><span aria-hidden="true">⚠</span> ${C.rough}</span></a>
        <button type="button" class="maps-btn" data-share-url="${mapsPinUrl(d.access.lat, d.access.lon)}"
          data-share-text="${C.shareText}"
          data-tip="${C.shareTip}"><span aria-hidden="true">📍</span> <span class="maps-btn-label">${C.share}</span></button>
      </div>
      <p class="muted small maps-note">${C.mapsNote}</p>
    </div>`
    : d ? `<p class="muted small">${C.noDirections}</p>` : "";

  // 5. Mushroom clock, last.
  const clk = clockSentence(Number(p[`p${day}`]), meta.clock,
    p[`o${day}`] === undefined ? meta.clock.opens : Number(p[`o${day}`]));
  const clock = `<p class="clock ${clk.open ? "open" : ""}" data-tip="${esc(clockTip(meta.clock))}"><span aria-hidden="true">⏱</span>
    <b>${C.clockLabel}</b> ${clk.text}${meta.clock.counted_from ? ` <span class="muted">${esc(C.countedFrom(fmtDay(meta.clock.counted_from, { day: "numeric", month: "long" })))}</span>` : ""}</p>`;

  const what = c.shade ? (meta.heat50 ? C.whatPatch : C.whatSpot) : C.whatSquare;
  return `<div class="card-bar"><span class="muted small">${what}</span>
      <button type="button" class="card-x" data-card-close aria-label="${C.closeCard}" data-tip="${C.closeCardTip}">✕</button></div>
    ${rating}${season}${facts}${maps}${clock}
    ${c.failed ? `<p class="muted small">${C.failed}</p>` : ""}
    <p class="no-rakes" data-tip="${RAKES_TIP}">${C.noRakes}</p>`;
}

// ---------------------------------------------------------------- "Share location" (as in V5)
// Phones: the system share sheet (WhatsApp, Messages…). Computers: copy the link.
async function shareLink(btn: HTMLElement) {
  const url = btn.dataset.shareUrl!;
  const label = btn.querySelector<HTMLElement>(".maps-btn-label");
  const say = (t: string) => {
    if (!label) return;
    label.textContent = t;
    window.setTimeout(() => (label.textContent = C.share), 2500);
  };
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try { await navigator.share({ title: C.shareTitle, text: btn.dataset.shareText ?? "", url }); return; }
    catch (e) { if ((e as DOMException).name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(url); say(C.copied); return; }
  catch { /* clipboard blocked: show the link so it can be copied by hand */ }
  const box = btn.closest(".maps-link");
  let input = box?.querySelector<HTMLInputElement>(".maps-copy");
  if (box && !input) {
    input = document.createElement("input");
    input.className = "maps-copy";
    input.readOnly = true;
    input.setAttribute("aria-label", C.mapsLink);
    box.querySelector(".maps-btns")?.after(input);
  }
  if (!input) return;
  input.value = url;
  input.focus();
  input.select();
  say(document.execCommand?.("copy") ? C.copied : C.copyBelow);
}

document.addEventListener("click", (e) => {
  const b = (e.target as Element | null)?.closest?.<HTMLElement>("[data-share-url]");
  if (!b) return;
  e.preventDefault();
  void shareLink(b);
});
