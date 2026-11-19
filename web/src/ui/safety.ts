// Safety banner text and the emergency box. Wording comes from the project brief.

import { T } from "../i18n";
const S = T.safety;

export const SAFETY_LINE = S.line;

/** The emergency numbers, as tap-to-call links (shown on every screen). */
export const NUMBERS_LINE = S.numbers;

export const WARN_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
  <path fill="currentColor" d="M12 2 1 21h22L12 2Zm0 6c.6 0 1 .4 1 1v5a1 1 0 1 1-2 0V9c0-.6.4-1 1-1Zm0 11.2a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z"/></svg>`;

export function emergencyHTML(): string {
  return `
  <div class="em-head" id="em-title">
    <h2>${S.emTitle}</h2>
    <div>${S.emSub}</div>
  </div>
  <div class="em-body">
    <a class="call" href="tel:112">
      <span>${S.call112}<small>${S.ambulance}</small></span><span aria-hidden="true">📞</span>
    </a>
    <a class="call secondary" href="tel:1401">
      <span>${S.call1401}</span><span aria-hidden="true">📞</span>
    </a>
    <ul>
      ${S.emList.map((l) => `<li>${l}</li>`).join("\n      ")}
    </ul>
    <form method="dialog"><button class="em-close">${S.close}</button></form>
  </div>`;
}

export function mountEmergency(openers: HTMLElement[]): void {
  const dlg = document.createElement("dialog");
  dlg.className = "emergency";
  dlg.setAttribute("aria-labelledby", "em-title");
  dlg.innerHTML = emergencyHTML();
  document.body.append(dlg);
  for (const b of openers) b.addEventListener("click", () => dlg.showModal());
}

/** The warning a visitor must agree to before using the site (Real, 18 Nov 2026).
 *  First time on a device: the full warning. Every later visit: a short reminder with one big OK
 *  (they have read it already, so it must be quick). Moving between the map and the About page
 *  in the same tab does not ask again.
 *  Change the number when the wording changes in substance: everyone then gets the full one again. */
const AGREE_KEY = "shroomy-agreed";
const AGREE_VERSION = "1";

const stored = (box: () => Storage): boolean => {
  try { return box().getItem(AGREE_KEY) === AGREE_VERSION; } catch { return false; }
};
const store = (box: () => Storage): void => {
  try { box().setItem(AGREE_KEY, AGREE_VERSION); } catch { /* private window: asked again next time */ }
};

const FULL_HTML = `
  <div class="em-head">
    <h2 id="agree-title">${WARN_ICON} ${S.fullTitle}</h2>
    <div>${S.fullSub}</div>
  </div>
  <div class="em-body">
    <ul>
      ${S.fullList.map((l) => `<li>${l}</li>`).join("\n      ")}
    </ul>
    <div class="agree-foot">
      <p class="agree-numbers">${NUMBERS_LINE}</p>
      <button type="button" class="agree-yes">${S.agree}</button>
      <p class="agree-note">${S.hobby}</p>
    </div>
  </div>`;

const SHORT_HTML = `
  <div class="em-body">
    <h2 id="agree-title" class="agree-short-title">${WARN_ICON} ${S.shortTitle}</h2>
    <p class="agree-short-line">${S.shortLine}</p>
    <button type="button" class="agree-yes">${S.shortOk}</button>
    <p class="agree-note">${NUMBERS_LINE} · <button type="button" class="agree-more">${S.readFull}</button></p>
  </div>`;

/** After a change of language: ask again, with the FULL warning, in the new language (Real, 19 Nov 2026).
 *  Both languages are on the same website address, so this note is read by the page that opens next. */
const AGAIN_KEY = "shroomy-warn-again";
export function askAgainInFull(): void {
  try { sessionStorage.removeItem(AGREE_KEY); sessionStorage.setItem(AGAIN_KEY, "1"); } catch { /* private window */ }
}
const takeAgain = (): boolean => {
  try { const on = sessionStorage.getItem(AGAIN_KEY) === "1"; sessionStorage.removeItem(AGAIN_KEY); return on; } catch { return false; }
};

/** Covers the page until the button is pressed. Nothing is sent. Screenshot robots are not asked. */
export function mountAgree(): void {
  const again = takeAgain();
  if (stored(() => sessionStorage) || (navigator as Navigator & { webdriver?: boolean }).webdriver) return;
  const dlg = document.createElement("dialog");
  dlg.setAttribute("aria-labelledby", "agree-title");
  const draw = (full: boolean) => {
    dlg.className = full ? "emergency agree" : "emergency agree short";
    dlg.innerHTML = full ? FULL_HTML : SHORT_HTML;
    dlg.scrollTop = 0;
    const yes = dlg.querySelector<HTMLButtonElement>(".agree-yes")!;
    yes.addEventListener("click", () => {
      store(() => localStorage);
      store(() => sessionStorage);
      dlg.close();
      dlg.remove();
    });
    dlg.querySelector(".agree-more")?.addEventListener("click", () => draw(true));
    if (!full) yes.focus();                            // Enter or Space is enough on a computer
  };
  document.body.append(dlg);
  dlg.addEventListener("cancel", (e) => e.preventDefault());   // Esc does not skip it
  dlg.showModal();
  draw(again || !stored(() => localStorage));
}
