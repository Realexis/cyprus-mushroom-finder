"""Reading the Department of Meteorology's daily rain PDF. Made-up numbers in the PDF's layout
(the real archive is private: licence not stated)."""
import subprocess
from pathlib import Path

import pytest

from shroomy.sources import dom_rain

TEXT = """                     DEPARTMENT OF METEOROLOGY
                          NOVEMBER
         Provisional records until                13/11/2026 (08:00 a.m.)
                                  Station
STATION ONE                       40.0            1.5                10.0           25%              80.0                40.0           50%
STATION TWO (HILL)                50.0            0.0                0.0            0%               100.0            150.0             150%
STATION THREE                     20.0            TR                 -              -                30.0                 3.0            10%
AVERAGE PRECIPITATION
FOR THE AREA UNDER                 36.7            0.5                5.0           14%              70.0                64.3          92%
GOVT. CONTROL
(*) Perecentage of actual cumulative precipitation since 1/10 ...
                                      100%      80%      60%
"""


@pytest.fixture
def fake_pdftotext(monkeypatch):
    def run(text):
        monkeypatch.setattr(dom_rain.shutil, "which", lambda _: "/usr/bin/pdftotext")
        monkeypatch.setattr(dom_rain.subprocess, "run",
                            lambda *a, **k: subprocess.CompletedProcess(a, 0, stdout=text, stderr=""))
    return run


def test_parse_rows_date_and_average(fake_pdftotext):
    fake_pdftotext(TEXT)
    t = dom_rain.parse(Path("x.pdf"))
    assert t["as_of"] == "2026-11-13T08:00" and t["month"] == "NOVEMBER"
    assert [s["station"] for s in t["stations"]] == ["STATION ONE", "STATION TWO (HILL)", "STATION THREE"]
    one = t["stations"][0]
    assert one["last_24h_mm"] == 1.5 and one["month_pct_of_normal"] == 25 and one["since_oct1_mm"] == 40
    three = t["stations"][2]
    assert three["last_24h_mm"] is None and three["month_total_mm"] is None      # TR and "-" stay empty
    assert t["average"]["station"] == dom_rain.AVERAGE and t["average"]["normal_month_mm"] == 36.7
    assert t["warnings"] == []                                                     # chart lines ignored


def test_percent_check_flags_a_misread(fake_pdftotext):
    fake_pdftotext(TEXT.replace("10.0           25%", "10.0           75%"))
    assert any("STATION ONE" in w for w in dom_rain.parse(Path("x.pdf"))["warnings"])


def test_layout_change_fails_loudly(fake_pdftotext):
    fake_pdftotext("Provisional records until 13/11/2026 (08:00 a.m.)\nnothing else\n")
    with pytest.raises(ValueError):
        dom_rain.parse(Path("x.pdf"))


def test_file_name_pattern():
    m = dom_rain.NAME.search("x Daily and Cummulative Precipitation_13112026_ENG.pdf y")
    assert m.groups() == ("13", "11", "2026")


def test_import_from_collector(tmp_path, monkeypatch):
    from shroomy import shelf
    shelf_dir = tmp_path / "shelf"
    monkeypatch.setenv("SHROOMY_SHELF", str(shelf_dir))
    src = tmp_path / "collector" / "dom-rain" / "pdf"
    src.mkdir(parents=True)
    (src / "2026-11-14.pdf").write_bytes(b"%PDF-1.7 made up")
    (src / "2026-11-15.pdf").write_bytes(b"<html>not a pdf</html>")
    url = "https://example.org/Daily%20and%20Cummulative%20Precipitation_14112026_ENG.pdf"
    (src.parent / "saved.csv").write_text(f"saved_utc,file,bytes,sha256,url\nx,2026-11-14.pdf,1,y,{url}\n")
    assert dom_rain.import_from(src) == 1
    assert (dom_rain.archive_dir() / "2026-11-14.pdf").exists()
    assert not (dom_rain.archive_dir() / "2026-11-15.pdf").exists()
    assert shelf.file_get("dom-rain", shelf.request_label(url, {})) is not None
    assert dom_rain.import_from(src) == 0                  # second time: nothing new
