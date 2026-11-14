# Fact-check of the mushroom cards (Shroomy Lab, 14 Nov 2026)

Checked: the 6 mushroom cards (`config/species.yaml`, field notes in `web/src/ui/species.ts`) and the
10 lookalikes (`config/lookalikes.yaml`). Nothing on the cards was changed.

**How to read "Read":** *Full* = I read the page or document. *Summary* = I only saw a search summary
or an abstract. Treat as weaker.

**Not done:** no expert was asked. The Cyprus Mycological Association has still not confirmed anything.

## Sources

| Tag | Source | Read |
|---|---|---|
| FD | Cyprus Department of Forests, Funga page. https://www.moa.gov.cy/moa/fd/fd.nsf/fd67_en/fd67_en?OpenDocument= | Full |
| PIO | Press and Information Office (2008), *Mushrooms in Cyprus* leaflet. https://www.pedoulas.org.cy/docs/MUSHROOMS%20IN%20CYPRUS.pdf | Full |
| KYK | KYKPEE, Μανιτάρια της Κύπρου. https://kykpee.org/mushrooms-of-cyprus/ | Full |
| DIA | Dialogos (2017). https://dialogos.com.cy/manitaria-enas-thisavros-tis-kipriakis-fisis/ | Full |
| W-* | Wikipedia pages: Lactarius deliciosus, L. sanguifluus, Russula delica, Tricholoma caligatum, Suillus luteus, Morchella arbutiphila, M. disparilis, False morel, Amanita phalloides, A. virosa, A. pantherina, A. proxima, Lepiota brunneoincarnata, Agaricus xanthodermus, Omphalotus olearius, Russula emetica | Full |
| FN | First Nature: Lactarius deliciosus, Lactarius chrysorrheus. https://www.first-nature.com/fungi/ | Full |
| LOI16m | Loizides et al. (2016), true morels in Cyprus. Mycological Progress 15. DOI 10.1007/s11557-016-1180-1 | Summary |
| LOI18 | Loizides, Bellanger, Yiangou, Moreau (2018), genus *Amanita* in Cyprus, with a review of previous records and poisoning incidents. Documents Mycologiques 37: 201-218 | Summary |
| TOR14 | Torrejón (2014), Annotated checklist of fungi in Cyprus Island. 1. Larger Basidiomycota. Acta Mycologica 49(1). DOI 10.5586/am.2014.011 | Summary |
| GBIF | GBIF records in Cyprus, counted 14 Nov 2026 (public API) | Data |

GBIF has very few Cyprus fungus records. "0 records" there does not mean "does not grow in Cyprus".

## A. Does not match the sources (6)

**Fixed in Lab on 14 Nov 2026 (Real said yes): A1 and A2.** A1: the stem line now says the two Cyprus
slippery Jacks have no ring. A2: the name is now "arnoui". The rest is unchanged.

