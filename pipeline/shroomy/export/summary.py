"""summary.json — a small, plain file Claude (or anyone) can read to plan a trip.

Ask Claude: "Here is summary.json — where should we go on Saturday?"
Public level only: ~2 km hexagons, named by the nearest village. No exact spots.
"""
import json
import math
from datetime import date

import numpy as np

from .. import config
from ..score import clock

TREE_NAMES = ["Calabrian pine (likely)", "Troodos black pine (likely)", "Golden oak (likely)",
              "Other broadleaf", "Tripylos cedar zone (closed)"]
TOP_N = 5
MIN_GAP_KM = 8          # spread the top zones out over the island


def _km(lat1, lon1, lat2, lon2):
    p = math.pi / 180
    a = (math.sin((lat2 - lat1) * p / 2) ** 2
         + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2)
    return 12742 * math.asin(math.sqrt(a))


def _compass(lat1, lon1, lat2, lon2):
    """Direction FROM the village TO the zone."""
    b = math.degrees(math.atan2((lon2 - lon1) * math.cos(math.radians(lat1)), lat2 - lat1)) % 360
    return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][int((b + 22.5) // 45) % 8]


def near(lat, lon, places):
    best = min(places, key=lambda p: _km(lat, lon, p[1], p[0]))
    d = _km(lat, lon, best[1], best[0])
    if d < 1:
        return best[2]
    return f"{d:.0f} km {_compass(best[1], best[0], lat, lon)} of {best[2]}"


def reasons(inp: dict, fac: dict) -> str:
    """Plain-language 'why', strongest factors first."""
    parts = [
        (fac["rain_total"], f"{inp['rain_30d_mm']:.0f} mm rain in 30 days"),
        (fac["rain_pulse"], f"{inp['pulse_mm']:.0f} mm soaking rain 7-20 days ago"),
        (fac["temperature"], f"{inp['t7_mean_c']:.0f} °C average this week"),
        (fac["soil_moisture"], f"soil wetter than {inp['soil_percentile']:.0f}% of last season"),
        (fac["shade"], "shady slopes and valleys"),
    ]
    good = [t for v, t in sorted(parts, key=lambda x: -x[0]) if v >= 0.6]
    weak = [t for v, t in sorted(parts, key=lambda x: x[0]) if v < 0.4]
    s = ("Good: " + "; ".join(good) + ".") if good else ""
    if weak:
        s += (" " if s else "") + "Weak: " + "; ".join(weak[:2]) + "."
    if inp["frost_days"] >= 1:
        s += f" Frost on {inp['frost_days']:.0f} day(s)."
    return s


def build(zones: list, days: list, meta: dict) -> dict:
    places = json.loads((config.DATA / "static" / "places.json").read_text())["places"]
    c = meta["clock"]
    out_days = []
    for d in days:
        k = d["offset"]
        ranked = sorted(zones, key=lambda z: -z["score"][k])
        picked = []
        for z in ranked:
            if all(_km(z["lat"], z["lon"], p["lat"], p["lon"]) >= MIN_GAP_KM for p in picked):
                picked.append(z)
            if len(picked) == TOP_N:
                break
        scores = np.array([z["score"][k] for z in zones])
        top = []
        for rank, z in enumerate(picked, 1):
            inp = {n: float(v[k]) for n, v in z["inputs"].items()}
            fac = {n: float(v[k]) for n, v in z["factors"].items()}
            trees = {TREE_NAMES[i]: round(float(f), 2) for i, f in enumerate(z["trees"]) if f >= 0.1}
            top.append({
                "rank": rank,
                "where": near(z["lat"], z["lon"], places),
                "lat": round(z["lat"], 4), "lon": round(z["lon"], 4),
                "score": int(round(z["score"][k])),
                "why": reasons(inp, fac),
                "mushroom_clock": clock.sentence(int(z["clock"][k]), c["opens"], c["closes"]),
                "trees": trees,
                "altitude_m": [int(z["alt"][0]), int(z["alt"][1])],
                "inputs": {n: round(v, 1) for n, v in inp.items()},
                "factors_0_to_1": {n: round(v, 2) for n, v in fac.items()},
            })
        out_days.append({
            "date": d["date"], "weekday": date.fromisoformat(d["date"]).strftime("%A"),
            "confidence": d["confidence"],
            "island": {"median_score": int(np.median(scores)),
                       "zones_70_plus": int((scores >= 70).sum()), "zones_total": len(zones)},
            "top_zones": top,
        })
    return {
        "title": "Cyprus Mushroom Finder — growing conditions summary",
        "safety": meta["safety"],
        "how_to_read": (
            "Scores 0-100 = how good GROWING CONDITIONS are (rain, temperature, soil moisture, "
            "season for the altitude, shade) in ~2 km forest zones. It never says a mushroom is "
            "there, and never says anything about eating one. Nature reserves are closed and "
            "never listed. Confidence: high = days 0-2, medium = 3-4, low = 5+ (forecast). "
            "Picking rules: no rakes or tools; pick by hand or knife; put the leaf litter back."),
        "emergency": "Poisoning: call 112. Cyprus Poison Centre: 1401. Do not wait for symptoms.",
        "weather_run": meta["weather_run"], "generated_utc": meta["generated_utc"],
        "site": "https://realexis.github.io/cyprus-mushroom-finder/",
        "days": out_days,
        "species": "Species filters arrive in Phase 5.",
    }
