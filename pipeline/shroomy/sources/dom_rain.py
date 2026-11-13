"""Cyprus Department of Meteorology: daily rain at its stations (provisional), saved every day.

The department publishes ONE PDF a day, "Daily and Cummulative Precipitation_DDMMYYYY_ENG.pdf",
in https://www.dom.org.cy/CLIMATOLOGY/English/Provisional%20Precipitation%20Data/ . Only today's
file stays online, so a history exists only if we save it every day.

Per station (17 on 13 Nov 2026): the month's normal (1961-90), rain in the last 24 hours to
08:00, the month's total, % of normal, the normal since 1 October, the total since 1 October,
and % of normal (against the normal to the END of the month, the PDF's own footnote).
The PDF has no station coordinates.

Licence: NOT stated (config/sources.yaml -> dom_rain, to_verify). The archive stays PRIVATE on
this Mac (the shared shelf, files/dom-rain) and is never published until the user has asked
the department.

Run:  uv run python -m shroomy.sources.dom_rain            # save today's PDF + rebuild the table
      uv run python -m shroomy.sources.dom_rain --table    # rebuild the table only (no download)
      ... --import <collector-repo>/dom-rain/pdf            # also copy days the GitHub collector saved
"""
import csv
import io
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

import requests

from .. import config, shelf

BASE = "https://www.dom.org.cy/CLIMATOLOGY/English/Provisional%20Precipitation%20Data/"
NAME = re.compile(r"Daily and Cummulative Precipitation_(\d{2})(\d{2})(\d{4})_ENG\.pdf")
HEADERS = {"User-Agent": "cyprus-mushroom-finder/0.1 (non-commercial, private archive)"}
FIELDS = ["normal_month_mm", "last_24h_mm", "month_total_mm", "month_pct_of_normal",
          "normal_since_oct1_mm", "since_oct1_mm", "since_oct1_pct_of_normal"]
NUM = r"(-|TR|\d+(?:\.\d+)?%?)"
ROW = re.compile(r"^\s*(.*?)\s{2,}" + r"\s+".join([NUM] * 7) + r"\s*$")
AVERAGE = "AVERAGE (area under government control)"


def archive_dir() -> Path:
    """Private archive: the shared shelf on the Mac, else data/raw/dom_rain (never in git)."""
    r = shelf.root()
    return (r / "files" / "dom-rain" / "pdf") if r else config.RAW / "dom_rain" / "pdf"


def listing() -> list[str]:
    """PDF names in the department's folder right now (normally just today's)."""
    r = requests.get(BASE, headers=HEADERS, timeout=60)
    r.raise_for_status()
    return sorted({m.group(0) for m in NAME.finditer(r.text.replace("%20", " "))})


def save_today() -> list[Path]:
    """Download every PDF the folder shows that we do not have yet. Returns the saved paths."""
    out = []
    for name in listing():
        d, m, y = NAME.match(name).groups()
        local = archive_dir() / f"{y}-{m}-{d}.pdf"
        url = BASE + quote(name)

        def download(url=url, local=local):
            r = requests.get(url, headers=HEADERS, timeout=120)
            r.raise_for_status()
            if not r.content.startswith(b"%PDF"):
                raise RuntimeError(f"{url} did not return a PDF")
            local.parent.mkdir(parents=True, exist_ok=True)
            local.write_bytes(r.content)
        new = not local.exists()
        shelf.cached_get("dom-rain", url, {}, local, download)
        print(f" - {local.name}: {'saved' if new else 'already saved'}")
        out.append(local)
    if not out:
        print(" ! no PDF in the department's folder right now")
    return out


def import_from(folder: Path) -> int:
    """Copy PDFs saved by the private GitHub collector (Realexis/shroomy-collector, folder
    dom-rain/pdf) into the archive. Each is labelled on the shelf with the address it came from
    (the collector's saved.csv). Returns how many were new."""
    log = folder.parent / "saved.csv"
    urls = {r["file"]: r["url"] for r in csv.DictReader(open(log))} if log.exists() else {}
    n = 0
    for src in sorted(folder.glob("????-??-??.pdf")):
        dst = archive_dir() / src.name
        if dst.exists():
            continue
        if not src.read_bytes().startswith(b"%PDF"):
            print(f" ! {src.name} is not a PDF, skipped")
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)
        if src.name in urls and shelf.enabled():
            shelf.file_put("dom-rain", shelf.request_label(urls[src.name], {}), dst, by="shroomy-collector")
        print(f" - {src.name}: copied from the GitHub collector")
        n += 1
    return n


