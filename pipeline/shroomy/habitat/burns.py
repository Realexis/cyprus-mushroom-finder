"""Burned forest from the EFFIS burnt-area maps (Copernicus), fires since the 2018 forest map.

The forest map is from 2018, so forest burned after that still looked like habitat
(audit GAPS G9: the 23 July 2025 Limassol fire, ERA25). This layer fixes that without
rebuilding the fixed habitat file the daily robot downloads:

- fetch():  download the yearly EFFIS burnt areas for Cyprus into a small public file,
            config/effis_burned_areas.geojson (committed, so the robot needs no new download).
- apply():  a 250 m square more than half burned stops counting as its tree. Its likely tree
            becomes 6 "burned forest, recent fire" during the first two springs after the fire
            (morels may come [LAR16]) and 7 "burned forest" after that. No partner-tree species
            uses 6 or 7; morels use 6 (config/species.yaml).

Run:  uv run python -m shroomy.habitat.burns          (download again and rewrite the file)
"""
import json
from datetime import date
from functools import lru_cache

import numpy as np
import requests
from rasterio import features
from pyproj import Transformer

from .. import config, shelf
from ..grid import habitat_grid

FILE = config.CONFIG_DIR / "effis_burned_areas.geojson"
WFS = "https://maps.effis.emergency.copernicus.eu/effis"
BBOX = "34.4,32.2,35.8,34.7,EPSG:4326"            # Cyprus, lat/lon order (WFS 1.1.0)
HEADERS = {"User-Agent": "cyprus-mushroom-finder/0.1 (non-commercial, static site)"}
RECENT, OLD = 6, 7                               # likely_tree codes for burned squares


def _cfg():
    return config.load("scoring")["habitat"]["burned"]


def fetch():
    """EFFIS yearly burnt areas -> one small GeoJSON (fire date, hectares, outline)."""
    c = _cfg()
    years = [str(y) for y in range(c["since_year"], date.today().year)] + ["season"]   # season = this year
    out = []
    for y in years:
        n0 = len(out)
        params = {"SERVICE": "WFS", "VERSION": "1.1.0", "REQUEST": "GetFeature",
                  "TYPENAME": f"ms:modis.ba.poly.{y}", "BBOX": BBOX,
                  "OUTPUTFORMAT": "application/json; subtype=geojson"}
        # This year's fires change, so that reply is labelled by today's date; closed years are not.
        day = date.today().isoformat() if y == "season" else None
        local = config.RAW / "effis" / (f"wfs_season_{day}.geojson" if day else f"wfs_{y}.geojson")

        def download(params=params, local=local):
            r = requests.get(WFS, params=params, headers=HEADERS, timeout=120)
            r.raise_for_status()
            local.parent.mkdir(parents=True, exist_ok=True)
            local.write_bytes(r.content)
        shelf.cached_get("effis", WFS, params, local, download, day=day)   # this copy -> shelf -> download
        for f in json.loads(local.read_text())["features"]:
            p = f["properties"]
            if p.get("COUNTRY") != "CY":
                continue
            out.append({"type": "Feature",
                        "properties": {"date": p["FIREDATE"][:10], "ha": round(float(p.get("AREA_HA") or 0))},
                        "geometry": _round(f["geometry"])})
        print(f" - {y}: {len(out) - n0} fires")
    out.sort(key=lambda f: f["properties"]["date"])
    FILE.write_text(json.dumps({"type": "FeatureCollection",
                                "source": "EFFIS burnt areas (modis.ba.poly), Copernicus EMS",
                                "downloaded": date.today().isoformat(), "features": out},
                               separators=(",", ":")))
    print(f"{len(out)} fires since {c['since_year']} -> {FILE}")


def _round(geom, nd=5):
    def r(c):
        return [round(c[0], nd), round(c[1], nd)] if isinstance(c[0], (int, float)) else [r(x) for x in c]
    return {"type": geom["type"], "coordinates": r(geom["coordinates"])}


@lru_cache(maxsize=1)
def burned_layer():
    """Per 250 m square: (share burned by fires since since_year, date of the latest fire as a
    day number, 0 = none). Computed on a 25 m grid inside each square."""
    g = habitat_grid()
    if not FILE.exists():
        return np.zeros((g.height, g.width), "float32"), np.zeros((g.height, g.width), "int32")
    fine = g.at(25)
    k = int(round(g.res / fine.res))
    to_xy = Transformer.from_crs("EPSG:4326", g.crs, always_xy=True)
    shapes = []
    for f in json.loads(FILE.read_text())["features"]:           # oldest first, so newer fires win
        geom = f["geometry"]
        shapes.append((_project(geom, lambda lo, la: to_xy.transform(lo, la)),   # GeoJSON: lon, lat
                       date.fromisoformat(f["properties"]["date"]).toordinal()))
    last = features.rasterize(shapes, out_shape=(fine.height, fine.width), transform=fine.transform,
                              fill=0, dtype="int32")
    blocks = last.reshape(g.height, k, g.width, k)
    share = (blocks > 0).mean(axis=(1, 3)).astype("float32")
    latest = blocks.max(axis=(1, 3)).astype("int32")
    return share, latest


def _project(geom, fn):
    def p(c):
        return list(fn(c[0], c[1])) if isinstance(c[0], (int, float)) else [p(x) for x in c]
    return {"type": geom["type"], "coordinates": p(geom["coordinates"])}


def morel_until(fire: date, springs: int, spring_end=(4, 30), spring_start=(2, 1)) -> date:
    """Last day of the n-th spring (Feb-Apr, the morel months) that starts after the fire."""
    y = fire.year if fire < date(fire.year, *spring_start) else fire.year + 1
    return date(y + springs - 1, *spring_end)


def apply(hab: dict, on: date) -> dict:
    """Mark burned squares in the habitat layers (returns a new dict; the input is unchanged)."""
    c = _cfg()
    if not c.get("enabled"):
        return hab
    share, latest = burned_layer()
    burned = (share > c["min_fraction"]) & (hab["forest_type"] > 0)
    if not burned.any():
        return hab
    recent = np.zeros_like(burned)
    for d in np.unique(latest[burned]):
        if on <= morel_until(date.fromordinal(int(d)), c["morel_springs"]):
            recent |= burned & (latest == d)
    tree = hab["likely_tree"].copy()
    tree[burned] = OLD
    tree[recent] = RECENT
    return {**hab, "likely_tree": tree, "burned_share": share}


if __name__ == "__main__":
    fetch()