| # | Card | What the card says | What the sources say |
|---|---|---|---|
| A1 | Slippery Jacks | Stem "with a ring: white on top, dark brown to violet underneath" | That is *Suillus luteus* (W). The two slippery Jacks the Department of Forests lists for Cyprus, *S. collinitus* and *S. granulatus* (FD), have **no ring** (W: *S. granulatus* "bears neither a partial veil nor a ring"; the card's own note says *S. collinitus* has no ring). GBIF Cyprus: *S. collinitus* 2, *S. luteus* 1, *S. granulatus* 0. |
| A2 | Morels | Local name "arnaoui" | KYK spells it **αρνούϊ** (arnoui). DIA: αρνούθκια (plural). No source has "arnaoui". |
| A3 | Morels | Latin name "*Morchella esculenta / elata*" | The Cyprus sources use *Morchella conica* (PIO, KYK) or *Morchella* sp. (FD). LOI16m confirmed 11 species by DNA and named two new ones. I could not read its full list, so I cannot say whether *esculenta* or *elata* are among them. |
| A4 | Matsutake | Common name "matsutake" | W: *T. caligatum* is "sometimes referred to as the European Matsutake". The true matsutake is a different species (*T. matsutake*). |
| A5 | Lookalike *Russula emetica* | "the sickener (pink Russula)" | W: cap "bright scarlet or cherry red"; grows in damp woods and bog moss. No Cyprus record found (not on FD's list, GBIF 0). Which red or pink Russula the brief meant is still a guess. |
| A6 | Slippery Jacks | Local name "lartias" | Not found in any source. KYK gives **σφουγκαράς** (sfoungaras) for *S. granulatus*. |

## B. No source found (4)

| # | Card | Claim | Note |
|---|---|---|---|
| B1 | Bloody milk cap | "Troodos black pine", "above 1,200 m" | Only the brief says so. W: with pines "on calcareous soils"; lists Cyprus but no place, tree or altitude. Not on FD, PIO or KYK. GBIF Cyprus: 0. |
| B2 | Matsutake | "Mid and high altitudes" only | W: "coastal and high altitude woods". The card's own field note says "on the coast and in the mountains". |
| B3 | Matsutake | Golden oak as a tree | Cyprus sources say pine forests only (PIO, KYK). W says evergreen oaks elsewhere in the Mediterranean. |
| B4 | Lookalikes *Amanita virosa*, *A. verna* | (on the list of 10) | "Deadly" is right for both (W). But LOI18 (summary only) judged the Cyprus reports of *A. virosa* spurious, and *A. verna* was reported once and not confirmed. They may not grow in Cyprus. **Correction:** every card says "These 10 grow in the same forests" and "4 deadly lookalikes grow in the same forests", so the card does claim it. For these two (and for *Russula emetica*, A5) that line has no source. |

## C. Confirmed

**Red pine mushroom (*Lactarius deliciosus*)**
- Cap, gills, hollow stem with pits, orange milk, green bruising: W, FN.
- Mainly pines; also golden oak, kermes oak, strawberry tree, mastic, terebinth: FD (official). Note: W and FN name pines, FN "oak woodlands occasionally".
- Woolly milk cap is poisonous, looks alike, grows in Cyprus, milk stays white: PIO, KYK. Name μαλλίτσης: KYK.
- Yellowdrop milk cap milk "quickly turns sulphur yellow": FN.
- Local name kokkinomanitaro: KYK.

**Bloody milk cap (*Lactarius sanguifluus*)**
- Cap 4-7.5 cm, gills, stem, blood-red milk turning greenish, pines, September to November: W.
- Local name γαιματάς: W only (one source).

**Milk-white brittlegill (*Russula delica*)**
- Every "what to look for" line, the woods, "hot spells", common in the eastern Mediterranean: W.
- Pine forests and shrubland, autumn, earlier than the red pine mushroom: KYK, PIO.
- Local name aspromanitaro: KYK.

**Matsutake (*Tricholoma caligatum*)**
- Cap, gills, ring, banded stem, nutmeg or allspice smell, Mediterranean trees, autumn and winter: W.
- Pine forests in Cyprus: PIO, KYK.
- Local names **ήμερο** (imero) and μαραθεύτικο: KYK. So "imero" has a Cyprus source.

**Morels**
- Spring; burned areas, forests, meadows, uncultivated land: PIO, KYK.
- Strawberry tree on Troodos igneous rock (*M. arbutiphila*); cypress and hawthorn (*M. disparilis*); cone-shaped, olive tones: W.
- True morels "always hollow"; false morels wrinkled or brain-like, chambered or cottony inside; still toxic after cooking: W.

**Slippery Jacks (*Suillus*)**
- Slimy brown cap that peels, yellow then olive pores, pines, poor soil: W (for *S. luteus*).
- Department of Forests lists *S. collinitus* and *S. granulatus*: FD.

**Lookalikes**
- Death cap: symptoms "usually occur 6 to 12 hours after ingestion"; "toxicity is not reduced by cooking, freezing, or drying": W. Found in Cyprus in hazelnut plantations: LOI18 (summary).
- *Lepiota brunneoincarnata*: deadly (amatoxin; deaths in Spain 2002, Tunisia 2010): W. On FD's Cyprus list.
- *Amanita proxima*: kidney poison: summary of a 2019 study (Mycological Progress, DOI 10.1007/s11557-019-01521-2). W only says "poisonous". GBIF Cyprus: 2.
- *Amanita pantherina*: toxic, could be fatal untreated: W. Rare in Cyprus, black pine forests: TOR14 (summary).
- *Agaricus xanthodermus* (yellow stainer): toxic, stomach upset: W. On FD's list.
- *Omphalotus olearius*: toxic, "appears similar to some chanterelles", on olive roots: W. On FD's list.
- *Lactarius chrysorrheus*: "poisonous even when cooked thoroughly"; with oaks: FN. On FD's list.

## Local names: where they stand

| Name on the card | Status |
|---|---|
| kokkinomanitaro | Cyprus source (KYK) |
| aspromanitaro | Cyprus source (KYK) |
| imero | Cyprus source (KYK), also μαραθεύτικο |
| gematas | Wikipedia only (γαιματάς) |
| arnaoui | Sources spell it αρνούϊ (arnoui) |
| lartias | Not found. KYK: σφουγκαράς for *S. granulatus* |

## What I could not read
- LOI16m, LOI18 and TOR14 in full (paywall or server error). Their lines above come from summaries.
