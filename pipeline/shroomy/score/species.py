"""Species filters (pure numpy, easy to test).

A species filter changes ONLY the habitat filter and the season window [BRIEF]:
- habitat: the cell's likely tree must be one of the species' trees, and its
  altitude band one of the species' bands (config/species.yaml);
- season: outside the species' months the score is 0; inside, the season factor is 1.
Every other factor and weight is the same as the general map.
"""
import numpy as np

from .factors import FACTORS


def general_habitat(habitat_filter, likely_tree, trees):
    """General map habitat: open forest whose likely tree is a partner tree [S7]."""
    return (np.asarray(habitat_filter) > 0) & np.isin(np.asarray(likely_tree).astype(int), trees)


def species_habitat(habitat_filter, likely_tree, band, spec):
    """True where the cell is open forest with one of this species' trees and bands."""
    return ((np.asarray(habitat_filter) > 0)
            & np.isin(np.asarray(likely_tree).astype(int), spec["trees"])
            & np.isin(np.asarray(band).astype(int), spec["bands"]))


def in_season(month: int, spec) -> bool:
    return int(month) in spec["months"]


def base_score(factors: dict, weights: dict):
    """Weighted sum of every factor EXCEPT the season one, scaled to 0-100.

    General score  = habitat x (base + season_share x season_factor)
    Species score  = species_habitat x in_season x (base + season_share)
    """
    total = sum(weights[k] for k in FACTORS)
    return sum(weights[k] * np.nan_to_num(factors[k], nan=0.0)
               for k in FACTORS if k != "season_altitude") / total * 100.0


def season_share(weights: dict) -> float:
    """How many of the 100 points the season factor is worth."""
    return weights["season_altitude"] / sum(weights[k] for k in FACTORS) * 100.0


def species_score(factors: dict, weights: dict, habitat, month: int, spec):
    if not in_season(month, spec):
        return np.zeros(np.shape(habitat))
    return np.asarray(habitat) * (base_score(factors, weights) + season_share(weights))


def months_text(months) -> str:
    """[10, 11, 12, 1] -> 'Oct-Jan'. Assumes the months run in order (wrapping the new year)."""
    names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return names[months[0] - 1] if len(months) == 1 else f"{names[months[0] - 1]}-{names[months[-1] - 1]}"
