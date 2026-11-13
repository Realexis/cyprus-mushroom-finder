"""Fill the shared shelf from downloads ALREADY on this Mac (no new downloads), and report on it.

Open-Meteo replies (weather, soil seasons, backtest season) are labelled by their EXACT request.
The cache files only say "batch 3 of season 1", so the request is rebuilt the way the code made
it (same points, same parameters), and every location is checked against the reply itself:
variables, first/last day, and grid point near the asked place (shelf.om_check). A file that
does not match is skipped and reported, never guessed.

Other downloads (GBIF, iNaturalist, EFFIS, roads, places, V4's SoilGrids/tree cover/grassland)
are stored once by content (APFS clones: no extra disk) with a list of where each was found.
Those found in THIS copy's own cache are also labelled by exact request when this copy's code
next reads them (shelf.cached_get), e.g. `uv run python -m shroomy.export.species`.

Run:  uv run python -m shroomy.shelf_seed            # seed from every copy, then report
      uv run python -m shroomy.shelf_seed --status   # report only
"""
import json
import re
import sys
import time
from datetime import date
from pathlib import Path

from . import config, shelf
from .grid import habitat_grid
from .weather.points import _habitat, _to_table, block_points, main_points, soil_points

# Parameters as each cache layout's code sends them (pipeline/shroomy/weather/fetch.py and
# the backtest's fetch_season in shroomy-dev / shroomy-audit / shroomy-v4-fable).
BACKTEST_VARS = ["precipitation_sum", "temperature_2m_mean", "temperature_2m_min", "temperature_2m_max"]
BACKTEST_DATES = ("2025-09-01", "2026-02-28")
CONTENT_SOURCES = {"gbif": "gbif", "inat": "inaturalist", "records": "inaturalist-records",
                   "weather/backtest/records": "records-v4", "effis": "effis", "roads": "roads",
                   "v03/soilgrids": "soilgrids", "v03/tcd": "tree-cover-density",
                   "v03/grassland": "grassland", "v03": "corine"}


def copies() -> list[Path]:
    return sorted(p for p in config.ROOT.parent.glob("shroomy*") if (p / "data" / "raw").is_dir())


def _season_points():
    """The backtest's points: one per 9 km land block (shroomy-audit backtest.season_points)."""
    g, hab = habitat_grid(), _habitat()
    k = int(config.load("weather")["soil_climatology"]["block_km"] * 1000 / g.res)
    return _to_table(block_points(hab["land_fraction"] > 0.5, k), g)


def _same_points_as_here(c: Path) -> str | None:
    """None if copy `c` places its weather points exactly like this copy (same habitat file,
    same point code, same grid settings), else the reason."""
    here = config.ROOT
    for rel in ("data/processed/habitat_250m.tif", "pipeline/shroomy/weather/points.py",
                "pipeline/shroomy/grid.py", "config/region.yaml"):
        a, b = here / rel, c / rel
        if not b.exists() or shelf._sha256(a) != shelf._sha256(b):
            return f"{rel} differs from {here.name}, so its points cannot be rebuilt here"
    mine, theirs = config.load("weather")["soil_climatology"], _yaml(c / "config" / "weather.yaml")["soil_climatology"]
    if mine["block_km"] != theirs["block_km"] or mine["forest_only"] != theirs["forest_only"]:
        return "soil point settings differ"
    return None


def _yaml(path: Path) -> dict:
    import yaml
    return yaml.safe_load(path.read_text())


def _layouts(raw: Path, wcfg: dict, pts: dict):
    """Yield (file, url, params, points, batch, per, day) for every known Open-Meteo cache file.
    `wcfg` is that copy's own config/weather.yaml (its variables, seasons, model)."""
    w = raw / "weather"
    om = wcfg["open_meteo"]
    seasons = wcfg["soil_climatology"]["seasons"]
    for f in sorted((w / "clim").glob("s*_b*.json")):
        si, b = map(int, re.match(r"s(\d+)_b(\d+)", f.stem).groups())
        if si >= len(seasons):
            yield f, None, f"season s{si} is not in this copy's config", None, None, None, None
            continue
        start, end = map(str, seasons[si])
        p = {"hourly": om["hourly"][0], "start_date": start, "end_date": end,
             "models": om["model"], "timezone": om["timezone"]}
        yield f, om["history_url"], p, pts["soil"], b, len(json.loads((w / "clim" / f"s{si}_b000.json").read_text())), None
    for d in sorted(w.glob("20??-??-??")):
        for f in sorted(d.glob("main_p*_b*.json")):
            m = re.match(r"main_p(\d+)_b(\d+)$", f.stem)
            if not m:
                yield f, None, "unknown name (another copy's layout)", None, None, None, None
                continue
            past, b = map(int, m.groups())
            p = {"daily": ",".join(om["daily"]), "hourly": ",".join(om["hourly"]), "past_days": past,
                 "forecast_days": om["forecast_days"], "models": om["model"], "timezone": om["timezone"]}
            per = len(json.loads((d / f"main_p{past}_b000.json").read_text()))
            yield f, om["forecast_url"], p, pts["main"], b, per, d.name
    for f in sorted((w / "backtest").glob("b[0-9][0-9][0-9].json")):
        b = int(f.stem[1:])
        p = {"daily": ",".join(BACKTEST_VARS), "start_date": BACKTEST_DATES[0], "end_date": BACKTEST_DATES[1],
             "models": om["model"], "timezone": om["timezone"]}
        per = len(json.loads((w / "backtest" / "b000.json").read_text()))
        yield f, om["history_url"], p, pts["season"], b, per, None


