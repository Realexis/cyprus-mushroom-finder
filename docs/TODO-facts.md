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
| S8 | Soil "normal" uses TWO seasons now (2024-25, 2025-26; all 139 points, 246 days each), both dry. 2023-24 still to add (~1,200 calls) | 2 seasons |
| S9 | *Russula delica* is "all forest" in the brief. Should "Other broadleaf" count for it? (S7 answer kept it out) | not counted |

## New guesses from the V3 Fable feedback (2026-11-13)
Each is tagged `[GUESS]` in `config/*.yaml`. No source gives a number. Source tags: `docs/SOURCES.md`.

| # | What | Guess now | Where |
|---|---|---|---|
| G1 | Water gate below 20 mm: a straight line (10 mm = half the score) | straight line | `scoring.yaml` `score.water_gate` |
| G2 | Fade of old rain in the gate: full until 20 days old, straight down to 0 at 30 days | 20 → 30 days | `scoring.yaml` `water_gate.full_until_days` |
| G3 | The fruiting window closes 20 days after the **latest** soaking rain (with one rain, the first window is open only days 18-20) | 20 days | `scoring.yaml` `mushroom_clock` |
| G4 | Season floor: no month September-April below 0.5 (the 0.5 itself) | 0.5 | `scoring.yaml` `season_altitude` |
| G5 | Burned forest: the cut at more than 50 % burned, for **partner-tree** species (LAR16 gives 50 % for morels only) | 50 % | `scoring.yaml` `habitat.burned` |
| G6 | Burned forest **never comes back** as partner-tree habitat on this map (no regrowth rule) | never | `pipeline/shroomy/habitat/burns.py` |
| G7 | The clock's rain memory starts on the first day of saved history (12 Oct 2026), not 1 September, until the history reaches back | from 12 Oct | `pipeline/shroomy/export/web.py` `clock_grid` |
| G8 | **Morel filter** covers nearly all forest (Calabrian pine, golden oak, other broadleaf, recent burns, all altitudes). Fable suggests keeping only recent burns + other broadleaf. Real, 2026-11-13: no clear view yet, so unchanged. V5: the morel card now says it covers 94% of forest squares (when, not where) | unchanged, said on the card | `config/species.yaml` (morels) |
| G9 | ~~**EFFIS fire-map licence** not yet checked~~ **Checked 2026-11-13 (V5): CC BY 4.0**, credit + changes stated (`config/sources.yaml` `burned_areas`) | kept | `config/sources.yaml` |

## Shroomy Lab only (14 Nov 2026)
| # | What | Guess now | Where |
|---|---|---|---|
| LAB1 | **50 m heat map**: how much a patch's own shade moves its square's score. Patch score = square score x (1 + strength x (patch shade - square shade) / 100). No source gives a number; no find locations to tune it on | strength 1.0. Public sightings fit 1.16 best (95% range 0.18 to 2.34, 173 patches): `docs/LAB-heat50-strength.md`. Needs real find locations to narrow | `config/lab.yaml`, `scripts/lab-heat50.py`, `web/src/map/heat50.ts` |

## Species and lookalikes (Phase 5)
| # | What | Draft value now | Where |
|---|---|---|---|
| L1 | **Which lookalikes go with which species** (the brief lists 10, no pairing) | every card shows all 10 | `config/lookalikes.yaml` |
| L2 | Severity "deadly" for *Amanita verna* and *A. virosa* (brief only says "deadly/toxic") | deadly (general mycology references) | `config/lookalikes.yaml` |
| L3 | Taxon for the 'pink "sickener" Russula' | *Russula emetica* | `config/lookalikes.yaml` |
| L4 | Morels = deciduous trees. Golden oak is evergreen, so only "Other broadleaf" counts; that class mixes deciduous and evergreen trees | Other broadleaf, mid + high | `config/species.yaml` |
| F1 | **Species field notes** ("What to look for", "Where to look", "Leave it alone if") were researched from public sources on 2026-11-12 (Cyprus Dept. of Forests, KYKPEE, Wikipedia, First Nature…). User chose to show them, labelled "not checked by an expert". **Have every line checked by the Cyprus Mycological Association** | shown, labelled | `web/src/ui/species.ts` (FIELD) |
| F2 | Woolly milk cap (*Lactarius torminosus*, poisonous, grows in Cyprus per sources) is not in the 10-lookalike list | add to `config/lookalikes.yaml`? | `config/lookalikes.yaml` |
| F3 | Which *Suillus* is "lartias"? Cyprus Dept. of Forests lists *S. collinitus* and *S. granulatus*, not *S. luteus*. **2026-11-13 (Real): the card now names the genus, "slippery Jacks (*Suillus*)".** The local name still to confirm | genus | `config/species.yaml` |
| F4 | Cyprus morels: *M. arbutiphila* and *M. disparilis* were described from Cyprus (2016); the names *M. esculenta / elata* may need updating | to confirm | `config/species.yaml` |
| D8 | Kermes oak map (brief: red pine mushroom also with kermes oak) | not mapped, not counted | `config/species.yaml` |
| S10 | Species scores differ only by trees, altitude and season (brief rule), so species sharing a habitat get the same number. Species-specific rain/temperature rules? | none (not in the brief) | `config/species.yaml` |
| S11 | **More target species**: public Cyprus records are too few (max ~15 per mushroom on GBIF) to derive trees or seasons | waiting for a source (user / Cyprus Mycological Association) | `config/species.yaml` |
| P1 | ~~50 m hotspot zoom private?~~ **Answered 2026-11-12: the public site shows the 250 m squares and the hotspot zoom** (overrides the brief's ~2 km rule; finds stay private). 50 m shade is now one fixed island-wide file, `web/public/tiles/shade50.pmtiles` (`shroomy.export.shade50`). **Before merging to `main`, upload it to the `static-v1` release** (the daily robot copies `*.pmtiles` from there) | public | `pipeline/shroomy/export/shade50.py` |

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
| D9 | **Coordinates of the Department of Meteorology rain stations** (not in the daily PDF) | not known. Needed to compare stations with the weather model. Ask the department or find their station list |
| D10 | **Licence of the department's daily rain PDF and rain maps** | not stated. Archive kept private. Ask the department before any public use |
| D11 | Does the Copernicus Soil Water Index 1 km (Europe) have pixels south of 35.0 N (Troodos)? Why no file after 15 Sep 2026? | catalogue says 35-72 N; needs a free account to open one file |
