"""Tests for the scoring factors, checked against the numbers in the brief."""
import numpy as np
import pytest

from shroomy import config
from shroomy.score import factors as F

S = config.load("scoring")["score"]


# ---------------------------------------------------------------- rain total
def test_rain_total_thresholds_from_brief():
    c = S["rain_total"]
    assert F.ramp(19, c["zero_below_mm"], c["full_at_mm"]) == 0
    assert F.ramp(50, c["zero_below_mm"], c["full_at_mm"]) == pytest.approx(0.5)
    assert F.ramp(80, c["zero_below_mm"], c["full_at_mm"]) == 1
    assert F.ramp(200, c["zero_below_mm"], c["full_at_mm"]) == 1


def test_rain_total_window_is_last_30_days_inclusive():
    p = np.zeros(40); p[10] = 100     # 29 days before day 39 -> inside
    p[9] = 50                          # 30 days before -> outside
    assert F.rain_total(p, 39, 30) == 100


# ---------------------------------------------------------------- rain pulse
def test_pulse_inside_window_counts():
    p = np.zeros(40); t = 39
    p[t - 12] = 10; p[t - 11] = 10; p[t - 10] = 10        # 30 mm, 10-12 days ago
    mm, end_ago = F.rain_pulse(p, t, 3, 7, 20)
    assert mm == 30 and end_ago == 10


def test_pulse_too_recent_is_ignored():
    p = np.zeros(40); t = 39
    p[t - 3] = 50                                         # 3 days ago: too fresh
    mm, _ = F.rain_pulse(p, t, 3, 7, 20)
    assert mm == 0


def test_pulse_too_old_is_ignored():
    p = np.zeros(40); t = 39
    p[t - 25] = 50
    mm, _ = F.rain_pulse(p, t, 3, 7, 20)
    assert mm == 0


def test_pulse_thresholds_from_brief():
    c = S["rain_pulse"]
    assert F.ramp(10, c["zero_below_mm"], c["full_at_mm"]) == 0
    assert F.ramp(25, c["zero_below_mm"], c["full_at_mm"]) == 1


# ---------------------------------------------------------------- temperature
@pytest.mark.parametrize("t,want", [(2, 0), (3, 0), (5.5, 0.5), (8, 1), (13, 1), (18, 1), (21, 0.5), (24, 0), (30, 0)])
def test_temperature_trapezoid_from_brief(t, want):
    c = S["temperature"]
    assert F.temperature_factor(t, 0, c) == pytest.approx(want)


def test_frost_lowers_temperature_factor():
    c = S["temperature"]
    assert F.temperature_factor(12, 2, c) == pytest.approx(1 - 2 * c["frost_penalty_per_day"])


def test_lapse_rate_round_trip():
    lapse = S["temperature"]["lapse_rate_c_per_km"]
    t0 = F.to_sea_level(10.0, 1000, lapse)
    assert t0 == pytest.approx(16.5)
    assert F.from_sea_level(t0, 1500, lapse) == pytest.approx(16.5 - 9.75)


# ---------------------------------------------------------------- soil
def test_percentile():
    hist = np.array([[0.1, 0.2, 0.3, 0.4, np.nan]])
    assert F.percentile_in([0.25], hist)[0] == pytest.approx(50)
    assert F.percentile_in([0.05], hist)[0] == 0
    assert F.percentile_in([0.9], hist)[0] == 100


# ---------------------------------------------------------------- season + combine
def test_season_lookup():
    tab = S["season_altitude"]
    got = F.season_factor(11, np.array([0, 1, 2, 3]), tab)
    assert got.tolist() == [0.0, tab["low"]["nov"], tab["mid"]["nov"], tab["high"]["nov"]]


def test_weights_sum_to_one():
    assert sum(S["weights"].values()) == pytest.approx(1.0)


def test_combine_all_perfect_is_100_and_filter_zero_is_0():
    ones = {k: np.ones(2) for k in F.FACTORS}
    s = F.combine(ones, S["weights"], np.array([1, 0]))
    assert s.tolist() == pytest.approx([100.0, 0.0])


def test_max_window_rain_only_inside_last_month():
    p = np.zeros((1, 40))
    p[0, 5:8] = 10          # 30 mm, 32-34 days before day 39: outside the 30 days
    p[0, 30:32] = 6         # 12 mm in 2 days, inside
    assert F.max_window_rain(p, 39, 30, 3)[0] == 12


def test_water_gate_shape():
    g = F.water_gate([0, 10, 20, 55], 20)
    assert list(g) == [0, 0.5, 1, 1]
