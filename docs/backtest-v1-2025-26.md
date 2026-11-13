# V3 backtest: the 2025-26 season

Made 2026-11-13 with `uv run python -m shroomy.backtest_v1` (V3 Fable feedback, step 1).
Raw numbers: `data/processed/backtest/backtest_v1_<label>.json` (private, not in git).

## What was tested

- **Weather:** the saved season run, 1 Sep 2025 to 28 Feb 2026, 156 points (one per 9 km).
  No new weather calls.
- **Scored days:** 1 Oct 2025 to 28 Feb 2026. September cannot be scored: the score needs the
  30 days before each day.
- **Soil moisture left out.** The saved weather has none. The other five weights are scaled
  up to fill its place.
- **Forest:** every open forest square on the general map (38,133 in live V3; 36,806 after burned forest is taken out).

### Test 1: the dry autumn

October to November 2025 had almost no rain (27 mm from September to November, island median).
A good model stays low. **Pass** = median below 45 ("Poor") and under 5% of square-days at 65+ ("Good").

### Test 2: the records

Dated public finds from iNaturalist, searched by **genus**, 1 Oct 2025 to 28 Feb 2026.
Photos of one patch on one day count once: **18 find events**, 17 of them within 5 km of forest.
On each find's date: the score at the nearest forest square, and the best within 5 km.

## Results

| Version | Dry autumn median | Dry autumn: Fair or better | Test 1 | Winter median (Dec-Feb) | Score at the find (median) | Best within 5 km | Finds with 45+ within 5 km | Clock open on find day |
|---|---|---|---|---|---|---|---|---|
| **Live V3** (`33b740a`) | 47.7 | 56% | **fail** | 76.0 | 79 | 82 | 100% | 53% |
| + water gate (step 2) | 9.1 | 0.2% | **pass** | 75.7 | 79 | 82 | 88% | 53% |
| + clock 18 / 2 days (step 4) | 9.1 | 0.2% | pass | 75.7 | 79 | 82 | 88% | **65%** |
| + season to April, morels (steps 5-7) | 9.4 | 0.2% | pass | 77.3 | 79 | 82 | 88% | 65% |
| + burned forest (step 8) | 9.5 | 0.2% | pass | 77.4 | 79 | 82 | 88% | 65% |

## What it means

- **The water gate fixes the dry autumn.** Live V3 gave "Fair" scores to more than half of
  all forest in a near-rainless autumn. With the gate, almost none.
- **Winter and the find days barely change.** Where a soaking rain fell, the gate does nothing.
- **The gate misses two early finds.** Two records on 2 December 2025 (*Agaricus*, *Suillus*)
  came before the season's first soaking rain (6-10 December in the weather model). They score
  11-12 with the gate. The weather model may have missed local rain (9 km squares), or these
  fruited on smaller rains. Two finds cannot tell which.
- **The new clock fits the records better.** The first window now opens 24-28 December.
  The *Russula* (25 Dec) and two *Suillus* (27 Dec) finds come right after.
- **Morels and *Suillus* on 28 February** now score 75 and 80 (were "no habitat" and "out of season").

## Honest limits

- **18 finds cannot prove a model.** They can only catch a clearly wrong one.
- Most finds are genera that V3 does not score as species (*Agaricus*, *Coprinus*, *Pleurotus*).
  For those, only the general map is compared.
- No soil moisture in the test. The live map uses it (15%).
- "Rank in own season" (how a find day ranks among that square's own days) is 0.7 in every
  version: find days are a bit better than usual, not the best days.
