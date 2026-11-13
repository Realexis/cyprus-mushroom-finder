"""The shared download shelf and the one Open-Meteo counter for the whole Mac."""
import json
import time

import pytest

from shroomy import shelf
from shroomy.weather import openmeteo

URL = "https://historical-forecast-api.open-meteo.com/v1/forecast"
P = {"hourly": "soil_moisture_0_to_7cm", "start_date": "2024-10-01", "end_date": "2024-10-02",
     "models": "ecmwf_ifs", "timezone": "Asia/Nicosia"}


@pytest.fixture
def shelf_dir(tmp_path, monkeypatch):
    d = tmp_path / "shroomy-shared"
    d.mkdir()
    monkeypatch.setenv("SHROOMY_SHELF", str(d))
    monkeypatch.setattr(shelf, "copy_logs", lambda: [])
    return d


def reply(lat, lon, var="soil_moisture_0_to_7cm", first="2024-10-01", last="2024-10-02"):
    return {"latitude": lat, "longitude": lon, "elevation": 100.0,
            "hourly": {"time": [f"{first}T00:00", f"{last}T23:00"], var: [0.2, 0.3]}}


def test_label_ignores_variable_order_but_not_variables():
    a = shelf.request_label(URL, {"daily": "a,b", "x": 1})
    b = shelf.request_label(URL, {"daily": "b,a", "x": 1})
    c = shelf.request_label(URL, {"daily": "a,b,c", "x": 1})     # one more variable = another request
    assert shelf.key(a) == shelf.key(b) != shelf.key(c)


def test_relative_request_needs_its_day():
    with pytest.raises(ValueError):
        shelf.request_label(URL, {"past_days": 3})
    d1 = shelf.request_label(URL, {"past_days": 3}, "2026-11-13")
    d2 = shelf.request_label(URL, {"past_days": 3}, "2026-11-14")
    assert shelf.key(d1) != shelf.key(d2)


def test_check_refuses_wrong_reply():
    lab = shelf.om_location_label(URL, P, "35.00000", "33.00000", None)
    assert shelf.om_check(lab, reply(35.05, 33.05)) is None
    assert "variables" in shelf.om_check(lab, reply(35.0, 33.0, var="soil_temperature_0_to_7cm"))
    assert "runs" in shelf.om_check(lab, reply(35.0, 33.0, first="2025-10-01"))
    assert "far" in shelf.om_check(lab, reply(35.5, 33.0))


def test_shelf_off_without_folder(monkeypatch, tmp_path):
    monkeypatch.delenv("SHROOMY_SHELF", raising=False)
    monkeypatch.setattr(shelf.config, "ROOT", tmp_path / "copy")     # no ../shroomy-shared
    assert not shelf.enabled()
    assert shelf.om_get({"url": URL, "params": {}}) is None


def test_fetch_downloads_only_missing_locations(shelf_dir, tmp_path, monkeypatch):
    lab = shelf.om_location_label(URL, P, "35.00000", "33.00000", None)
    assert shelf.om_put(lab, reply(35.0, 33.0), "test")
    asked = []

    class R:
        status_code = 200
        def __init__(self, q): self.q = q
        def raise_for_status(self): pass
        def json(self):
            return [reply(float(a), float(o)) for a, o in zip(self.q["latitude"].split(","),
                                                             self.q["longitude"].split(","))]

    def fake_get(url, params, headers, timeout):
        asked.append(params["latitude"])
        return R(params)
    monkeypatch.setattr(openmeteo.requests, "get", fake_get)
    b = openmeteo.Budget({"per_minute": 400, "per_hour": 4500, "per_day": 8000}, tmp_path / "own.json")
    out = openmeteo.fetch(URL, [35.0, 34.9], [33.0, 32.9], P, 1, 2, b)
    assert asked == ["34.90000"]                      # the saved location was not asked again
    assert [r["latitude"] for r in out] == [35.0, 34.9]
    assert b.today() == 1                             # one location = one call
    asked.clear()
    openmeteo.fetch(URL, [34.9], [32.9], P, 1, 2, b)  # now both are on the shelf
    assert asked == [] and b.today() == 1


def test_counter_reads_every_copy_once(shelf_dir, tmp_path, monkeypatch):
    now = time.time()
    a, c = tmp_path / "a.json", tmp_path / "c.json"
    a.write_text(json.dumps([[now - 10, 100], [now - 90000, 999]]))      # 2nd is older than a day
    c.write_text(json.dumps([[now - 10, 100], [now - 20, 50]]))          # a clone shares the 1st
    monkeypatch.setattr(shelf, "copy_logs", lambda: [a, c])
    own = tmp_path / "own.json"
    b = openmeteo.Budget({"per_minute": 400, "per_hour": 4500, "per_day": 8000}, own)
    assert b.today() == 150
    b.reserve(25)
    assert b.today() == 175
    log = json.loads((shelf_dir / "openmeteo_usage.json").read_text())
    assert log[-1][1] == 25 and log[-1][2] == shelf.COPY
    with pytest.raises(RuntimeError):
        openmeteo.Budget({"per_minute": 400, "per_hour": 4500, "per_day": 180}, own).reserve(10)


def test_cached_get_uses_shelf_then_labels_downloads(shelf_dir, tmp_path):
    calls = []
    f1 = tmp_path / "one" / "x.json"

    def dl():
        calls.append(1)
        f1.parent.mkdir(parents=True, exist_ok=True)
        f1.write_text('{"ok": 1}')
    shelf.cached_get("gbif", URL, {"q": "x"}, f1, dl)
    f2 = tmp_path / "two" / "x.json"                  # another copy, same exact request
    shelf.cached_get("gbif", URL, {"q": "x"}, f2, lambda: calls.append(2))
    assert calls == [1] and json.loads(f2.read_text()) == {"ok": 1}
