# Project state — Cyprus Mushroom Finder (branch `ux-v2`, 2026-11-12)

The site shows **growing conditions** for wild mushrooms in Cyprus forests.
Never "mushrooms are here", never anything about eating.

## Where things live

| What | Where |
|---|---|
| **Live site** | https://realexis.github.io/cyprus-mushroom-finder/ (`gh-pages` of repo `cyprus-mushroom-finder`). Rebuilt **daily at 04:00 UTC from `main`** by `.github/workflows/daily.yml`. Shows **Phase 4** plus the map-loading fix (`e1124f6`). |
| **Test copy ("preview")** | https://realexis.github.io/cyprus-mushroom-finder-preview/ (separate repo). Built by hand from `dev` with `DEPLOY_REMOTE=…-preview.git ./scripts/deploy-pages.sh`. Data **frozen at the 2026-11-12 run**. |
| **This branch** | `ux-v2`, cut from `dev` (Phase 5 + extras). Local preview: `ux-v2-web` on port 5205. |
| Settings, weights, facts | `config/*.yaml` (`scoring.yaml` has every weight and threshold, tagged `[BRIEF]` / `[DRAFT]`) |
| Open questions | `docs/TODO-facts.md` (never guessed: tagged drafts) |

## Data: real, not sample
- **Weather:** Open-Meteo (ECMWF IFS ~9 km), ~1,159 points over the island. 30 past days + 8 forecast days. Free tier, budget-guarded (~10,000 calls/day).
- **Fixed layers:** Copernicus DEM 30 m, Copernicus forest type 10 m, nature reserves (EEA), geology (golden-oak zone), OpenStreetMap (via the Protomaps basemap).
- The **data layer is already separate**: the Python pipeline writes static files; the website only reads them.
  - Daily files → `web/public/data/` (gitignored): `cells.pmtiles` (250 m squares), `cells_info.bin` (per-square details), `cells_road.bin` (drive-there points), `hexes.geojson` + `spots.json` (~2 km zones), `rain.geojson`, `reserves.geojson`, `hotspot_zones.json` (top-zone outlines), `meta.json`, `summary.json` (for Claude/planner).
  - Fixed files → `web/public/tiles/` (gitignored): `basemap.pmtiles`, `terrain.pmtiles`, `shade50.pmtiles` (island-wide 50 m shade).
  - Pipeline caches → `data/` (gitignored, private).

## How the score is built (pipeline, Python 3.12 via `uv`)
1. **Habitat (250 m, once):** forest type + altitude + geology → likely tree; shade (north/east slopes, valleys, autumn sun incl. ridge shadows); reserves closed.
2. **Daily score per 250 m forest square:** rain 30 d **20%**, soaking-rain pulse 7–20 d ago **15%**, 7-day temperature **25%**, soil moisture vs normal **15%**, season × altitude **15%**, shade **10%**. × habitat filter (partner trees only; "Other broadleaf" only for morels, user decision S7). Reserves = 0.
3. **8 days** (today + 7 forecast), confidence high (0–2) / medium (3–4) / low (5+).
4. **Mushroom clock:** days since the last soaking rain (≥ 20 mm); window opens +7 d, closes +20 d.
5. **Species filters** (6 species) change only trees, altitude and season months.
6. Export → files above. `npm run build` checks banned wording (`web/scripts/check-words.mjs`).

Run: `cd pipeline && uv run python -m shroomy.export.web` (no weather calls) · `uv run pytest` (73 tests).

## Website (Vite + TypeScript + MapLibre 6 + PMTiles)
- `web/src/main.ts` — start-up, map, clicks, loading message, 3D button.
- `web/src/map/layers.ts` — all map layers (squares, zones, shade, rain, reserves, 3D). `files.ts` — published map files are renamed `*.pmtiles.zip` (GitHub Pages compression bug).
- `web/src/ui/controls.ts` — side panel / phone bottom sheet: days, species picker, layer switch, rain replay, legend.
- `web/src/ui/spot.ts` — zone/square detail panel (score, clock, "Why this score", 8-day chart, species ranked, Drive there).
- `web/src/ui/species.ts` — species explorer (lookalikes first). `guide.ts` — 3-step intro. `tips.ts` — tooltips. `safety.ts` — banner + emergency box.
- `web/src/simple/` + `web/simple.html` — separate "simple" prototype (dev only, **uncommitted edits left in place on purpose**).

## Broken or unfinished
- **Live site is behind:** `main` = Phase 4. Merging `dev`/`ux-v2` into `main` needs: `shade50.pmtiles` uploaded to the `static-v1` release, a small conflict in `web/src/main.ts` + `web/package.json` (the live fix `e1124f6`), and a check that GDAL-made tiles + roads work on the Linux robot (not yet verified there).
- **Preview data is frozen** (12 Nov) → it shows "Data delayed" from the next day.
- **Facts to confirm** (Cyprus Mycological Association): researched species field notes (F1–F4), lookalike pairing (L1–L3), local names, Russula delica + broadleaf (S9), more species (S11). See `docs/TODO-facts.md`.
- Species scores tie when species share a habitat (S10: no species-specific weather rules in the brief).
- Size: square details file ~8 MB (loads on first tap); main JS ~1.2 MB.
- Phase 6 (finds log, Supabase) and Phase 7 (planner, briefing, learning) not started.
