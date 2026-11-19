// Species guide: a simple list of mushrooms, and one scrolling page per mushroom.
// Order on every mushroom page (Real's choice for Lite, 2026-11-13): the mushroom (photos, name, and a
// red link to the lookalikes), what to look for, where, when, then the danger signs and ALL deadly /
// toxic lookalikes at the bottom.
// Facts: species.json (project brief) plus field notes below, each backed by a listed source.
// Photos: iNaturalist; every photo opens a larger view with its author and licence.
// Nothing here ever says a mushroom can be eaten.
import "../styles/species.css";
import data from "../generated/species.json";
import { NUMBERS_LINE, SAFETY_LINE, WARN_ICON } from "./safety";
import { esc } from "./card";
import { T, type FieldNotes, type SpeciesText } from "../i18n";

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

/** Species whose trees and altitude band fit this square and whose season includes this month. */
export function inSeasonHere(tree: number, band: number, month: number): Species[] {
  return SPECIES.filter((s) => s.trees.includes(tree) && s.bands.includes(band) && s.months.includes(month));
}

const X = T.species;
const MONTH_LETTER = T.monthLetter, MONTH_SHORT = T.monthShort, MONTH_LONG = T.monthLong;

/** A species' text in the language of this build (English: as written in species.json). */
export const spText = (sp: Species): SpeciesText => X.text?.[sp.code] ?? sp;
/** The two name lines: [big, small]. English: Latin name, then the common name.
 *  Greek: the Greek name big, the Latin name small (Real, 19 Nov 2026). Both are escaped HTML. */
export function nameLines(sp: Species): [string, string] {
  const tx = spText(sp);
  return tx.title ? [esc(tx.title), `<i>${esc(sp.latin)}</i>`] : [`<i>${esc(sp.latin)}</i>`, esc(tx.common)];
}
const lkText = (l: Lookalike): { common: string; note: string } => X.lookText?.[l.latin] ?? l;

// ------------------------------------------------------------------ field notes (researched 2026-11-12)
// Every line comes from one of the SOURCES below. Not yet checked by the Cyprus Mycological Association.
// The labels are in the i18n files; the addresses are the same in every language.
const SOURCE_URL: Record<string, string> = {
  forests: "https://www.moa.gov.cy/moa/fd/fd.nsf/fd67_en/fd67_en?OpenDocument=",
  leaflet: "https://www.pedoulas.org.cy/docs/MUSHROOMS%20IN%20CYPRUS.pdf",
  kykpee: "https://kykpee.org/mushrooms-of-cyprus/",
  pedoulas: "https://www.pedoulas.org.cy/index.php/el/articles/nature-gr/mushrooms-gr",
  dialogos: "https://dialogos.com.cy/manitaria-enas-thisavros-tis-kipriakis-fisis/",
  w_lde: "https://en.wikipedia.org/wiki/Lactarius_deliciosus",
  w_lsa: "https://en.wikipedia.org/wiki/Lactarius_sanguifluus",
  w_rde: "https://en.wikipedia.org/wiki/Russula_delica",
  w_tca: "https://en.wikipedia.org/wiki/Tricholoma_caligatum",
  w_slu: "https://en.wikipedia.org/wiki/Suillus",
  w_arb: "https://en.wikipedia.org/wiki/Morchella_arbutiphila",
  w_dis: "https://en.wikipedia.org/wiki/Morchella_disparilis",
  w_false: "https://en.wikipedia.org/wiki/False_morel",
  w_dcap: "https://en.wikipedia.org/wiki/Amanita_phalloides",
  fn_lde: "https://www.first-nature.com/fungi/lactarius-deliciosus.php",
  fn_tor: "https://www.first-nature.com/fungi/lactarius-torminosus.php",
  fn_chr: "https://www.first-nature.com/fungi/lactarius-chrysorrheus.php",
  fn_col: "https://www.first-nature.com/fungi/suillus-collinitus.php",
  w_sgr: "https://en.wikipedia.org/wiki/Suillus_granulatus",
  w_slt: "https://en.wikipedia.org/wiki/Suillus_luteus",
  exub: "https://miller-mycology-lab.inhs.illinois.edu/files/2020/04/First-report-of-the-post-fire-morel-Morchella-exuberans-in-eastern-North-America-Mycologia-2017.pdf",
  ncbi: "https://www.ncbi.nlm.nih.gov/books/NBK470580/",
  agrotis: "https://www.gov.cy/media/sites/46/2025/12/2021-Jan-Apr.pdf",
};
const SOURCES = Object.fromEntries(Object.entries(SOURCE_URL).map(([k, url]) => [k, { label: X.sourceLabel[k], url }]));

