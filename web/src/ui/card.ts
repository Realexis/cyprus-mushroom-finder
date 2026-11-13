// The card for one tapped 250 m forest square, in Real's order (LITE-BRIEF.md):
// 1 rating word (tap: the score breakdown), 2 mushrooms in season here, 3 place facts,
// 4 Google Maps link, 5 the mushroom clock. Today only. Growing conditions only.
import { SCORE_STOPS } from "../map/layers";
import { served } from "../map/files";
import { inSeasonHere } from "./species";

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
}

const TREES: Record<number, string> = {
  1: "Calabrian pine (likely)", 2: "Troodos black pine (likely)", 3: "Golden oak (likely)",
  4: "Other broadleaf", 5: "Tripylos cedar zone (closed)",
  6: "Burned forest (recent fire)", 7: "Burned forest (fire since 2018)",
};
const BANDS: Record<number, string> = { 1: "low", 2: "mid", 3: "high (above 1,200 m)" };
const FACTOR_LABEL: Record<string, string> = {
  rain_total: "Rain, last 30 days", rain_pulse: "Soaking rain 7–20 days ago",
  temperature: "Temperature, last 7 days", soil_moisture: "Soil moisture",
  season_altitude: "Season for the altitude", shade: "Shade",
};
// Plain-language help for each factor (same numbers as config/scoring.yaml and V5).
const FACTOR_TIP: Record<string, string> = {
  rain_total: "All rain in the last 30 days. No points below 20 mm, full points from 80 mm.",
  rain_pulse: "The biggest 3-day rain between 7 and 20 days ago. No points below 10 mm, full points from 25 mm.",
  temperature: "Average temperature of the last 7 days, corrected for height. Best 8-18 °C. No points at 3 °C or 24 °C. Frost days take points off.",
  soil_moisture: "How wet the top soil is now, compared with the same place in the autumns and winters of 2024-25 and 2025-26. Wetter than most days = more points.",
  season_altitude: "Is it the right month for this height? High Troodos starts in September, middle heights in October, low hills in November. The season runs to April.",
  shade: "North and east-facing slopes, valley bottoms and little autumn sun keep the ground moist longer.",
};
export const RAKES_TIP = "Cyprus law: rakes and tools are banned in the forest (up to 1 year in prison, up to €5,000 fine, or both). No fires in or within 2 km of forests.";

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export const fmtDay = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { ...opts, timeZone: "Asia/Nicosia" });

export function scoreColour(v: number) {
  let c = SCORE_STOPS[0][1];
  for (const [s, col] of SCORE_STOPS) if (v >= s) c = col;
  return c;
}

/** The four rating words (Real's choice for Lite, 13 Nov 2026: four words, same cut-offs as V5). */
export function words(v: number) {
  if (v >= 80) return "Very good";
  if (v >= 65) return "Good";
  if (v >= 45) return "Fair";
  return "Poor";
}

/** The mushroom clock in plain words (same rules as pipeline/shroomy/score/clock.py and V5).
 *  opens = days after this soaking rain the window opens (18 for the season's first rain,
 *  2 for a later one). */
export function clockSentence(daysSince: number, c: Meta["clock"], opens = c.opens): { text: string; open: boolean } {
  if (daysSince < 0) return { text: `No soaking rain (${c.soak_mm} mm+) yet this season. Fruiting window closed.`, open: false };
  if (daysSince < opens) {
    const k = opens - daysSince;
    return { text: `Soaking rain ${daysSince} days ago. Window opens in ${k} day${k === 1 ? "" : "s"}.`, open: false };
  }
  if (daysSince <= c.closes) {
    const k = c.closes - daysSince;
    return { text: `Soaking rain ${daysSince} days ago. Window OPEN, about ${k} more day${k === 1 ? "" : "s"}.`, open: true };
  }
  return { text: `Last soaking rain was ${daysSince} days ago. Fruiting window has closed.`, open: false };
}

