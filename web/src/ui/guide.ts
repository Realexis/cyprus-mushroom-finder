// First-visit guide: three short steps. Shown once (remembered in this browser),
// and again any time from the "How to use" button.
import { SAFETY_LINE, WARN_ICON } from "./safety";

const KEY = "cmf-guide-seen";

const seen = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };
const remember = () => { try { localStorage.setItem(KEY, "1"); } catch { /* storage blocked: fine */ } };

export function mountGuide(): { open: () => void; openIfFirstVisit: () => void } {
  const dlg = document.createElement("dialog");
  dlg.className = "guide-dlg";
  dlg.setAttribute("aria-labelledby", "guide-h");
  dlg.innerHTML = `
    <div class="guide-body">
      <h2 id="guide-h">How to use the map</h2>
      <ol class="steps">
        <li><span class="step-n" aria-hidden="true">1</span>
          <div><b>Pick a day.</b> Today, or up to 7 days ahead. Later days are less certain.</div></li>
        <li><span class="step-n" aria-hidden="true">2</span>
          <div><b>Tap a forest zone.</b> Orange-red = very good growing conditions. Dark green = poor.</div></li>
        <li><span class="step-n" aria-hidden="true">3</span>
          <div><b>Read "Why this score".</b> Rain, temperature, soil, season and shade, each as a bar.</div></li>
      </ol>
      <p class="guide-tip"><b>Not sure what a button does?</b> Hover over it, or press and hold it on a phone.</p>
      <p class="guide-tip"><b>Species cards</b> show the deadly lookalikes first.</p>
      <div class="sp-safety">${WARN_ICON}<span>${SAFETY_LINE}</span></div>
      <form method="dialog"><button class="primary-btn guide-ok" type="submit">Got it, show me the map</button></form>
    </div>`;
  document.body.append(dlg);
  dlg.addEventListener("close", remember);
  const open = () => { if (!dlg.open) dlg.showModal(); };
  return { open, openIfFirstVisit: () => { if (!seen()) open(); } };
}
