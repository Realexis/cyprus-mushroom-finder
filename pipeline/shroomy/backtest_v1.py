"""Measuring stick for the V3 score (the live site's weighted score).

Scores every day of the 2025-26 season with the V3 score and runs two tests:

1. The dry-autumn test. October-November 2025 had almost no rain (about 27 mm from
   September to November). A good model stays low. September cannot be scored: the
   score needs the 30 days before each day, and the saved weather starts on 1 September.
2. The records test. Dated public finds (iNaturalist, searched by genus). On each find's
   date: the score at the nearest forest square and the best score within 5 km.

Weather: the saved season run data/raw/weather/backtest/season_run.npz
(1 Sep 2025 to 28 Feb 2026, 156 points, one per 9 km). No new weather calls.
That file has NO soil moisture, so the soil part is left out and the other five
weights are scaled up to fill its place. The report says so.

Honest limit: a few dozen records cannot prove a model. They can only catch a clearly
wrong one.

Run:  uv run python -m shroomy.backtest_v1 [--label NAME] [--ref GIT_REF]
      --ref 33b740a   scores with the config files as they were in that commit
                      (the live V3), so old and new can be compared on the same weather.
Output: data/processed/backtest/backtest_v1_<label>.json
"""
import json
import subprocess
import sys
from datetime import date

import numpy as np
import yaml
from pyproj import Transformer
from scipy.spatial import cKDTree

from . import config
from .grid import habitat_grid
from .score import clock
from .score import factors as F
from .score import species as SP
from .score.downscale import Interpolator
from .score.today import day_factors, load_habitat, water_gate

SEASON = config.RAW / "weather" / "backtest" / "season_run.npz"
RECORDS = config.RAW / "records" / "inat_2025_26.json"
OUT = config.PROCESSED / "backtest"
DRY = ("2025-10-01", "2025-11-30")          # the dry autumn (September cannot be scored)
NEAR_M = 5000                               # "best within 5 km"
FAIR, GOOD = 45, 65                         # the site's words: Fair from 45, Good from 65
# Record genus -> V3 species codes (config/species.yaml). Other genera: general map only.
GENUS_SPECIES = {"Suillus": ["slu"], "Lactarius": ["lde", "lsa"], "Russula": ["rde"],
                 "Morchella": ["mor"], "Tricholoma": ["tca"]}


def load_config(name: str, ref: str | None) -> dict:
    """config/<name>.yaml now, or as it was in git commit `ref`."""
    if not ref:
        return config.load(name)
    txt = subprocess.run(["git", "show", f"{ref}:config/{name}.yaml"], cwd=config.ROOT,
                         check=True, capture_output=True, text=True).stdout
    return yaml.safe_load(txt)


def find_events(first: str, last: str) -> list[dict]:
    """Records -> find events: one per date, genus and place (~1 km), so 23 photos of one
    morel patch count once."""
    seen, out = set(), []
    for d, genus, taxon, lat, lon, quality, user in json.loads(RECORDS.read_text()):
        if not (first <= d <= last):
            continue
        key = (d, genus, round(lat, 2), round(lon, 2))
        if key in seen:
            continue
        seen.add(key)
        out.append({"date": d, "genus": genus, "taxon": taxon, "lat": lat, "lon": lon, "quality": quality})
    return out


