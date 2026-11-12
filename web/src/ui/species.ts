// Species explorer: a deck of mushroom cards, each with its own screen of steps.
// Safety rules (project brief):
//  - Deadly and toxic lookalikes come FIRST on every species screen. The other steps stay
//    locked until the person has scrolled past all of them and pressed the button at the end.
//  - Photos: iNaturalist, CC0 / CC BY / CC BY-SA / CC BY-NC only. Every photo opens a larger
//    view with its author and licence (one tap). All credits are also in "Sources and credits".
//  - Nothing here ever says a mushroom can be eaten. Facts come only from species.json.
import "../styles/species.css";
import data from "../generated/species.json";
import { SAFETY_LINE, WARN_ICON } from "./safety";
import { esc } from "./spot";

export interface Photo { url: string; licence: string; attribution: string; page: string; taxon?: string; }
export interface Species {
  code: string; latin: string; common: string; local: string; local_confirmed: boolean;
  trees: number[]; trees_text: string; bands: number[]; altitude_text: string; months: number[];
  notes: string[]; season_text: string; photos: Photo[]; inat_pages: { name: string; url: string }[];
  records: { gbif_total: number; inat_research: number; months: Record<string, number>; links: { label: string; url: string }[] };
}
export interface Lookalike { latin: string; common: string; severity: "deadly" | "toxic"; note: string; photos: Photo[];
  inat_pages?: { name: string; url: string }[]; }

export const SPECIES = data.species as Species[];
export const LOOKALIKES = data.lookalikes as Lookalike[];
export const speciesByCode = (c: string | null) => SPECIES.find((s) => s.code === c) ?? null;

const MONTH_LETTER = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];

/** A 12-month ring: filled months = season window. A dot marks the current month. (Kept for other screens.) */
export function seasonRing(months: number[], current: number, size = 96): string {
  const c = size / 2, r = size * 0.36, w = size * 0.13;
  const arc = (m: number) => {
    const a0 = ((m - 1) / 12) * 2 * Math.PI - Math.PI / 2 + 0.03;
    const a1 = (m / 12) * 2 * Math.PI - Math.PI / 2 - 0.03;
    const p = (a: number) => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
    return `<path d="M ${p(a0)} A ${r} ${r} 0 0 1 ${p(a1)}" stroke-width="${w}" fill="none"
      class="${months.includes(m) ? "ring-on" : "ring-off"}"/>`;
  };
  const lab = (m: number) => {
    const a = ((m - 0.5) / 12) * 2 * Math.PI - Math.PI / 2;
    const rr = r + w * 1.25;
    return `<text x="${(c + rr * Math.cos(a)).toFixed(1)}" y="${(c + rr * Math.sin(a)).toFixed(1)}"
      class="${m === current ? "ring-now" : ""}">${MONTH_LETTER[m - 1]}</text>`;
  };
  const am = ((current - 0.5) / 12) * 2 * Math.PI - Math.PI / 2;
  return `<svg data-tip="The year as a ring, starting with January at the top. Filled months = the season. The dot and bold letter = the month you are looking at." class="ring" width="${size + 28}" height="${size + 28}" viewBox="-14 -14 ${size + 28} ${size + 28}" role="img"
    aria-label="Season: ${months.map((m) => MONTH_LETTER[m - 1]).length} months, marked on a year ring">
    ${Array.from({ length: 12 }, (_, i) => arc(i + 1)).join("")}
    ${Array.from({ length: 12 }, (_, i) => lab(i + 1)).join("")}
    <circle cx="${(c + r * Math.cos(am)).toFixed(1)}" cy="${(c + r * Math.sin(am)).toFixed(1)}" r="${w * 0.32}" class="ring-dot"/>
  </svg>`;
}

// ------------------------------------------------------------------ small helpers
const ICONS: Record<string, string> = {
  look: `<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>`,
  season: `<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 9 9h-9Z" fill="currentColor" stroke="none"/>`,
  habitat: `<path d="M12 2 5.5 11H9l-4.5 7h15L15 11h3.5Z"/><path d="M12 18v4"/>`,
  lock: `<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>`,
  info: `<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r="0.6" fill="currentColor"/>`,
  close: `<path d="M6 6l12 12M18 6 6 18"/>`,
  back: `<path d="M15 5 8 12l7 7"/>`,
  next: `<path d="m9 5 7 7-7 7"/>`,
  map: `<path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2Z"/><path d="M9 4v14M15 6v14"/>`,
  check: `<path d="m5 12.5 4.5 4.5L19 7.5"/>`,
  pine: `<path d="M12 2 5.5 11H9l-4.5 7h15L15 11h3.5Z"/><path d="M12 18v4"/>`,
  oak: `<path d="M12 3a5 5 0 0 0-4.6 3A4.5 4.5 0 0 0 5 14.5 4.5 4.5 0 0 0 9.5 17h5a4.5 4.5 0 0 0 4.5-4.5A4.5 4.5 0 0 0 16.6 6 5 5 0 0 0 12 3Z"/><path d="M12 11v11"/>`,
  leaf: `<path d="M5 19C5 9.5 11 4 20 4c0 9-5.5 15-15 15Z"/><path d="M5 19 13.5 10.5"/>`,
  mountain: `<path d="m2 20 7-12 4 6 3-4 6 10Z"/>`,
};
const icon = (n: string, size = 22) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