// The field notes themselves are in the i18n files (one set per language); the sources are shared.
const FIELD_SRC: Record<string, string[]> = {
  lde: ["leaflet", "w_lde", "fn_lde", "forests", "dialogos", "kykpee", "agrotis", "fn_tor", "fn_chr"],
  lsa: ["w_lsa", "fn_chr", "fn_tor", "kykpee"],
  rde: ["leaflet", "w_rde", "kykpee", "w_dcap"],
  tca: ["leaflet", "w_tca", "kykpee", "pedoulas", "dialogos", "w_dcap"],
  mor: ["leaflet", "kykpee", "agrotis", "exub", "w_arb", "w_dis", "w_false", "ncbi", "pedoulas"],
  slu: ["leaflet", "w_slu", "forests", "kykpee", "agrotis", "fn_col", "w_sgr", "w_slt"],
};
const AMANITA_SIGNS = X.amanitaSigns;
const FIELD: Record<string, FieldNotes & { src: string[] }> = Object.fromEntries(
  Object.entries(X.field).map(([k, f]) => [k, { ...f, src: FIELD_SRC[k] ?? [] }]));

// ------------------------------------------------------------------ small helpers
const ICONS: Record<string, string> = {
  info: `<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r="0.6" fill="currentColor"/>`,
  close: `<path d="M6 6l12 12M18 6 6 18"/>`,
  back: `<path d="M15 5 8 12l7 7"/>`,
  next: `<path d="m9 5 7 7-7 7"/>`,
  check: `<path d="m5 12.5 4.5 4.5L19 7.5"/>`,
  look: `<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>`,
  tree: `<path d="M12 2 5.5 11H9l-4.5 7h15L15 11h3.5Z"/><path d="M12 18v4"/>`,
  cal: `<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>`,
};
const icon = (n: string, size = 22) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

const inSeason = (sp: Species, m: number) => sp.months.includes(m);
const monthName = (m: number) => MONTH_LONG[m - 1];
function monthsUntil(sp: Species, m: number): number {
  for (let k = 1; k <= 12; k++) if (sp.months.includes(((m - 1 + k) % 12) + 1)) return k;
  return 0;
}
const LOOK_ORDER = [...LOOKALIKES.filter((l) => l.severity === "deadly"), ...LOOKALIKES.filter((l) => l.severity === "toxic")];
const nDeadly = LOOKALIKES.filter((l) => l.severity === "deadly").length;
const sevText = (l: Lookalike) => X.sev[l.severity];

type Shot = { p: Photo; name: string; sev?: Lookalike["severity"]; note?: string };

/** The year as 12 boxes: the season filled, this month marked. */
function monthBar(sp: Species, now: number): string {
  return `<div class="sc-months" role="img" aria-label="${esc(X.seasonAria(spText(sp).season_text, monthName(now)))}">
    ${MONTH_LETTER.map((l, i) => `<span class="${inSeason(sp, i + 1) ? "on" : ""}${i + 1 === now ? " now" : ""}">${l}</span>`).join("")}
  </div>`;
}

// ------------------------------------------------------------------ the dialog
type View = { kind: "list" } | { kind: "looks" } | { kind: "sp"; code: string };

