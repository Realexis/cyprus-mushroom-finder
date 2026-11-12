"""First heatmap of today's growing-conditions score (PNG).

Run:  uv run python -m shroomy.preview.heatmap [YYYY-MM-DD]
"""
import json
import sys
from datetime import date

import matplotlib
import matplotlib.patheffects  # noqa: F401
import numpy as np
import rasterio

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from pyproj import Transformer

from .. import config
from .render import (BG, INK, INK_SOFT, LAND, RESERVE, _font, _frame, _labels, _load,
                     _natura_on_land, _relief, _reserves)

# Calm at the low end, warm glow at the top.
SCORE_CMAP = LinearSegmentedColormap.from_list(
    "score", [(0.0, "#23413F"), (0.3, "#3E6B57"), (0.5, "#7E9F55"),
              (0.7, "#D9B44A"), (0.85, "#EE8E4A"), (1.0, "#FF6A4D")])
FACTOR_LABEL = {"rain_total": "Rain, last 30 days", "rain_pulse": "Soaking rain 7–20 days ago",
                "temperature": "Temperature, last 7 days", "soil_moisture": "Soil moisture vs normal",
                "season_altitude": "Season for the altitude", "shade": "Shade"}


def _score(day):
    p = config.PROCESSED / "scores" / f"score_{day}.tif"
    with rasterio.open(p) as src:
        b = {src.descriptions[i]: src.read(i + 1) for i in range(src.count)}
    s = json.loads((config.PROCESSED / "scores" / f"score_{day}.json").read_text())
    return b, s


def _composite(score, hs, land_hab):
    k = 5
    sc = np.repeat(np.repeat(score, k, 0), k, 1)
    land = np.isfinite(hs)[: sc.shape[0], : sc.shape[1]]
    relief = _relief(hs, 1)[: sc.shape[0], : sc.shape[1]]
    rgb = np.zeros(sc.shape + (3,), "float32")
    rgb[:] = matplotlib.colors.to_rgb(BG)
    rgb[land] = matplotlib.colors.to_rgb(LAND)
    ok = np.isfinite(sc)
    rgb[ok] = SCORE_CMAP(np.clip(sc[ok] / 100, 0, 1))[:, :3]
    rgb[land] *= relief[land][:, None]
    return np.clip(rgb, 0, 1)


def _panel(fig, font, summ, day):
    lx = 0.775
    fig.text(lx, 0.83, "Conditions score", color=INK, fontsize=17, fontweight="bold", family=font)
    cax = fig.add_axes([lx, 0.775, 0.19, 0.028])
    cax.imshow(np.linspace(0, 1, 256)[None, :], aspect="auto", cmap=SCORE_CMAP); cax.set_axis_off()
    for v, x in ((0, lx), (50, lx + 0.095), (100, lx + 0.19)):
        fig.text(x, 0.752, str(v), color=INK_SOFT, fontsize=11, family=font, ha="center")
    fig.text(lx, 0.715, "Why, on average across open forest", color=INK, fontsize=13.5,
             fontweight="bold", family=font)
    W = config.load("scoring")["score"]["weights"]
    y = 0.68
    for k, lab in FACTOR_LABEL.items():
        v = summ["factor_means_forest"][k]
        fig.text(lx, y, f"{lab}", color=INK, fontsize=11.5, family=font)
        fig.text(lx + 0.19, y, f"weight {W[k]:.0%}", color=INK_SOFT, fontsize=10, family=font, ha="right")
        fig.patches.append(plt.Rectangle((lx, y - 0.018), 0.19, 0.009, transform=fig.transFigure,
                                         color="#2B3A33"))
        fig.patches.append(plt.Rectangle((lx, y - 0.018), 0.19 * v, 0.009, transform=fig.transFigure,
                                         color=SCORE_CMAP(0.25 + 0.65 * v)))
        y -= 0.052
    i = summ["inputs_forest_median"]
    facts = (f"Typical forest cell today:\n"
             f"•  {i['rain_30d_mm']:.0f} mm rain in 30 days\n"
             f"•  {i['pulse_mm']:.0f} mm biggest 3-day soak (7–20 d ago)\n"
             f"•  {i['t7_mean_c']:.1f} °C mean over 7 days\n"
             f"•  soil wetter than {i['soil_percentile']:.0f}% of last season")
    fig.text(lx, y - 0.005, facts, color=INK_SOFT, fontsize=11.5, family=font, va="top", linespacing=1.55)
    fig.text(lx, 0.105, "Grey hatched = nature reserve, CLOSED.\nNo rakes. Pick by hand or knife.\n"
             "Put the leaf litter back.", color=INK_SOFT, fontsize=11, family=font, va="bottom",
             linespacing=1.5)