const MAP_TREES: Record<number, { name: string; icon: string }> = {
  1: { name: "Calabrian pine", icon: "pine" }, 2: { name: "Troodos black pine", icon: "pine" },
  3: { name: "golden oak", icon: "oak" }, 4: { name: "other broadleaf", icon: "leaf" },
};
// low/mid boundary is a draft (H2), so only the high band gets a number.
const MAP_BANDS: Record<number, { name: string; sub: string }> = {
  3: { name: "High", sub: "above 1,200 m" }, 2: { name: "Mid", sub: "" }, 1: { name: "Low", sub: "" },
};

const inSeason = (sp: Species, m: number) => sp.months.includes(m);
const monthName = (m: number) => MONTH_LONG[m - 1];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
/** Months until the next season month after m (1 = next month). */
function monthsUntil(sp: Species, m: number): number {
  for (let k = 1; k <= 12; k++) if (sp.months.includes(((m - 1 + k) % 12) + 1)) return k;
  return 0;
}
const DEADLY = LOOKALIKES.filter((l) => l.severity === "deadly");
const TOXIC = LOOKALIKES.filter((l) => l.severity === "toxic");
const LOOK_ORDER = [...DEADLY, ...TOXIC];
const sevText = (l: Lookalike) => (l.severity === "deadly" ? "Deadly" : "Toxic");
const sevTip = (l: Lookalike) => l.severity === "deadly"
  ? "Deadly: can kill. Poisoning? Call 112 at once, do not wait for symptoms."
  : "Toxic: poisonous. Poisoning? Call 112 or the Poison Centre 1401.";

// ------------------------------------------------------------------ remembered progress (this browser only)
const STORE = "shroomy-explored-v1";
function loadExplored(): Record<string, number[]> {
  try { return JSON.parse(localStorage.getItem(STORE) ?? "{}") ?? {}; } catch { return {}; }
}
function saveExplored(e: Record<string, number[]>) {
  try { localStorage.setItem(STORE, JSON.stringify(e)); } catch { /* private window: fine */ }
}

// ------------------------------------------------------------------ pieces
const TABS = [
  { id: "danger", label: "Lookalikes", icon: "warn" },
  { id: "look", label: "Look", icon: "look" },
  { id: "season", label: "Season", icon: "season" },
  { id: "habitat", label: "Habitat", icon: "habitat" },
] as const;
const TAB_TIPS = [
  "Deadly and toxic mushrooms that can look similar. Always first.",
  "Photos of this mushroom, and side by side with a lookalike.",
  "Which months are its season, and if it is in season now.",
  "Which trees and which altitude its habitat needs.",
];

type Shot = { p: Photo; name: string; sev?: Lookalike["severity"] };

/** 12 small ticks: the season at a glance. */
const strip = (sp: Species, m: number) => `<span class="sc-strip" aria-hidden="true">${
  Array.from({ length: 12 }, (_, i) => `<i class="${inSeason(sp, i + 1) ? "on" : ""}${i + 1 === m ? " now" : ""}"></i>`).join("")}</span>`;

/** The big season dial. Tap a month to look at it. */
function seasonDial(sp: Species, sel: number, now: number): string {
  const size = 260, c = size / 2, r = 96, w = 30;
  const pt = (a: number, rr: number) => `${(c + rr * Math.cos(a)).toFixed(2)} ${(c + rr * Math.sin(a)).toFixed(2)}`;
  const ang = (m: number) => ((m - 1) / 12) * 2 * Math.PI - Math.PI / 2;
  const seg = (m: number) => {
    const a0 = ang(m) + 0.035, a1 = ang(m + 1) - 0.035, ri = r - w / 2, ro = r + w / 2;
    const d = `M ${pt(a0, ro)} A ${ro} ${ro} 0 0 1 ${pt(a1, ro)} L ${pt(a1, ri)} A ${ri} ${ri} 0 0 0 ${pt(a0, ri)} Z`;
    return `<path d="${d}" data-month="${m}" class="sd-seg${inSeason(sp, m) ? " on" : ""}${m === sel ? " sel" : ""}"><title>${monthName(m)}</title></path>`;
  };
  const lab = (m: number) => {
    const a = ang(m + 0.5), p = pt(a, r).split(" ");
    return `<text x="${p[0]}" y="${p[1]}" class="sd-lab${inSeason(sp, m) ? " on" : ""}${m === sel ? " sel" : ""}" data-month="${m}">${MONTH_LETTER[m - 1]}</text>`;
  };
  const nowA = ang(now + 0.5), np = pt(nowA, r + w / 2 + 10).split(" ");
  const on = inSeason(sp, sel);
  return `<svg class="sc-dial" viewBox="0 0 ${size} ${size}" role="img"
      aria-label="Year dial. ${esc(sp.season_text)} is the season. ${monthName(sel)}: ${on ? "in season" : "not in season"}.">
    ${Array.from({ length: 12 }, (_, i) => seg(i + 1)).join("")}
    ${Array.from({ length: 12 }, (_, i) => lab(i + 1)).join("")}
    <circle cx="${np[0]}" cy="${np[1]}" r="5" class="sd-now"><title>The month the map shows</title></circle>
    <text x="${c}" y="${c - 12}" class="sd-month">${monthName(sel)}</text>
    <text x="${c}" y="${c + 18}" class="sd-state${on ? " on" : ""}">${on ? "In season" : "Not in season"}</text>
  </svg>`;
}

