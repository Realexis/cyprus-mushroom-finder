"""Burned forest (habitat/burns.py): morel springs and the habitat cut."""
from datetime import date

import numpy as np

from shroomy.habitat import burns


def test_morel_springs_after_a_summer_fire():
    # 23 July 2025 Limassol fire -> springs 2026 and 2027 [LAR16]
    assert burns.morel_until(date(2025, 7, 23), 2) == date(2027, 4, 30)


def test_winter_fire_counts_the_same_spring():
    assert burns.morel_until(date(2026, 1, 10), 2) == date(2027, 4, 30)
    assert burns.morel_until(date(2026, 3, 1), 2) == date(2028, 4, 30)


def test_apply_marks_only_mostly_burned_forest(monkeypatch):
    share = np.array([[0.9, 0.3, 0.9, 0.9]], "float32")
    fire = date(2025, 7, 23).toordinal()
    latest = np.array([[fire, fire, date(2021, 7, 3).toordinal(), fire]], "int32")
    monkeypatch.setattr(burns, "burned_layer", lambda: (share, latest))
    monkeypatch.setattr(burns, "_cfg", lambda: {"enabled": True, "min_fraction": 0.5, "morel_springs": 2})
    hab = {"likely_tree": np.array([[1, 1, 1, 2]], "float32"), "forest_type": np.array([[2, 2, 2, 0]])}
    out = burns.apply(hab, date(2026, 3, 1))
    assert out["likely_tree"].tolist() == [[6, 1, 7, 2]]       # recent / partly burned / old fire / not forest
    assert hab["likely_tree"].tolist() == [[1, 1, 1, 2]]       # input unchanged
    assert burns.apply(hab, date(2027, 6, 1))["likely_tree"].tolist() == [[7, 1, 7, 2]]
