"""The shared map grids.

All layers line up on one frame in UTM 36N (metres):
the 250 m habitat grid, the 25 m terrain grid and the 10 m forest grid
share the same corner, so 250 m = 10 x 10 terrain cells = 25 x 25 forest cells.
"""
from dataclasses import dataclass

import numpy as np
from pyproj import Transformer
from rasterio.transform import from_origin

from . import config


@dataclass(frozen=True)
class Grid:
    crs: str
    west: float
    north: float
    res: float
    width: int
    height: int

    @property
    def transform(self):
        return from_origin(self.west, self.north, self.res, self.res)

    @property
    def bounds(self):
        """(west, south, east, north) in metres."""
        return (self.west, self.north - self.height * self.res,
                self.west + self.width * self.res, self.north)

    def at(self, res: float) -> "Grid":
        """Same frame, different cell size (must divide 250 m evenly)."""
        f = self.res / res
        assert abs(f - round(f)) < 1e-9, "resolutions must nest"
        return Grid(self.crs, self.west, self.north, res,
                    int(round(self.width * f)), int(round(self.height * f)))

    def cell_centres_lonlat(self):
        """Lon/lat of every cell centre (2D arrays)."""
        cols, rows = np.meshgrid(np.arange(self.width), np.arange(self.height))
        x = self.west + (cols + 0.5) * self.res
        y = self.north - (rows + 0.5) * self.res
        t = Transformer.from_crs(self.crs, "EPSG:4326", always_xy=True)
        return t.transform(x, y)


def habitat_grid() -> Grid:
    """The 250 m grid covering the whole island, snapped to whole 250 m."""
    r = config.load("region")
    res = r["grids"]["habitat_m"]
    w, s, e, n = r["bbox_lonlat"]
    t = Transformer.from_crs("EPSG:4326", r["crs"], always_xy=True)
    xs, ys = t.transform([w, w, e, e], [s, n, s, n])
    west = np.floor(min(xs) / res) * res
    east = np.ceil(max(xs) / res) * res
    south = np.floor(min(ys) / res) * res
    north = np.ceil(max(ys) / res) * res
    return Grid(r["crs"], west, north, res,
                int((east - west) / res), int((north - south) / res))


def block_mean(a: np.ndarray, k: int) -> np.ndarray:
    """Average k x k blocks (NaN-aware). Shape must be a multiple of k."""
    h, w = a.shape
    b = a.reshape(h // k, k, w // k, k)
    with np.errstate(invalid="ignore"):
        return np.nanmean(b, axis=(1, 3))
