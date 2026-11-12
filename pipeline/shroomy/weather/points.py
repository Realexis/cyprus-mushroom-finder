"""Weather sample points.

- Main points: one per 3 km block that has land, placed at the middle of
  that block's land (so coastal points sit on land, not in the sea).
- Soil climatology points: one per 9 km block with forest habitat.
"""
import numpy as np
import rasterio
from pyproj import Transformer

from .. import config
from ..grid import habitat_grid


def _habitat():
    with rasterio.open(config.PROCESSED / "habitat_250m.tif") as src:
        return {src.descriptions[i]: src.read(i + 1) for i in range(src.count)}


def block_points(mask: np.ndarray, block: int):
    """Centroid (row, col in 250 m cells) of the True cells in each block x block window."""
    h, w = mask.shape
    pts = []
    for r0 in range(0, h, block):
        for c0 in range(0, w, block):
            m = mask[r0:r0 + block, c0:c0 + block]
            if m.any():
                rr, cc = np.nonzero(m)
                pts.append((r0 + rr.mean(), c0 + cc.mean(), r0 // block, c0 // block))
    return pts


def _to_table(pts, g):
    t = Transformer.from_crs(g.crs, "EPSG:4326", always_xy=True)
    rows = np.array([p[0] for p in pts]); cols = np.array([p[1] for p in pts])
    x = g.west + (cols + 0.5) * g.res
    y = g.north - (rows + 0.5) * g.res
    lon, lat = t.transform(x, y)
    return {"x": x, "y": y, "lon": np.asarray(lon), "lat": np.asarray(lat),
            "block_row": np.array([p[2] for p in pts]), "block_col": np.array([p[3] for p in pts])}


def main_points():
    g = habitat_grid()
    hab = _habitat()
    k = int(config.load("region")["grids"]["weather_m"] / g.res)        # 12
    return _to_table(block_points(hab["land_fraction"] > 0.5, k), g)


def soil_points():
    g = habitat_grid()
    hab = _habitat()
    c = config.load("weather")["soil_climatology"]
    k = int(c["block_km"] * 1000 / g.res)                               # 36
    mask = hab["habitat_filter"] > 0 if c["forest_only"] else hab["land_fraction"] > 0.5
    return _to_table(block_points(mask, k), g)
