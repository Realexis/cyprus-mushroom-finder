"""Terrain tiles for the website (hillshade now, 3D in Phase 5).

Encodes our Copernicus DEM as "Terrarium" PNG tiles:
    height = (R * 256 + G + B / 256) - 32768
Each zoom level is read straight from the DEM (no averaging of encoded colours).

Run:  uv run python -m shroomy.export.terrain
"""
import io
import math
import sqlite3
import subprocess

import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.transform import from_bounds as transform_from_bounds
from rasterio.warp import reproject

from .. import config

R = 20037508.342789244
TILE = 256
MINZOOM, MAXZOOM = 7, 12          # z12 ≈ 31 m pixels at Cyprus latitude, matching GLO-30


def tile_range(z, bbox):
    w, s, e, n = bbox
    def xy(lon, lat):
        k = 2 ** z
        x = int((lon + 180) / 360 * k)
        y = int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * k)
        return x, y
    x0, y0 = xy(w, n); x1, y1 = xy(e, s)
    return range(x0, x1 + 1), range(y0, y1 + 1)


def tile_bounds(z, x, y):
    size = 2 * R / 2 ** z
    return (-R + x * size, R - (y + 1) * size, -R + (x + 1) * size, R - y * size)


def encode(h):
    v = np.clip(np.nan_to_num(h, nan=0.0), -32768, 32767) + 32768.0
    r = np.floor(v / 256)
    g = np.floor(v - r * 256)
    b = np.floor((v - r * 256 - g) * 256)
    return np.dstack([r, g, b]).astype("uint8")


def main():
    bbox = config.load("region")["bbox_lonlat"]
    out_dir = config.ROOT / "web" / "public" / "tiles"
    out_dir.mkdir(parents=True, exist_ok=True)
    mb = config.DATA / "terrain.mbtiles"
    mb.unlink(missing_ok=True)
    db = sqlite3.connect(mb)
    db.execute("CREATE TABLE metadata (name TEXT, value TEXT)")
    db.execute("CREATE TABLE tiles (zoom_level INT, tile_column INT, tile_row INT, tile_data BLOB)")
    meta = {"name": "Cyprus terrain (Copernicus GLO-30, terrarium)", "format": "png",
            "type": "baselayer", "minzoom": MINZOOM, "maxzoom": MAXZOOM,
            "bounds": ",".join(map(str, bbox)),
            "attribution": config.load("sources")["dem"]["credit"]}
    db.executemany("INSERT INTO metadata VALUES (?,?)", [(k, str(v)) for k, v in meta.items()])

    n = 0
    with rasterio.open(config.PROCESSED / "dem_25m.tif") as src:
        dem = src.read(1)
        for z in range(MINZOOM, MAXZOOM + 1):
            xs, ys = tile_range(z, bbox)
            for x in xs:
                for y in ys:
                    h = np.full((TILE, TILE), -9999, "float32")
                    reproject(dem, h, src_transform=src.transform, src_crs=src.crs,
                              src_nodata=-9999, dst_transform=transform_from_bounds(
                                  *tile_bounds(z, x, y), TILE, TILE),
                              dst_crs="EPSG:3857", dst_nodata=-9999,
                              resampling=Resampling.bilinear)
                    h = np.where(h <= -9000, 0, np.maximum(h, 0))      # sea = 0 m
                    buf = io.BytesIO()
                    Image.fromarray(encode(h)).save(buf, "PNG", optimize=True)
                    db.execute("INSERT INTO tiles VALUES (?,?,?,?)",
                               (z, x, 2 ** z - 1 - y, buf.getvalue()))
                    n += 1
            print(f" - z{z}: {len(xs) * len(ys)} tiles")
    db.commit(); db.close()
    out = out_dir / "terrain.pmtiles"
    subprocess.run(["pmtiles", "convert", str(mb), str(out)], check=True, capture_output=True)
    mb.unlink()
    print(f"{n} tiles -> {out} ({out.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