def island(day, font):
    bands, hs, b, crs = _load()
    sc, summ = _score(day)
    rgb = _composite(sc["score"], hs, bands["land_fraction"])
    fig = plt.figure(figsize=(18, 11.2), dpi=180, facecolor=BG)
    ax = fig.add_axes([0.01, 0.075, 0.76, 0.82], facecolor=BG)
    ax.imshow(rgb, extent=(b.left, b.right, b.bottom, b.top), interpolation="bilinear")
    _natura_on_land(bands, b, crs).boundary.plot(ax=ax, color="#DDE6D8", linewidth=0.5,
                                                 linestyle=(0, (2, 2)), alpha=0.35, zorder=3)
    _reserves(ax, font)
    extent = (b.left + 4000, b.right - 4000, b.bottom, b.top - 10000)
    _labels(ax, crs, font, extent)
    d = date.fromisoformat(day)
    _frame(ax, extent, f"Growing conditions · {d:%A %-d %B %Y}",
           "Weather + habitat score on open forest, 250 m grid · v1 rules · Phase 2 preview", font)
    _panel(fig, font, summ, day)
    fig.text(0.965, 0.065, "Weather: Open-Meteo.com (CC BY 4.0), ECMWF IFS · Copernicus DEM © DLR e.V., © Airbus · "
             "Copernicus HRL Forest Type · EEA (CC BY 4.0) · © OpenStreetMap",
             color="#6F8276", fontsize=9, family=font, ha="right")
    out = config.PREVIEW / f"phase2_score_{day}.png"
    fig.savefig(out, facecolor=BG); plt.close(fig)
    return out


def troodos(day, font):
    bands, hs, b, crs = _load()
    sc, summ = _score(day)
    rgb = _composite(sc["score"], hs, bands["land_fraction"])
    t = Transformer.from_crs("EPSG:4326", crs, always_xy=True)
    x0, y0 = t.transform(32.62, 34.78); x1, y1 = t.transform(33.30, 35.12)
    fig = plt.figure(figsize=(18, 11.2), dpi=180, facecolor=BG)
    ax = fig.add_axes([0.01, 0.075, 0.76, 0.82], facecolor=BG)
    ax.imshow(rgb, extent=(b.left, b.right, b.bottom, b.top), interpolation="nearest")
    _reserves(ax, font)
    extent = (x0, x1, y0, y1)
    _labels(ax, crs, font, extent, min_gap_m=4000)
    d = date.fromisoformat(day)
    _frame(ax, extent, f"Troodos close-up · {d:%-d %B %Y}",
           "Each square = 250 m · higher score = better growing conditions today", font)
    _panel(fig, font, summ, day)
    out = config.PREVIEW / f"phase2_score_troodos_{day}.png"
    fig.savefig(out, facecolor=BG); plt.close(fig)
    return out


if __name__ == "__main__":
    runs = sorted((config.PROCESSED / "scores").glob("score_*.json"))
    day = sys.argv[1] if len(sys.argv) > 1 else json.loads(runs[-1].read_text())["day"]
    f = _font()
    print(island(day, f)); print(troodos(day, f))
