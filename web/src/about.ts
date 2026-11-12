import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "./styles/app.css";
import { mountEmergency } from "./ui/safety";
import { applyTheme, currentTheme } from "./ui/theme";

interface Credit { name: string; credit: string; licence: string; status: string; use: string; }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

applyTheme(currentTheme());
mountEmergency([...document.querySelectorAll<HTMLElement>("[data-emergency]")]);

fetch(new URL("data/meta.json", document.baseURI), { cache: "no-cache" })
  .then((r) => r.json())
  .then((m: { credits: Credit[]; weather_run: string; model: string }) => {
    document.getElementById("run")!.textContent = `${m.weather_run} · model ${m.model}`;
    document.getElementById("credits")!.innerHTML = m.credits.map((c) => `
      <div class="card">
        <h3>${esc(c.name)}</h3>
        <p>${esc(c.credit)}</p>
        <p><span class="tag ${c.status === "verified" ? "" : "warn"}">${esc(c.licence)}${c.status === "verified" ? "" : " · licence being checked"}</span></p>
        ${c.use ? `<p>${esc(c.use)}</p>` : ""}
      </div>`).join("") + `
      <div class="card"><h3>Protomaps basemap</h3><p>Map tiles from the Protomaps build of OpenStreetMap. © OpenStreetMap contributors (ODbL).</p></div>`;
  });
