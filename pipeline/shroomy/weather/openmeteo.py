"""A polite Open-Meteo client: counts every call, throttles, retries, caches.

Open-Meteo counts one call per location, per 14 days of data and per
10 variables (fractional). We estimate the same way and wait when a
minute/hour/day cap is near.

The count is shared by every project copy on this Mac (see shroomy/shelf.py): the shelf's log
plus every copy's own data/raw/openmeteo_usage.json. Each location's reply is also kept on the
shelf, labelled by the exact request, so no copy downloads it twice. Without a shelf (the GitHub
robot) it works as before: this copy's own log and cache only.
"""
import json
import time
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

from .. import config, shelf

USAGE = config.RAW / "openmeteo_usage.json"
UA = {"User-Agent": "shroomy-weather/0.1 (non-commercial)"}
TZ = ZoneInfo("Asia/Nicosia")


def call_cost(n_locations: int, n_variables: int, n_days: int) -> float:
    """Estimated Open-Meteo call weight (their published rule)."""
    return n_locations * max(1.0, n_variables / 10) * max(1.0, n_days / 14)


class Budget:
    """Caps for the whole Mac (with a shelf) or for this copy (without one)."""

    def __init__(self, caps: dict, own_log=None):
        self.caps = caps
        self.own_log = own_log or USAGE

    def _used(self, seconds: float) -> float:
        return sum(shelf.all_calls(self.own_log, seconds).values())

    def _fits(self, cost: float) -> bool:
        if self._used(86400) + cost > self.caps["per_day"]:
            raise RuntimeError("daily Open-Meteo budget reached (all copies on this Mac) — try again tomorrow")
        return (self._used(60) + cost <= self.caps["per_minute"]
                and self._used(3600) + cost <= self.caps["per_hour"])

    def reserve(self, cost: float, note: str = ""):
        """Wait until `cost` fits under every cap, then count it (before the request is sent,
        so two copies starting at once cannot both squeeze under the cap)."""
        if cost > self.caps["per_minute"]:
            raise ValueError("a single request is bigger than the per-minute cap; use smaller batches")
        while True:
            if shelf.enabled():
                with shelf.usage_lock():
                    if self._fits(cost):
                        shelf.record_call(time.time(), cost, self.own_log, note)
                        return
            elif self._fits(cost):
                shelf.record_call(time.time(), cost, self.own_log, note)
                return
            time.sleep(5)

    def today(self) -> float:
        return self._used(86400)


def _day_for(params: dict, day) -> str | None:
    if not any(k in params for k in shelf.RELATIVE):
        return None
    return str(day) if day else datetime.now(TZ).date().isoformat()


def fetch(url: str, lats, lons, params: dict, n_variables: int, n_days: int,
          budget: Budget, cache_path=None, tries=4, day=None):
    """One multi-location request. Returns a list (one dict per location).

    `day`: the Cyprus day a "past/next N days" request is for (default: today). Order of lookups:
    this copy's cache file -> the shelf, location by location -> download only the missing ones.
    """
    lat_s = [f"{v:.5f}" for v in lats]
    lon_s = [f"{v:.5f}" for v in lons]
    d = _day_for(params, day)
    labels = ([shelf.om_location_label(url, params, a, o, d) for a, o in zip(lat_s, lon_s)]
              if shelf.enabled() else None)

    if cache_path is not None and cache_path.exists():
        out = json.loads(cache_path.read_text())
        if labels and len(out) == len(labels):
            for lab, rep in zip(labels, out):
                shelf.om_put(lab, rep, f"{shelf.COPY}:{cache_path.relative_to(config.ROOT)}")
        return out

    out = [shelf.om_get(lab) for lab in labels] if labels else [None] * len(lat_s)
    miss = [i for i, r in enumerate(out) if r is None]
    if miss:
        got = _download(url, [lat_s[i] for i in miss], [lon_s[i] for i in miss], params,
                        n_variables, n_days, budget, tries)
        if len(got) != len(miss):
            raise RuntimeError(f"Open-Meteo returned {len(got)} locations for {len(miss)} asked")
        for i, rep in zip(miss, got):
            out[i] = rep
            if labels:
                shelf.om_put(labels[i], rep, f"{shelf.COPY}:download")
    else:
        print(f"   all {len(out)} locations from the shared shelf (0 calls)")
    if cache_path is not None:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(json.dumps(out))
    return out


def _download(url, lat_s, lon_s, params, n_variables, n_days, budget, tries):
    q = dict(params)
    q["latitude"] = ",".join(lat_s)
    q["longitude"] = ",".join(lon_s)
    cost = call_cost(len(lat_s), n_variables, n_days)
    for i in range(tries):
        budget.reserve(cost, url.split("/")[2])
        try:
            r = requests.get(url, params=q, headers=UA, timeout=120)
            if r.status_code == 429:
                print("   429 rate limited — waiting 60 s")
                time.sleep(60)
                continue
            r.raise_for_status()
            d = r.json()
            return d if isinstance(d, list) else [d]
        except requests.RequestException as e:
            if i == tries - 1:
                raise
            print(f"   retry {i + 1}: {e}")
            time.sleep(10 * (i + 1))
    raise RuntimeError("Open-Meteo kept rate-limiting; try later")
