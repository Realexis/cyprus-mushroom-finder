// Tooltips: short plain-language help on any element with data-tip="…".
// - Mouse: hover for a moment.  - Keyboard: shows on focus.
// - Phone: press and hold (the tap itself is then ignored, so nothing changes by accident).
// One shared bubble. Inside a dialog it moves into the dialog so it stays on top.

const SHOW_DELAY_MS = 350;
const HOLD_MS = 450;

let tip: HTMLDivElement;
let current: HTMLElement | null = null;
let timer = 0;
let holdTimer = 0;
let swallowClick = false;
let fromMap = false;
let keyboard = false;                // was the last input a key press? (focus tips only then)                 // true while the bubble shows a map-hover tip

function ensure() {
  if (tip) return tip;
  tip = document.createElement("div");
  tip.className = "tip";
  tip.id = "tip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.append(tip);
  return tip;
}

function place(x: number, y: number, below: boolean) {
  const t = ensure();
  const r = t.getBoundingClientRect();
  const pad = 8;
  let left = Math.round(x - r.width / 2);
  left = Math.max(pad, Math.min(window.innerWidth - r.width - pad, left));
  let top = below ? y + 12 : y - r.height - 12;
  if (!below && top < pad) top = y + 12;                       // no room above: go below
  if (top + r.height > window.innerHeight - pad) top = Math.max(pad, y - r.height - 12);
  t.style.left = `${left}px`;
  t.style.top = `${Math.round(top)}px`;
  t.style.setProperty("--arrow-x", `${Math.round(x - left)}px`);
  t.classList.toggle("below", top > y);
}

/** Show a tip for an element (above it, or below when there is no room). */
export function showFor(el: HTMLElement) {
  const text = el.dataset.tip;
  if (!text) return;
  const t = ensure();
  const host = el.closest("dialog") ?? document.body;
  if (t.parentElement !== host) host.append(t);
  t.textContent = text;
  t.hidden = false;
  fromMap = false;
  current = el;
  el.setAttribute("aria-describedby", "tip");
  const r = el.getBoundingClientRect();
  place(r.left + r.width / 2, r.top, false);
  t.classList.add("on");
}

/** Show a tip at a screen point (used for hovering the map). */
export function showAt(x: number, y: number, text: string) {
  const t = ensure();
  if (t.parentElement !== document.body) document.body.append(t);
  t.textContent = text;
  t.hidden = false;
  fromMap = true;
  current = null;
  place(x, y, false);
  t.classList.add("on");
}

/** Hide only a map-hover tip (never a button tip that is about to show). */
export function hideMapTip() {
  if (!fromMap || !tip) return;
  fromMap = false;
  tip.classList.remove("on");
  tip.hidden = true;
}

export function hide() {
  fromMap = false;
  window.clearTimeout(timer);
  if (!tip) return;
  tip.classList.remove("on");
  tip.hidden = true;
  current?.removeAttribute("aria-describedby");
  current = null;
}

const target = (e: Event) => (e.target as Element | null)?.closest?.<HTMLElement>("[data-tip]") ?? null;

export function mountTips() {
  ensure();
  // Mouse hover
  document.addEventListener("pointerover", (e) => {
    if ((e as PointerEvent).pointerType === "touch") return;
    const el = target(e);
    if (!el || el === current) return;
    if (el.tagName === "SELECT" && document.activeElement === el) return;   // its menu may be open
    window.clearTimeout(timer);
    timer = window.setTimeout(() => showFor(el), SHOW_DELAY_MS);
  });
  document.addEventListener("pointerout", (e) => {
    const el = target(e);
    if (!el) return;
    const to = (e as PointerEvent).relatedTarget as Node | null;
    if (to && el.contains(to)) return;
    hide();
  });
  // Keyboard focus
  // Menus (select) count as ":focus-visible" even after a mouse click, so we check the
  // last input ourselves: focus tips only for keyboard users. Never over an open menu.
  document.addEventListener("keydown", (e) => { if (e.key === "Tab" || e.key.startsWith("Arrow")) keyboard = true; }, true);
  document.addEventListener("pointerdown", () => { keyboard = false; }, true);
  document.addEventListener("focusin", (e) => {
    const el = target(e);
    if (el && keyboard && el.tagName !== "SELECT") showFor(el); else hide();
  });
  document.addEventListener("change", () => hide(), true);
  document.addEventListener("focusout", () => hide());
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
  // Phone: press and hold
  document.addEventListener("pointerdown", (e) => {
    if ((e as PointerEvent).pointerType !== "touch") { hide(); return; }
    const el = target(e);
    hide();
    if (!el) return;
    window.clearTimeout(holdTimer);
    holdTimer = window.setTimeout(() => { showFor(el); swallowClick = true; }, HOLD_MS);
  });
  const cancelHold = () => window.clearTimeout(holdTimer);
  document.addEventListener("pointerup", cancelHold);
  document.addEventListener("pointercancel", cancelHold);
  document.addEventListener("click", (e) => {
    if (!swallowClick) return;
    swallowClick = false;
    e.preventDefault(); e.stopPropagation();
  }, true);
  document.addEventListener("contextmenu", (e) => { if (target(e)) e.preventDefault(); });
  window.addEventListener("scroll", hide, true);
  window.addEventListener("resize", hide);
}