function clockTip(c: Meta["clock"]): string {
  return c.later_opens == null
    ? `Counts the days since the last soaking rain (${c.soak_mm} mm or more). The fruiting window opens about ${c.opens} days after it and closes about ${c.closes} days after it.`
    : `Counts the days since the last soaking rain (${c.soak_mm} mm or more). The season's first window opens about ${c.opens} days after the first soaking rain. After that, each new soaking rain opens it again after about ${c.later_opens} days. It closes about ${c.closes} days after the latest one.`;
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
const rainMM = (mm: number, soak: number) => (mm < soak && Math.round(mm) >= soak ? mm.toFixed(1) : String(Math.round(mm)));

function factorText(name: string, inp: number[] | null, f: number, date: string, soak: number): string {
  if (name === "season_altitude") return fmtDay(date, { month: "long" });
  if (name === "shade") return `${Math.round(f * 100)}/100`;
  if (!inp) return "";
  const [r30, pulse, t7, soil, frost] = inp;
  switch (name) {
    case "rain_total": return `${Math.round(r30)} mm`;
    case "rain_pulse": return `${rainMM(pulse, soak)} mm in 3 days`;
    case "temperature": return `${t7.toFixed(1)} °C average${frost >= 1 ? ` · frost on ${Math.round(frost)} day${frost >= 2 ? "s" : ""}` : ""}`;
    case "soil_moisture": return `wetter than ${Math.round(soil)}% of days in recent seasons`;
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
  const ago = age > 0 ? `, ${age} day${age === 1 ? "" : "s"} ago` : age === 0 ? ", today" : "";
  const word = full ? "yes" : mm < 2 ? "no" : "partly";
  let val: string;
  if (full) val = `${mmText} mm in 3 days${ago}. No cut.`;
  else if (mm < 2) val = `No rain worth counting in the last month, so the score is cut to ${pct}%.`;
  else if (mm >= g.full_at_mm) val = `${mmText} mm in 3 days${ago}. Older rain counts less each day, so the score is cut to ${pct}%.`;
  else val = `${mmText} mm in 3 days${ago} (${g.full_at_mm} mm needed), so the score is cut to ${pct}%.`;
  const tip = `Mushrooms need a soaking rain. The score is multiplied by the biggest 3-day rain of the last ${g.days} days, divided by ${g.full_at_mm} mm. ${g.full_at_mm} mm or more = no cut. Rain older than 20 days counts a little less each day, and not at all after ${g.days} days.`;
  return `<li class="why-row" data-tip="${esc(tip)}">
      <div class="why-top"><span>Soaking rain in the last month: <b>${word}</b></span></div>
      <div class="why-val">${esc(val)}</div></li>`;
}

function breakdown(d: CellDetail | null, meta: Meta, day: number): string {
  if (!d) return `<p class="muted small">Loading the score parts…</p>`;
  if (!d.factors) return `<p class="muted small">No score parts are stored for this square.</p>`;
  const date = meta.days[day].date;
  const rows = Object.keys(meta.weights).map((n, i) => {
    const f = d.factors![i];
    const pct = Math.round(Math.max(0, Math.min(1, f)) * 100);
    const w = Math.round(meta.weights[n] * 100);
    return `<li class="why-row" data-tip="${esc(FACTOR_TIP[n])} This counts for ${w}% of the score.">
      <div class="why-top"><span>${FACTOR_LABEL[n]}</span><span class="muted">counts ${w}%</span></div>
      <div class="why-bar" role="img" aria-label="${FACTOR_LABEL[n]}: ${pct} out of 100"><i style="width:${pct}%;background:${scoreColour(pct)}"></i></div>
      <div class="why-val">${esc(factorText(n, d.inputs, f, date, meta.clock.soak_mm))}</div></li>`;
  }).join("") + gateRow(d.inputs, meta);
  return `<ul class="why-list">${rows}</ul>`;
}

// ---------------------------------------------------------------- the card
const ll = (lat: number, lon: number) => `${lat.toFixed(5)},${lon.toFixed(5)}`;
const mapsDirectionsUrl = (lat: number, lon: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${ll(lat, lon)}&travelmode=driving`;
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
  const v = raw === undefined || raw === null ? null : Number(raw);
  const d = c.detail;
  const month = Number(meta.days[day].date.slice(5, 7));
  const monthName = fmtDay(meta.days[day].date, { month: "long" });

  // 1. Rating word. Tap it for the score breakdown.
  const rating = v === null
    ? `<p class="rating-none"><b>Not scored</b></p>`
    : `<button type="button" class="rating" id="rating" aria-expanded="${c.open}" aria-controls="why"
        data-tip="How good the growing conditions are in this square today. Tap to see why.">
        <i class="rating-swatch" style="background:${scoreColour(v)}" aria-hidden="true"></i>
        <span class="rating-text"><span class="rating-word">${words(v)}</span>
          <span class="rating-sub">growing conditions today · ${v}/100</span></span>
        <span class="rating-more" aria-hidden="true">${c.open ? "▴" : "▾"}</span></button>
      <div class="why" id="why" ${c.open ? "" : "hidden"}>
        <p class="muted small">Why this score: six things count. A long bar = that thing is good right now.</p>
        ${breakdown(d, meta, day)}</div>`;

  // 2. Mushrooms in season here (this square's trees and altitude, this month).
  const sp = inSeasonHere(Number(p.tree), Number(p.band), month);
  const season = `<h3 class="card-h">In season here in ${monthName}</h3>
    ${sp.length ? `<ul class="sp-list">${sp.map((s) => `<li><button type="button" class="sp-open" data-open-card="${s.code}"
        data-tip="Open the mushroom card: photos, what to look for, and its deadly lookalikes."><span><i>${esc(s.latin)}</i>
        <span class="muted">· ${esc(s.common)} · ${esc(s.season_text)}</span></span><span class="sp-open-go" aria-hidden="true">›</span></button></li>`).join("")}</ul>
      <p class="muted small">Their trees, altitude and month fit this square. It does not mean they are here. Tap one for its card and its deadly lookalikes.</p>`
      : `<p class="muted small">None of our target mushrooms is in season for these trees and this altitude in ${monthName}.</p>`}`;

  // 3. Place facts.
  const road = d ? `forest track ${dist(d.road[0])} · road ${dist(d.road[1])}` : c.failed ? "–" : "loading…";
  const facts = `<ul class="facts">
    <li data-tip="The likely trees, worked out from satellite forest maps, height and rock type. Not a tree survey."><span aria-hidden="true">🌲</span> <b>Trees:</b> ${TREES[Number(p.tree)] ?? "Forest"}</li>
    <li data-tip="Height above sea level. Higher forest is cooler and its season starts earlier."><span aria-hidden="true">⛰</span> <b>Altitude:</b> ${Number(p.elev).toLocaleString("en-GB")} m · ${BANDS[Number(p.band)] ?? ""} band</li>
    <li data-tip="Straight-line distance to the nearest forest track and drivable road, from OpenStreetMap. Not a driving route."><span aria-hidden="true">🚙</span> <b>Nearest:</b> ${road}</li>
    ${c.shade ? `<li data-tip="The 50 m square you tapped: the average of three terrain parts. Faces north-east (cooler) ${c.shade.fa}/100, valley bottom ${c.shade.va}/100, little autumn sun ${c.shade.ls}/100. Shade keeps the ground moist. Terrain only: the weather is the same for the whole area."><span aria-hidden="true">🌗</span> <b>Shade here (50 m):</b> ${c.shade.sh}/100</li>` : ""}</ul>`;

  // 4. Google Maps link (free, no key). None for squares in or by a nature reserve.
  const maps = d?.access ? `<a class="maps-btn" href="${mapsDirectionsUrl(d.access.lat, d.access.lon)}" target="_blank" rel="noopener"
        data-tip="Opens Google Maps with driving directions to the middle of this 250 m square. Free, no sign-in.">
        <span><span aria-hidden="true">🚗</span> Directions in Google Maps</span>
        <span class="maps-warn">The middle of this square may be away from roads. Tracks may be rough.</span></a>`
    : d ? `<p class="muted small">No directions for this square: it is in or next to a nature reserve.</p>` : "";

  // 5. Mushroom clock, last.
  const clk = clockSentence(Number(p[`p${day}`]), meta.clock,
    p[`o${day}`] === undefined ? meta.clock.opens : Number(p[`o${day}`]));
  const clock = `<p class="clock ${clk.open ? "open" : ""}" data-tip="${esc(clockTip(meta.clock))}"><span aria-hidden="true">⏱</span>
    <b>Mushroom clock:</b> ${clk.text}${meta.clock.counted_from ? ` <span class="muted">(rain counted from ${esc(fmtDay(meta.clock.counted_from, { day: "numeric", month: "long" }))})</span>` : ""}</p>`;

  return `<div class="card-bar"><span class="muted small">250 m forest square · today</span>
      <button type="button" class="card-x" data-card-close aria-label="Close this card" data-tip="Close this card.">✕</button></div>
    ${rating}${season}${facts}${maps}${clock}
    ${c.failed ? `<p class="muted small">Some details could not load. Check your connection and tap the square again.</p>` : ""}
    <p class="no-rakes" data-tip="${RAKES_TIP}"><b>No rakes.</b> Pick by hand or knife. Put the leaf litter back.</p>`;
}

