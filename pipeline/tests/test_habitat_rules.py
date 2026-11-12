"""Tests for the tree-zone and reserve rules, using the real config values."""
import numpy as np

from shroomy import config
from shroomy.habitat.build import classify

H = config.load("scoring")["habitat"]


def run(elev, con, brd, ign, reserve=""):
    a = lambda v: np.array([v], dtype="float32")
    return [x[0] for x in classify(a(elev), a(con), a(brd), a(ign), np.array([reserve]), H)]


def test_low_conifer_is_calabrian_pine():
    forest, tree, band, f = run(500, 0.8, 0.0, 0.0)
    assert (forest, tree, band, f) == (1, 1, 1, 1)


def test_high_conifer_on_troodos_is_black_pine():
    _, tree, band, _ = run(1500, 0.8, 0.0, 1.0)
    assert (tree, band) == (2, 3)


def test_high_conifer_off_troodos_stays_calabrian():
    _, tree, _, _ = run(1500, 0.8, 0.0, 0.0)
    assert tree == 1


def test_broadleaf_on_igneous_is_golden_oak():
    _, tree, _, _ = run(800, 0.0, 0.7, 1.0)
    assert tree == 3


def test_broadleaf_off_igneous_is_other():
    _, tree, _, _ = run(800, 0.0, 0.7, 0.0)
    assert tree == 4


def test_no_forest_no_habitat():
    forest, tree, _, f = run(800, 0.05, 0.05, 1.0)
    assert (forest, tree, f) == (0, 0, 0)


def test_reserve_is_closed():
    *_, f = run(1200, 0.9, 0.0, 1.0, reserve="Madari")
    assert f == 0


def test_tripylos_cedar_band_is_closed():
    _, tree, _, f = run(1100, 0.9, 0.0, 1.0, reserve="Tripylos - Mavroi Kremmoi")
    assert (tree, f) == (5, 0)
