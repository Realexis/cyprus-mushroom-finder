// The language button in the header, next to "About" (Real, 19 Nov 2026).
// One build = one language (src/i18n). When the site is built with VITE_OTHER_LANG_URL, the header
// gets a button that opens the same page of the OTHER language's build:
//   English build (the default, at the site's address):  VITE_OTHER_LANG_URL=el/
//   Greek build (in the folder el/):                     VITE_OTHER_LANG_URL=../
// Without the setting there is no button (the live English site, until Greek is merged in).
// Changing language shows the full first warning again, in the new language, in case the
// visitor did not understand it the first time.
import { T } from "../i18n";
import { askAgainInFull } from "./safety";

const OTHER = (import.meta.env.VITE_OTHER_LANG_URL as string | undefined) ?? "";

export function mountLangSwitch(page: "" | "about.html"): void {
  const sos = document.querySelector(".topbar .sos");
  if (!OTHER || !sos) return;
  const a = document.createElement("a");
  a.className = "about-link lang-link";
  a.href = new URL(OTHER + page, document.baseURI).href;
  a.lang = T.lang.otherCode;
  a.hreflang = T.lang.otherCode;
  a.setAttribute("aria-label", T.lang.otherLabel);
  a.dataset.tip = T.lang.otherTip;
  a.innerHTML = `<span class="lang-long">${T.lang.otherName}</span><span class="lang-short" aria-hidden="true">${T.lang.otherShort}</span>`;
  a.addEventListener("click", askAgainInFull);
  sos.before(a);
}
