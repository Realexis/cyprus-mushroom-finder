// Safety banner text and the emergency box. Wording comes from the project brief.

export const SAFETY_LINE =
  "Conditions only. Never eat a wild mushroom based on this map, an app or an AI.";

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