def run(label: str, ref: str | None):
    S = load_config("scoring", ref)["score"]
    specs = load_config("species", ref)["species"]
    W = dict(S["weights"])
    W["soil_moisture"] = 0.0                       # no soil data in the season file
    share = SP.season_share(W)
    gate_cfg = S.get("water_gate") or {}

    w = dict(np.load(SEASON))
    dates = [str(d) for d in w["dates"]]
    first_t = S["rain_total"]["days"]              # first day with 30 days of rain before it
    g = habitat_grid()
    hab = load_habitat()
    rows, cols = np.nonzero(hab["habitat_filter"] > 0)       # open forest (not in reserves)
    cx = g.west + (cols + 0.5) * g.res
    cy = g.north - (rows + 0.5) * g.res
    tree = hab["likely_tree"][rows, cols].astype(int)
    band = hab["altitude_band"][rows, cols].astype(int)
    elev = np.nan_to_num(hab["elevation_m"][rows, cols], nan=0.0)
    shade = hab["shade_score"][rows, cols]
    gen = np.isin(tree, S["general_map_trees"])
    sp_mask = {s["code"]: SP.species_habitat(np.ones_like(tree), tree, band, s) for s in specs}
    interp = Interpolator(np.c_[w["x"], w["y"]], np.c_[cx, cy])
    pt_of_cell = cKDTree(np.c_[w["x"], w["y"]]).query(np.c_[cx, cy])[1]

    days = list(range(first_t, len(dates)))
    general = np.full((len(rows), len(days)), np.nan, "float32")
    species = {c: np.full((len(rows), len(days)), np.nan, "float32") for c in sp_mask}
    gate_med, clock_open = [], []
    print(f"[{label}] scoring {len(days)} days x {len(rows):,} forest squares (soil left out)")
    for j, t in enumerate(days):
        day = date.fromisoformat(dates[t])
        f, inp = day_factors(S, w, t, interp, elev, band, shade, day.month, clim=None)
        gate, _ = water_gate(S, w["precip"], t, interp)
        general[:, j] = F.combine(f, W, gen) * gate
        general[~gen, j] = np.nan
        base = SP.base_score(f, W)
        for s in specs:
            if SP.in_season(day.month, s):
                v = (base + share) * gate
                species[s["code"]][:, j] = np.where(sp_mask[s["code"]], v, np.nan)
        gate_med.append(float(np.median(gate[gen])))
        st = clock_state(w["precip"], t, S, dates)
        clock_open.append(st[pt_of_cell])

    clock_open = np.stack(clock_open, axis=1)                 # (cells, days) bool
    sdates = [dates[t] for t in days]
    res = {"label": label, "config_ref": ref or "working tree", "weather": SEASON.name,
           "scored_days": [sdates[0], sdates[-1]], "forest_squares": int(gen.sum()),
           "soil": "left out (no soil data in the season file); other weights scaled up",
           "water_gate": bool(gate_cfg.get("enabled")),
           "daily": [{"date": d, "median": _r(np.nanmedian(general[:, j])),
                      "p90": _r(np.nanpercentile(general[:, j], 90)),
                      "share_good": _r(np.mean(general[gen, j] >= GOOD)),
                      "gate_median": _r(gate_med[j]),
                      "clock_open_share": _r(np.mean(clock_open[gen, j]))}
                     for j, d in enumerate(sdates)]}

    # ---------------------------------------------------------- test 1: dry autumn
    dj = [j for j, d in enumerate(sdates) if DRY[0] <= d <= DRY[1]]
    wj = [j for j, d in enumerate(sdates) if "2025-12-01" <= d <= "2026-02-28"]
    dry = general[gen][:, dj]
    wet = general[gen][:, wj]
    res["dry_autumn"] = {
        "dates": list(DRY), "median": _r(np.median(dry)), "p90": _r(np.percentile(dry, 90)),
        "share_fair_or_better": _r(np.mean(dry >= FAIR)), "share_good_or_better": _r(np.mean(dry >= GOOD)),
        "pass": bool(np.median(dry) < FAIR and np.mean(dry >= GOOD) < 0.05),
        "rule": f"pass = median below {FAIR} ('Poor') and under 5% of square-days at {GOOD}+ ('Good')",
        "rain_sep_nov_mm_island_median": _r(np.median(w["precip"][:, :dates.index("2025-12-01")].sum(1))),
    }
    res["winter"] = {"dates": ["2025-12-01", "2026-02-28"], "median": _r(np.median(wet)),
                     "p90": _r(np.percentile(wet, 90)), "share_good_or_better": _r(np.mean(wet >= GOOD))}

    # ---------------------------------------------------------- test 2: records
    to_xy = Transformer.from_crs("EPSG:4326", g.crs, always_xy=True)
    gtree = cKDTree(np.c_[cx[gen], cy[gen]])
    gidx = np.nonzero(gen)[0]
    events = find_events(sdates[0], sdates[-1])
    rec = []
    for e in events:
        j = sdates.index(e["date"])
        x, y = to_xy.transform(e["lon"], e["lat"])
        dist, k = gtree.query([x, y])
        r = {**{k2: e[k2] for k2 in ("date", "genus", "taxon", "quality")},
             "nearest_km": _r(dist / 1000, 1)}
        if dist <= NEAR_M:
            c = gidx[k]
            own = general[c]
            r["score_nearest"] = _r(own[j], 0)
            r["season_median_nearest"] = _r(np.nanmedian(own), 0)
            r["rank_in_own_season"] = _r(np.mean(own <= own[j]), 2)   # 1.0 = its best day
            near = gidx[gtree.query_ball_point([x, y], NEAR_M)]
            r["best_5km"] = _r(np.nanmax(general[near, j]), 0)
            r["clock_open"] = bool(clock_open[c, j])
        for code in GENUS_SPECIES.get(e["genus"], []):
            m = sp_mask[code]
            st = cKDTree(np.c_[cx[m], cy[m]])
            sd, _ = st.query([x, y])
            if sd > NEAR_M:
                r[f"{code}_5km"] = "no habitat within 5 km"
                continue
            near = np.nonzero(m)[0][st.query_ball_point([x, y], NEAR_M)]
            v = species[code][near, j]
            r[f"{code}_5km"] = "out of season" if np.isnan(v).all() else _r(np.nanmax(v), 0)
        rec.append(r)
    scored = [r for r in rec if "score_nearest" in r]
    res["records"] = {
        "events": len(rec), "with_forest_within_5km": len(scored),
        "median_score_nearest": _r(np.median([r["score_nearest"] for r in scored])) if scored else None,
        "median_best_5km": _r(np.median([r["best_5km"] for r in scored])) if scored else None,
        "share_best_5km_fair_or_better": _r(np.mean([r["best_5km"] >= FAIR for r in scored])) if scored else None,
        "median_rank_in_own_season": _r(np.median([r["rank_in_own_season"] for r in scored])) if scored else None,
        "share_clock_open": _r(np.mean([r["clock_open"] for r in scored])) if scored else None,
        "list": rec,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f"backtest_v1_{label}.json"
    out.write_text(json.dumps(res, indent=1))
    _print(res)
    return out


def clock_state(precip, t, S, dates):
    """Per weather point: is the fruiting window open on day t?"""
    st, _, _ = clock.window(precip, t, S, dates)
    return st == "open"


def _r(v, nd=3):
    return None if v is None or (isinstance(v, float) and np.isnan(v)) else round(float(v), nd)


def _print(res):
    d, w, r = res["dry_autumn"], res["winter"], res["records"]
    print(f"\n[{res['label']}] Test 1, dry autumn {d['dates'][0]} to {d['dates'][1]}: "
          f"median {d['median']}, p90 {d['p90']}, Good+ {d['share_good_or_better']:.0%} -> "
          f"{'PASS' if d['pass'] else 'FAIL'}")
    print(f"           winter Dec-Feb: median {w['median']}, Good+ {w['share_good_or_better']:.0%}")
    print(f"[{res['label']}] Test 2, records: {r['events']} find events, {r['with_forest_within_5km']} "
          f"near forest. Median score at the find {r['median_score_nearest']}, best within 5 km "
          f"{r['median_best_5km']}, rank in own season {r['median_rank_in_own_season']}, "
          f"clock open {r['share_clock_open']}")


if __name__ == "__main__":
    a = sys.argv[1:]
    label = a[a.index("--label") + 1] if "--label" in a else "current"
    ref = a[a.index("--ref") + 1] if "--ref" in a else None
    run(label, ref)
