// Species cards. Rule: deadly and toxic lookalikes come FIRST, on every card.
// Photos: iNaturalist, CC0 / CC BY / CC BY-SA / CC BY-NC only, credit shown on each photo.
// Nothing here ever says a mushroom can be eaten.
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

/** A 12-month ring: filled months = season window. A dot marks the current month. */
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

const photoHTML = (p: Photo, alt: string, cls = "") => `
  <figure class="ph ${cls}">
    <img src="${esc(p.url)}" alt="${esc(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
    <figcaption><a href="${esc(p.page)}" target="_blank" rel="noopener" data-tip="Photo author and licence. Opens the photo on iNaturalist.">${esc(p.attribution)}</a></figcaption>
  </figure>`;

function lookalikesHTML(sp: Species): string {
  const items = LOOKALIKES.map((l) => `
    <li class="look ${l.severity}">
      ${l.photos[0] ? photoHTML(l.photos[0], `Photo of ${l.latin}`, "small") : ""}
      <div>
        <span class="sev ${l.severity}" data-tip="${l.severity === "deadly" ? "Deadly: can kill. Poisoning? Call 112 at once, do not wait for symptoms." : "Toxic: poisonous. Poisoning? Call 112 or the Poison Centre 1401."}">${l.severity === "deadly" ? "DEADLY" : "TOXIC"}</span>
        <b><i>${esc(l.latin)}</i></b>${l.common ? ` · ${esc(l.common)}` : ""}
        ${l.note ? `<p>${esc(l.note)}</p>` : ""}
        ${l.inat_pages?.[0] ? `<p><a href="${esc(l.inat_pages[0].url)}" target="_blank" rel="noopener"
          data-tip="More photos and details of this lookalike on iNaturalist. Opens a new tab.">More photos ↗</a></p>` : ""}
      </div>
    </li>`).join("");
  return `
    <section class="lookalikes" aria-labelledby="look-h-${sp.code}">
      <h3 id="look-h-${sp.code}">${WARN_ICON} Deadly and toxic lookalikes · read first</h3>
      <p>These can grow in the same forests and look similar. Which of them matter most for
        <i>${esc(sp.latin)}</i> is still to be confirmed with the Cyprus Mycological Association,
        so <b>all of them are shown</b>.</p>
      <ul>${items}</ul>
    </section>`;
}

const MAP_TREES: Record<number, string> = { 1: "Calabrian pine", 2: "Troodos black pine", 3: "golden oak", 4: "other broadleaf" };
const MAP_BANDS: Record<number, string> = { 1: "low", 2: "mid", 3: "high (above 1,200 m)" };   // low/mid boundary is a draft (H2)
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "More info": real public records from Cyprus, what is still unconfirmed, and links. */
function moreHTML(sp: Species, open: boolean): string {
  const r = sp.records;
  const max = Math.max(1, ...Object.values(r.months));
  const bars = MONTH_SHORT.map((m, i) => {
    const n = r.months[String(i + 1)] ?? 0;
    return `<div class="rec-m${sp.months.includes(i + 1) ? " in" : ""}" data-tip="${m}: ${n} public record${n === 1 ? "" : "s"} in Cyprus.">
      <i style="height:${n ? Math.max(6, (n / max) * 44) : 2}px"></i><span>${m[0]}</span></div>`;
  }).join("");
  const unsure = [
    !sp.local_confirmed ? `the local name <b>${esc(sp.local)}</b>` : "",
    "which lookalikes matter most for this species",
  ].filter(Boolean);
  return `<details class="more"${open ? " open" : ""}>
    <summary class="more-btn" data-tip="Public records from Cyprus, what we still need to check, and links to learn more.">More info</summary>
    <div class="more-body">
      <h4>Public records in Cyprus</h4>
      <p><b>${r.gbif_total}</b> record${r.gbif_total === 1 ? "" : "s"} on GBIF (museums, surveys and shared iNaturalist sightings) ·
        <b>${r.inat_research}</b> expert-checked sighting${r.inat_research === 1 ? "" : "s"} on iNaturalist.</p>
      ${r.gbif_total ? `<div class="rec-chart" aria-label="Public records in Cyprus by month">${bars}</div>
        <p class="muted small">Months with records. Underlined months = the season we use (${esc(sp.season_text)}).
        ${(() => { const undated = r.gbif_total - Object.values(r.months).reduce((a, b) => a + b, 0);
          return undated > 0 ? `${undated} record${undated === 1 ? " has" : "s have"} no date.` : ""; })()}</p>` : ""}
      <p class="muted small">Cyprus mushrooms are recorded very little, so these numbers are too small to show a season
        or to say where the species grows. You can help by adding your own sightings to iNaturalist.</p>
      <h4>How the map treats it</h4>
      <p>Counts as habitat on our map: <b>${sp.trees.map((t) => MAP_TREES[t]).join(", ")}</b> forest,
        at <b>${sp.bands.map((b) => MAP_BANDS[b]).join(", ")}</b> altitude.
        Scored only in <b>${esc(sp.season_text)}</b>. Everything else (rain, temperature, soil, shade) is the same as the general map.</p>
      <h4>Still to confirm</h4>
      <p>With the Cyprus Mycological Association: ${unsure.join(" and ")}.</p>
      <h4>Learn more</h4>
      <ul class="more-links">${r.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a></li>`).join("")}</ul>
      <p class="muted small">Links open other websites in a new tab. Never use any website, app or AI to decide what to eat.</p>
    </div></details>`;
}

function cardHTML(sp: Species, month: number, more = false): string {
  const local = sp.local_confirmed ? `<b>${esc(sp.local)}</b>`
    : `<b>${esc(sp.local)}</b> <span class="tag warn" data-tip="We have not checked this spelling yet. We will ask the Cyprus Mycological Association.">to confirm with the Cyprus Mycological Association</span>`;
  return `
    <article class="sp-card" aria-labelledby="sp-h-${sp.code}">
      <div class="sp-safety">${WARN_ICON}<span>${SAFETY_LINE}</span></div>
      ${lookalikesHTML(sp)}
      <section class="sp-main">
        <h3 id="sp-h-${sp.code}"><i>${esc(sp.latin)}</i></h3>
        <p class="sp-common">${esc(sp.common)} · local name ${local}</p>
        <div class="ph-row">${sp.photos.map((p) => photoHTML(p, `Photo of ${p.taxon ?? sp.latin}`)).join("")}</div>
        <div class="sp-facts">
          ${seasonRing(sp.months, month, 120)}
          <dl>
            <dt>Season</dt><dd>${esc(sp.season_text)}</dd>
            <dt>Trees</dt><dd>${esc(sp.trees_text)}</dd>
            <dt>Altitude</dt><dd>${esc(sp.altitude_text)}</dd>
          </dl>
        </div>
        ${sp.notes.length ? `<ul class="sp-notes">${sp.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
        <p class="muted small">Photos: iNaturalist (${sp.inat_pages.map((p) => `<a href="${esc(p.url)}" target="_blank" rel="noopener"><i>${esc(p.name)}</i></a>`).join(", ")}).
          Each photo shows its author and licence.</p>
        ${moreHTML(sp, more)}
        <button class="primary-btn" type="button" data-show="${sp.code}" data-tip="Close this card and colour the map for this mushroom's trees, altitude and season.">Show good conditions for this habitat on the map</button>
      </section>
    </article>`;
}