def seed_openmeteo(report: dict):
    pts = {"main": main_points(), "soil": soil_points(), "season": _season_points()}
    seen = set()
    for c in copies():
        why = _same_points_as_here(c)
        if why:
            report["skipped"].append([c.name, why])
            continue
        for f, url, p, P, b, per, day in _layouts(c / "data" / "raw", _yaml(c / "config" / "weather.yaml"), pts):
            rel = f"{c.name}/{f.relative_to(c)}"
            if url is None:
                report["skipped"].append([rel, p])
                continue
            body = f.read_bytes()
            h = (str(f.relative_to(c)), hash(body))
            if h in seen:                    # same bytes already handled (cloned copies)
                report["duplicates"] += 1
                continue
            reply = json.loads(body)
            lat = [f"{v:.5f}" for v in P["lat"][b * per:(b + 1) * per]]
            lon = [f"{v:.5f}" for v in P["lon"][b * per:(b + 1) * per]]
            if len(lat) != len(reply):
                report["skipped"].append([rel, f"{len(reply)} locations, the code would ask {len(lat)}"])
                continue
            labels = [shelf.om_location_label(url, p, a, o, day) for a, o in zip(lat, lon)]
            bad = next((r for r in (shelf.om_check(lab, rep) for lab, rep in zip(labels, reply)) if r), None)
            if bad:
                report["skipped"].append([rel, bad])
                continue
            seen.add(h)
            new = sum(shelf.om_put(lab, rep, rel) for lab, rep in zip(labels, reply))
            report["om_files"] += 1
            report["om_locations_new"] += new


def seed_content(report: dict):
    """Every other raw download, stored once by content, with where it was found."""
    for c in copies():
        raw = c / "data" / "raw"
        items = [(raw / "osm_places.json", "overpass")]
        for sub, src in CONTENT_SOURCES.items():
            d = raw / sub
            if d.is_dir():
                items += [(f, src) for f in sorted(d.iterdir()) if f.is_file() and not f.name.startswith(".")]
        for f, src in items:
            if not f.exists():
                continue
            sha, blob = shelf.add_blob(src, f)
            idx_f = shelf.root() / "files" / src / "found.json"
            idx = json.loads(idx_f.read_text()) if idx_f.exists() else {}
            e = idx.setdefault(sha, {"file": blob.name, "bytes": f.stat().st_size, "found_at": []})
            where = f"{c.name}/{f.relative_to(c)}"
            if where not in e["found_at"]:
                e["found_at"].append(where)
                report["content_new_places"] += 1
            shelf._write_atomic(idx_f, json.dumps(idx, indent=1).encode())


def status():
    r = shelf.root()
    if r is None:
        print("No shelf (set SHROOMY_SHELF or create ../shroomy-shared).")
        return
    om_n = sum(1 for _ in (r / "openmeteo").glob("*/*.json")) if (r / "openmeteo").exists() else 0
    print(f"Shelf: {r}")
    print(f" - Open-Meteo: {om_n:,} saved location replies, each labelled by its exact request")
    files = r / "files"
    for src in sorted(p for p in files.iterdir() if p.is_dir()) if files.exists() else []:
        labelled = sum(1 for _ in src.glob("*/*.meta.json"))
        blobs = list((src / "blobs").glob("*")) if (src / "blobs").exists() else []
        mb = sum(b.stat().st_size for b in blobs) / 1e6
        print(f" - {src.name}: {len(blobs)} files ({mb:.1f} MB), {labelled} labelled by exact request")
    from .weather.openmeteo import USAGE
    now = time.time()
    calls = shelf.all_calls(USAGE)
    print(f"Open-Meteo calls from this Mac (all copies, counted once): "
          f"{sum(calls.values()):,.0f} in 24 h · {sum(c for t, c in calls.items() if now - t < 3600):,.0f} in 1 h "
          f"· limit 10,000/day")


def seed():
    r = shelf.root()
    if r is None:
        raise SystemExit("No shelf folder: create ../shroomy-shared (or set SHROOMY_SHELF) first.")
    report = {"om_files": 0, "om_locations_new": 0, "duplicates": 0, "content_new_places": 0,
              "skipped": [], "day": date.today().isoformat()}
    seed_openmeteo(report)
    seed_content(report)
    shelf._write_atomic(r / "seed_report.json", json.dumps(report, indent=1).encode())
    print(f"Open-Meteo: {report['om_files']} files checked and labelled, {report['om_locations_new']:,} new "
          f"location replies, {report['duplicates']} identical copies skipped")
    for rel, why in report["skipped"]:
        print(f"   not labelled: {rel} — {why}")
    print(f"Other sources: {report['content_new_places']} file places recorded")


if __name__ == "__main__":
    if "--status" not in sys.argv:
        seed()
    status()
