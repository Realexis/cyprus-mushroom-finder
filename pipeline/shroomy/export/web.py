"""Export map data for the website.

PUBLIC  -> web/public/data/   (deployed daily: hexagons, rain squares, reserves, meta, summary.json)
PRIVATE -> data/web-private/  (your Mac only: full 250 m cells. NEVER deployed.)

Run:  uv run python -m shroomy.export.web            # public + private (on your Mac)
      uv run python -m shroomy.export.web --public   # public only (what the daily robot runs)
"""
import json
import shutil
import subprocess
import sys
from datetime import date, datetime, timezone

import h3
import numpy as np
import rasterio
from pyproj import Transformer
from scipy.spatial import cKDTree

from .. import config
from ..grid import habitat_grid
from ..score import clock
from ..score.today import latest_run, load_habitat, score_day
from . import summary

PUBLIC = config.ROOT / "web" / "public" / "data"
PRIVATE = config.DATA / "web-private"
STATIC = config.DATA / "static"
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


def _rnd(o, nd):
    if isinstance(o, float):
        return round(o, nd)
    if isinstance(o, (list, tuple)):
        return [_rnd(x, nd) for x in o]
    if isinstance(o, dict):
        return {k: _rnd(v, nd) for k, v in o.items()}
    return o


def _write_geojson(path, features, ndigits=5):
    path.write_text(json.dumps({"type": "FeatureCollection", "features": _rnd(features, ndigits)},
                               separators=(",", ":")))


def clock_days(w, t0):
    """Days since the last soaking rain at each weather point, for day offsets 0..7."""
    S = config.load("scoring")["score"]
    rp, mc = S["rain_pulse"], S["mushroom_clock"]
    return np.stack([clock.days_since_soak(w["precip"], t0 + k, rp["window_days"],
                                           rp["soaking_event_mm"], mc["wet_day_mm"])
                     for k in range(N_DAYS)], axis=1)                      # (points, 8)


def build(run, private=True):
    w = np.load(run)
    today = date.fromisoformat(str(w["today"]))
    dates = [str(d) for d in w["dates"]]
    t0 = dates.index(today.isoformat())
    S = config.load("scoring")
    pv = S["public_view"]

    print("Scoring 8 days")
    days = [_read(score_day(run, off)) for off in range(N_DAYS)]
    hab = load_habitat()
    g = habitat_grid()
    to_ll = Transformer.from_crs(g.crs, "EPSG:4326", always_xy=True)
    clk_pt = clock_days(w, t0)
    pt_tree = cKDTree(np.c_[w["x"], w["y"]])

    PUBLIC.mkdir(parents=True, exist_ok=True)

    # ---------------------------------------------------------- hexagons (public)
    open_cells = hab["habitat_filter"] > 0
    rows, cols = np.nonzero(open_cells)
    cx = g.west + (cols + 0.5) * g.res
    cy = g.north - (rows + 0.5) * g.res
    lon, lat = to_ll.transform(cx, cy)
    hexes = np.array([h3.latlng_to_cell(la, lo, pv["h3_resolution"]) for la, lo in zip(lat, lon)])
    order = np.argsort(hexes, kind="stable")
    uh, starts = np.unique(hexes[order], return_index=True)
    groups = np.split(order, starts[1:])

    score = np.stack([d["score"][rows, cols] for d in days], axis=1)
    fac_names = ["rain_total", "rain_pulse", "temperature", "soil_moisture", "season_altitude", "shade"]
    inputs = ["rain_30d_mm", "pulse_mm", "t7_mean_c", "soil_percentile", "frost_days"]
    fac = {k: np.stack([d[f"f_{k}"][rows, cols] for d in days], axis=1) for k in fac_names}
    inp = {k: np.stack([d[k][rows, cols] for d in days], axis=1) for k in inputs}
    tree = hab["likely_tree"][rows, cols].astype(int)
    elev = hab["elevation_m"][rows, cols]

    feats, zones = [], []
    for hx, m in zip(uh, groups):
        if len(m) < pv["min_open_forest_cells"]:
            continue
        s = np.nanmean(score[m], axis=0)
        _, ip = pt_tree.query([cx[m].mean(), cy[m].mean()])
        ring = [[lo, la] for la, lo in h3.cell_to_boundary(hx)]
        ring.append(ring[0])
        props = {f"s{i}": int(round(v)) for i, v in enumerate(s)}
        props.update({f"p{i}": int(clk_pt[ip, i]) for i in range(N_DAYS)})
        feats.append({"type": "Feature", "properties": props,
                      "geometry": {"type": "Polygon", "coordinates": [ring]}})
        clat, clon = h3.cell_to_latlng(hx)
        trees = np.bincount(tree[m], minlength=6)[1:]
        zones.append({
            "hex": hx, "lat": clat, "lon": clon, "score": s,
            "factors": {k: np.nanmean(fac[k][m], axis=0) for k in fac_names},
            "inputs": {k: np.nanmean(inp[k][m], axis=0) for k in inputs},
            "clock": clk_pt[ip],
            "trees": trees / trees.sum(),
            "alt": (float(np.nanmin(elev[m])), float(np.nanmax(elev[m]))),
        })
    _write_geojson(PUBLIC / "hexes.geojson", feats)
    print(f" - {len(feats)} public hexagons")

    # ---------------------------------------------------------- rain squares (public)
    half = config.load("region")["grids"]["weather_m"] / 2
    p = w["precip"]
    rfeats = []
    for i in range(len(w["x"])):
        x, y = float(w["x"][i]), float(w["y"][i])
        xs, ys = to_ll.transform([x - half, x + half, x + half, x - half, x - half],
                                 [y - half, y - half, y + half, y + half, y - half])
        props = {"r7": float(np.nansum(p[i, t0 - 6: t0 + 1])),
                 "r30": float(np.nansum(p[i, t0 - 29: t0 + 1])),
                 "d": [round(float(v), 1) for v in p[i, t0 - 29: t0 + N_DAYS]]}
        rfeats.append({"type": "Feature", "properties": props,
                       "geometry": {"type": "Polygon", "coordinates": [list(zip(xs, ys))]}})
    _write_geojson(PUBLIC / "rain.geojson", rfeats, ndigits=4)

    # ---------------------------------------------------------- reserves (public info)
    shutil.copy(STATIC / "reserves.geojson", PUBLIC / "reserves.geojson")

    # ---------------------------------------------------------- meta + summary
    sources = config.load("sources")
    mc = S["score"]["mushroom_clock"]
    day_info = [{"offset": i, "date": dates[t0 + i], "confidence": confidence(i)} for i in range(N_DAYS)]
    meta = {
        "generated_utc": datetime.now(timezone.utc).isoformat(timespec="minutes"),
        "weather_run": today.isoformat(), "model": str(w["model"]),
        "days": day_info, "rain_days": dates[t0 - 29: t0 + N_DAYS],
        "public_hexagon_resolution": pv["h3_resolution"],
        "clock": {"opens": mc["window_opens_days_after_pulse"], "closes": mc["window_closes_days_after_pulse"],
                  "soak_mm": S["score"]["rain_pulse"]["soaking_event_mm"]},
        "credits": [{"name": v["name"], "credit": v["credit"], "licence": v["licence"],
                     "status": v["licence_status"], "use": v.get("use", "")}
                    for v in sources.values() if isinstance(v, dict) and "credit" in v],
        "safety": "Conditions only. Never eat a wild mushroom based on this map, an app or an AI.",
    }
    (PUBLIC / "meta.json").write_text(json.dumps(meta, indent=1))
    summ = summary.build(zones, day_info, meta)
    (PUBLIC / "summary.json").write_text(json.dumps(summ, indent=1, ensure_ascii=False))
    print(f" - summary.json: top {len(summ['days'][0]['top_zones'])} zones per day")

    if private:
        export_private(days, hab, g, to_ll, clk_pt, pt_tree)