def _num(tok: str):
    if tok in ("-", "TR"):
        return None
    return float(tok.rstrip("%"))


def parse(pdf: Path) -> dict:
    """One PDF -> {"as_of", "month", "stations": [...], "average": {...}, "warnings": [...]}."""
    if not shutil.which("pdftotext"):
        raise RuntimeError("pdftotext is missing (Mac: brew install poppler; Linux: apt install poppler-utils)")
    text = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], check=True,
                          capture_output=True, text=True).stdout
    m = re.search(r"records until\s+(\d{2})/(\d{2})/(\d{4})\s*\((\d{2}):(\d{2})", text)
    if not m:
        raise ValueError(f"{pdf.name}: no 'records until' date")
    d, mo, y, hh, mm = m.groups()
    out = {"as_of": f"{y}-{mo}-{d}T{hh}:{mm}", "file": pdf.name, "stations": [], "average": None,
           "warnings": []}
    mon = re.search(r"^\s*(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|"
                    r"NOVEMBER|DECEMBER)\s*$", text, re.M)
    out["month"] = mon.group(1) if mon else None
    for line in text.splitlines():
        if line.lstrip().startswith("(*)"):
            break                                          # below: footnote and the chart
        r = ROW.match(line)
        if not r:
            continue
        name, vals = r.group(1).strip(), r.groups()[1:]
        row = {"station": name, **{f: _num(v) for f, v in zip(FIELDS, vals)}, "raw": line.strip()}
        for total, normal, pct in (("month_total_mm", "normal_month_mm", "month_pct_of_normal"),
                                   ("since_oct1_mm", "normal_since_oct1_mm", "since_oct1_pct_of_normal")):
            if None not in (row[total], row[normal], row[pct]) and row[normal] > 0:
                if abs(100 * row[total] / row[normal] - row[pct]) > 1.5:
                    out["warnings"].append(f"{name}: {pct} {row[pct]} does not match {total}/{normal}")
        if name.upper().startswith("FOR THE AREA UNDER"):
            row["station"] = AVERAGE
            out["average"] = row
        else:
            out["stations"].append(row)
    if not out["stations"]:
        raise ValueError(f"{pdf.name}: no station rows found (layout changed?)")
    return out


def build_table() -> Path:
    """Every saved PDF -> one CSV (one row per station per day) next to the PDFs."""
    pdfs = sorted(archive_dir().glob("????-??-??.pdf"))
    rows, warn = [], []
    for p in pdfs:
        t = parse(p)
        warn += [f"{p.name}: {w}" for w in t["warnings"]]
        for s in t["stations"] + ([t["average"]] if t["average"] else []):
            rows.append({"as_of": t["as_of"], "station": s["station"], **{f: s[f] for f in FIELDS}})
    out = archive_dir().parent / "daily.csv"
    buf = io.StringIO()
    w = csv.DictWriter(buf, ["as_of", "station"] + FIELDS)
    w.writeheader()
    w.writerows(rows)
    shelf._write_atomic(out, buf.getvalue().encode())
    shelf._write_atomic(archive_dir().parent / "status.json", json.dumps({
        "days": len(pdfs), "first": pdfs[0].stem if pdfs else None, "last": pdfs[-1].stem if pdfs else None,
        "rows": len(rows), "warnings": warn, "built": datetime.now().isoformat(timespec="seconds")},
        indent=1).encode())
    print(f"{len(pdfs)} days, {len(rows)} rows -> {out}" + (f" · {len(warn)} warnings" if warn else ""))
    for x in warn:
        print("   !", x)
    return out


if __name__ == "__main__":
    if "--import" in sys.argv:
        import_from(Path(sys.argv[sys.argv.index("--import") + 1]))
    if "--table" not in sys.argv:
        save_today()
    build_table()
