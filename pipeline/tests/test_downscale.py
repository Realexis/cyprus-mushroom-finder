import numpy as np
import pytest

from shroomy.score.downscale import Interpolator


def test_linear_field_is_reproduced_exactly():
    rng = np.random.default_rng(1)
    pts = rng.uniform(0, 10000, (60, 2))
    cells = rng.uniform(2000, 8000, (200, 2))
    f = lambda xy: 3 + 0.002 * xy[:, 0] - 0.001 * xy[:, 1]
    it = Interpolator(pts, cells)
    assert it(f(pts)) == pytest.approx(f(cells), abs=1e-9)


def test_outside_points_take_nearest():
    pts = np.array([[0, 0], [10, 0], [0, 10]], float)
    it = Interpolator(pts, np.array([[100.0, 100.0]]))
    assert it(np.array([1.0, 2.0, 3.0]))[0] in (2.0, 3.0)


def test_multi_column_values():
    pts = np.array([[0, 0], [10, 0], [0, 10], [10, 10]], float)
    it = Interpolator(pts, np.array([[5.0, 5.0]]))
    v = np.array([[1, 10], [1, 10], [1, 10], [1, 10]], float)
    assert it(v)[0].tolist() == pytest.approx([1, 10])
