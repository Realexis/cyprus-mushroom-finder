"""Shroomy Lab: the 50 m heat map (one colour scale close up).

Each 50 m patch gets its 250 m square's score for today, moved up or down by how much shadier
or sunnier the patch is than its square (config/lab.yaml: an educated GUESS, not from the brief).
The picture uses the SAME colours as the 250 m squares, so a colour always means the same number.
The card works the number out again with the same rule (web/src/map/heat50.ts).

In:  web/public/data/cells.pmtiles + cells_info.bin (today's scores and their shade part),
     web/public/tiles/shade50.pmtiles (fixed 50 m shade), web/src/map/layers.ts (the colours)
Out: web/public/data/heat50.pmtiles (image tiles, zoom 11-13) and heat50.json
Run: cd pipeline && uv run python ../scripts/lab-heat50.py          (about a minute)
Needs GDAL and the pmtiles tool (Homebrew).
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import rasterio
import yaml
from rasterio.enums import ColorInterp
from rasterio.transform import from_origin

ROOT = Path(__file__).resolve().parent.parent
DATA, TILES = ROOT / "web/public/data", ROOT / "web/public/tiles"
OUT = DATA / "heat50.pmtiles"
# The project's grid (pipeline/shroomy/grid.py) at 50 m.
CRS, WEST, NORTH, RES, W, H = "EPSG:32636", 426500, 3957500, 50, 4500, 2795
TE = [str(v) for v in (WEST, NORTH - H * RES, WEST + W * RES, NORTH)]
Z13 = "19.109257071294063"        # metres per pixel at zoom 13
# How solid a colour is drawn (cellOpacity in web/src/map/layers.ts).
OPACITY = [(0, 0.62), (50, 0.7), (65, 0.85), (80, 0.95)]


def run(*cmd):
    subprocess.run([str(c) for c in cmd], check=True)


def rasterize(src, layer, attr, where, out, dtype="Int32"):
    """Polygons -> 50 m grid of `attr` (-1 = none)."""
    gpkg = out.with_suffix(".gpkg")
    if not gpkg.exists():
        run("ogr2ogr", "-q", "-f", "GPKG", "-t_srs", CRS, "-nln", "x", *(["-where", where] if where else []), gpkg, src, layer)
    run("gdal_rasterize", "-q", "-l", "x", "-a", attr, "-te", *TE, "-tr", RES, RES,
        "-ot", dtype, "-a_nodata", "-1", "-init", "-1", gpkg, out)
    with rasterio.open(out) as r:
        return r.read(1)


def score_stops():
    """SCORE_STOPS from the map code, so the picture can never drift from the 250 m colours."""
    ts = (ROOT / "web/src/map/layers.ts").read_text()
    body = re.search(r"SCORE_STOPS[^=]*=\s*\[(.*?)\];", ts, re.S).group(1)
    return [(float(v), c) for v, c in re.findall(r'\[(\d+),\s*"(#[0-9a-fA-F]{6})"\]', body)]


def heat50(score, sh50, sh250, strength):
    """The rule. Same as web/src/map/heat50.ts (round half up)."""
    v = score * (1 + strength * (sh50 - sh250) / 100)
    return np.clip(np.floor(v + 0.5), 0, 100)


def main():
    strength = float(yaml.safe_load((ROOT / "config/lab.yaml").read_text())["heat50"]["shade_strength"])
    meta = json.loads((DATA / "meta.json").read_text())
    day = next((k for k, d in enumerate(meta["days"]) if d["date"] == meta["weather_run"]), 0)
    ix = json.loads((DATA / "cells_info.json").read_text())
    nf, ni = len(ix["factors"]), len(ix["inputs"])
    info = np.fromfile(DATA / "cells_info.bin", dtype="<i2").reshape(-1, ix["days"] * (nf + ni) + 2)
    sh250 = info[:, day * (nf + ni) + ix["factors"].index("shade")].astype("float32")     # x100, -1 = none

    with tempfile.TemporaryDirectory() as t:
        t = Path(t)
        drawn_where = "closed = 0 AND g = 1"          # the squares the map draws
        idx = rasterize(DATA / "cells.pmtiles", "cells", "i", drawn_where, t / "idx.tif")
        score = rasterize(DATA / "cells.pmtiles", "cells", f"s{day}", drawn_where, t / "score.tif").astype("float32")
        shade = rasterize(TILES / "shade50.pmtiles", "hotspots", "sh", None, t / "shade.tif").astype("float32")
        drawn = (idx >= 0) & (score >= 0)
        ref = np.where(drawn, sh250[np.clip(idx, 0, None)], -1)
        refine = drawn & (shade >= 0) & (ref >= 0)
        v = np.where(refine, heat50(score, shade, ref, strength), score)
        ch = (v - score)[refine]
        print(f"day {day} ({meta['weather_run']}), strength {strength}: {refine.sum():,} patches refined, "
              f"{(drawn & ~refine).sum():,} keep their square's score")
        print("change in points: 1% {:.0f}, 5% {:.0f}, middle {:.0f}, 95% {:.0f}, 99% {:.0f}".format(*np.percentile(ch, [1, 5, 50, 95, 99])))

        stops = score_stops()
        xs = np.array([s for s, _ in stops])
        rgb_stops = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for _, c in stops], float)
        rgba = np.zeros((4, H, W), np.uint8)
        for k in range(3):
            rgba[k] = np.where(drawn, np.interp(v, xs, rgb_stops[:, k]).round(), 0)
        rgba[3] = np.where(drawn, (np.interp(v, [a for a, _ in OPACITY], [b for _, b in OPACITY]) * 255).round(), 0)
        with rasterio.open(t / "rgba.tif", "w", driver="GTiff", width=W, height=H, count=4, dtype="uint8",
                           crs=CRS, transform=from_origin(WEST, NORTH, RES, RES), compress="deflate",
                           photometric="RGB", alpha="UNASSOCIATED") as d:
            d.write(rgba)
            d.colorinterp = [ColorInterp.red, ColorInterp.green, ColorInterp.blue, ColorInterp.alpha]

        # Web map tiles, zoom 11-13. "near" keeps every patch one flat colour with sharp edges.
        run("gdalwarp", "-q", "-t_srs", "EPSG:3857", "-r", "near", "-tr", Z13, Z13, "-tap", t / "rgba.tif", t / "merc.tif")
        run("gdal_translate", "-q", "-of", "MBTILES", "-co", "TILE_FORMAT=PNG", "-co", "ZOOM_LEVEL_STRATEGY=LOWER",
            "-co", "RESAMPLING=NEAREST", t / "merc.tif", t / "heat.mbtiles")
        run("gdaladdo", "-q", "-r", "nearest", t / "heat.mbtiles", "2", "4")
        OUT.unlink(missing_ok=True)
        subprocess.run(["pmtiles", "convert", t / "heat.mbtiles", OUT], check=True, capture_output=True)

    (DATA / "heat50.json").write_text(json.dumps({
        "weather_run": meta["weather_run"], "generated_utc": meta["generated_utc"], "day": day,
        "shade_strength": strength,
        "rule": "patch score = square score x (1 + shade_strength x (patch shade - square shade) / 100), kept in 0-100",
        "note": "An educated guess (Shroomy Lab). Weather, soil and season are those of the 250 m square.",
    }, indent=1) + "\n")
    print(f"-> {OUT} ({OUT.stat().st_size / 1e6:.1f} MB) + heat50.json")


if __name__ == "__main__":
    sys.exit(main())