def export_private(days, hab, g, to_ll, clk_pt, pt_tree):
    """Full 250 m cells -> PMTiles, for the private view on this Mac only."""
    PRIVATE.mkdir(parents=True, exist_ok=True)
    rows, cols = np.nonzero(hab["forest_type"] > 0)
    _, near_pt = pt_tree.query(np.c_[g.west + (cols + 0.5) * g.res, g.north - (rows + 0.5) * g.res])
    feats = []
    for r, c in zip(rows, cols):
        x0 = g.west + c * g.res; y1 = g.north - r * g.res
        xs, ys = to_ll.transform([x0, x0 + g.res, x0 + g.res, x0, x0], [y1, y1, y1 - g.res, y1 - g.res, y1])
        props = {f"s{i}": (None if not np.isfinite(d["score"][r, c]) else int(round(d["score"][r, c])))
                 for i, d in enumerate(days)}
        props.update({f"p{i}": int(clk_pt[near_pt[len(feats)], i]) for i in range(N_DAYS)})
        props["tree"] = int(hab["likely_tree"][r, c])
        props["elev"] = int(round(float(np.nan_to_num(hab["elevation_m"][r, c]))))
        props["closed"] = int(hab["habitat_filter"][r, c] == 0)
        feats.append({"type": "Feature", "properties": props,
                      "geometry": {"type": "Polygon", "coordinates": [list(zip(xs, ys))]}})
    gj = PRIVATE / "cells.geojson"
    _write_geojson(gj, feats)
    subprocess.run(["tippecanoe", "-q", "-f", "-o", str(PRIVATE / "cells.pmtiles"), "-l", "cells",
                    "-Z6", "-z13", "--no-feature-limit", "--no-tile-size-limit",
                    "--simplify-only-low-zooms", "--detect-shared-borders", str(gj)], check=True)
    gj.unlink()
    print(f" - {len(feats)} private 250 m cells (this Mac only)")


if __name__ == "__main__":
    build(latest_run(), private="--public" not in sys.argv)
