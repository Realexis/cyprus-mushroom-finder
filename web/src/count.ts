// Anonymous visit counter (GoatCounter, https://www.goatcounter.com). No cookies, nothing stored on the phone.
// OFF until COUNTER_SITE is filled in. Real asked for it on 15 Nov 2026 to learn how testers use the site.
//
// What is sent, and nothing else:
//   - a page name ("/" or "/about") or one of the fixed action names below
//   - the screen size, and the name of the website the visitor came from (host only, page views only)
// Never sent: map position, the tapped square, coordinates, the page address, anything typed.
// The request is made with no Referer header, so the page address cannot leak through it.

/** The GoatCounter site code: "abc" for abc.goatcounter.com. Empty = the counter is off. */
/** A test copy is built with VITE_COUNTER=off, so its visits never mix with the live numbers. */
export const COUNTER_SITE = import.meta.env.VITE_COUNTER === "off" ? "" : "realexis";

import { LANG } from "./i18n";

const nav = navigator as Navigator & { globalPrivacyControl?: boolean; webdriver?: boolean };
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";
const ASKED_NOT_TO = nav.doNotTrack === "1" || nav.globalPrivacyControl === true;

/** True when this visit is counted: a site code is set, the site is online, the browser did not say
 *  "Do Not Track" and it is not a test robot. */
export const counterOn = !!COUNTER_SITE && !LOCAL && !ASKED_NOT_TO && !nav.webdriver;

function send(params: Record<string, string>) {
  if (!counterOn) return;
  try {
    const q = new URLSearchParams({ ...params, rnd: Math.random().toString(36).slice(2, 8) });
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.src = `https://${COUNTER_SITE}.goatcounter.com/count?${q}`;
  } catch { /* counting must never break the site */ }
}

/** Count one page view. `page` is a fixed name, never the real address. */
export function countPage(page: "/" | "/about") {
  let from = "";
  try { if (document.referrer) { const h = new URL(document.referrer).hostname; if (h !== location.hostname) from = h; } } catch { /* no referrer */ }
  // Greek pages are counted apart ("/el/" and "/el/about"), so we can see how much Greek is used.
  const name = LANG === "el" ? `/el${page}` : page;
  send({ p: name, s: `${screen.width},${screen.height},${window.devicePixelRatio || 1}`, ...(from ? { r: from } : {}) });
}

/** Count one named action (a fixed word, no details about the place). */
export function countAction(name: string) {
  send({ p: name, e: "true" });
}

// Buttons counted by what they are, in the order checked. Mushroom cards add the public species code.
const ACTIONS: [selector: string, name: (el: HTMLElement) => string][] = [
  [".lang-link", () => "change-language"],
  ["[data-share-url]", () => "share-location"],
  ["a.maps-btn.primary", () => "directions"],
  ["#rating", () => "score-details"],
  ["#replay-btn", () => "rain-replay"],
  [".ctrl-full", () => "full-map"],
  ["[data-emergency]", () => "emergency-info"],
  ["[data-open-card]", (el) => (el.dataset.openCard ? `mushroom-card-${el.dataset.openCard}` : "mushroom-cards")],
  ["[data-act='open'][data-code]", (el) => `mushroom-card-${el.dataset.code}`],
  ["[data-act='looks'], [data-act='jump']", () => "lookalikes"],
];

/** Start counting taps on the buttons above. Does nothing when the counter is off. */
export function mountCounter() {
  if (!counterOn) return;
  document.addEventListener("click", (e) => {
    const t = e.target as Element | null;
    for (const [sel, name] of ACTIONS) {
      const el = t?.closest?.<HTMLElement>(sel);
      if (el) { countAction(name(el).replace(/[^a-z0-9-]/gi, "").slice(0, 40)); return; }
    }
  }, true);
}
