"""Build the 250 m habitat layer from the cached raw data.

Output: data/processed/habitat_250m.tif (one band per layer, named) +
        data/processed/habitat_legend.json (what each code means).

Run:  uv run python -m shroomy.habitat.build
"""
import json
from datetime import date

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.features import rasterize
from rasterio.vrt import WarpedVRT

from .. import config
from ..grid import block_mean, habitat_grid
from . import terrain

# ---------------------------------------------------------------- codes
TREE = {0: "none", 1: "Calabrian pine (likely)", 2: "Troodos black pine (likely)",
        3: "Golden oak (likely)", 4: "Other broadleaf", 5: "Tripylos cedar zone (closed)"}
FOREST = {0: "none", 1: "conifer", 2: "broadleaf"}
BAND = {0: "none", 1: "low", 2: "mid", 3: "high"}


def classify(elev, conifer_frac, broad_frac, igneous_frac, in_reserve_name, hcfg):
    """Pure rule set: forest type, likely tree, altitude band, habitat filter.

    in_reserve_name: array of reserve names ('' = not in a reserve).
    All thresholds come from config/scoring.yaml -> habitat.
    """
    t = hcfg["trees"]
    forest_frac = conifer_frac + broad_frac
    is_forest = forest_frac >= hcfg["forest_min_fraction"]
    conifer = is_forest & (conifer_frac >= broad_frac)
    broad = is_forest & ~conifer
    igneous = igneous_frac >= t["igneous_min_fraction"]

    forest = np.where(conifer, 1, np.where(broad, 2, 0)).astype("uint8")

    tree = np.zeros(elev.shape, "uint8")
    tree[conifer] = 1                                                    # Calabrian pine
    black = conifer & igneous & (elev >= t["black_pine_min_m"])          # [BRIEF] >1,200 m in Troodos
    tree[black] = 2
    tree[broad & igneous] = 3                                            # golden oak
    tree[broad & ~igneous] = 4
    # Cyprus cedar: Tripylos, 900-1,400 m [BRIEF]. Inside a closed reserve.
    cedar = conifer & (np.char.find(in_reserve_name.astype(str), "Tripylos") >= 0) \
        & (elev >= 900) & (elev <= 1400)
    tree[cedar] = 5

    b = hcfg["altitude_bands"]
    band = np.where(elev >= b["high_min_m"], 3, np.where(elev >= b["mid_min_m"], 2, 1)).astype("uint8")
    band[~np.isfinite(elev)] = 0

    reserve = in_reserve_name != ""
    habitat_filter = (is_forest & ~reserve).astype("uint8")             # reserves score 0 [BRIEF]
    return forest, tree, band, habitat_filter


# ---------------------------------------------------------------- terrain -> 250 m
def terrain_layers(g250, hcfg):
    s = hcfg["shade"]
    with rasterio.open(config.PROCESSED / "dem_25m.tif") as src:
        dem = src.read(1).astype("float32")
        res = src.res[0]
    # Copernicus DEM stores the sea as 0 m, so land = above 0 m.
    land = (dem > -9000) & (dem > 0)
    dem_f = np.where(land, dem, 0).astype("float32")

    print(" - slope and aspect")
    slope, aspect = terrain.slope_aspect(dem_f, res)
    facing = terrain.facing_score(slope, aspect, s["facing_best_azimuth_deg"],
                                  s["facing_full_effect_slope_deg"])
    print(" - valley index (TPI)")
    tpi = terrain.tpi(dem_f, res, s["valley_radius_m"])
    valley = terrain.valley_score(tpi, s["valley_full_effect_m"])

    print(" - autumn sun + cast shadows")
    lon, lat = g250.cell_centres_lonlat()
    suns = terrain.sun_positions(float(np.mean(lat)), float(np.mean(lon)),
                                 date.fromisoformat(s["autumn_sun_date"]),
                                 s["autumn_sun_hours_local"], s["utc_offset_hours"])
    illum = np.zeros(dem.shape, "float32")
    flat = 0.0
    for az, el in suns:
        print(f"   sun az {az:5.1f}  el {el:4.1f}")
        i = terrain.illumination(slope, aspect, az, el)
        if s["cast_shadows"]:
            i[terrain.cast_shadow(dem_f, res, az, el, s["shadow_max_distance_m"])] = 0
        illum += i
        flat += max(np.sin(np.radians(el)), 0)
    illum /= len(suns)
    flat /= len(suns)
    low_sun = terrain.low_sun_score(illum, flat)
    shade = terrain.combine_shade(facing, valley, low_sun, s["weights"])

    k = int(round(g250.res / res))
    nan = lambda a: np.where(land, a, np.nan)
    # Mean aspect as a vector (averaging compass degrees directly is wrong).
    ax = block_mean(nan(np.sin(np.radians(aspect))), k)
    ay = block_mean(nan(np.cos(np.radians(aspect))), k)
    out = {
        "elevation_m": block_mean(nan(dem_f), k),
        "slope_deg": block_mean(nan(slope), k),
        "aspect_deg": (np.degrees(np.arctan2(ax, ay)) % 360).astype("float32"),
        "hillshade_autumn": block_mean(nan(illum / max(flat, 1e-6)), k),
        "tpi_m": block_mean(nan(tpi), k),
        "facing_score": block_mean(nan(facing), k),
        "valley_score": block_mean(nan(valley), k),
        "low_sun_score": block_mean(nan(low_sun), k),
        "shade_score": block_mean(nan(shade), k),
        "land_fraction": block_mean(land.astype("float32"), k),
    }
    # A 50 m hillshade for previews.
    out["_hillshade_50m"] = block_mean(nan(terrain.illumination(slope, aspect, 315, 45)), 2)
    return out


