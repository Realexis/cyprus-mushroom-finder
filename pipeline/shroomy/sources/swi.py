"""Copernicus Soil Water Index (SWI), Europe 1 km daily v2: is it usable for Cyprus yet?

The public catalogue (no account) is enough to answer two questions before anyone makes an
account: (1) which area does the product cover, and (2) how recent is the newest file.
Checked 13 Nov 2026: 35.0-72.0 N (most of Troodos is just south of 35.0 N) and nothing after
15 Sep 2026. Downloading the files needs a free Copernicus Data Space account, made by the user.

Run:  uv run python -m shroomy.sources.swi
"""
from datetime import date, timedelta

import requests

STAC = "https://stac.dataspace.copernicus.eu/v1"
COLLECTION = "clms_swi_europe_1km_daily_v2_cog"
CYPRUS_FOREST_LAT = (34.75, 35.25)          # rough span of the Troodos + Pafos forest
HEADERS = {"User-Agent": "cyprus-mushroom-finder/0.1 (non-commercial)"}


def status(today: date | None = None, look_back_days: int = 120) -> dict:
    today = today or date.today()
    c = requests.get(f"{STAC}/collections/{COLLECTION}", headers=HEADERS, timeout=60).json()
    west, south, east, north = c["extent"]["spatial"]["bbox"][0]
    start = (today - timedelta(days=look_back_days)).isoformat()
    s = requests.get(f"{STAC}/search", params={"collections": COLLECTION, "limit": 200,
                                               "datetime": f"{start}T00:00:00Z/{today.isoformat()}T23:59:59Z"},
                     headers=HEADERS, timeout=60).json()
    days = sorted(f["properties"]["datetime"][:10] for f in s.get("features", []))
    return {"south_edge_deg": south, "covers_troodos": south <= CYPRUS_FOREST_LAT[0],
            "newest_file": days[-1] if days else None,
            "days_old": (today - date.fromisoformat(days[-1])).days if days else None}


if __name__ == "__main__":
    r = status()
    print(f"South edge: {r['south_edge_deg']} N · covers Troodos: {r['covers_troodos']}")
    print(f"Newest file: {r['newest_file']} ({r['days_old']} days old)")
