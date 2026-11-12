# Facts we still need

These values are **not in the brief**. The code runs with a **[DRAFT]** placeholder
(see `config/scoring.yaml`). Nothing here is presented to users as fact.

## Habitat (Phase 1)
| # | What | Draft value now | Where |
|---|---|---|---|
| H1 | Share of a 250 m cell that must be forest | 25% | `habitat.forest_min_fraction` |
| H2 | **Mid / low altitude boundary** | 600 m | `habitat.altitude_bands.mid_min_m` |
| H3 | Does **serpentinite** count as "Troodos igneous rock" for golden oak? | yes | `habitat.trees.troodos_igneous_units` |
| H4 | Share of a cell that must be igneous rock | 50% | `habitat.trees.igneous_min_fraction` |
| H5 | **Shade recipe**: weights of slope facing / valley / low sun | equal thirds | `habitat.shade.weights` |
| H6 | Valley index radius and depth for full effect | 500 m, 30 m | `habitat.shade.valley_*` |
| H7 | Autumn sun date used for hillshade | 31 Oct, 08-16 h | `habitat.shade.autumn_sun_*` |

## Score (Phase 2+)
| # | What | Draft value now |
|---|---|---|
| S1 | Frost penalty size | -0.1 per frost day |
| S2 | Soil moisture percentile mapping | 0 at p20 -> 1 at p80 |
| S3 | **Season x altitude table** as numbers | drafted from the brief's words |
| S4 | Mushroom clock shift for high/cool cells | 0 days |
| S5 | Russula delica "warm spells" rule | none yet |
| S6 | Soaking event must end on a wet day (≥ 1 mm) | 1 mm (standard wet-day definition) |
| S7 | ~~Should "Other broadleaf" count as habitat in the general map?~~ | **Answered 2026-11-12: no, except for morels.** `score.general_map_trees: [1, 2, 3]` |
| S8 | Soil "normal" uses only ONE season (Oct 2025-Jan 2026) | add 2 more seasons, one per day |
| S9 | *Russula delica* is "all forest" in the brief. Should "Other broadleaf" count for it? (S7 answer kept it out) | not counted |

## Species and lookalikes (Phase 5)
| # | What | Draft value now | Where |
|---|---|---|---|
| L1 | **Which lookalikes go with which species** (the brief lists 10, no pairing) | every card shows all 10 | `config/lookalikes.yaml` |
| L2 | Severity "deadly" for *Amanita verna* and *A. virosa* (brief only says "deadly/toxic") | deadly (general mycology references) | `config/lookalikes.yaml` |
| L3 | Taxon for the 'pink "sickener" Russula' | *Russula emetica* | `config/lookalikes.yaml` |
| L4 | Morels = deciduous trees. Golden oak is evergreen, so only "Other broadleaf" counts; that class mixes deciduous and evergreen trees | Other broadleaf, mid + high | `config/species.yaml` |
| D8 | Kermes oak map (brief: red pine mushroom also with kermes oak) | not mapped, not counted | `config/species.yaml` |
| P1 | 50 m hotspot zoom: **private only** for now (finer than the public ~2 km rule). Make public? | private | `pipeline/shroomy/export/hotspots.py` |

## Data and legal
| # | What | Status |
|---|---|---|
| D1 | **Geology licence** (Geological Survey Dept. via DLS INSPIRE) | unknown. Used internally only. Ask INSPIRE@dls.moi.gov.cy |
| D2 | Natura 2000 licence record | expected CC BY 4.0, record not read yet |
| D3 | **Areas not under Republic control** (north): picking rules, reserves | no data. Forest is mapped; legal notes do not apply there |
| D4 | British Sovereign Base Areas: picking rules | unknown |
| D5 | Burned ground source for morels | not chosen |
| D6 | Rare species list for the public view | not given |
| D7 | Local Greek names (except kokkinomanitaro) | "to confirm with the Cyprus Mycological Association" |
