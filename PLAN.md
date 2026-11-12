# Cyprus Mushroom Finder — Phase 0 Plan

**Status:** Phase 4 done (daily robot at 04:00 UTC). Live: https://realexis.github.io/cyprus-mushroom-finder/ · Code: https://github.com/Realexis/cyprus-mushroom-finder. Waiting for "next phase".
**Rule zero:** the site shows **growing conditions only**. Never edibility.

---

## 1. The big picture

**Two halves.**
- **Pipeline** (Python): downloads data, builds the habitat map, scores every forest cell, writes map tiles + `summary.json`.
- **Website** (Vite + TypeScript + MapLibre): a static site that reads those files. No map server.

**Daily loop:** GitHub Actions runs the pipeline at 04:00 UTC, then deploys the new files.

---

## 2. Folder structure

```
shroomy/
  PLAN.md                  this file
  README.md                how to run everything
  config/
    scoring.yaml           ALL weights + thresholds (you tune here)
    species.yaml           6 target species, trees, altitude, season
    lookalikes.yaml        deadly/toxic lookalikes per species
    sources.yaml           every data URL, licence, credit line
  pipeline/                Python
    shroomy/
      habitat/             DEM, slope, aspect, hillshade, valley index, forest, trees, reserves
      weather/             Open-Meteo fetch, rolling history, 250 m downscale + lapse rate
      score/               factor functions, score, forecast, confidence, mushroom clock
      export/              PMTiles, public hexagons, summary.json, Friday briefing
      learn/               trip features, logistic regression, honest 80/20 test
    tests/                 tests for every scoring function
  web/                     the website
    src/
      map/                 MapLibre, layers, 3D terrain, rain replay
      ui/                  safety banner, emergency box, day slider, spot panel,
                           species cards, planner, about page
      styles/              design tokens: dark forest-green + light theme
  data/                    big downloads + cache (NOT in git)
  briefings/               weekly Friday text files
  docs/
    TODO-facts.md          every fact we still need (never guessed)
  .github/workflows/       daily.yml, friday.yml
```

---

## 3. Tech choices (and why)

| Part | Choice | Why |
|---|---|---|
| **Pipeline language** | Python 3.12 (via `uv`) | Best tools for maps + science. Your Mac has 3.9, too old. |
| **Raster maths** | GDAL, rasterio, numpy, scipy | Industry standard for DEM work. |
| **Score map tiles** | Vector PMTiles (tippecanoe) | Each 250 m forest cell holds a score per day. The day slider just recolours, so it is instant. Click a cell and its data is already there. |
| **Public view** | H3 hexagons, resolution 7 (~2 km) | Standard hexagon grid. Hides exact spots by design. |
| **3D terrain** | Copernicus DEM → terrain PMTiles | Hillshade + 3D with no server. |
| **Background map** | Cyprus cut from the Protomaps OSM build, our own style | Free, no key, and we design a unique calm look (not a stock Google-style map). |
| **Website** | Vite + TypeScript + MapLibre GL JS + pmtiles plugin | As you asked. Plain TypeScript, no heavy framework, fast on a phone. |
| **Hosting** | GitHub Pages | Free. Handles larger files than Cloudflare Pages' 25 MB file limit. |
| **Private data** | Supabase (Phase 6) | Login, finds, photos, and the private 250 m tiles in a locked bucket. |
| **Automation** | GitHub Actions | Free for public repos. |

### Private vs public (important)

- A static site is **readable by anyone**. So the public site will **only ever hold the ~2 km hexagons**.
- The **250 m private tiles** and **all finds** go to Supabase behind login (Phase 6).
- Until Phase 6, you see the private 250 m view **on your Mac only**.

---

## 4. Accounts and keys

**No key needed:** Open-Meteo, Copernicus DEM (AWS), OpenStreetMap / Geofabrik, Natura 2000 (EEA), iNaturalist, GBIF, Protomaps build.

| Account | When | Cost | Note |
|---|---|---|---|
| **GitHub** | Phase 3 | Free | Repo must be **public** for free Pages. Code only, never finds. |
| ~~EU Login~~ | — | — | **Not needed.** Forest type comes from the public EEA image service. |
| **Supabase** | Phase 6 | Free tier | I believe free projects pause after ~1 week unused. I will verify before Phase 6. |
| Domain name | Optional | ~EUR 10/year | Only if you want one. Not needed. |

**Cost warnings:**
- Open-Meteo free = **non-commercial only**. Ads or selling access would need their paid plan.
- I will tell you **before** anything costs money.

---

## 5. Your Mac

- **Disk is 94% full (13 GB free).** GDAL + data for Phase 1 needs a few GB. Tight but OK. Big caches stay small (Cyprus is a small island).
- **To install in Phase 1** (via Homebrew): `uv`, `gdal`, `tippecanoe`, `pmtiles`, `gh` (GitHub tool).

---

## 6. Staying under Open-Meteo limits

- I believe Open-Meteo counts **each location as a call**, and long date ranges count extra. 1,000 points x 92 days every day could get near the 10,000/day limit. **I will verify this in Phase 2.**
- **Plan:** fetch only a short window each day and keep **our own rolling history** of the last 30+ days.
- **Soil moisture percentile** needs past years. One-time backfill from the Open-Meteo historical API, **spread over several days** to stay polite.
- Cache everything. If a fetch fails, reuse yesterday and show **"data delayed"**.

---

## 7. Facts we still need (TODO — I will not guess these)

These go in `docs/TODO-facts.md`. Scoring runs with clearly marked draft values until you confirm.

1. **Geology map** for "Troodos igneous rock" (golden oak zone). No source given. I will search for an official Cyprus Geological Survey layer.
2. **Nature reserve boundaries.** Will try Cyprus INSPIRE GeoPortal. If missing: marked TODO + placeholder layer, and I tell you.
3. **Burned ground** for morels. No source given. Possible option: a satellite burnt-area product. Needs your OK.
4. **Season x altitude table** as numbers 0-1. You gave it in words; I will draft numbers marked "draft, please check".
5. **Shade score recipe** (how aspect, valley index and hillshade combine). Draft, marked TODO.
6. **Frost penalty size.** Not given.
7. **Mushroom clock "earlier for high/cool cells"**: how many days earlier. Not given.
8. **Russula delica "warm spells"**: no number given.
9. **Rare species list** to hide in the public view.
10. **Drive time** for the Saturday planner: needs routing. Plan: compute drive times offline from OSM roads (free). Phase 7.
11. **Local Greek names** (except kokkinomanitaro): marked "to confirm with the Cyprus Mycological Association".

---

## 8. Safety built in from day one

- Safety banner on every screen. Emergency box (112, Poison Centre 1401) one tap away.
- "No rakes. Pick by hand or knife. Put the leaf litter back." on the map.
- Reserves = grey, hatched, **CLOSED**, score 0.
- Wording rules checked by a **test**: the build fails if words like "edible", "safe to eat" or "good to eat" appear next to a find, photo or map spot.
- Lookalikes shown **first** on every species card. Photos from logs are always **"unconfirmed"**.

---

## 9. Phases

0. **Plan** ✓
1. Habitat layer + static preview map ✓ (see `previews/`)
2. Weather + v1 score for today + first heatmap ✓
3. Website v1 + deploy ✓
4. Daily automation + 7-day forecast + confidence + mushroom clock ✓
5. Spot panel, 3D, rain replay, species filter + cards
6. Private finds log, public/private views, village memory
7. Saturday planner, Friday briefing, learning pipeline, polish
