# Sources for the prediction audit

> Copied 2026-11-13 from the prediction-audit chat (branch `audit-prediction`), so the source
> tags in `config/*.yaml` (LOI16, LOI19, KAR16, ...) can be looked up on this branch.
> `audit/GAPS.md` lives on that branch.

Checked 2026-11-13. Every fact in `audit/GAPS.md` and the two direction files points here.

**How to read the "Read" column**

- **Full text** = I read the document itself.
- **Abstract** = I only saw the abstract or a search summary. Treat as weaker.
- **Data** = numbers I pulled myself from a public database on 2026-11-13.

**Nothing here is a Cyprus measurement of fruiting conditions.** No such study exists
that I could find. The Cyprus sources give places, hosts, months and field practice.
The numbers on rain and temperature come from Spain.

---

## A. Cyprus sources

| Tag | Source | Read | What it gives us |
|---|---|---|---|
| **LOI16** | Loizides M. (2016). *Macromycetes within Cistaceae-dominated ecosystems in Cyprus.* Mycotaxon 131 (online checklist). https://www.mycotaxon.com/resources/checklists/Loizides-v131-1-checklist.pdf | Full text | Ten-year survey, 2007-2016. Season, hosts, altitudes and dates for desert truffles, morels, bronze bolete, Cistus milk caps |
| **LOI19** | Loizides M., Bellanger J-M., Assyov B., Moreau P-A., Richard F. (2019). *Phylogenetic and distributional data on boletoid fungi (Boletaceae) in Cyprus and description of a new sampling methodology.* Data in Brief 25: 104115. https://pmc.ncbi.nlm.nih.gov/articles/PMC6700403 | Full text (summary of the page) | 767 forays in ten years. **The rain rule Cyprus field mycologists use.** Survey months. Tree types and altitudes |
| **LOI19b** | Loizides M. et al. (2019). Boletoid fungi of Cyprus, ten-year study. Fungal Ecology 41. | Abstract | 25 bolete species; 19 (76 %) tied to evergreen oaks |
| **LOI16m** | Loizides M., Bellanger J-M., Clowez P., Richard F., Moreau P-A. (2016). True morels in Cyprus. Mycological Progress 15. DOI 10.1007/s11557-016-1180-1 | Abstract | 11 morel species confirmed in Cyprus. Hosts for *M. arbutiphila* and *M. disparilis* |
| **PIO08** | Republic of Cyprus, Press and Information Office (2008). *Mushrooms in Cyprus* leaflet, P.I.O. 153/2008. https://www.pedoulas.org.cy/docs/MUSHROOMS%20IN%20CYPRUS.pdf | Full text | Official short guide. Season and habitat per common species |
| **CM26** | Clark M. D. (21 Jan 2026). *Mushroom foraging excursion reveals impacts of climate change.* Cyprus Mail. https://cyprus-mail.com/2026/01/21/alarm-bells-in-the-forest | Full text | First-hand report on the **2025-26 season** |
| **KI26** | Cyprus Inform (21 Jan 2026). Same story, shorter. https://www.kiprinform.com/en/cyprus_news/cyprus-forest-mushroom-season-falters-as-drought-and-harmful-foraging-practices-raise-concerns | Full text | Repeats CM26. Not independent |
| **ERA25** | Eratosthenes Centre of Excellence (2025). Limassol wildfire mapping. https://eratosthenes.org.cy/eratosthenes-centre-confirms-scale-of-devastation-in-limassol-wildfire/ | Summary | Fire of **23 July 2025**: 120.7 km². 15.5 % forest, 31 % shrub, 51 % grass |
| **NOTE** | `species-research.md` in the shared notes (species-cards chat, 2026-11-12) | Full text | Dept of Forests, KYKPEE, Pedoulas, Wikipedia facts on looks, hosts, local names |
| **INAT** | iNaturalist, verifiable records in Cyprus, by month. API queried 2026-11-13 | Data | See table C |
| **GBIF** | GBIF occurrences in Cyprus, by month. API queried 2026-11-13 | Data | See table C |

### Key lines from the Cyprus sources

