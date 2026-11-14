// The design switcher (look-and-feel exploration, branch lab-design).
// Pick a design with ?design=<id> in the web address, or with the picker bar on the page.
// The choice is remembered on the phone, so the About page keeps it.
// ?picker=0 hides the bar (for screenshots).
import "./shared.css";
import "./picker.css";
import type { Design } from "./types";

const found = import.meta.glob<{ default: Design }>("./*/design.ts", { eager: true });
import.meta.glob("./*/design.css", { eager: true });      // every design's styles, each scoped to its own id

export const DESIGNS: Design[] = Object.values(found).map((m) => m.default).sort((a, b) => a.order - b.order);

const KEY = "shroomy-design";
function remembered(): string | null { try { return localStorage.getItem(KEY); } catch { return null; } }
function remember(id: string) { try { localStorage.setItem(KEY, id); } catch { /* private window */ } }

function choose(): Design {
  const q = new URLSearchParams(location.search).get("design");
  const byId = (id: string | null) => DESIGNS.find((d) => d.id === id);
  const d = byId(q) ?? byId(remembered()) ?? DESIGNS[0];
  if (q && byId(q)) remember(d.id);
  return d;
}

export const activeDesign: Design = choose();
document.documentElement.dataset.design = activeDesign.id;

function go(id: string) {
  remember(id);
  const u = new URL(location.href);
  u.searchParams.set("design", id);
  location.href = u.href;
}

/** The bar on top of the page: previous, a list of all designs, next. Only in this exploration build. */
export function mountPicker() {
  if (import.meta.env.VITE_DESIGN_PICKER === "off" || new URLSearchParams(location.search).get("picker") === "0") return;
  const i = DESIGNS.indexOf(activeDesign), n = DESIGNS.length;
  const bar = document.createElement("div");
  bar.className = "dz-bar";
  bar.innerHTML = `
    <button type="button" data-go="${DESIGNS[(i + n - 1) % n].id}" aria-label="Previous design">‹</button>
    <label><span>Design ${i} of ${n - 1}</span>
      <select aria-label="Choose a design">${DESIGNS.map((d) =>
        `<option value="${d.id}"${d === activeDesign ? " selected" : ""}>${d.order}. ${d.name}</option>`).join("")}</select></label>
    <button type="button" data-go="${DESIGNS[(i + 1) % n].id}" aria-label="Next design">›</button>`;
  bar.title = activeDesign.idea;
  bar.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-go]");
    if (b) go(b.dataset.go!);
  });
  bar.querySelector("select")!.addEventListener("change", (e) => go((e.target as HTMLSelectElement).value));
  document.body.prepend(bar);
  document.documentElement.classList.add("has-picker");
}
