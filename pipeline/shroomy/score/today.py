"""Score every 250 m forest cell for one day (v1, rule-based).

Run:  uv run python -m shroomy.score.today [YYYY-MM-DD]

Output: data/processed/scores/score_<day>.tif (score + every factor, named bands)
        data/processed/scores/score_<day>.json (summary numbers)
"""
import json
import sys
from datetime import date

import numpy as np
import rasterio
from scipy.spatial import cKDTree

from .. import config
from ..grid import habitat_grid
from . import factors as F
from .downscale import Interpolator
from .species import general_habitat

OUT = config.PROCESSED / "scores"


def load_habitat():
    with rasterio.open(config.PROCESSED / "habitat_250m.tif") as src:
        return {src.descriptions[i]: src.read(i + 1) for i in range(src.count)}


def day_factors(S, w, t, interp, elev, band, shade, month, clim=None):
    """The six factors (0..1) and their raw inputs for every cell on day index t.

    S = the "score" part of scoring.yaml. w = a weather run (points x days).
    clim = the soil climatology, or None (no soil data: the soil factor is NaN).
    Shared by the daily score and the backtest (backtest_v1.py), so both use the same maths.
    """
    lapse = S["temperature"]["lapse_rate_c_per_km"]

    # --- rain (per point, then spread)
    p = w["precip"]
    rt = S["rain_total"]; rp = S["rain_pulse"]
    rain30 = interp(F.rain_total(p, t, rt["days"]))
    rain7 = interp(F.rain_total(p, t, 7))
    pulse_pt, _ = F.rain_pulse(p, t, rp["window_days"], rp["min_days_ago"], rp["max_days_ago"])
    pulse = interp(pulse_pt)

    # --- temperature: to sea level at the points, spread, then back up to each cell's height
    tc = S["temperature"]
    days = slice(t - tc["days"] + 1, t + 1)
    t0 = F.to_sea_level(w["tmean"][:, days], w["elev_om"][:, None], lapse)
    tmin0 = F.to_sea_level(w["tmin"][:, days], w["elev_om"][:, None], lapse)
    tmean_cells = F.from_sea_level(interp(t0), elev[:, None], lapse)
    tmin_cells = F.from_sea_level(interp(tmin0), elev[:, None], lapse)
    t7 = tmean_cells.mean(axis=1)
    frost = (tmin_cells <= tc["frost_threshold_c"]).sum(axis=1)

    # --- soil moisture percentile vs the nearest climatology point (same model)
    sm = S["soil_moisture"]
    if clim is not None and np.isfinite(w["soil"][:, t]).any():
        _, nn = cKDTree(np.c_[clim["x"], clim["y"]]).query(np.c_[w["x"], w["y"]])
        soil_pct_pt = F.percentile_in(w["soil"][:, t], clim["sorted_values"][nn])
        soil_pct = interp(np.nan_to_num(soil_pct_pt, nan=np.nanmedian(soil_pct_pt)))
        f_soil = F.ramp(soil_pct, sm["zero_at_percentile"], sm["full_at_percentile"])
    else:
        soil_pct = np.full(len(elev), np.nan)
        f_soil = np.full(len(elev), np.nan)

    f = {
        "rain_total": F.ramp(rain30, rt["zero_below_mm"], rt["full_at_mm"]),
        "rain_pulse": F.ramp(pulse, rp["zero_below_mm"], rp["full_at_mm"]),
        "temperature": F.temperature_factor(t7, frost, tc),
        "soil_moisture": f_soil,
        "season_altitude": F.season_factor(month, band, S["season_altitude"]),
        "shade": np.nan_to_num(shade, nan=0.0),
    }
    inputs = {"rain_30d_mm": rain30, "rain_7d_mm": rain7, "pulse_mm": pulse, "t7_mean_c": t7,
              "frost_days": frost, "soil_percentile": soil_pct}
    return f, inputs


def water_gate(S, precip, t, interp):
    """Per cell: (gate 0..1, biggest 3-day rain in the last 30 days in mm). Gate = 1 when off."""
    g = S.get("water_gate") or {}
    big = interp(F.max_window_rain(precip, t, g.get("days", 30), S["rain_pulse"]["window_days"]))
    gate = F.water_gate(big, g["full_at_mm"]) if g.get("enabled") else np.ones_like(big)
    return gate, big


