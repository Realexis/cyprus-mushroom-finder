from datetime import date, timedelta

import numpy as np
import pytest

from shroomy.weather import history as H


def fake_run(path, today, past, fc, value):
    t = date.fromisoformat(today)
    dates = [(t + timedelta(days=k)).isoformat() for k in range(-past, fc)]
    n = 3
    arr = np.full((n, len(dates)), value, "float32")
    np.savez_compressed(path, dates=np.array(dates), today=today, model="ecmwf_ifs",
                        lon=np.arange(n, dtype=float), lat=np.arange(n, dtype=float),
                        x=np.zeros(n), y=np.zeros(n), elev_om=np.zeros(n),
                        **{v: arr for v in H.VARS})
    return path


def test_merge_then_incremental(tmp_path):
    store = tmp_path / "h.npz"
    H.merge(fake_run(tmp_path / "a.npz", "2026-11-12", 31, 8, 1.0), store)
    assert H.complete_for(date(2026, 11, 12), 31, store)
    # Next day: small fetch with new values overwrites the overlap only.
    H.merge(fake_run(tmp_path / "b.npz", "2026-11-13", 3, 8, 2.0), store)
    assert H.complete_for(date(2026, 11, 13), 31, store)
    out = tmp_path / "run.npz"
    H.assemble(date(2026, 11, 13), 31, 8, out, store)
    z = np.load(out)
    assert z["precip"].shape == (3, 39)
    assert z["precip"][0, 0] == 1.0          # old day kept
    assert z["precip"][0, -1] == 2.0         # newest forecast
    assert str(z["today"]) == "2026-11-13"


def test_gap_is_detected(tmp_path):
    store = tmp_path / "h.npz"
    H.merge(fake_run(tmp_path / "a.npz", "2026-11-12", 31, 8, 1.0), store)
    # Skip 5 days: those days were only ever forecasts -> not observed.
    assert not H.complete_for(date(2026, 11, 18), 31, store)


def test_assemble_refuses_missing_days(tmp_path):
    store = tmp_path / "h.npz"
    H.merge(fake_run(tmp_path / "a.npz", "2026-11-12", 3, 8, 1.0), store)
    with pytest.raises(RuntimeError):
        H.assemble(date(2026, 11, 12), 31, 8, tmp_path / "r.npz", store)


def test_next_day_needs_only_incremental_fetch(tmp_path):
    store = tmp_path / "h.npz"
    H.merge(fake_run(tmp_path / "a.npz", "2026-11-12", 31, 8, 1.0), store)
    # Tomorrow: the 3 newest past days come from the small fetch -> no full fetch needed.
    assert H.complete_for(date(2026, 11, 13), 31, store, skip_recent=3)
    assert not H.complete_for(date(2026, 11, 13), 31, store, skip_recent=0)
