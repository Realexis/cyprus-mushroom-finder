"""A polite Open-Meteo client: counts every call, throttles, retries, caches.

Open-Meteo counts one call per location, per 14 days of data and per
10 variables (fractional). We estimate the same way, keep a usage log in
data/raw/openmeteo_usage.json, and wait when a minute/hour/day cap is near.
"""
import json
import math
import time
from datetime import datetime, timezone

import requests

from .. import config

USAGE = config.RAW / "openmeteo_usage.json"
UA = {"User-Agent": "shroomy-weather/0.1 (non-commercial)"}


def call_cost(n_locations: int, n_variables: int, n_days: int) -> float:
    """Estimated Open-Meteo call weight (their published rule)."""
    return n_locations * max(1.0, n_variables / 10) * max(1.0, n_days / 14)


class Budget:
    def __init__(self, caps: dict):
        self.caps = caps
        self.log = json.loads(USAGE.read_text()) if USAGE.exists() else []

    def _used(self, seconds: float) -> float:
        now = time.time()
        return sum(c for t, c in self.log if now - t < seconds)

    def wait_for(self, cost: float):
        if cost > self.caps["per_minute"]:
            raise ValueError("a single request is bigger than the per-minute cap; use smaller batches")
        while True:
            if self._used(86400) + cost > self.caps["per_day"]:
                raise RuntimeError("daily Open-Meteo budget reached — try again tomorrow")
            m, h = self._used(60), self._used(3600)
            if m + cost <= self.caps["per_minute"] and h + cost <= self.caps["per_hour"]:
                return
            time.sleep(5)

    def spend(self, cost: float):
        now = time.time()
        self.log = [(t, c) for t, c in self.log if now - t < 86400] + [(now, cost)]
        USAGE.parent.mkdir(parents=True, exist_ok=True)
        USAGE.write_text(json.dumps(self.log))

    def today(self) -> float:
        return self._used(86400)


def fetch(url: str, lats, lons, params: dict, n_variables: int, n_days: int,
          budget: Budget, cache_path=None, tries=4):
    """One multi-location request. Returns a list (one dict per location)."""
    if cache_path is not None and cache_path.exists():
        return json.loads(cache_path.read_text())
    q = dict(params)
    q["latitude"] = ",".join(f"{v:.5f}" for v in lats)
    q["longitude"] = ",".join(f"{v:.5f}" for v in lons)
    cost = call_cost(len(lats), n_variables, n_days)
    for i in range(tries):
        budget.wait_for(cost)
        try:
            r = requests.get(url, params=q, headers=UA, timeout=120)
            budget.spend(cost)
            if r.status_code == 429:
                print("   429 rate limited — waiting 60 s")
                time.sleep(60)
                continue
            r.raise_for_status()
            d = r.json()
            d = d if isinstance(d, list) else [d]
            if cache_path is not None:
                cache_path.parent.mkdir(parents=True, exist_ok=True)
                cache_path.write_text(json.dumps(d))
            return d
        except requests.RequestException as e:
            if i == tries - 1:
                raise
            print(f"   retry {i + 1}: {e}")
            time.sleep(10 * (i + 1))
