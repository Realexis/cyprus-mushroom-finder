# Cyprus Mushroom Finder

> **Branch `lite`: Shroomy Lite.** A simplified, phone-first copy of V5 for the Mushroom Hunters Cyprus
> group: today only, double tap to zoom to the 250 m squares, tap a square for its card, rain replay,
> full map (`?full=1`). Same scores as V5 (the pipeline is unchanged).
> Preview: https://realexis.github.io/cyprus-mushroom-finder-preview/lite/ (data frozen, no daily update).

A map of Cyprus showing where **growing conditions** are right for wild mushrooms.

> **Conditions only. Never eat a wild mushroom based on this map, an app or an AI.**
> Emergency: **112** · Cyprus Poison Centre: **1401**

**Live site:** https://realexis.github.io/cyprus-mushroom-finder/
**For Claude:** https://realexis.github.io/cyprus-mushroom-finder/data/summary.json
**Preview of the `dev` branch (test version, data frozen, no daily update):** https://realexis.github.io/cyprus-mushroom-finder-preview/
Update it with `DEPLOY_REMOTE=https://github.com/Realexis/cyprus-mushroom-finder-preview.git ./scripts/deploy-pages.sh`.

## How it updates

GitHub Actions runs `.github/workflows/daily.yml` every day at **04:17 UTC** (06:17 Cyprus winter time):
fetch weather → score today + 7 days → export public data → deploy.
Run it by hand from the repo's **Actions** tab → *Daily conditions update* → *Run workflow*.

Fixed inputs live in the `static-v1` release. The habitat layer is **encrypted**
(private 250 m detail); the key is the `STATIC_KEY` repo secret.

## Run it on your Mac

Needs Homebrew `gdal`, `uv`, `tippecanoe`, `pmtiles`.

```bash
cd pipeline
uv run python -m shroomy.daily            # weather + scores + public AND private (250 m) data
uv run pytest                             # tests
cd ../web && npm run dev                  # site with the private view at http://localhost:5173
```

One-off builds (already done): `shroomy.habitat.fetch`, `shroomy.habitat.build`,
`shroomy.weather.fetch --clim`, `shroomy.export.terrain`.

Species cards: `uv run python -m shroomy.export.species` rebuilds `web/src/generated/species.json`
from `config/species.yaml` + `config/lookalikes.yaml` + iNaturalist photos (licence-checked, cached).
Public data includes the 250 m forest squares (`cells.pmtiles` + details), made daily (the robot uses GDAL,
no tippecanoe needed). The 50 m shade is a fixed island-wide file built once:
`uv run python -m shroomy.export.shade50` → `web/public/tiles/shade50.pmtiles` (goes in the `static-v1` release).

## Shared download shelf (Mac only)

All project copies on this Mac share one shelf of raw downloads and ONE Open-Meteo call counter:
`../shroomy-shared/` (or `$SHROOMY_SHELF`). Every reply is labelled by its exact request, so a
copy never downloads what another already has. `uv run python -m shroomy.shelf_seed` fills it
from the copies' saved files (no downloads); `--status` reports it. The GitHub robot has no
shelf and works as before.

## Where things are
- `config/` — every weight, threshold, source and credit
- `pipeline/` — Python data pipeline
- `web/` — the website (Vite + TypeScript + MapLibre)
- `docs/TODO-facts.md` — facts still to confirm
- `PLAN.md` — the phase plan
