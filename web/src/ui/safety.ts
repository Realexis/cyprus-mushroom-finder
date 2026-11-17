// Safety banner text and the emergency box. Wording comes from the project brief.

export const SAFETY_LINE =
  "Conditions only. Never eat a wild mushroom based on this map, an app or an AI.";

/** The emergency numbers, as tap-to-call links (shown on every screen). */
export const NUMBERS_LINE =
  `Poisoning: call <a href="tel:112">112</a> · Poison Centre <a href="tel:1401">1401</a>`;

export const WARN_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
  <path fill="currentColor" d="M12 2 1 21h22L12 2Zm0 6c.6 0 1 .4 1 1v5a1 1 0 1 1-2 0V9c0-.6.4-1 1-1Zm0 11.2a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z"/></svg>`;

export function emergencyHTML(): string {
  return `
  <div class="em-head" id="em-title">
    <h2>Mushroom poisoning?</h2>
    <div>Act now. Do not wait for symptoms.</div>
  </div>
  <div class="em-body">
    <a class="call" href="tel:112">
      <span>Call 112<small>Ambulance</small></span><span aria-hidden="true">📞</span>
    </a>
    <a class="call secondary" href="tel:1401">
      <span>Cyprus Poison Centre: 1401</span><span aria-hidden="true">📞</span>
    </a>
    <ul>
      <li><b>Do not wait for symptoms.</b> Death cap poisons show no symptoms for <b>6–12 hours</b>.
          Some Cyprus species act after about <b>48 hours</b>.</li>
      <li><b>Bring the mushroom</b> (or what is left of it) to the hospital.</li>
      <li><b>Cooking does not remove the poison.</b></li>
    </ul>
    <form method="dialog"><button class="em-close">Close</button></form>
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
    <h2 id="agree-title">${WARN_ICON} This is not a game</h2>
    <div>Some wild mushrooms in Cyprus can kill. They can look just like others.</div>
  </div>
  <div class="em-body">
    <ul>
      <li><b>Never eat a mushroom based on pictures or guesses.</b> Not from this site, an app or an AI.</li>
      <li><b>Always have an experienced person check it,</b> in person. Trust them before any screen.</li>
      <li><b>Learn first. Do not just go and guess.</b> Go out with people who know mushrooms.</li>
      <li><b>Good conditions grow deadly mushrooms too.</b> A high score says nothing about what a mushroom is. This site is not enough to decide.</li>
    </ul>
    <div class="agree-foot">
      <p class="agree-numbers">${NUMBERS_LINE}</p>
      <button type="button" class="agree-yes">I understand and agree</button>
      <p class="agree-note">Shroomy is a hobby project in beta. It can be wrong.</p>
    </div>
  </div>`;

const SHORT_HTML = `
  <div class="em-body">
    <h2 id="agree-title" class="agree-short-title">${WARN_ICON} Not a game</h2>
    <p class="agree-short-line"><b>Never eat a mushroom based on pictures or guesses.</b>
      Always have an experienced person check it.</p>
    <button type="button" class="agree-yes">OK, I agree</button>
    <p class="agree-note">${NUMBERS_LINE} · <button type="button" class="agree-more">Read the full warning</button></p>
  </div>`;

/** Covers the page until the button is pressed. Nothing is sent. Screenshot robots are not asked. */
export function mountAgree(): void {
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
  draw(!stored(() => localStorage));
}
