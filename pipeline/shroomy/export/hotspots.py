"""50 m "hotspot zoom" for the top zones (public since 2026-11-12, user decision).

Inside each top ~2 km zone of the coming 8 days, we re-run the SAME shade recipe
as the 250 m habitat layer (config/scoring.yaml -> habitat.shade), but at 50 m:
north/east-facing slopes, valley bottoms and low autumn sun. Forest share is
read from the 10 m Copernicus forest map.

Terrain only. There is NO finer weather: ECMWF is ~9 km, so rain and temperature
stay the same over the whole zone.

Output: web/public/data/hotspots.pmtiles (50 m squares) + hotspot_zones.json
Needs the 25 m DEM and the 10 m forest map (on your Mac). Where they are missing
(the daily robot), it skips and the site simply hides the hotspot zoom.
Run:    uv run python -m shroomy.export.hotspots   (also runs inside export.web)
"""
import json
from datetime import date

import h3
import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT
from rasterio.windows import Window
from shapely.geometry import Polygon
from shapely import contains_xy

from .. import config
from ..grid import block_mean, habitat_grid
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
    need = [config.PROCESSED / "dem_25m.tif", config.RAW / "forest_type" / "forest_type.vrt"]
    if not all(p.exists() for p in need):
        for f in ("hotspots.pmtiles", "hotspot_zones.json"):
            (OUT / f).unlink(missing_ok=True)          # never leave stale hotspots behind
        print(" - hotspot zoom skipped (terrain inputs not here)")
        return
    g = g or habitat_grid()
    S = config.load("scoring")["habitat"]
    s = S["shade"]
    to_utm = Transformer.from_crs("EPSG:4326", g.crs, always_xy=True)
    to_ll = Transformer.from_crs(g.crs, "EPSG:4326", always_xy=True)
    zones = zone_hexes(summ)
    margin = s["shadow_max_distance_m"] + 2 * s["valley_radius_m"]
    g25, g10 = g.at(25), g.at(10)
    feats = []
    with rasterio.open(config.PROCESSED / "dem_25m.tif") as dem_src, \
         rasterio.open(config.RAW / "forest_type" / "forest_type.vrt") as fsrc, \
         WarpedVRT(fsrc, crs=g10.crs, transform=g10.transform, width=g10.width, height=g10.height,
                   resampling=Resampling.nearest, nodata=255) as fvrt:
        for z in zones:
            ring = [to_utm.transform(lo, la) for la, lo in h3.cell_to_boundary(z["hex"])]
            poly = Polygon(ring)
            x0, y0, x1, y1 = poly.bounds
            # Snap the zone box to the 50 m grid, then add the margin (in 25 m pixels).
            c0 = int(np.floor((x0 - g.west) / RES)) * 2; c1 = int(np.ceil((x1 - g.west) / RES)) * 2
            r0 = int(np.floor((g.north - y1) / RES)) * 2; r1 = int(np.ceil((g.north - y0) / RES)) * 2
            m = int(np.ceil(margin / 25 / 2)) * 2
            win = Window(c0 - m, r0 - m, (c1 - c0) + 2 * m, (r1 - r0) + 2 * m)
            dem = dem_src.read(1, window=win, boundless=True, fill_value=0).astype("float32")
            t = shade_window(dem, 25.0, z["lat"], z["lon"], s)
            inner = (slice(m, m + r1 - r0), slice(m, m + c1 - c0))
            k = {n: block_mean(np.where(t["land"], t[n], np.nan)[inner], 2)
                 for n in ("shade", "facing", "valley", "low_sun")}
            elev = block_mean(np.where(t["land"], dem, np.nan)[inner], 2)
            # Forest share per 50 m cell from the 10 m map (5 x 5 pixels).
            fwin = Window(c0 * 5 // 2, r0 * 5 // 2, (c1 - c0) * 5 // 2, (r1 - r0) * 5 // 2)
            fty = fvrt.read(1, window=fwin)            # top zones lie well inside the map
            con = block_mean((fty == 2).astype("float32"), 5)
            brd = block_mean((fty == 1).astype("float32"), 5)
            forest = (con + brd) >= S["forest_min_fraction"]
            rr, cc = np.nonzero(forest & np.isfinite(k["shade"]))
            west = g.west + c0 // 2 * RES; north = g.north - r0 // 2 * RES
            px = west + (cc + 0.5) * RES; py = north - (rr + 0.5) * RES
            inside = contains_xy(poly, px, py)
            for r, c, ok in zip(rr, cc, inside):
                if not ok:
                    continue
                xa = west + c * RES; ya = north - r * RES
                xs, ys = to_ll.transform([xa, xa + RES, xa + RES, xa, xa], [ya, ya, ya - RES, ya - RES, ya])
                feats.append({"type": "Feature", "properties": {
                    "sh": int(round(k["shade"][r, c] * 100)), "fa": int(round(k["facing"][r, c] * 100)),
                    "va": int(round(k["valley"][r, c] * 100)), "ls": int(round(k["low_sun"][r, c] * 100)),
                    "el": int(round(float(elev[r, c]))), "con": int(con[r, c] >= brd[r, c])},
                    "geometry": {"type": "Polygon", "coordinates": [[[round(a, 6), round(b, 6)]
                                                                      for a, b in zip(xs, ys)]]}})
            z["ring"] = [[round(lo, 5), round(la, 5)] for la, lo in h3.cell_to_boundary(z["hex"])]
            z["ring"].append(z["ring"][0])
    OUT.mkdir(parents=True, exist_ok=True)
    gj = OUT / "hotspots.geojson"
    gj.write_text(json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":")))
    from .web import write_pmtiles
    write_pmtiles(gj, OUT / "hotspots.pmtiles", "hotspots", 10, 14)
    gj.unlink()
    (OUT / "hotspot_zones.json").write_text(json.dumps({"res_m": RES, "zones": zones}, ensure_ascii=False))
    print(f" - hotspot zoom: {len(zones)} top zones, {len(feats)} forest squares of 50 m")


if __name__ == "__main__":
    summ = json.loads((config.ROOT / "web" / "public" / "data" / "summary.json").read_text())
    build(summ)
