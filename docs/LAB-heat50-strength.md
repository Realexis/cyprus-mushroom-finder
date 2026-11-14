# Shroomy Lab: how strongly shade counts in the 50 m heat map

Checked 14 Nov 2026. Rule: patch score = square score x (1 + strength x (patch shade - square shade) / 100).
**Strength chosen: 1.0.** One shade point more than the square = 1% higher score.

## 1. What public sightings show

Data: iNaturalist, all fungus sightings in Cyprus without lichens, position known to 50 m or better,
not hidden. Fetched 14 Nov 2026 from the public API. 451 sightings; 290 fall on a 50 m forest patch.
Counting each patch once: **173 patches, in 120 squares, from 117 outings**.

| Question | Answer |
|---|---|
| Is the patch with a sighting shadier than its 250 m square? | Yes, in **61%** of patches (50% = shade makes no difference) |
| How much shadier, on average? | **+2.1 shade points** |
| Strength that fits best | **1.16** |
| 95% range (whole outings resampled, so one busy day cannot decide it) | **0.18 to 2.34** |
| Share of resamples where shade helps at all | 98% |

Method: inside each square, the chance that a sighting is on a patch is taken as
exp(strength x patch shade / 100), and the strength that fits the sightings best is found.

**Limits.** 173 patches is few, so the range is wide. People photograph where they walk (paths,
valleys, picnic sites), which can push the number up. Positions are up to 50 m off, which pushes it
down. Most sightings are from December. All fungi are counted, not only our six mushrooms.
The brief's own weight (shade = 10% of the score) equals a strength of about 0.15: just below the range.

## 2. How the map behaves (778,727 patches, today's scores)

| Strength | Patches that move 5+ points | 90% of patches move | Hit the top (100) | Jump 2+ rating words | Link to the square's score |
|---|---|---|---|---|---|
| 0.15 | 0% | -2 to +2 | 0.0% | 0.0% | 1.00 |
| 0.5 | 29% | -7 to +8 | 0.1% | 0.0% | 0.97 |
| **1.0** | **55%** | **-15 to +16** | **1.6%** | **1.0%** | **0.90** |
| 1.5 | 67% | -22 to +22 | 5.0% | 4.0% | 0.81 |
| 2.3 | 76% | -34 to +26 | 10.6% | 10.2% | 0.68 |

## 3. Why 1.0

- It is close to what the sightings fit best (1.16) and well inside their range.
- More than half the patches visibly differ from their square, so the close-up map says something.
- Rain, temperature and season still decide most of the picture (link 0.90).
- Few patches hit the top of the scale (1.6%) or jump two rating words (1.0%). At 1.5 both are 4-5%.
- Rounded down from 1.16 because of the walking-path bias above.

## To improve it

Real find locations for the target mushrooms (kept private) would narrow the range. A few hundred
would be enough to tell 0.5 from 1.5.