/** Mounts the species guide. Returns open(code?) — no code = the list of all species. */
export function mountSpecies(month: () => number): (code?: string) => void {
  const dlg = document.createElement("dialog");
  dlg.className = "species-dlg sc";
  dlg.setAttribute("aria-label", X.guide);
  document.body.append(dlg);

  let view: View = { kind: "list" };
  let now = month();
  let layerOpener: HTMLElement | null = null;
  const sets: Record<string, Shot[]> = {};
  LOOK_ORDER.forEach((l, i) => { sets[`lk${i}`] = l.photos.map((p) => ({ p, name: l.latin, sev: l.severity, note: lkText(l).note })); });
  SPECIES.forEach((s) => { sets[`sp-${s.code}`] = s.photos.map((p) => ({ p, name: p.taxon ?? s.latin })); });

  // ---------------------------------------------------------------- pieces
  const lookRows = () => `<ul class="sc-lk">${LOOK_ORDER.map((l, i) => `
    <li><button type="button" class="sc-lk-row ${l.severity}" data-act="view" data-set="lk${i}" data-i="0"
        aria-label="${esc(X.lookRowAria(l.latin, sevText(l)))}"
        data-tip="${X.lookRowTip}">
      ${l.photos[0] ? `<img src="${esc(l.photos[0].url)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : `<span class="sc-noimg"></span>`}
      <span class="sc-lk-text">
        <span class="sc-sev ${l.severity}">${WARN_ICON}${sevText(l)}</span>
        <b><i>${esc(l.latin)}</i></b>${lkText(l).common ? `<span class="sc-soft">${esc(lkText(l).common)}</span>` : ""}
        ${lkText(l).note ? `<span class="sc-lk-note">${esc(lkText(l).note)}</span>` : ""}
      </span>
    </button></li>`).join("")}</ul>`;

  const row = (s: Species) => {
    const on = inSeason(s, now);
    return `<li><button type="button" class="sc-row${on ? " on" : ""}" data-act="open" data-code="${s.code}"
        data-tip="${X.rowTip}">
      ${s.photos[0] ? `<img src="${esc(s.photos[0].url)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ""}
      <span class="sc-row-text">
        <b>${nameLines(s)[0]}</b>
        <span class="sc-soft">${nameLines(s)[1]}</span>
        ${on ? `<span class="sc-chip on">${icon("check", 16)}${X.inSeason}</span>` : `<span class="sc-chip">${esc(spText(s).season_text)}</span>`}
      </span>
      ${icon("next")}
    </button></li>`;
  };

  const listHTML = () => {
    const on = SPECIES.filter((s) => inSeason(s, now)), off = SPECIES.filter((s) => !inSeason(s, now));
    return `
      <button type="button" class="sc-danger-btn" data-act="looks">
        <span class="sc-danger-ph">${LOOK_ORDER.slice(0, 3).map((l) => l.photos[0] ? `<img src="${esc(l.photos[0].url)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : "").join("")}</span>
        <span class="sc-danger-text"><b>${WARN_ICON}${X.dangerBtn}</b><span>${X.learnFirst}</span></span>
        ${icon("next")}
      </button>
      ${on.length ? `<h3 class="sc-h">${X.inSeasonIn(now)}</h3><ul class="sc-list">${on.map(row).join("")}</ul>` : ""}
      ${off.length ? `<h3 class="sc-h">${X.notInSeasonIn(now)}</h3><ul class="sc-list off">${off.map(row).join("")}</ul>` : ""}`;
  };

  const looksHTML = () => `
    <section class="sc-danger">
      <h3 class="sc-h danger">${WARN_ICON}${X.dangerBtn}</h3>
      <p>${X.looksIntro}</p>
      <p class="sc-sign"><b>${X.leaveIf}</b> ${AMANITA_SIGNS}</p>
      ${lookRows()}
    </section>`;

  const speciesHTML = (sp: Species) => {
    const f = FIELD[sp.code];
    const tx = spText(sp);
    // The big name already is the local name: do not repeat it (unless its spelling is still to confirm).
    const sameName = !!tx.title && tx.title.toLowerCase() === tx.local && sp.local_confirmed;
    const shots = sets[`sp-${sp.code}`];
    const onNow = inSeason(sp, now);
    const k = monthsUntil(sp, now), nextM = ((now - 1 + k) % 12) + 1;
    return `
      <section class="sc-me">
        <div class="sc-car-wrap">
          <ul class="sc-car" tabindex="0" aria-label="${esc(X.carAria(sp.latin))}">
            ${shots.map((s, i) => `<li><button type="button" class="sc-photo" data-act="view" data-set="sp-${sp.code}" data-i="${i}"
                aria-label="${esc(X.photoAria(i + 1, shots.length, s.name))}"
                data-tip="${X.photoTip}">
              <img src="${esc(s.p.url)}" alt="" loading="${i ? "lazy" : "eager"}" referrerpolicy="no-referrer" />
              <span class="sc-cc" aria-hidden="true">©</span></button></li>`).join("")}
          </ul>
          ${shots.length > 1 ? `<div class="sc-dots" aria-hidden="true">${shots.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>` : ""}
        </div>
        <h3 class="sc-name">${nameLines(sp)[0]}</h3>
        <p class="sc-sub">${tx.title ? nameLines(sp)[1] : ""}${sameName ? "" : `${tx.title ? ". " : ""}${X.subLine(tx.title ? "" : esc(tx.common), esc(tx.local))}`}${sp.local_confirmed ? "" : `<span class="sc-q" tabindex="0"
          data-tip="${X.spellTip}">?</span>`}</p>
        <a class="sc-jump" href="#sc-danger-h" data-act="jump">${WARN_ICON}<span>${X.jump(nDeadly)}</span></a>
      </section>

      ${f ? `<section class="sc-sec">
        <h3 class="sc-h">${icon("look")}${X.whatToLook}</h3>
        <p class="sc-unchecked">${icon("info", 18)}<span>${X.notChecked}</span></p>
        <dl class="sc-look">${f.look.map(([k, t]) => `<div><dt>${esc(k)}</dt><dd>${esc(t)}</dd></div>`).join("")}</dl>
      </section>` : ""}


      <section class="sc-sec">
        <h3 class="sc-h">${icon("tree")}${X.whereToLook}</h3>
        ${f ? `<p class="sc-unchecked">${icon("info", 18)}<span>${X.notChecked}</span></p>` : ""}
        <ul class="sc-where">${(f?.where ?? []).map((w) => `<li>${esc(w)}</li>`).join("")}
          <li><b>${X.onOurMap}</b> ${esc(tx.trees_text)}. ${esc(tx.altitude_text)}.</li></ul>
      </section>

      <section class="sc-sec">
        <h3 class="sc-h">${icon("cal")}${X.when}</h3>
        ${monthBar(sp, now)}
        <p class="sc-when ${onNow ? "on" : ""}">${onNow
          ? `${icon("check")}<span>${X.inSeasonNow(esc(tx.season_text))}</span>`
          : `<span>${X.notInSeasonNow(now, esc(tx.season_text), nextM)}</span>`}</p>
      </section>

      <section class="sc-danger" aria-labelledby="sc-danger-h">
        <h3 class="sc-h danger" id="sc-danger-h" tabindex="-1">${WARN_ICON}${X.dangerH}</h3>
        ${f?.danger.length ? `<p class="sc-sign-h"><b>${X.leaveIfColon}</b></p>
          <ul class="sc-signs">${f.danger.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
        <p>${X.watchThese(LOOKALIKES.length, nDeadly)}</p>
        ${lookRows()}
      </section>

      <button type="button" class="sc-more" data-act="info">${icon("info", 20)}${X.more}</button>`;
  };

  // ---------------------------------------------------------------- whole screen
  const headHTML = () => {
    const back = `<button type="button" class="sc-round" data-act="list" aria-label="${X.backAll}" data-tip="${X.backAllTip}">${icon("back")}</button>`;
    if (view.kind === "sp") {
      const sp = speciesByCode(view.code)!;
      return `${back}<h2 class="sc-title">${nameLines(sp)[0]}<span>${nameLines(sp)[1]}</span></h2>`;
    }
    if (view.kind === "looks") return `${back}<h2 class="sc-title">${X.looksTitle}<span>${X.looksSub}</span></h2>`;
    return `<h2 class="sc-title">${X.listTitle}<span>${X.listSub}</span></h2>`;
  };

  const render = (focus = ".sc-head .sc-round") => {
    const sp = view.kind === "sp" ? speciesByCode(view.code)! : null;
    dlg.innerHTML = `
      <div class="sc-main">
        <header class="sc-head">
          ${headHTML()}
          <button type="button" class="sc-round" data-act="info" aria-label="${X.infoAria}"
            data-tip="${X.infoTip}">${icon("info")}</button>
          <button type="button" class="sc-round" data-act="close" aria-label="${X.close}" data-tip="${X.closeTip}">${icon("close")}</button>
        </header>
        <div class="sc-safety">${WARN_ICON}<span>${SAFETY_LINE} <span class="sc-numbers">${NUMBERS_LINE}</span></span></div>
        <div class="sc-body"><div class="sc-page">
          ${sp ? speciesHTML(sp) : view.kind === "looks" ? looksHTML() : listHTML()}
        </div></div>
      </div>
      <div class="sc-layer" hidden></div>`;
    const car = dlg.querySelector<HTMLElement>(".sc-car");
    if (car) {
      const dots = [...dlg.querySelectorAll<HTMLElement>(".sc-dots i")];
      car.addEventListener("scroll", () => {
        const i = Math.round(car.scrollLeft / car.clientWidth);
        dots.forEach((d, j) => d.classList.toggle("on", i === j));
      }, { passive: true });
    }
    dlg.querySelector<HTMLElement>(focus)?.focus({ preventScroll: true });
  };

  // ---------------------------------------------------------------- layers: photo viewer and sources
  const layer = () => dlg.querySelector<HTMLElement>(".sc-layer");
  const openLayer = (html: string, label: string) => {
    const l = layer()!;
    layerOpener = document.activeElement as HTMLElement | null;
    l.innerHTML = html;
    l.setAttribute("role", "dialog");
    l.setAttribute("aria-modal", "true");
    l.setAttribute("aria-label", label);
    l.hidden = false;
    dlg.querySelector<HTMLElement>(".sc-main")!.inert = true;
    l.querySelector<HTMLElement>("[data-act='layer-close']")?.focus();
  };
  const closeLayer = () => {
    const l = layer();
    if (!l || l.hidden) return false;
    l.hidden = true; l.innerHTML = "";
    dlg.querySelector<HTMLElement>(".sc-main")!.inert = false;
    layerOpener?.focus({ preventScroll: true });
    return true;
  };

  let viewerSet = "", viewerI = 0;
  const viewerHTML = () => {
    const shots = sets[viewerSet], s = shots[viewerI];
    return `<div class="sc-viewer">
      <header class="sc-layer-head">
        <h2>${s.sev ? `<span class="sc-sev ${s.sev}">${WARN_ICON}${X.sev[s.sev]}</span> ` : ""}<i>${esc(s.name)}</i>
          ${shots.length > 1 ? `<span class="sc-soft">${X.photoOf(viewerI + 1, shots.length)}</span>` : ""}</h2>
        <button type="button" class="sc-round" data-act="layer-close" aria-label="${X.closePhoto}">${icon("close")}</button>
      </header>
      <div class="sc-viewer-ph">
        <img src="${esc(s.p.url.replace("/medium.", "/large."))}" alt="${esc(X.photoAlt(s.name))}" referrerpolicy="no-referrer"
          onerror="this.onerror=null;this.src='${esc(s.p.url)}'" />
        ${shots.length > 1 ? `
          <button type="button" class="sc-round sc-prev" data-act="vstep" data-d="-1" aria-label="${X.prev}">${icon("back")}</button>
          <button type="button" class="sc-round sc-next" data-act="vstep" data-d="1" aria-label="${X.next}">${icon("next")}</button>` : ""}
      </div>
      ${s.note ? `<p class="sc-viewer-note">${esc(s.note)}</p>` : ""}
      <p class="sc-credit"><span>${X.photoBy} ${esc(s.p.attribution)}</span>
        <a href="${esc(s.p.page)}" target="_blank" rel="noopener">${X.openInat}</a></p>
    </div>`;
  };

  const creditList = (shots: Shot[]) => `<ul class="sc-credits">${shots.map((s) => `<li>
      <img src="${esc(s.p.url)}" alt="" loading="lazy" referrerpolicy="no-referrer" />
      <span><i>${esc(s.name)}</i><br><a href="${esc(s.p.page)}" target="_blank" rel="noopener">${esc(s.p.attribution)}</a></span></li>`).join("")}</ul>`;
  const lookCredits = () => `<details class="sc-fold"><summary>${X.lookCredits}</summary>
      ${creditList(LOOK_ORDER.flatMap((_, i) => sets[`lk${i}`]))}</details>`;

  const recordsHTML = (sp: Species) => {
    const r = sp.records;
    const max = Math.max(1, ...Object.values(r.months));
    const bars = MONTH_SHORT.map((m, i) => {
      const n = r.months[String(i + 1)] ?? 0;
      return `<div class="rec-m${sp.months.includes(i + 1) ? " in" : ""}" data-tip="${X.recTip(m, n)}">
        <i style="height:${n ? Math.max(6, (n / max) * 44) : 2}px"></i><span>${m[0]}</span></div>`;
    }).join("");
    return `<h3>${X.recTitle}</h3>
      <p>${X.recLine(r.gbif_total, r.inat_research)}</p>
      ${r.gbif_total ? `<div class="rec-chart" aria-label="${X.recChart}">${bars}</div>` : ""}
      <p class="sc-soft">${X.recNote}</p>`;
  };

  const infoHTML = () => {
    const head = `<header class="sc-layer-head"><h2>${X.infoTitle}</h2>
      <button type="button" class="sc-round" data-act="layer-close" aria-label="${X.close}">${icon("close")}</button></header>`;
    const foot = `<p class="sc-soft">${X.linksNote} ${esc(SAFETY_LINE)}</p>`;
    if (view.kind === "sp") {
      const sp = speciesByCode(view.code)!;
      const f = FIELD[sp.code];
      const tx = spText(sp);
      const confirm = [
        !sp.local_confirmed ? X.confirmLocal(tx.local) : "",
        X.confirmLooks,
        X.confirmNotes,
        ...(f?.check ?? []),
      ].filter(Boolean);
      return `${head}<div class="sc-info">
        <h3>${X.confirmH}</h3>
        <ul class="sc-links">${confirm.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
        <h3>${X.notesFrom}</h3>
        <ul class="sc-links">${(f?.src ?? []).map((k) => `<li><a href="${esc(SOURCES[k].url)}" target="_blank" rel="noopener">${esc(SOURCES[k].label)} ↗</a></li>`).join("")}</ul>
        <p class="sc-soft">${X.briefNote}</p>
        <h3>${X.howH}</h3>
        <p>${X.how(esc(tx.trees_text), esc(tx.altitude_text), esc(tx.season_text))}</p>
        ${tx.notes.length ? `<ul class="sc-links">${tx.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
        ${recordsHTML(sp)}
        <h3>${X.photosH}</h3>
        <p class="sc-soft">${X.photosNote}</p>
        ${creditList(sets[`sp-${sp.code}`])}
        ${lookCredits()}
        <h3>${X.learnMore}</h3>
        <ul class="sc-links">${sp.records.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(X.linkLabel(l.label))} ↗</a></li>`).join("")}</ul>
        ${foot}</div>`;
    }
    return `${head}<div class="sc-info">
      <h3>${X.whereFromH}</h3>
      <p>${X.whereFrom}</p>
      <h3>${X.confirmH}</h3>
      <p>${X.confirmAll(LOOKALIKES.length)}</p>
      <h3>${X.collectH}</h3>
      <ul class="sc-links">${X.collect.map((c) => `<li>${c}</li>`).join("")}</ul>
      <p class="sc-soft"><a href="${esc(SOURCES.forests.url)}" target="_blank" rel="noopener">${esc(SOURCES.forests.label)} ↗</a></p>
      ${lookCredits()}
      <p><a href="./about.html">${X.allCredits}</a></p>
      ${foot}</div>`;
  };

  // ---------------------------------------------------------------- actions
  const go = (v: View) => { view = v; render(); dlg.querySelector(".sc-body")?.scrollTo(0, 0); };

  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) { dlg.close(); return; }
    const b = (e.target as Element).closest<HTMLElement>("[data-act]");
    if (!b) return;
    const d = b.dataset;
    switch (d.act) {
      case "close": dlg.close(); break;
      case "jump": e.preventDefault(); dlg.querySelector("#sc-danger-h")?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); break;
      case "list": go({ kind: "list" }); break;
      case "looks": go({ kind: "looks" }); break;
      case "open": go({ kind: "sp", code: d.code! }); break;
      case "view": viewerSet = d.set!; viewerI = Number(d.i); openLayer(viewerHTML(), X.viewerLabel); break;
      case "vstep": {
        const n = sets[viewerSet].length;
        viewerI = (viewerI + Number(d.d) + n) % n;
        layer()!.innerHTML = viewerHTML();
        layer()!.querySelector<HTMLElement>(`[data-act="vstep"][data-d="${d.d}"]`)?.focus();
        break;
      }
      case "info": openLayer(infoHTML(), X.infoTitle); break;
      case "layer-close": closeLayer(); break;
    }
  });
  dlg.addEventListener("keydown", (e) => {
    const l = layer();
    if (l && !l.hidden && l.querySelector(".sc-viewer") && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      l.querySelector<HTMLElement>(`[data-act="vstep"][data-d="${e.key === "ArrowRight" ? 1 : -1}"]`)?.click();
    }
  });
  dlg.addEventListener("cancel", (e) => { if (closeLayer()) e.preventDefault(); });

  return (code?: string) => {
    now = month();
    closeLayer();
    go(code && speciesByCode(code) ? { kind: "sp", code } : { kind: "list" });
    if (!dlg.open) dlg.showModal();
    dlg.querySelector<HTMLElement>(".sc-head .sc-round")?.focus({ preventScroll: true });
  };
}
