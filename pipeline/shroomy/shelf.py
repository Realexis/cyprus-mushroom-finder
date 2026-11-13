"""The shared download shelf: one copy of every raw download for ALL project copies on this Mac.

Several copies of this project live side by side (shroomy, shroomy-dev, shroomy-v3-fable,
shroomy-v4-fable, shroomy-audit, shroomy-v5, ...). They used to download the same weather and the
same records again and again, and each counted only its own Open-Meteo calls. The shelf fixes both:

- Every saved reply is labelled by its EXACT request (address + every parameter, plus the Cyprus
  day for "past N days / next N days" requests, whose answer changes each day). A request with one
  more variable (V4's soil temperature) is a different label, never mixed up.
- Open-Meteo replies are kept per location, so a copy that groups its points differently, or asks
  for a few more points, still reuses every location already on the shelf.
- ONE Open-Meteo call counter for the whole Mac (`openmeteo_usage.json` on the shelf). Until every
  copy writes to it, it also reads each copy's own `data/raw/openmeteo_usage.json` (same time = same
  call, counted once).
- Only raw downloads live here. Scores and maps stay inside each copy.

Where: $SHROOMY_SHELF, else the folder `shroomy-shared` next to this project. If neither exists
(the GitHub robot), the shelf is off and everything works as before (per-copy cache and log).
"""
import fcntl
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from . import config

COPY = config.ROOT.name                     # this copy's name, e.g. "shroomy-v5"
RELATIVE = ("past_days", "forecast_days", "past_hours", "forecast_hours")
LIST_PARAMS = ("daily", "hourly", "current", "minutely_15")   # variable lists: order does not matter


def root() -> Path | None:
    env = os.environ.get("SHROOMY_SHELF")
    if env:
        return Path(env)
    p = config.ROOT.parent / "shroomy-shared"
    return p if p.is_dir() else None


def enabled() -> bool:
    return root() is not None


# ------------------------------------------------------------------ labels
def request_label(url: str, params: dict, day: str | None = None) -> dict:
    """The exact request, in one canonical form. Variable lists are sorted (same data whatever the
    order); everything else is kept as sent. `day` (the Cyprus day) is required for relative
    requests, and can be given for any answer that changes over time (this year's fires)."""
    p = {}
    for k, v in params.items():
        v = str(v)
        p[k] = ",".join(sorted(v.split(","))) if k in LIST_PARAMS else v
    if any(k in p for k in RELATIVE) and not day:
        raise ValueError("a 'past/next N days' request needs the Cyprus day it was made for")
    lab = {"url": url, "params": dict(sorted(p.items()))}
    if day:
        lab["day"] = day
    return lab