function listHTML(month: number): string {
  // In-season species first.
  const ordered = [...SPECIES].sort((a, b) => Number(b.months.includes(month)) - Number(a.months.includes(month)));
  return `<ul class="sp-list">${ordered.map((s) => `
    <li><button type="button" class="sp-pick" data-open="${s.code}" data-tip="Open the card: deadly lookalikes first, then photos, season, trees and altitude.">
      ${s.photos[0] ? `<img src="${esc(s.photos[0].url)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ""}
      <span><b><i>${esc(s.latin)}</i></b><br><span class="muted">${esc(s.common)} · ${esc(s.season_text)}
        ${s.months.includes(month) ? `<span class="tag">in season</span>` : `<span class="tag" data-tip="Not this month. On the map its habitat shows grey, with no score.">out of season</span>`}</span></span>
    </button>
    <button type="button" class="more-mini" data-open-more="${s.code}"
      data-tip="Open the card at its More info part: Cyprus records and links.">More info</button></li>`).join("")}</ul>`;
}

/** Mounts the species dialog. Returns open(code?) — no code = the list. */
export function mountSpecies(month: () => number, onShow: (code: string) => void): (code?: string) => void {
  const dlg = document.createElement("dialog");
  dlg.className = "species-dlg";
  dlg.setAttribute("aria-label", "Species cards");
  document.body.append(dlg);

  const render = (code?: string, more = false) => {
    const sp = code ? SPECIES.find((s) => s.code === code) : undefined;
    dlg.innerHTML = `
      <div class="dlg-head">
        ${sp ? `<button type="button" class="icon-btn" data-back aria-label="Back to all species" data-tip="Back to all species.">←</button>` : ""}
        <h2>${sp ? "Species card" : "Species cards"}</h2>
        <button type="button" class="icon-btn" data-close aria-label="Close" data-tip="Close the species cards and go back to the map.">✕</button>
      </div>
      <div class="dlg-body">
        ${sp ? cardHTML(sp, month(), more) : `<div class="sp-safety">${WARN_ICON}<span>${SAFETY_LINE}</span></div>
          <p>Each card shows the <b>deadly and toxic lookalikes first</b>, then the habitat and season.
            The map only shows <b>growing conditions</b> for each species' habitat.</p>${listHTML(month())}`}
      </div>`;
    dlg.querySelector("[data-close]")?.addEventListener("click", () => dlg.close());
    dlg.querySelector("[data-back]")?.addEventListener("click", () => render());
    dlg.querySelectorAll<HTMLButtonElement>("[data-open]").forEach((b) => b.addEventListener("click", () => render(b.dataset.open)));
    dlg.querySelectorAll<HTMLButtonElement>("[data-open-more]").forEach((b) =>
      b.addEventListener("click", () => render(b.dataset.openMore, true)));
    dlg.querySelector<HTMLButtonElement>("[data-show]")?.addEventListener("click", (e) => {
      onShow((e.currentTarget as HTMLButtonElement).dataset.show!); dlg.close();
    });
    dlg.querySelector(".dlg-body")?.scrollTo(0, 0);
    if (more) requestAnimationFrame(() => dlg.querySelector(".more")?.scrollIntoView({ block: "start" }));
  };
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  return (code?: string) => { render(code); if (!dlg.open) dlg.showModal(); };
}
