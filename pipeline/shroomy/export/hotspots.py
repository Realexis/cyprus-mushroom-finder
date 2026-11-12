"""Top zones + the 50 m shade recipe.

- build(): daily, writes web/public/data/hotspot_zones.json (the dashed top-zone outlines).
- shade_window(): the SAME shade recipe as the 250 m habitat layer (config/scoring.yaml ->
  habitat.shade) on a DEM window: north/east-facing slopes, valley bottoms, low autumn sun.
  Used by shroomy.export.shade50 to build the fixed island-wide 50 m shade tiles.

Terrain only. There is NO finer weather: ECMWF is ~9 km.
Run:    uv run python -m shroomy.export.hotspots   (also runs inside export.web)
"""
import json
from datetime import date

import h3
import numpy as np

from .. import config
from ..habitat import terrain

OUT = config.ROOT / "web" / "public" / "data"
RES = 50


def shade_window(dem, res, lat, lon, s):
    """Shade score (0-1) on a DEM window, with the habitat recipe."""
    land = dem > 0
    dem_f = np.where(land, dem, 0).astype("float32")
    slope, aspect = terrain.slope_aspect(dem_f, res)
    facing = terrain.facing_score(slope, aspect, s["facing_best_azimuth_deg"], s["facing_full_effect_slope_deg"])
    valley = terrain.valley_score(terrain.tpi(dem_f, res, s["valley_radius_m"]), s["valley_full_effect_m"])
    suns = terrain.sun_positions(lat, lon, date.fromisoformat(s["autumn_sun_date"]),
                                 s["autumn_sun_hours_local"], s["utc_offset_hours"])
    illum = np.zeros(dem.shape, "float32")
    flat = 0.0
    for az, el in suns:
        i = terrain.illumination(slope, aspect, az, el)
        if s["cast_shadows"]:
            i[terrain.cast_shadow(dem_f, res, az, el, s["shadow_max_distance_m"])] = 0
        illum += i
        flat += max(np.sin(np.radians(el)), 0)
    low_sun = terrain.low_sun_score(illum / len(suns), flat / len(suns))
    shade = terrain.combine_shade(facing, valley, low_sun, s["weights"])
    return {"shade": shade, "facing": facing, "valley": valley, "low_sun": low_sun, "land": land}


def zone_hexes(summ):
    """Unique top-zone hexagons over the 8 days, best score first."""
    res = config.load("scoring")["public_view"]["h3_resolution"]
    best = {}
    for d in summ["days"]:
        for z in d["top_zones"]:
            hx = h3.latlng_to_cell(z["lat"], z["lon"], res)
            if hx not in best or z["score"] > best[hx]["score"]:
                best[hx] = {"hex": hx, "where": z["where"], "lat": z["lat"], "lon": z["lon"],
                            "score": z["score"], "date": d["date"]}
    return sorted(best.values(), key=lambda z: -z["score"])


def build(summ, g=None):
    """Daily: the top-zone outlines (hotspot_zones.json). Needs no terrain files.

    The 50 m shade squares themselves are a fixed, island-wide file built once by
    shroomy.export.shade50 (shade only depends on the terrain)."""
    zones = zone_hexes(summ)
    for z in zones:
        z["ring"] = [[round(lo, 5), round(la, 5)] for la, lo in h3.cell_to_boundary(z["hex"])]
        z["ring"].append(z["ring"][0])
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "hotspots.pmtiles").unlink(missing_ok=True)      # old per-zone file, replaced by tiles/shade50.pmtiles
    (OUT / "hotspot_zones.json").write_text(json.dumps({"res_m": RES, "zones": zones}, ensure_ascii=False))
    print(f" - top zones: {len(zones)} outlines (50 m shade comes from tiles/shade50.pmtiles)")


if __name__ == "__main__":
    summ = json.loads((config.ROOT / "web" / "public" / "data" / "summary.json").read_text())
    build(summ)
