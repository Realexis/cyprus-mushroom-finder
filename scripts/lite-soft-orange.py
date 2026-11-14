"""Shroomy Lite: soft edges for the conditions colour seen close up (made every day).

Close up, the map shows the 50 m shade squares. Where a 50 m spot has no forest there is no
shade square, and today's conditions colour of its 250 m square shows through: the "orange
squares". This makes ONLY those spots a soft picture: same colour as the 250 m square, with
blurred edges that fade over the shade squares around them. The shade squares stay sharp.

In:  web/public/data/cells.pmtiles (today's scores), web/public/data/meta.json,
     web/public/tiles/shade50.pmtiles (fixed)
Out: web/public/data/soft.pmtiles (image tiles, zoom 11-12, about 5 MB)
Run: cd pipeline && uv run python ../scripts/lite-soft-orange.py      (about a minute)
Needs GDAL and the pmtiles tool (Homebrew).
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import ColorInterp
from rasterio.transform import from_origin
from scipy.ndimage import gaussian_filter

ROOT = Path(__file__).resolve().parent.parent
DATA, TILES = ROOT / "web/public/data", ROOT / "web/public/tiles"
OUT = DATA / "soft.pmtiles"
# The project's grid (pipeline/shroomy/grid.py), at 25 m so the edges can be soft.
CRS, WEST, NORTH, RES, W, H = "EPSG:32636", 426500, 3957500, 25, 9000, 5590
TE = [str(v) for v in (WEST, NORTH - H * RES, WEST + W * RES, NORTH)]
# Same colour steps as SCORE_STOPS in web/src/map/layers.ts.
STOPS = [(0, "#23413f"), (30, "#3e6b57"), (50, "#7e9f55"), (70, "#d9b44a"), (85, "#ee8e4a"), (100, "#ff6a4d")]
BLUR_PX = 1.0                     # about 25 m: soft, but the spot stays where it is
Z12 = "38.21851414258813"         # metres per pixel at zoom 12


def run(*cmd):
    subprocess.run([str(c) for c in cmd], check=True)


def rasterize(src, layer, attr, where, out):
    """Polygons -> 25 m grid of `attr` (255 = none)."""
    gpkg = out.with_suffix(".gpkg")
    run("ogr2ogr", "-q", "-f", "GPKG", "-t_srs", CRS, "-nln", "x", *(["-where", where] if where else []), gpkg, src, layer)
    run("gdal_rasterize", "-q", "-l", "x", "-a", attr, "-te", *TE, "-tr", RES, RES,
        "-ot", "Byte", "-a_nodata", "255", "-init", "255", gpkg, out)
    with rasterio.open(out) as r:
        return r.read(1)


def main():
    meta = json.loads((DATA / "meta.json").read_text())
    day = next((k for k, d in enumerate(meta["days"]) if d["date"] == meta["weather_run"]), 0)
    with tempfile.TemporaryDirectory() as t:
        t = Path(t)
        # Today's score of every 250 m square that the map draws (open, partner trees).
        score = rasterize(DATA / "cells.pmtiles", "cells", f"s{day}", "closed = 0 AND g = 1", t / "score.tif")
        shade = rasterize(TILES / "shade50.pmtiles", "hotspots", "sh", None, t / "shade.tif")
        drawn = score != 255
        hole = drawn & (shade == 255)
        print(f"day {day} ({meta['weather_run']}): {hole.sum() / max(drawn.sum(), 1):.0%} of the drawn forest has no shade square")

        # Colour: each hole keeps its own 250 m square's colour, and the soft edge around it
        # carries that same colour (a blur of the hole colours only), never a neighbour's.
        stops = np.array([s for s, _ in STOPS], float)
        rgb_stops = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for _, c in STOPS], float)
        h = hole.astype("float32")
        wsum = gaussian_filter(h, BLUR_PX)
        s = np.where(hole, score, 0).astype("float32")
        rgb = np.empty((3, H, W), np.uint8)
        with np.errstate(invalid="ignore", divide="ignore"):
            for k in range(3):
                ch = np.interp(s, stops, rgb_stops[:, k]).astype("float32") * h
                rgb[k] = np.nan_to_num(gaussian_filter(ch, BLUR_PX) / wsum).clip(0, 255).round().astype(np.uint8)
        # Soft edges: the inside stays solid, the edge fades outwards over the shade.
        a = np.where(hole, 1.0, np.clip(wsum * 2.0, 0, 1))
        alpha = (a * 255).round().astype(np.uint8)
        rgb[:, alpha == 0] = 0
        with rasterio.open(t / "rgba.tif", "w", driver="GTiff", width=W, height=H, count=4, dtype="uint8",
                           crs=CRS, transform=from_origin(WEST, NORTH, RES, RES), compress="deflate",
                           photometric="RGB", alpha="UNASSOCIATED") as d:
            d.write(np.concatenate([rgb, alpha[None]]))
            d.colorinterp = [ColorInterp.red, ColorInterp.green, ColorInterp.blue, ColorInterp.alpha]

        # Web map tiles, zoom 11-12 (the map shows them from zoom 11.5 and enlarges them smoothly).
        run("gdalwarp", "-q", "-t_srs", "EPSG:3857", "-r", "bilinear", "-tr", Z12, Z12, "-tap",
            t / "rgba.tif", t / "merc.tif")
        run("gdal_translate", "-q", "-of", "MBTILES", "-co", "TILE_FORMAT=PNG8", "-co", "ZOOM_LEVEL_STRATEGY=LOWER",
            "-co", "RESAMPLING=BILINEAR", t / "merc.tif", t / "soft.mbtiles")
        run("gdaladdo", "-q", "-r", "average", t / "soft.mbtiles", "2")
        subprocess.run(["pmtiles", "convert", t / "soft.mbtiles", OUT], check=True, capture_output=True)
    print(f"-> {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    sys.exit(main())