def key(label: dict) -> str:
    return hashlib.sha256(json.dumps(label, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def _write_atomic(path: Path, data: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".tmp-")
    with os.fdopen(fd, "wb") as f:
        f.write(data)
    os.replace(tmp, path)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ------------------------------------------------------------------ Open-Meteo (per location)
def om_location_label(url: str, params: dict, lat: str, lon: str, day: str | None) -> dict:
    """Label of ONE location of a multi-location Open-Meteo request (coordinates as sent)."""
    p = {k: v for k, v in params.items() if k not in ("latitude", "longitude")}
    return request_label(url, p | {"latitude": lat, "longitude": lon}, day)


def om_check(label: dict, reply: dict, tol_deg: float = 0.2) -> str | None:
    """Does this reply answer this request? None if yes, else the reason.

    Checks what a reply can prove: the variables, the first and last time, and that its grid
    point lies within `tol_deg` of the asked coordinates. Open-Meteo moves each point to a model
    cell, and coastal points to the nearest LAND cell: up to 0.12 degrees on the west coast
    (measured 13 Nov 2026), so 0.2 degrees catches a wrong file, not a moved point."""
    from datetime import date, timedelta
    p = label["params"]
    for kind in ("daily", "hourly"):
        asked = set(p[kind].split(",")) if kind in p else set()
        got = set(reply.get(kind, {})) - {"time"}
        if asked != got:
            return f"{kind} variables {sorted(got)} != asked {sorted(asked)}"
    if abs(float(reply["latitude"]) - float(p["latitude"])) > tol_deg or \
            abs(float(reply["longitude"]) - float(p["longitude"])) > tol_deg:
        return "grid point too far from the asked coordinates"
    if "start_date" in p:
        first, last = p["start_date"], p["end_date"]
    elif "day" in label:
        d0 = date.fromisoformat(label["day"])
        first = (d0 - timedelta(days=int(p.get("past_days", 0)))).isoformat()
        last = (d0 + timedelta(days=int(p.get("forecast_days", 7)) - 1)).isoformat()
    else:
        return None
    for kind in ("daily", "hourly"):
        if kind in p:
            t = reply[kind]["time"]
            if t[0][:10] != first or t[-1][:10] != last:
                return f"{kind} runs {t[0][:10]}..{t[-1][:10]}, asked {first}..{last}"
    return None


def _om_path(k: str) -> Path:
    return root() / "openmeteo" / k[:2] / f"{k}.json"


def om_get(label: dict):
    """The saved reply for one location, or None."""
    if not enabled():
        return None
    f = _om_path(key(label))
    if not f.exists():
        return None
    return json.loads(f.read_text())["reply"]


def om_put(label: dict, reply: dict, source: str):
    """Save one location's reply. Never overwrites: the first saved answer stays.
    A reply that does not match its request (om_check) is refused."""
    if not enabled() or om_check(label, reply):
        return False
    f = _om_path(key(label))
    if f.exists():
        return False
    _write_atomic(f, json.dumps({"request": label, "saved": _now(), "by": source,
                                 "reply": reply}, separators=(",", ":")).encode())
    return True


# ------------------------------------------------------------------ other sources (whole files)
def _file_dir(source: str) -> Path:
    return root() / "files" / source


def file_get(source: str, label: dict) -> Path | None:
    """Path of the saved reply for this exact request, or None."""
    if not enabled():
        return None
    k = key(label)
    meta = _file_dir(source) / k[:2] / f"{k}.meta.json"
    if not meta.exists():
        return None
    m = json.loads(meta.read_text())
    f = _blob(source, m["sha256"], m["ext"])
    return f if f.exists() else None


def _blob(source, sha, ext) -> Path:
    return _file_dir(source) / "blobs" / f"{sha}{ext}"


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def add_blob(source: str, path: Path) -> tuple[str, Path]:
    """Store a file by its content (an APFS clone: no extra disk on this Mac). Returns (sha, path)."""
    sha = _sha256(path)
    ext = path.suffix
    dst = _blob(source, sha, ext)
    if not dst.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        tmp = dst.with_name(f".tmp-{os.getpid()}-{dst.name}")
        r = subprocess.run(["cp", "-c", str(path), str(tmp)], capture_output=True)   # clone if possible
        if r.returncode != 0:
            shutil.copyfile(path, tmp)
        os.replace(tmp, dst)
    return sha, dst


def file_put(source: str, label: dict, path: Path, by: str = COPY) -> bool:
    """Label a downloaded file with its exact request. False if the label already exists."""
    if not enabled():
        return False
    k = key(label)
    meta = _file_dir(source) / k[:2] / f"{k}.meta.json"
    if meta.exists():
        return False
    sha, blob = add_blob(source, path)
    ext = blob.name[len(sha):]
    _write_atomic(meta, json.dumps({"request": label, "sha256": sha, "ext": ext, "saved": _now(),
                                    "by": by}, indent=1).encode())
    return True


def cached_get(source: str, url: str, params: dict, local: Path, download, day: str | None = None) -> Path:
    """Shelf-aware download of one file to `local`.

    1. `local` exists -> use it (and label it on the shelf if it is not there yet).
    2. The shelf has this exact request -> copy it to `local`.
    3. Otherwise call download() (must write `local`), then put it on the shelf.
    """
    label = request_label(url, params, day) if enabled() else None
    if local.exists():
        if label:
            file_put(source, label, local)
        return local
    if label:
        hit = file_get(source, label)
        if hit:
            local.parent.mkdir(parents=True, exist_ok=True)
            if subprocess.run(["cp", "-c", str(hit), str(local)], capture_output=True).returncode != 0:
                shutil.copyfile(hit, local)
            return local
    download()
    if label and local.exists():
        file_put(source, label, local)
    return local


# ------------------------------------------------------------------ the shared Open-Meteo counter
def _usage_file() -> Path:
    return root() / "openmeteo_usage.json"


def copy_logs() -> list[Path]:
    """Every project copy's own Open-Meteo log next to this one (shroomy*, any name)."""
    return sorted(config.ROOT.parent.glob("shroomy*/data/raw/openmeteo_usage.json"))


@contextmanager
def usage_lock():
    lock = root() / ".openmeteo_usage.lock"
    lock.parent.mkdir(parents=True, exist_ok=True)
    with open(lock, "a") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def _read(path: Path) -> list:
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return []


def all_calls(own_log: Path, window: float = 86400) -> dict[float, float]:
    """{unix_time: calls} for the last `window` seconds, from the shared log + every copy's log.
    The same time in two logs is one call (copies made by cloning share old entries)."""
    now = time.time()
    out = {}
    logs = [own_log] + (copy_logs() + [_usage_file()] if enabled() else [])
    for log in logs:
        for e in _read(log):
            t, c = float(e[0]), float(e[1])
            if now - t < window:
                out[round(t, 3)] = c
    return out


def record_call(t: float, calls: float, own_log: Path, note: str = ""):
    """Add one call to the shared log (and this copy's own log, for older code that reads it)."""
    now = time.time()
    if enabled():
        f = _usage_file()
        log = [e for e in _read(f) if now - float(e[0]) < 86400 * 7]
        log.append([t, calls, COPY, note])
        _write_atomic(f, json.dumps(log).encode())
    own = [e for e in _read(own_log) if now - float(e[0]) < 86400]
    own.append([t, calls])
    _write_atomic(own_log, json.dumps(own).encode())
