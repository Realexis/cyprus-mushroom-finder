"""Island-wide 50 m shade squares for every forest area (one-off, fixed file).

Shade depends only on the terrain (north/east-facing slopes, valley bottoms, low
autumn sun incl. ridge shadows), so it never changes from day to day. We build it
once with the SAME recipe as the 250 m habitat layer (config/scoring.yaml ->
habitat.shade) and ship it like the terrain tiles.

Output: web/public/tiles/shade50.pmtiles (layer "hotspots", props sh fa va ls el con)
The site shows it when you zoom in. For the live site it goes into the static-v1
release next to terrain.pmtiles (the daily robot copies *.pmtiles from there).

Run:  uv run python -m shroomy.export.shade50        (~5-10 min)
"""
import json
import time

import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT
from rasterio.windows import Window

from .. import config
from ..grid import block_mean, habitat_grid
from .hotspots import shade_window
from .web import write_pmtiles

OUT = config.ROOT / "web" / "public" / "tiles" / "shade50.pmtiles"
RES = 50
BLOCK = 400                      # block core: 400 x 50 m = 20 km


def _read_clipped(src, win: Window, fill):
    """Read a window that may stick out of the dataset; outside = fill."""
    full = Window(0, 0, src.width, src.height)
    out = np.full((int(win.height), int(win.width)), fill, src.dtypes[0])
    try:
        inter = win.intersection(full)
    except Exception:            # no overlap
        return out
    data = src.read(1, window=inter)
    r0, c0 = int(inter.row_off - win.row_off), int(inter.col_off - win.col_off)
    out[r0:r0 + data.shape[0], c0:c0 + data.shape[1]] = data
    return out


def build():
    S = config.load("scoring")["habitat"]
    s = S["shade"]
    g = habitat_grid()
    g50, g10 = g.at(RES), g.at(10)
    to_ll = Transformer.from_crs(g.crs, "EPSG:4326", always_xy=True)
    margin = int(np.ceil((s["shadow_max_distance_m"] + 2 * s["valley_radius_m"]) / 25 / 2)) * 2   # 25 m px, even
    gj = OUT.with_suffix(".geojson")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    n_feat, t0 = 0, time.time()
    with rasterio.open(config.PROCESSED / "dem_25m.tif") as dem_src, \
         rasterio.open(config.RAW / "forest_type" / "forest_type.vrt") as fsrc, \
         WarpedVRT(fsrc, crs=g10.crs, transform=g10.transform, width=g10.width, height=g10.height,
                   resampling=Resampling.nearest, nodata=255) as fvrt, \
         open(gj, "w") as out:
        out.write('{"type":"FeatureCollection","features":[\n')
        blocks = [(r, c) for r in range(0, g50.height, BLOCK) for c in range(0, g50.width, BLOCK)]
        for k, (r50, c50) in enumerate(blocks):
            h50 = min(BLOCK, g50.height - r50); w50 = min(BLOCK, g50.width - c50)
            # Forest first: skip blocks without forest (sea, plains).
            fty = _read_clipped(fvrt, Window(c50 * 5, r50 * 5, w50 * 5, h50 * 5), 255)
            con = block_mean((fty == 2).astype("float32"), 5)
            brd = block_mean((fty == 1).astype("float32"), 5)
            forest = (con + brd) >= S["forest_min_fraction"]
            if not forest.any():
                continue
            # Terrain with a margin for valley index + ridge shadows (25 m pixels).
            win = Window(c50 * 2 - margin, r50 * 2 - margin, w50 * 2 + 2 * margin, h50 * 2 + 2 * margin)
            dem = _read_clipped(dem_src, win, 0).astype("float32")
            if not (dem > 0).any():
                continue
            cx = g.west + (c50 + w50 / 2) * RES; cy = g.north - (r50 + h50 / 2) * RES
            lon_c, lat_c = to_ll.transform(cx, cy)
            t = shade_window(dem, 25.0, lat_c, lon_c, s)
            inner = (slice(margin, margin + h50 * 2), slice(margin, margin + w50 * 2))
            land = t["land"][inner]
            k50 = {n: block_mean(np.where(land, t[n][inner], np.nan), 2) for n in ("shade", "facing", "valley", "low_sun")}
            elev = block_mean(np.where(land, dem[inner], np.nan), 2)
            rr, cc = np.nonzero(forest & np.isfinite(k50["shade"]))
            if not len(rr):
                continue
            # Square corners -> lon/lat, all at once.
            x0 = g.west + (c50 + cc) * RES; y1 = g.north - (r50 + rr) * RES
            lo0, la1 = to_ll.transform(x0, y1); lo1, la0 = to_ll.transform(x0 + RES, y1 - RES)
            props = np.c_[np.round(k50["shade"][rr, cc] * 100), np.round(k50["facing"][rr, cc] * 100),
                          np.round(k50["valley"][rr, cc] * 100), np.round(k50["low_sun"][rr, cc] * 100),
                          np.round(np.nan_to_num(elev[rr, cc]))].astype(int)
            conif = (con[rr, cc] >= brd[rr, cc]).astype(int)
            lines = []
            for i in range(len(rr)):
                ring = [[round(lo0[i], 6), round(la1[i], 6)], [round(lo1[i], 6), round(la1[i], 6)],
                        [round(lo1[i], 6), round(la0[i], 6)], [round(lo0[i], 6), round(la0[i], 6)],
                        [round(lo0[i], 6), round(la1[i], 6)]]
                sh, fa, va, ls, el = props[i]
                lines.append(json.dumps({"type": "Feature",
                                         "properties": {"sh": int(sh), "fa": int(fa), "va": int(va), "ls": int(ls),
                                                        "el": int(el), "con": int(conif[i])},
                                         "geometry": {"type": "Polygon", "coordinates": [ring]}},
                                        separators=(",", ":")))
            out.write(("" if n_feat == 0 else ",\n") + ",\n".join(lines))
            n_feat += len(lines)
            print(f" - block {k + 1}/{len(blocks)}: {len(lines)} squares ({time.time() - t0:.0f} s)", flush=True)
        out.write("\n]}\n")
    print(f"{n_feat} forest squares of 50 m -> tiles")
    write_pmtiles(gj, OUT, "hotspots", 11, 14)
    gj.unlink()
    print(f"-> {OUT} ({OUT.stat().st_size / 1e6:.1f} MB) in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    build()
