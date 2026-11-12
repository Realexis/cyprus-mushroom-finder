"""Tests for the terrain maths. Small fake landscapes with known answers."""
from datetime import date

import numpy as np
import pytest

from shroomy.habitat import terrain

RES = 25.0


def plane(rise_east=0.0, rise_north=0.0, n=21):
    """A tilted flat plane: height rises by the given metres per metre."""
    r, c = np.mgrid[0:n, 0:n]
    x = c * RES
    y = -r * RES                      # rows go south
    return (1000 + rise_east * x + rise_north * y).astype("float32")


def test_slope_facing_north():
    # Ground rising towards the south faces NORTH.
    s, a = terrain.slope_aspect(plane(rise_north=-0.1), RES)
    assert s[10, 10] == pytest.approx(np.degrees(np.arctan(0.1)), abs=0.01)
    assert min(a[10, 10], 360 - a[10, 10]) < 0.5


def test_slope_facing_east():
    # Ground rising towards the west faces EAST.
    _, a = terrain.slope_aspect(plane(rise_east=-0.2), RES)
    assert a[10, 10] == pytest.approx(90, abs=0.5)


def test_sun_autumn_noon_cyprus():
    # Nicosia area, 31 Oct: the sun peaks in the south at about 40 degrees.
    suns = terrain.sun_positions(35.0, 33.0, date(2026, 10, 31), np.arange(8, 17, 0.25), 2)
    az, el = max(suns, key=lambda s: s[1])
    assert 38 < el < 42
    assert 170 < az < 190


def test_illumination_flat_equals_sin_elevation():
    s, a = np.zeros((3, 3)), np.zeros((3, 3))
    assert terrain.illumination(s, a, 180, 30)[1, 1] == pytest.approx(0.5, abs=1e-6)


def test_cast_shadow_behind_wall():
    # A tall wall on the east side; sun low in the east -> ground west of the wall is shaded.
    dem = np.zeros((5, 60), "float32")
    dem[:, 50] = 100.0
    sh = terrain.cast_shadow(dem, RES, sun_az=90, sun_el=10, max_dist_m=2000)
    assert sh[2, 45]                  # close behind the wall: shaded
    assert not sh[2, 55]              # on the sunny side: lit
    # 100 m wall, 10 degree sun -> shadow about 567 m = ~22 cells long.
    assert not sh[2, 50 - 30]


def test_facing_score():
    steep = np.full((1, 1), 30.0)
    assert terrain.facing_score(steep, np.full((1, 1), 45.0), 45, 15)[0, 0] == pytest.approx(1.0)
    assert terrain.facing_score(steep, np.full((1, 1), 225.0), 45, 15)[0, 0] == pytest.approx(0.0)
    flat = np.zeros((1, 1))
    assert terrain.facing_score(flat, np.full((1, 1), 225.0), 45, 15)[0, 0] == pytest.approx(0.5)


def test_valley_score_and_tpi():
    dem = np.full((41, 41), 500.0, "float32")
    dem[20, 20] = 400.0                                # a pit
    t = terrain.tpi(dem, RES, radius_m=100)
    assert t[20, 20] < 0
    assert terrain.valley_score(np.array([-60.0, -15.0, 10.0]), 30).tolist() == [1.0, 0.5, 0.0]


def test_combine_shade_weights():
    one, zero = np.ones(1), np.zeros(1)
    w = {"facing": 0.5, "valley": 0.25, "low_sun": 0.25}
    assert terrain.combine_shade(one, zero, zero, w)[0] == pytest.approx(0.5)
