# Cyprus Mushroom Finder

A map of Cyprus showing where **growing conditions** are right for wild mushrooms.

> **Conditions only. Never eat a wild mushroom based on this map, an app or an AI.**
> Emergency: **112** · Cyprus Poison Centre: **1401**

**Live site:** https://realexis.github.io/cyprus-mushroom-finder/
**For Claude:** https://realexis.github.io/cyprus-mushroom-finder/data/summary.json
**Preview of the `dev` branch (test version, data frozen, no daily update):** https://realexis.github.io/cyprus-mushroom-finder-preview/
Update it with `DEPLOY_REMOTE=https://github.com/Realexis/cyprus-mushroom-finder-preview.git ./scripts/deploy-pages.sh`.

## How it updates

GitHub Actions runs `.github/workflows/daily.yml` every day at **04:00 UTC** (06:00 Cyprus winter time):
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
Private 50 m hotspot zoom: built by `shroomy.export.web` on your Mac (never in the public site).

## Where things are
- `config/` — every weight, threshold, source and credit
- `pipeline/` — Python data pipeline
- `web/` — the website (Vite + TypeScript + MapLibre)
- `docs/TODO-facts.md` — facts still to confirm
- `PLAN.md` — the phase plan