def score_day(run_file, day_offset=0):
    """Score day `today + day_offset` using the weather run in `run_file`."""
    S = config.load("scoring")["score"]
    w = np.load(run_file)
    dates = [str(d) for d in w["dates"]]
    t = dates.index(str(w["today"])) + day_offset
    day = date.fromisoformat(dates[t])

    g = habitat_grid()
    hab = load_habitat()
    land = hab["land_fraction"] > 0.5
    rows, cols = np.nonzero(land)                         # score all land (rain layer too)
    cx = g.west + (cols + 0.5) * g.res
    cy = g.north - (rows + 0.5) * g.res
    interp = Interpolator(np.c_[w["x"], w["y"]], np.c_[cx, cy])
    elev = np.nan_to_num(hab["elevation_m"][rows, cols], nan=0.0)

    clim = np.load(config.PROCESSED / "weather" / "soil_climatology.npz")
    f, inputs = day_factors(S, w, t, interp, elev, hab["altitude_band"][rows, cols].astype(int),
                            hab["shade_score"][rows, cols], day.month, clim)
    rain30, rain7, pulse = inputs["rain_30d_mm"], inputs["rain_7d_mm"], inputs["pulse_mm"]
    t7, frost, soil_pct = inputs["t7_mean_c"], inputs["frost_days"], inputs["soil_percentile"]
    # [S7] general map: open forest with a partner tree only (not "Other broadleaf").
    general = general_habitat(hab["habitat_filter"], hab["likely_tree"], S["general_map_trees"])
    gate, rain3_max = water_gate(S, w["precip"], t, interp)
    score = F.combine(f, S["weights"], general[rows, cols]) * gate

    # --- write a raster with named bands
    layers = {"score": score, **{f"f_{k}": v for k, v in f.items()},
              "rain_30d_mm": rain30, "rain_7d_mm": rain7, "pulse_mm": pulse,
              "t7_mean_c": t7, "frost_days": frost, "soil_percentile": soil_pct,
              "water_gate": gate, "rain3_max_mm": rain3_max}
    OUT.mkdir(parents=True, exist_ok=True)
    tif = OUT / f"score_{day.isoformat()}.tif"
    prof = dict(driver="GTiff", width=g.width, height=g.height, count=len(layers), dtype="float32",
                crs=g.crs, transform=g.transform, nodata=np.nan, compress="deflate", predictor=3,
                tiled=True)
    with rasterio.open(tif, "w", **prof) as dst:
        for i, (name, v) in enumerate(layers.items(), start=1):
            a = np.full((g.height, g.width), np.nan, "float32")
            a[rows, cols] = v
            if name == "score":
                a[~general] = np.nan                            # general score: partner-tree forest
            elif name.startswith("f_"):
                a[hab["habitat_filter"] == 0] = np.nan          # factors on all open forest (species)
            dst.write(a, i)
            dst.set_band_description(i, name)

    hf = general[rows, cols]
    summ = {"day": day.isoformat(), "run": str(w["today"]), "day_offset": day_offset,
            "model": str(w["model"]),
            "forest_cells": int(hf.sum()),
            "score": {q: float(np.percentile(score[hf], v)) for q, v in
                      (("p10", 10), ("median", 50), ("p90", 90), ("max", 100))},
            "cells_score_60_plus": int((score[hf] >= 60).sum()),
            "factor_means_forest": {k: float(np.mean(v[hf])) for k, v in f.items()},
            "inputs_forest_median": {"rain_30d_mm": float(np.median(rain30[hf])),
                                     "rain_7d_mm": float(np.median(rain7[hf])),
                                     "pulse_mm": float(np.median(pulse[hf])),
                                     "t7_mean_c": float(np.median(t7[hf])),
                                     "frost_days": float(np.median(frost[hf])),
                                     "soil_percentile": float(np.median(soil_pct[hf])),
                                     "rain3_max_mm": float(np.median(rain3_max[hf])),
                                     "water_gate": float(np.median(gate[hf]))},
            "island_rain_30d_mm_max": float(rain30.max())}
    (OUT / f"score_{day.isoformat()}.json").write_text(json.dumps(summ, indent=2))
    print(json.dumps(summ, indent=2))
    return tif


def latest_run():
    runs = sorted((config.PROCESSED / "weather").glob("run_*.npz"))
    if not runs:
        raise SystemExit("No weather run yet: uv run python -m shroomy.weather.fetch")
    return runs[-1]


if __name__ == "__main__":
    off = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    score_day(latest_run(), off)