- **Season (LOI16):** "the fruiting season spans between September and April, with the most
  productive period occurring between November and February".
- **Field rule (LOI19):** surveys began "18-20 days following the first substantial rainfall
  of the season (>20 mm)". After that, "usually 1-2 days following subsequent rainfall episodes".
- **Altitude order (LOI19):** surveys started at high elevations in autumn and moved down as
  it got colder and wetter. Survey counts peaked **December to March**.
- **Summer (LOI19, PIO08):** fruiting above 1,400 m after more than 30 mm. PIO08: after strong
  rain that keeps the litter humid "for at least 15 - 20 days".
- **Commonest woodland (LOI19):** mixed Calabrian pine and golden oak.
- **2025-26 (CM26):** "By the time the ground was wet enough it was already getting too cold."
  A poor season at Vavatsinia, Lythrodontas and Troodos. Fennel king oyster near Lefkara also
  poor, "lack of autumn rain".

---

## B. Mediterranean science (mostly Spanish pine forests)

| Tag | Source | Read | What it gives us |
|---|---|---|---|
| **KAR16** | Karavani A. (2016). *Effect of climatic and micro-climatic conditions on the provisioning of fungal-based ecosystem services in Mediterranean pine stands.* MEDFOR thesis, Univ. of Lleida. https://medfor.eu/sites/default/files/editor/karavani_et_al_final.pdf. Published as Karavani et al. (2018), Agric. For. Meteorol. 248: 432-440 | Full text | 28 plots, weekly picking, 2008-2015, Catalonia. Rain, temperature and soil moisture vs yield |
| **TAY14** | Taye Z. M. (2014). *Conditional yield models for edible mushrooms in Pinus pinaster stands of Soria.* MEDFOR thesis. https://www.medfor.eu/sites/default/files/editor/zelalem_mengiste_medfor_thesis_final.pdf. Published as Taye et al. (2016), Fungal Ecology 23: 30-41 | Full text (parts) | 17 years of data. Milk caps = 76 % of marketed yield. Autumn rain, soil pH, stand age |
| **OLA20** | Olano J. M. et al. (2020). *Primary productivity and climate control mushroom yields in Mediterranean pine forests.* Agric. For. Meteorol. 288-289 | Abstract | 22-24 years, Soria. Last year's greenness (NDVI) was the best single predictor. Satellite soil moisture as good as rain |
| **HER15** | Hernández-Rodríguez M. et al. (2015). *Climate-sensitive models for mushroom yields and diversity in Cistus ladanifer scrublands.* Agric. For. Meteorol. | Abstract | Mean minimum autumn temperature was the strongest climate factor |
| **AND19** | Andrino A. et al. (2019). *The crop of desert truffle depends on agroclimatic parameters during two key annual periods.* Agron. Sustain. Dev. 39: 51. DOI 10.1007/s13593-019-0596-9 | Abstract | 15 years, *Terfezia claveryi* orchard. Two key periods: **autumn (Sep-Oct)** and **end of March** |
| **LAR16** | Larson A. J. et al. (2016). *Post-fire morel abundance, spatial structure and harvest sustainability.* Forest Ecol. Manage. | Abstract | Burn morels did not appear where less than 50 % of the surface burned |
| **SCH83** | Schmidt E. L. (1983). Morel spore germination in soil. Mycologia 75 | Abstract | No germination until soil passed about 10 °C |
| **MAT** | *Tricholoma matsutake* fruiting studies, Japan and China (Forests 2026, 17: 516; Iwate 2020) | Abstract | Fruiting when soil cools below about 19 °C; about 15 °C at a cold site. **A different species from the Cyprus one** |
| **WIK-LS** | Wikipedia, *Lactarius sanguifluus* | Full text | With pines on chalky soil. Fruits Sep-Nov in southern Europe |
| **FAO56** | Allen R. G. et al. (1998). FAO Irrigation and Drainage Paper 56 | Known reference | Evaporation formulas already used in V4 |

### Key lines from the science

- **Rain works with a delay (KAR16):** "Precipitation ... exhibits a one-month time lag in its
  correlation with mushroom productivity." The thesis lists five more Spanish and Italian
  studies that found the same.