/** A photo that opens the larger view with its credit. */
function photoBtn(set: string, i: number, shot: Shot, cls = "", label = ""): string {
  return `<button type="button" class="sc-photo ${cls}" data-act="view" data-set="${set}" data-i="${i}"
      aria-label="${esc(label || `Photo of ${shot.name}`)}. Open larger, with the photo credit."
      data-tip="Tap to see it larger, with the photo's author and licence.">
    <img src="${esc(shot.p.url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
    <span class="sc-cc" aria-hidden="true">©</span>
  </button>`;
}

function monthStepper(scope: "deck" | "season", m: number, now: number, label: string): string {
  const prev = ((m + 10) % 12) + 1, next = (m % 12) + 1;
  return `<div class="sc-step" role="group" aria-label="${esc(label)}">
    <button type="button" class="sc-round" data-act="month" data-scope="${scope}" data-m="${prev}" data-dir="prev"
      aria-label="Previous month: ${monthName(prev)}" data-tip="Previous month.">${icon("back")}</button>
    <div class="sc-step-mid" aria-live="polite">
      <b>${monthName(m)}</b>
      ${m === now ? `<span class="sc-now-tag">the map's month</span>`
        : `<button type="button" class="sc-link" data-act="month" data-scope="${scope}" data-m="${now}"
            data-tip="Go back to the month the map is showing.">Back to ${monthName(now)}</button>`}
    </div>
    <button type="button" class="sc-round" data-act="month" data-scope="${scope}" data-m="${next}" data-dir="next"
      aria-label="Next month: ${monthName(next)}" data-tip="Next month.">${icon("next")}</button>
  </div>`;
}

function lookTiles(): string {
  return `<ul class="sc-looks">${LOOK_ORDER.map((l, i) => `
    <li class="sc-look ${l.severity}">
      ${l.photos[0] ? photoBtn(`lk${i}`, 0, { p: l.photos[0], name: l.latin }, "", `Photo of ${l.latin}`) : ""}
      <div class="sc-look-text">
        <span class="sc-sev ${l.severity}" data-tip="${sevTip(l)}">${WARN_ICON}${sevText(l)}</span>
        <b class="sc-look-name"><i>${esc(l.latin)}</i></b>
        ${l.common ? `<span class="sc-look-common">${esc(l.common)}</span>` : ""}
        ${l.note ? `<p>${esc(l.note)}</p>` : ""}
      </div>
    </li>`).join("")}</ul>`;
}

// ------------------------------------------------------------------ the dialog
type View = { kind: "deck" } | { kind: "looks" } | { kind: "sp"; code: string; tab: number };

/** Mounts the species explorer. Returns open(code?) — no code = the deck of all species. */
export function mountSpecies(month: () => number, onShow: (code: string) => void): (code?: string) => void {
  const dlg = document.createElement("dialog");
  dlg.className = "species-dlg sc";
  dlg.setAttribute("aria-label", "Species cards");
  document.body.append(dlg);

  let view: View = { kind: "deck" };
  let now = month();
  let deckMonth = now;
  let seasonSel = now;
  let compare: number | null = null;
  let hint = false;                       // "look at the lookalikes first" message
  let justUnlocked = false;
  let animate = false;                    // play the step entrance once, after a step or screen change
  let layerOpener: HTMLElement | null = null;
  const seen = new Set<string>();        // species whose lookalikes were looked at (this visit only)
  const explored = loadExplored();
  const sets: Record<string, Shot[]> = {};
  LOOK_ORDER.forEach((l, i) => { sets[`lk${i}`] = l.photos.map((p) => ({ p, name: l.latin, sev: l.severity })); });
  SPECIES.forEach((s) => { sets[`sp-${s.code}`] = s.photos.map((p) => ({ p, name: p.taxon ?? s.latin })); });

  const unlocked = (code: string) => seen.has(code);
  const allowed = (code: string, tab: number) => tab === 0 || unlocked(code);

  // ---------------------------------------------------------------- deck
  const deckHTML = () => {
    const m = deckMonth;
    const ordered = [...SPECIES].sort((a, b) => Number(inSeason(b, m)) - Number(inSeason(a, m)));
    const nOn = ordered.filter((s) => inSeason(s, m)).length;
    const card = (s: Species) => {
      const on = inSeason(s, m);
      const ex = explored[s.code] ?? [];
      return `<li><button type="button" class="sc-card${on ? " on" : ""}" data-act="open" data-code="${s.code}"
          data-tip="Open this mushroom. Its deadly and toxic lookalikes come first.">
        <span class="sc-card-ph">${s.photos[0] ? `<img src="${esc(s.photos[0].url)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ""}
          <span class="sc-pips" aria-label="Explored ${ex.length} of 4 parts">${TABS.map((_, i) => `<i class="${ex.includes(i) ? "on" : ""}"></i>`).join("")}</span></span>
        <span class="sc-badge${on ? " on" : ""}">${on ? `${icon("check", 16)}In season` : esc(s.season_text)}</span>
        <span class="sc-label">
          <b><i>${esc(s.latin)}</i></b>
          <span class="sc-label-common">${esc(s.common)}</span>
          ${strip(s, m)}
        </span>
      </button></li>`;
    };
    return `
      ${monthStepper("deck", m, now, "Month to check")}
      <p class="sc-count" aria-live="polite">${nOn ? `<b>${nOn} of ${SPECIES.length}</b> in season in ${monthName(m)}.`
        : `None of these are in season in ${monthName(m)}.`}</p>
      <ul class="sc-deck">
        <li class="sc-deck-wide"><button type="button" class="sc-danger-card" data-act="looks"
            data-tip="All deadly and toxic lookalikes, with photos. Learn these first.">
          <span class="sc-danger-ph">${DEADLY.slice(0, 4).map((l) => l.photos[0] ? `<img src="${esc(l.photos[0].url)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : "").join("")}</span>
          <span class="sc-danger-text">
            <b>${WARN_ICON} Deadly and toxic lookalikes</b>
            <span>${DEADLY.length} deadly and ${TOXIC.length} toxic. Learn these first.</span>
          </span>
          ${icon("next")}
        </button></li>
        ${ordered.map(card).join("")}
      </ul>`;
  };

  // ---------------------------------------------------------------- species steps
  const dangerHTML = (sp: Species) => `
    <h3 class="sc-h">${WARN_ICON} Lookalikes first</h3>
    <p class="sc-lead">These can grow in the same forests and look similar to <i>${esc(sp.latin)}</i>.
      <b>Some can kill.</b> All ${LOOKALIKES.length} are shown for every mushroom.</p>
    ${lookTiles()}
    ${unlocked(sp.code) ? "" : `<div class="sc-ack">
      <p>Looked at all ${LOOKALIKES.length}? Then you can open the other steps.</p>
      <button type="button" class="primary-btn sc-big" data-act="ack">${icon("check")} I have looked at all ${LOOKALIKES.length} lookalikes</button>
    </div>`}`;

  const lookHTML = (sp: Species) => {
    const shots = sets[`sp-${sp.code}`];
    const local = sp.local_confirmed ? `<b>${esc(sp.local)}</b>`
      : `<b class="sc-unsure" tabindex="0" data-tip="Spelling still to confirm with the Cyprus Mycological Association.">${esc(sp.local)}</b>`;
    const c = compare !== null ? LOOK_ORDER[compare] : null;
    return `
      <div class="sc-car-wrap">
        <ul class="sc-car" tabindex="0" aria-label="Photos of ${esc(sp.latin)}. Swipe or use the arrows.">
          ${shots.map((s, i) => `<li>${photoBtn(`sp-${sp.code}`, i, s, "big", `Photo ${i + 1} of ${shots.length}: ${s.name}`)}</li>`).join("")}
        </ul>
        ${shots.length > 1 ? `
          <button type="button" class="sc-round sc-car-prev" data-act="car" data-d="-1" aria-label="Previous photo">${icon("back")}</button>
          <button type="button" class="sc-round sc-car-next" data-act="car" data-d="1" aria-label="Next photo">${icon("next")}</button>
          <div class="sc-dots" aria-hidden="true">${shots.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>` : ""}
      </div>
      <h3 class="sc-name"><i>${esc(sp.latin)}</i></h3>
      <p class="sc-sub">${esc(sp.common)}. Local name ${local}</p>

      <h4 class="sc-h4">Compare with a lookalike</h4>
      ${c ? `<div class="sc-compare">
          <figure>${photoBtn(`sp-${sp.code}`, 0, shots[0], "", `Photo of ${sp.latin}`)}
            <figcaption><b><i>${esc(sp.latin)}</i></b></figcaption></figure>
          <figure class="${c.severity}">${c.photos[0] ? photoBtn(`lk${compare}`, 0, { p: c.photos[0], name: c.latin }, "", `Photo of ${c.latin}`) : ""}
            <figcaption><span class="sc-sev ${c.severity}">${WARN_ICON}${sevText(c)}</span>
              <b><i>${esc(c.latin)}</i></b>${c.note ? `<span>${esc(c.note)}</span>` : ""}</figcaption></figure>
        </div>` : `<p class="sc-muted">Pick one to put it next to this mushroom.</p>`}
      <ul class="sc-pickrow" aria-label="Lookalikes to compare">
        ${LOOK_ORDER.map((l, i) => `<li><button type="button" class="sc-pick ${l.severity}" data-act="compare" data-i="${i}"
            aria-pressed="${compare === i}" aria-label="Compare with ${esc(l.latin)} (${sevText(l).toLowerCase()})"
            data-tip="${esc(l.latin)}: ${sevText(l).toLowerCase()}.">
          ${l.photos[0] ? `<img src="${esc(l.photos[0].url)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ""}
        </button></li>`).join("")}
      </ul>`;
  };

  const seasonHTML = (sp: Species) => {
    const onNow = inSeason(sp, now);
    const k = monthsUntil(sp, now);
    const nextM = ((now - 1 + k) % 12) + 1;
    return `
      <div class="sc-season">
        <div class="sc-dial-wrap" data-tip="The year as a dial, January at the top. Filled months are the season. The dot is the month the map shows. Tap a month.">
          ${seasonDial(sp, seasonSel, now)}
        </div>
        <div class="sc-season-side">
          <p class="sc-season-text">Season <b>${esc(sp.season_text)}</b></p>
          <p class="sc-now ${onNow ? "on" : ""}">${onNow
            ? `${icon("check")} <span><b>In season now.</b> The map shows ${monthName(now)}.</span>`
            : `<span><b>Not in season in ${monthName(now)}.</b> Its season starts in ${monthName(nextM)}, in ${plural(k, "month")}.</span>`}</p>
          ${monthStepper("season", seasonSel, now, "Month on the dial")}
        </div>
      </div>
      <p class="sc-muted">The season is the window our map uses. Mushrooms only grow when the weather is right too.</p>`;
  };

  const habitatHTML = (sp: Species) => `
    <div class="sc-hab">
      <section class="sc-hab-block">
        <h3 class="sc-h">${icon("pine")} Trees</h3>
        <p class="sc-hab-text">${esc(sp.trees_text)}</p>
        <ul class="sc-trees">${sp.trees.map((t) => `<li>${icon(MAP_TREES[t].icon, 26)}<span>${cap(MAP_TREES[t].name)}</span></li>`).join("")}</ul>
      </section>
      <section class="sc-hab-block">
        <h3 class="sc-h">${icon("mountain")} Altitude</h3>
        <p class="sc-hab-text">${esc(sp.altitude_text)}</p>
        <div class="sc-alt">
          <svg viewBox="0 0 200 120" class="sc-mtn" preserveAspectRatio="none" aria-hidden="true">
            <defs><clipPath id="mtn-${sp.code}"><path d="M0 120 L40 86 L70 50 L98 14 L122 40 L150 68 L200 120 Z"/></clipPath></defs>
            <g clip-path="url(#mtn-${sp.code})">
              <rect x="0" y="0" width="200" height="46" class="${sp.bands.includes(3) ? "on" : ""}"/>
              <rect x="0" y="46" width="200" height="38" class="${sp.bands.includes(2) ? "on" : ""}"/>
              <rect x="0" y="84" width="200" height="36" class="${sp.bands.includes(1) ? "on" : ""}"/>
            </g>
            <path d="M0 120 L40 86 L70 50 L98 14 L122 40 L150 68 L200 120" class="sc-mtn-line"/>
          </svg>
          <ul class="sc-bands">${[3, 2, 1].map((b) => `<li class="${sp.bands.includes(b) ? "on" : ""}">
            ${sp.bands.includes(b) ? icon("check", 18) : `<span class="sc-dash" aria-hidden="true"></span>`}
            <span><b>${MAP_BANDS[b].name}</b>${MAP_BANDS[b].sub ? ` ${MAP_BANDS[b].sub}` : ""}<span class="sr">${sp.bands.includes(b) ? ": yes" : ": no"}</span></span></li>`).join("")}</ul>
        </div>
      </section>
    </div>`;

  const speciesBody = (sp: Species, tab: number) =>
    [dangerHTML, lookHTML, seasonHTML, habitatHTML][tab](sp);

  const tabsHTML = (sp: Species, tab: number) => {
    const ex = explored[sp.code] ?? [];
    return `<div class="sc-tabs${justUnlocked ? " unlock" : ""}" role="tablist" aria-label="Steps for ${esc(sp.latin)}">
      ${TABS.map((t, i) => {
        const ok = allowed(sp.code, i);
        return `<button type="button" role="tab" id="sc-tab-${i}" class="sc-tab${i === 0 ? " danger" : ""}" style="--i:${i}"
            aria-selected="${i === tab}" aria-controls="sc-panel" tabindex="${i === tab ? 0 : -1}"
            ${ok ? "" : `aria-disabled="true"`} data-act="tab" data-tab="${i}"
            data-tip="${ok ? TAB_TIPS[i] : "Look at the lookalikes first. Then this step opens."}">
          <span class="sc-tab-ic">${!ok ? icon("lock", 20) : t.icon === "warn" ? WARN_ICON : icon(t.icon, 20)}</span>
          <span class="sc-tab-label">${t.label}</span>
          <i class="sc-tab-pip${ex.includes(i) ? " on" : ""}" aria-hidden="true"></i>
        </button>`;
      }).join("")}
    </div>`;
  };

  const footHTML = (sp: Species, tab: number) => {
    if (!unlocked(sp.code)) return "";
    const prev = tab > 0 ? `<button type="button" class="sc-round" data-act="tab" data-tab="${tab - 1}"
        aria-label="Back to ${TABS[tab - 1].label}" data-tip="Back to ${TABS[tab - 1].label}.">${icon("back")}</button>` : "";
    const main = tab < 3
      ? `<button type="button" class="primary-btn sc-big" data-act="tab" data-tab="${tab + 1}">Next: ${TABS[tab + 1].label} ${icon("next", 20)}</button>`
      : `<button type="button" class="primary-btn sc-big" data-act="show" data-code="${sp.code}"
          data-tip="Close this and colour the map for this mushroom's trees, altitude and season.">${icon("map", 20)} Show good conditions for this habitat on the map</button>`;
    return `<div class="sc-foot">${prev}${main}</div>`;
  };

  // ---------------------------------------------------------------- whole screen
  const headHTML = () => {
    if (view.kind === "sp") {
      const sp = speciesByCode(view.code)!;
      return `<button type="button" class="sc-round" data-act="deck" aria-label="Back to all mushrooms" data-tip="Back to all mushrooms.">${icon("back")}</button>
        <div class="sc-title">
          ${sp.photos[0] ? `<img src="${esc(sp.photos[0].url)}" alt="" referrerpolicy="no-referrer" />` : ""}
          <h2><i>${esc(sp.latin)}</i><span>${esc(sp.common)}</span></h2>
        </div>`;
    }
    if (view.kind === "looks") return `<button type="button" class="sc-round" data-act="deck" aria-label="Back to all mushrooms" data-tip="Back to all mushrooms.">${icon("back")}</button>
      <div class="sc-title"><h2>Lookalikes<span>Deadly and toxic</span></h2></div>`;
    return `<div class="sc-title"><h2>Mushrooms<span>${SPECIES.length} species, and their lookalikes</span></h2></div>`;
  };

  const render = (opts: { keepScroll?: boolean; focus?: string } = {}) => {
    const oldBody = dlg.querySelector<HTMLElement>(".sc-body");
    const scroll = opts.keepScroll && oldBody ? oldBody.scrollTop : 0;
    const sp = view.kind === "sp" ? speciesByCode(view.code)! : null;
    const tab = view.kind === "sp" ? view.tab : 0;
    if (sp && allowed(sp.code, tab)) {
      const ex = (explored[sp.code] ??= []);
      if (!ex.includes(tab)) { ex.push(tab); saveExplored(explored); }
    }
    dlg.innerHTML = `
      <div class="sc-main">
        <header class="sc-head">
          ${headHTML()}
          <button type="button" class="sc-round" data-act="info" aria-label="Sources and credits"
            data-tip="Sources, photo credits, public records in Cyprus and links.">${icon("info")}</button>
          <button type="button" class="sc-round" data-act="close" aria-label="Close" data-tip="Close and go back to the map.">${icon("close")}</button>
        </header>
        <div class="sc-safety">${WARN_ICON}<span>${SAFETY_LINE}</span></div>
        ${sp ? tabsHTML(sp, tab) : ""}
        <div class="sc-body" ${sp ? `id="sc-panel" role="tabpanel" aria-labelledby="sc-tab-${tab}" tabindex="-1"` : ""}>
          <div class="sc-panel${animate ? " enter" : ""} ${sp ? `tab-${TABS[tab].id}` : view.kind}">
            ${sp ? speciesBody(sp, tab) : view.kind === "looks"
              ? `<p class="sc-lead">These can grow in the same forests as the mushrooms on this map and can look similar.
                  <b>Some can kill.</b> Tap a photo to see it larger.</p>${lookTiles()}`
              : deckHTML()}
            ${sp && hint ? `<p class="sc-hint" role="status">${icon("lock", 18)} First look at all ${LOOKALIKES.length} lookalikes. The button is at the end of the list.</p>` : ""}
          </div>
        </div>
        ${sp ? footHTML(sp, tab) : ""}
      </div>
      <div class="sc-layer" hidden></div>`;
    justUnlocked = false; animate = false;
    const body = dlg.querySelector<HTMLElement>(".sc-body")!;
    body.scrollTop = scroll;
    wireCarousel();
    if (opts.focus) dlg.querySelector<HTMLElement>(opts.focus)?.focus({ preventScroll: true });
  };

  const wireCarousel = () => {
    const car = dlg.querySelector<HTMLElement>(".sc-car");
    if (!car) return;
    const dots = [...dlg.querySelectorAll<HTMLElement>(".sc-dots i")];
    car.addEventListener("scroll", () => {
      const i = Math.round(car.scrollLeft / car.clientWidth);
      dots.forEach((d, j) => d.classList.toggle("on", i === j));
    }, { passive: true });
  };

  // ---------------------------------------------------------------- layers: photo viewer and sources
  const layer = () => dlg.querySelector<HTMLElement>(".sc-layer")!;
  const main = () => dlg.querySelector<HTMLElement>(".sc-main")!;
  const openLayer = (html: string, label: string) => {
    layerOpener = document.activeElement as HTMLElement | null;
    const l = layer();
    l.innerHTML = html;
    l.setAttribute("role", "dialog");
    l.setAttribute("aria-modal", "true");
    l.setAttribute("aria-label", label);
    l.hidden = false;
    main().inert = true;
    l.querySelector<HTMLElement>("[data-act='layer-close']")?.focus();
  };
  const closeLayer = () => {
    const l = dlg.querySelector<HTMLElement>(".sc-layer");
    if (!l || l.hidden) return false;
    l.hidden = true; l.innerHTML = "";
    main().inert = false;
    layerOpener?.focus({ preventScroll: true });
    return true;
  };

  let viewerSet = "", viewerI = 0;
  const viewerHTML = () => {
    const shots = sets[viewerSet], s = shots[viewerI];
    return `<div class="sc-viewer">
      <header class="sc-layer-head">
        <h2>${s.sev ? `<b class="sc-sev ${s.sev}">${WARN_ICON}${s.sev === "deadly" ? "Deadly" : "Toxic"}</b> ` : ""}<i>${esc(s.name)}</i>${shots.length > 1 ? `<span>Photo ${viewerI + 1} of ${shots.length}</span>` : ""}</h2>
        <button type="button" class="sc-round" data-act="layer-close" aria-label="Close the photo">${icon("close")}</button>
      </header>
      <div class="sc-viewer-ph">
        <img src="${esc(s.p.url.replace("/medium.", "/large."))}" alt="Photo of ${esc(s.name)}" referrerpolicy="no-referrer"
          onerror="this.onerror=null;this.src='${esc(s.p.url)}'" />
        ${shots.length > 1 ? `
          <button type="button" class="sc-round sc-car-prev" data-act="vstep" data-d="-1" aria-label="Previous photo">${icon("back")}</button>
          <button type="button" class="sc-round sc-car-next" data-act="vstep" data-d="1" aria-label="Next photo">${icon("next")}</button>` : ""}
      </div>
      <p class="sc-credit"><span>Photo: ${esc(s.p.attribution)}</span>
        <a href="${esc(s.p.page)}" target="_blank" rel="noopener" data-tip="Opens this photo on iNaturalist in a new tab.">Open on iNaturalist ↗</a></p>
    </div>`;
  };
  const openViewer = (set: string, i: number) => {
    viewerSet = set; viewerI = i;
    openLayer(viewerHTML(), "Photo and credit");
  };

  const creditList = (shots: Shot[]) => `<ul class="sc-credits">${shots.map((s) => `<li>
      <img src="${esc(s.p.url)}" alt="" loading="lazy" referrerpolicy="no-referrer" />
      <span><i>${esc(s.name)}</i><br><a href="${esc(s.p.page)}" target="_blank" rel="noopener">${esc(s.p.attribution)}</a></span></li>`).join("")}</ul>`;

  const lookCredits = () => `<details class="sc-more"><summary>Photo credits for the lookalikes</summary>
      ${creditList(LOOK_ORDER.flatMap((_, i) => sets[`lk${i}`]))}
      <ul class="sc-links">${LOOK_ORDER.filter((l) => l.inat_pages?.[0]).map((l) =>
        `<li><a href="${esc(l.inat_pages![0].url)}" target="_blank" rel="noopener">More photos of <i>${esc(l.latin)}</i> on iNaturalist ↗</a></li>`).join("")}</ul>
    </details>`;

  const recordsHTML = (sp: Species) => {
    const r = sp.records;
    const max = Math.max(1, ...Object.values(r.months));
    const bars = MONTH_SHORT.map((m, i) => {
      const n = r.months[String(i + 1)] ?? 0;
      return `<div class="rec-m${sp.months.includes(i + 1) ? " in" : ""}" data-tip="${m}: ${plural(n, "public record")} in Cyprus.">
        <i style="height:${n ? Math.max(6, (n / max) * 44) : 2}px"></i><span>${m[0]}</span></div>`;
    }).join("");
    const undated = r.gbif_total - Object.values(r.months).reduce((a, b) => a + b, 0);
    return `<h3>Public records in Cyprus</h3>
      <p><b>${r.gbif_total}</b> ${r.gbif_total === 1 ? "record" : "records"} on GBIF (museums, surveys and shared iNaturalist sightings).
        <b>${r.inat_research}</b> expert-checked ${r.inat_research === 1 ? "sighting" : "sightings"} on iNaturalist.</p>
      ${r.gbif_total ? `<div class="rec-chart" aria-label="Public records in Cyprus by month">${bars}</div>
        <p class="sc-muted">Months with records. Underlined months are the season we use (${esc(sp.season_text)}).
          ${undated > 0 ? `${undated} ${undated === 1 ? "record has" : "records have"} no date.` : ""}</p>` : ""}
      <p class="sc-muted">Cyprus mushrooms are recorded very little, so these numbers are too small to show a season
        or to say where the species grows. You can help by adding your own sightings to iNaturalist.</p>`;
  };

  const infoHTML = () => {
    const head = `<header class="sc-layer-head"><h2>Sources and credits</h2>
      <button type="button" class="sc-round" data-act="layer-close" aria-label="Close sources and credits">${icon("close")}</button></header>`;
    const foot = `<p class="sc-muted">Links open other websites in a new tab. ${esc(SAFETY_LINE)}</p>`;
    if (view.kind === "sp") {
      const sp = speciesByCode(view.code)!;
      const unsure = [!sp.local_confirmed ? `the local name <b>${esc(sp.local)}</b>` : "",
        "which lookalikes matter most for this mushroom"].filter(Boolean);
      return `${head}<div class="sc-info">
        <h3>Photos</h3>
        <p class="sc-muted">From iNaturalist. Each photo keeps its author and licence.</p>
        ${creditList(sets[`sp-${sp.code}`])}
        ${lookCredits()}
        ${recordsHTML(sp)}
        <h3>How the map uses it</h3>
        <p>Counts as habitat: <b>${sp.trees.map((t) => MAP_TREES[t].name).join(", ")}</b> forest,
          at <b>${sp.bands.map((b) => MAP_BANDS[b].name.toLowerCase()).join(", ")}</b> altitude.
          Scored only in <b>${esc(sp.season_text)}</b>. Everything else (rain, temperature, soil, shade) is the same as the general map.</p>
        ${sp.notes.length ? `<ul class="sc-notes">${sp.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
        <h3>Still to confirm</h3>
        <p>With the Cyprus Mycological Association: ${unsure.join(" and ")}. Until then, all ${LOOKALIKES.length} lookalikes are shown.</p>
        <h3>Learn more</h3>
        <ul class="sc-links">${sp.records.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a></li>`).join("")}</ul>
        ${foot}</div>`;
    }
    return `${head}<div class="sc-info">
      <h3>Where this comes from</h3>
      <p>Seasons, trees and altitudes come from the project brief. Photos come from iNaturalist, and each one keeps its
        author and licence: tap any photo to see it.</p>
      <h3>Still to confirm</h3>
      <p>With the Cyprus Mycological Association: the local names (except <b>kokkinomanitaro</b>), and which lookalikes
        matter most for each mushroom. Until then, all ${LOOKALIKES.length} lookalikes are shown on every mushroom.</p>
      ${view.kind === "looks" ? creditList(LOOK_ORDER.flatMap((_, i) => sets[`lk${i}`])) : lookCredits()}
      <p><a href="./about.html">Every photo credit, on the About page</a></p>
      ${foot}</div>`;
  };

  // ---------------------------------------------------------------- actions
  const go = (v: View, focus?: string) => {
    view = v; hint = false; animate = true;
    if (v.kind === "sp") { seasonSel = now; compare = null; }
    render({ focus: focus ?? ".sc-head .sc-round" });
  };
  const setTab = (tab: number) => {
    if (view.kind !== "sp" || tab < 0 || tab >= TABS.length || tab === view.tab) return;
    if (!allowed(view.code, tab)) { hint = true; render({ keepScroll: true, focus: `#sc-tab-${view.tab}` }); return; }
    view = { ...view, tab }; hint = false; animate = true;
    render({ focus: `#sc-tab-${tab}` });
  };

  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) { dlg.close(); return; }
    const t = e.target as Element;
    const seg = t.closest<SVGElement>("[data-month]");
    if (seg && view.kind === "sp") { seasonSel = Number(seg.dataset.month); render({ keepScroll: true }); return; }
    const b = t.closest<HTMLElement>("[data-act]");
    if (!b) return;
    const d = b.dataset;
    switch (d.act) {
      case "close": dlg.close(); break;
      case "deck": go({ kind: "deck" }); break;
      case "looks": go({ kind: "looks" }); break;
      case "open": go({ kind: "sp", code: d.code!, tab: 0 }); break;
      case "tab": setTab(Number(d.tab)); break;
      case "ack":
        if (view.kind !== "sp") break;
        seen.add(view.code); justUnlocked = true;
        view = { ...view, tab: 1 }; hint = false; animate = true;
        render({ focus: "#sc-tab-1" });
        break;
      case "month":
        if (d.scope === "deck") deckMonth = Number(d.m); else seasonSel = Number(d.m);
        render({ keepScroll: true, focus: `[data-act="month"][data-scope="${d.scope}"][data-dir="${d.dir ?? "prev"}"]` });
        break;
      case "compare":
        compare = compare === Number(d.i) ? null : Number(d.i);
        render({ keepScroll: true, focus: `[data-act="compare"][data-i="${d.i}"]` });
        break;
      case "car": {
        const car = dlg.querySelector<HTMLElement>(".sc-car")!;
        const n = car.children.length, i = Math.round(car.scrollLeft / car.clientWidth);
        const j = (i + Number(d.d) + n) % n;
        car.scrollTo({ left: j * car.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        break;
      }
      case "view": openViewer(d.set!, Number(d.i)); break;
      case "vstep": {
        const n = sets[viewerSet].length;
        viewerI = (viewerI + Number(d.d) + n) % n;
        layer().innerHTML = viewerHTML();
        layer().querySelector<HTMLElement>(`[data-act="vstep"][data-d="${d.d}"]`)?.focus();
        break;
      }
      case "info": openLayer(infoHTML(), "Sources and credits"); break;
      case "layer-close": closeLayer(); break;
      case "show": onShow(d.code!); dlg.close(); break;
    }
  });

  // Keyboard: arrows move between steps; Escape closes a photo or the sources first.
  dlg.addEventListener("keydown", (e) => {
    const tabEl = (e.target as Element).closest?.("[role='tab']");
    if (tabEl && view.kind === "sp" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      e.preventDefault();
      const n = view.tab + (e.key === "ArrowRight" ? 1 : -1);
      if (n >= 0 && n < TABS.length) setTab(n);
    }
    if (!layer().hidden && viewerSet && layer().querySelector(".sc-viewer") && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      layer().querySelector<HTMLElement>(`[data-act="vstep"][data-d="${e.key === "ArrowRight" ? 1 : -1}"]`)?.click();
    }
  });
  dlg.addEventListener("cancel", (e) => { if (closeLayer()) e.preventDefault(); });

  // Swipe left / right on a step to move to the next / previous step (phones).
  let sx = 0, sy = 0, sOk = false;
  dlg.addEventListener("pointerdown", (e) => {
    sOk = e.pointerType === "touch" && view.kind === "sp" && layer().hidden
      && !(e.target as Element).closest(".sc-car, .sc-pickrow, .sc-dial-wrap, .sc-tabs");
    sx = e.clientX; sy = e.clientY;
  });
  dlg.addEventListener("pointerup", (e) => {
    if (!sOk || view.kind !== "sp") return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) setTab(view.tab + (dx < 0 ? 1 : -1));
  });

  return (code?: string) => {
    now = month(); deckMonth = now;
    closeLayer();
    go(code && speciesByCode(code) ? { kind: "sp", code, tab: 0 } : { kind: "deck" });
    if (!dlg.open) dlg.showModal();
    dlg.querySelector<HTMLElement>(".sc-head .sc-round")?.focus({ preventScroll: true });
  };
}