# ---------------------------------------------------------------- forest -> 250 m
def forest_fractions(g250):
    """Share of conifer and broadleaf 10 m pixels inside each 250 m cell."""
    g10 = g250.at(10)
    with rasterio.open(config.RAW / "forest_type" / "forest_type.vrt") as src:
        with WarpedVRT(src, crs=g10.crs, transform=g10.transform, width=g10.width,
                       height=g10.height, resampling=Resampling.nearest, nodata=255) as v:
            fty = v.read(1)
    k = 25
    con = block_mean((fty == 2).astype("float32"), k)
    brd = block_mean((fty == 1).astype("float32"), k)
    return con, brd


# ---------------------------------------------------------------- vectors -> 250 m
def vector_layers(g250, hcfg):
    gpkg = config.RAW / "vectors.gpkg"
    shape = (g250.height, g250.width)
    nr = gpd.read_file(gpkg, layer="nature_reserves")
    n2k = gpd.read_file(gpkg, layer="natura2000")
    geo = gpd.read_file(gpkg, layer="geology")

    # Reserves: a cell touching a reserve counts as closed (err on the safe side).
    names = np.array(sorted(nr["siteName"].unique()))
    idx = rasterize(((geom, i + 1) for geom, i in zip(nr.geometry, nr["siteName"].map(
        {n: j for j, n in enumerate(names)}))), out_shape=shape, transform=g250.transform,
        all_touched=True, dtype="uint8")
    reserve_name = np.where(idx > 0, np.concatenate([[""], names])[idx], "")
    reserve_name[idx == 0] = ""

    natura = rasterize(((g, 1) for g in n2k.geometry), out_shape=shape,
                       transform=g250.transform, all_touched=False, dtype="uint8")

    # Troodos igneous rock: rasterize at 25 m, then share per 250 m cell.
    units = set(hcfg["trees"]["troodos_igneous_units"])
    ign = geo[geo["unit"].isin(units)]
    g25 = g250.at(25)
    ig25 = rasterize(((g, 1) for g in ign.geometry), out_shape=(g25.height, g25.width),
                     transform=g25.transform, dtype="uint8")
    igneous_frac = block_mean(ig25.astype("float32"), 10)
    return reserve_name, idx, list(names), natura, igneous_frac


# ---------------------------------------------------------------- main
def main():
    hcfg = config.load("scoring")["habitat"]
    g = habitat_grid()
    print(f"Grid: {g.width} x {g.height} cells of {g.res:.0f} m")

    t = terrain_layers(g, hcfg)
    print(" - forest fractions")
    con, brd = forest_fractions(g)
    print(" - reserves, Natura 2000, geology")
    reserve_name, reserve_id, reserve_names, natura, igneous_frac = vector_layers(g, hcfg)

    forest, tree, band, hfilter = classify(t["elevation_m"], con, brd, igneous_frac,
                                           reserve_name, hcfg)
    land = t["land_fraction"] > 0.5
    for a in (forest, tree, band, hfilter):
        a[~land] = 0

    layers = {
        "habitat_filter": hfilter, "forest_type": forest, "likely_tree": tree,
        "altitude_band": band, "reserve_id": reserve_id, "natura2000": natura,
        "conifer_fraction": con, "broadleaf_fraction": brd, "igneous_fraction": igneous_frac,
        **{k: v for k, v in t.items() if not k.startswith("_")},
    }
    out = config.PROCESSED / "habitat_250m.tif"
    prof = dict(driver="GTiff", width=g.width, height=g.height, count=len(layers),
                dtype="float32", crs=g.crs, transform=g.transform, nodata=np.nan,
                compress="deflate", predictor=3, tiled=True)
    with rasterio.open(out, "w", **prof) as dst:
        for i, (name, arr) in enumerate(layers.items(), start=1):
            dst.write(arr.astype("float32"), i)
            dst.set_band_description(i, name)

    with rasterio.open(config.PROCESSED / "hillshade_50m.tif", "w", driver="GTiff",
                       width=t["_hillshade_50m"].shape[1], height=t["_hillshade_50m"].shape[0],
                       count=1, dtype="float32", crs=g.crs, nodata=np.nan, compress="deflate",
                       transform=g.at(50).transform) as dst:
        dst.write(t["_hillshade_50m"].astype("float32"), 1)

    legend = {"likely_tree": TREE, "forest_type": FOREST, "altitude_band": BAND,
              "reserve_id": {0: "none", **{i + 1: n for i, n in enumerate(reserve_names)}},
              "habitat_filter": {0: "no habitat or closed reserve", 1: "forest habitat, open"},
              "note": "likely_tree is inferred from forest type + altitude + geology, not a tree survey."}
    (config.PROCESSED / "habitat_legend.json").write_text(json.dumps(legend, indent=2))

    # A short summary for the report.
    cell_km2 = (g.res / 1000) ** 2
    summ = {"forest_km2": float((forest > 0).sum() * cell_km2),
            "open_habitat_km2": float((hfilter == 1).sum() * cell_km2),
            "closed_reserve_forest_km2": float(((forest > 0) & (reserve_id > 0)).sum() * cell_km2),
            "by_tree_km2": {TREE[k]: float((tree == k).sum() * cell_km2) for k in TREE if k},
            "by_band_forest_km2": {BAND[k]: float(((band == k) & (forest > 0)).sum() * cell_km2)
                                   for k in (1, 2, 3)},
            "reserves": reserve_names}
    (config.PROCESSED / "habitat_summary.json").write_text(json.dumps(summ, indent=2))
    print(json.dumps(summ, indent=2))


if __name__ == "__main__":
    main()