- **Why (KAR16):** rain first has to wet the soil. Soil moisture mattered one month after rain did.
- **Temperature limits both ends (KAR16):** "high temperatures limiting production at the
  beginning of the fruiting season and low temperatures limiting it at the end."
  Daily **maximum** early and daily **minimum** late predicted better than the mean.
- **Rain spread matters (KAR16):** the number of rainy days often predicted better than total mm.
- **Soria (TAY14):** fruiting "seems to happen starting 100 mm of autumn rainfall".
  More acid soil gave more milk caps. Older stands gave fewer.
- **Typical values at the Catalan site (KAR16):** November mean 8.5 °C, December mean 5.1 °C,
  October rain 58 mm. It is cooler and wetter than Cyprus pine forest.

---

## C. Public records in Cyprus, by month (pulled 2026-11-13)

All years together. Counts are **tiny**. They show months, not abundance.

| Species (as searched) | iNaturalist | GBIF | Months with records |
|---|---|---|---|
| Red pine mushroom | 7 | 5 | Oct (5), Nov, Dec, Feb, Mar, Apr |
| All milk caps (*Lactarius*) | 13 | - | Oct, Jan, Mar, Apr |
| Bloody milk cap | 0 | - | none |
| White brittlegill | 1 | 0 | Sep |
| Matsutake | 0 | 2 | Dec |
| All *Suillus* | 28 | 5 | **Dec (11), Jan (10)**, Oct, Nov, Feb |
| *Suillus luteus* | **0** | - | none |
| *Suillus collinitus* | 5 | - | Oct, Dec, Jan |
| King oyster (*Pleurotus eryngii*) | 8 | 9 | **Jan**, Feb, Apr |
| All morels (*Morchella*) | 29 | 43 | GBIF: **Apr (24), Mar (13)**, Feb (2). iNaturalist: 23 of 29 are **one find on one day** (28 Feb 2026, Karpas) |
| Bronze bolete | 0 | 1 | Aug |
| Wood blewit | - | 3 | Jan, Feb |
| Shaggy ink cap | 6 | 5 | Nov to Apr |
| Field mushroom | 0 | 1 | Feb |
| Chanterelles | 0 | 0 | none |
| Desert truffles (*Terfezia*) | 0 | 2 | no month given |

**Host plants on GBIF in Cyprus (records with a map position):**
giant fennel 285, golden oak 307, strawberry tree 294, kermes oak 94, *Helianthemum* 150,
*Cistus* 871, black pine 189, Calabrian pine 294.

**Important for the backtest:** searching by **genus** finds far more dated records for the
2025-26 season than the 2 the V4 backtest used. It looked for exact species names only
(*Suillus luteus*, *Morchella esculenta*), which Cyprus observers rarely use.
*Suillus*: 9 records, Dec 2025 to Feb 2026. King oyster: 2. Milk caps: 1. Morels: 2 find events.

---

## D. Technical checks

| Tag | What I checked | Result |
|---|---|---|
| **OM** | Open-Meteo, 3 test calls, 2026-11-13 | `soil_temperature_0_to_7cm` **is available** for the ECMWF IFS model, in both the forecast API and the historical-forecast API. Same free tier |

---

## E. Sources I could not open

Named so nobody thinks they were read.

- MDPI Forests 10(3): 206. Blocked.
- Olano 2020 full PDF, Andrino 2019 full text, Loizides 2019 HAL copy. Blocked.
- Loizides (2021), *Basidiomycete diversity within Calabrian pine ecosystems on the island of
  Cyprus*, Mycotaxon 136. **Not found online. This is the most useful missing source.**
- Loizides (2011), *Quercus alnifolia and its fungi*, Field Mycology 12(3). Behind a paywall.
- Loizides, Kyriakou, Tziakouris (2011), *Edible and Toxic Fungi of Cyprus* (book). Not online.
- Cyprus Insider article on the 2025-26 season. Server error.
- **Ponce et al. 2022** (named in the handoff). I did not find or read it. Not used.

**Best next step for sources:** ask Michael Loizides or the Cyprus Mycological Association
for the two Cyprus papers and the book. **Ask Real first.**
