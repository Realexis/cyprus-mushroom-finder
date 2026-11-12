"""Export map data for the website.

PUBLIC  -> web/public/data/        (deployed: hexagons, rain squares, reserves, meta)
PRIVATE -> data/web-private/       (your Mac only: full 250 m cells. NEVER deployed.)

Run:  uv run python -m shroomy.export.web
"""
import json
import shutil
import subprocess
from datetime import date, datetime, timezone

import geopandas as gpd
import h3
import numpy as np
import rasterio
from pyproj import Transformer
from shapely.geometry import Polygon, box, mapping

from .. import config
from ..grid import habitat_grid
from ..score.today import latest_run, load_habitat, score_day

PUBLIC = config.ROOT / "web" / "public" / "data"
PRIVATE = config.DATA / "web-private"
N_DAYS = 8


def confidence(offset: int) -> str:
    c = config.load("scoring")["score"]["forecast_confidence"]
    if offset <= c["high_max_day"]:
        return "high"
    if offset <= c["medium_max_day"]:
        return "medium"
    return "low"


def _read(tif):
    with rasterio.open(tif) as src:
        return {src.descriptions[i]: src.read(i + 1) for i in range(src.count)}


def _write_geojson(path, features, ndigits=5):
    def rnd(o):
        if isinstance(o, float):
            return round(o, ndigits)
        if isinstance(o, (list, tuple)):
            return [rnd(x) for x in o]
        if isinstance(o, dict):
            return {k: rnd(v) for k, v in o.items()}
        return o
    path.write_text(json.dumps({"type": "FeatureCollection", "features": rnd(features)},
                               separators=(",", ":")))


def main():
    run = latest_run()
    w = np.load(run)
    today = date.fromisoformat(str(w["today"]))
    dates = [str(d) for d in w["dates"]]
    t0 = dates.index(today.isoformat())

    print("Scoring 8 days")
    days = []
    for off in range(N_DAYS):
        tif = score_day(run, off)
        days.append(_read(tif))
    hab = load_habitat()
    g = habitat_grid()
    to_ll = Transformer.from_crs(g.crs, "EPSG:4326", always_xy=True)
    pv = config.load("scoring")["public_view"]

    PUBLIC.mkdir(parents=True, exist_ok=True)
    PRIVATE.mkdir(parents=True, exist_ok=True)

    # ---------------------------------------------------------- public hexagons
    open_cells = hab["habitat_filter"] > 0
    rows, cols = np.nonzero(open_cells)
    lon, lat = to_ll.transform(g.west + (cols + 0.5) * g.res, g.north - (rows + 0.5) * g.res)
    hexes = np.array([h3.latlng_to_cell(la, lo, pv["h3_resolution"]) for la, lo in zip(lat, lon)])
    scores = np.stack([d["score"][rows, cols] for d in days], axis=1)          # (cells, 8)
    feats = []
    for hx in np.unique(hexes):
        m = hexes == hx
        if m.sum() < pv["min_open_forest_cells"]:
            continue
        s = np.nanmean(scores[m], axis=0)
        ring = [[lo, la] for la, lo in h3.cell_to_boundary(hx)]
        ring.append(ring[0])
        feats.append({"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [ring]},
                      "properties": {**{f"s{i}": int(round(v)) for i, v in enumerate(s)}}})
    _write_geojson(PUBLIC / "hexes.geojson", feats)
    print(f" - {len(feats)} public hexagons")

    # ---------------------------------------------------------- rain squares (3 km)
    half = config.load("region")["grids"]["weather_m"] / 2
    p = w["precip"]
    rfeats = []
    for i in range(len(w["x"])):
        x, y = float(w["x"][i]), float(w["y"][i])
        xs, ys = to_ll.transform([x - half, x + half, x + half, x - half, x - half],
                                 [y - half, y - half, y + half, y + half, y - half])
        props = {"r7": float(np.nansum(p[i, t0 - 6: t0 + 1])),
                 "r30": float(np.nansum(p[i, t0 - 29: t0 + 1]))}
        # Daily rain for the 30-day replay (oldest first) and the 8 forecast days.
        props["d"] = [round(float(v), 1) for v in p[i, t0 - 29: t0 + N_DAYS]]
        rfeats.append({"type": "Feature", "properties": props,
                       "geometry": {"type": "Polygon", "coordinates": [list(zip(xs, ys))]}})
    _write_geojson(PUBLIC / "rain.geojson", rfeats, ndigits=4)
    print(f" - {len(rfeats)} rain squares")

    # ---------------------------------------------------------- reserves + Natura 2000 (public info)
    nr = gpd.read_file(config.RAW / "vectors.gpkg", layer="nature_reserves").to_crs(4326)
    nr["geometry"] = nr.geometry.simplify(0.0002)
    nr[["siteName", "geometry"]].rename(columns={"siteName": "name"}).to_file(
        PUBLIC / "reserves.geojson", driver="GeoJSON", COORDINATE_PRECISION=5)

    # ---------------------------------------------------------- meta
    sources = config.load("sources")
    meta = {
        "generated_utc": datetime.now(timezone.utc).isoformat(timespec="minutes"),
        "weather_run": today.isoformat(),
        "model": str(w["model"]),
        "days": [{"offset": i, "date": dates[t0 + i], "confidence": confidence(i)}
                 for i in range(N_DAYS)],
        "rain_days": dates[t0 - 29: t0 + N_DAYS],
        "public_hexagon_resolution": pv["h3_resolution"],
        "credits": [{"name": v["name"], "credit": v["credit"], "licence": v["licence"],
                     "status": v["licence_status"], "use": v.get("use", "")}
                    for v in sources.values() if isinstance(v, dict) and "credit" in v],
        "safety": "Conditions only. Never eat a wild mushroom based on this map, an app or an AI.",
    }
    (PUBLIC / "meta.json").write_text(json.dumps(meta, indent=1))

    # ---------------------------------------------------------- PRIVATE 250 m cells (not deployed)
    allc = hab["forest_type"] > 0
    rows, cols = np.nonzero(allc)
    cfeats = []
    for r, c in zip(rows, cols):
        x0 = g.west + c * g.res; y1 = g.north - r * g.res
        xs, ys = to_ll.transform([x0, x0 + g.res, x0 + g.res, x0, x0], [y1, y1, y1 - g.res, y1 - g.res, y1])
        props = {f"s{i}": (None if not np.isfinite(d["score"][r, c]) else int(round(d["score"][r, c])))
                 for i, d in enumerate(days)}
        props["tree"] = int(hab["likely_tree"][r, c])
        props["elev"] = int(round(float(np.nan_to_num(hab["elevation_m"][r, c]))))
        props["closed"] = int(hab["habitat_filter"][r, c] == 0)
        cfeats.append({"type": "Feature", "properties": props,
                       "geometry": {"type": "Polygon", "coordinates": [list(zip(xs, ys))]}})
    gj = PRIVATE / "cells.geojson"
    _write_geojson(gj, cfeats)
    pm = PRIVATE / "cells.pmtiles"
    subprocess.run(["tippecanoe", "-q", "-f", "-o", str(pm), "-l", "cells", "-Z6", "-z13",
                    "--no-feature-limit", "--no-tile-size-limit", "--simplify-only-low-zooms",
                    "--detect-shared-borders", str(gj)], check=True)
    gj.unlink()
    print(f" - {len(cfeats)} private 250 m cells -> {pm}")


if __name__ == "__main__":
    main()
