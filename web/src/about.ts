import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "./styles/app.css";
import { mountEmergency } from "./ui/safety";
import { applyTheme, systemTheme } from "./ui/theme";
import { esc, fmtDay, type Meta } from "./ui/card";
import { LOOKALIKES, SPECIES } from "./ui/species";
import { activeDesign, mountPicker } from "./designs";

applyTheme(activeDesign.theme ?? systemTheme());
mountPicker();
mountEmergency([...document.querySelectorAll<HTMLElement>("[data-emergency]")]);

fetch(new URL("data/meta.json", document.baseURI), { cache: "no-cache" })
  .then((r) => r.json() as Promise<Meta>)
  .then((m) => {
    document.getElementById("run")!.textContent = fmtDay(m.weather_run, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    document.getElementById("credits")!.innerHTML = m.credits.map((c) => `
      <div class="card">
        <p><b>${esc(c.name)}</b></p>
        <p>${esc(c.credit)}</p>
        <p class="tag">${esc(c.licence)}${c.status === "verified" ? "" : " · licence being checked"}</p>
        ${c.use ? `<p class="tag">${esc(c.use)}</p>` : ""}
      </div>`).join("") + `
      <div class="card"><p><b>Protomaps basemap</b></p><p>Map tiles from the Protomaps build of OpenStreetMap. © OpenStreetMap contributors (ODbL).</p></div>`;
  });

// Every photo credit on the mushroom cards, grouped by species (species first, then lookalikes).
const photoList = [...SPECIES.map((s) => ({ name: s.latin, photos: s.photos })),
  ...LOOKALIKES.map((l) => ({ name: l.latin, photos: l.photos }))];
document.getElementById("photo-credits")!.innerHTML = photoList.map((g) => g.photos.map((p) => `
  <li><i>${esc(p.taxon ?? g.name)}</i>: <a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.attribution)}</a></li>`).join("")).join("");
