import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "./styles/app.css";
import { mountEmergency } from "./ui/safety";
import { applyTheme, systemTheme } from "./ui/theme";
import { esc, fmtDay, type Meta } from "./ui/card";

applyTheme(systemTheme());
mountEmergency([...document.querySelectorAll<HTMLElement>("[data-emergency]")]);

// Shroomy Lite has no species photos or public records, so those two credits are left out.
const NOT_USED = /iNaturalist|GBIF/;

fetch(new URL("data/meta.json", document.baseURI), { cache: "no-cache" })
  .then((r) => r.json() as Promise<Meta>)
  .then((m) => {
    document.getElementById("run")!.textContent = fmtDay(m.weather_run, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    document.getElementById("credits")!.innerHTML = m.credits.filter((c) => !NOT_USED.test(c.name)).map((c) => `
      <div class="card">
        <p><b>${esc(c.name)}</b></p>
        <p>${esc(c.credit)}</p>
        <p class="tag">${esc(c.licence)}${c.status === "verified" ? "" : " · licence being checked"}</p>
        ${c.use ? `<p class="tag">${esc(c.use)}</p>` : ""}
      </div>`).join("") + `
      <div class="card"><p><b>Protomaps basemap</b></p><p>Map tiles from the Protomaps build of OpenStreetMap. © OpenStreetMap contributors (ODbL).</p></div>`;
  });
