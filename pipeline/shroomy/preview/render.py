"""Static preview maps of the habitat layer (PNG).

Run:  uv run python -m shroomy.preview.render
"""
import json

import geopandas as gpd
import matplotlib
import numpy as np
import rasterio
import requests

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import Patch
from pyproj import Transformer

from .. import config

# ---------------------------------------------------------------- design tokens (dark)
INK = "#E9EFE6"          # main text
INK_SOFT = "#A9B8AD"     # secondary text
BG = "#0C1612"           # sea / page
LAND = "#2F3E36"         # land with no forest
TREE_COLOURS = {
    1: ("#7FA05E", "Calabrian pine (likely)"),
    2: ("#2F7A5B", "Troodos black pine (likely)"),
    3: ("#E0B040", "Golden oak (likely)"),
    4: ("#A9BE7B", "Other broadleaf"),
    5: ("#86C3B4", "Tripylos cedar zone (closed)"),
}
RESERVE = "#8C928F"
SAFETY = "Conditions only. Never eat a wild mushroom based on this map, an app or an AI."


def _font():
    names = {f.name for f in font_manager.fontManager.ttflist}
    for f in ("Avenir Next", "Avenir", "Helvetica Neue", "Inter", "DejaVu Sans"):
        if f in names:
            return f
    return "sans-serif"


def _places():
    """City/town labels from OpenStreetMap (cached)."""
    p = config.RAW / "osm_places.json"
    if not p.exists():
        q = ('[out:json][timeout:90];area["ISO3166-1"="CY"]->.a;'
             '(node["place"~"^(city|town)$"](area.a);'
             'node["natural"="peak"]["name:en"~"Olympus|Olympos"](area.a););out;')
        r = requests.post("https://overpass-api.de/api/interpreter", data={"data": q},
                          headers={"User-Agent": "shroomy-preview/0.1"}, timeout=120)
        r.raise_for_status()
        p.write_text(r.text)
    els = json.loads(p.read_text())["elements"]
    out = []
    for e in els:
        t = e.get("tags", {})
        name = t.get("name:en") or t.get("name")
        if name:
            out.append((e["lon"], e["lat"], name, t.get("place", "peak")))
    return out


def _load():
    with rasterio.open(config.PROCESSED / "habitat_250m.tif") as src:
        bands = {src.descriptions[i]: src.read(i + 1) for i in range(src.count)}
        bounds, crs = src.bounds, src.crs
    with rasterio.open(config.PROCESSED / "hillshade_50m.tif") as src:
        hs = src.read(1)
    return bands, hs, bounds, crs


def _relief(hs, k):
    """Hillshade 0..1 at the composite resolution (soft, never fully black)."""
    h = np.nan_to_num(hs, nan=0.7)
    h = np.repeat(np.repeat(h, k, 0), k, 1)
    return 0.55 + 0.6 * (h - 0.5)


def _frame(ax, extent, title, subtitle, font):
    ax.set_xlim(extent[0], extent[1]); ax.set_ylim(extent[2], extent[3])
    ax.set_axis_off()
    ax.figure.text(0.035, 0.94, title, color=INK, fontsize=30, fontweight="bold", family=font)
    ax.figure.text(0.035, 0.905, subtitle, color=INK_SOFT, fontsize=15, family=font)
    # Safety banner (always).
    ax.figure.patches.append(plt.Rectangle((0, 0), 1, 0.055, transform=ax.figure.transFigure,
                                           color="#1B2A22", zorder=-1))
    ax.figure.text(0.035, 0.02, "SAFETY  ·  " + SAFETY, color="#F3D9A4", fontsize=14,
                   family=font, fontweight="bold")
    ax.figure.text(0.965, 0.02, "Emergency: 112  ·  Cyprus Poison Centre: 1401",
                   color="#F3D9A4", fontsize=13, family=font, ha="right")


def _labels(ax, crs, font, extent, kinds=("city", "town", "peak"), min_gap_m=9000):
    """Place labels, biggest places first, skipping any too close to one already placed."""
    t = Transformer.from_crs("EPSG:4326", crs, always_xy=True)
    rank = {"city": 0, "peak": 1, "town": 2}
    placed = []
    for lon, lat, name, kind in sorted(_places(), key=lambda p: rank.get(p[3], 9)):
        if kind not in kinds:
            continue
        x, y = t.transform(lon, lat)
        if not (extent[0] < x < extent[1] and extent[2] < y < extent[3]):
            continue
        if any(np.hypot(x - px, y - py) < min_gap_m for px, py in placed):
            continue
        placed.append((x, y))
        big = kind == "city"
        ax.plot(x, y, "o", ms=5 if big else 3, color=INK, mec=BG, mew=1, zorder=6, clip_on=True)
        ax.text(x + 1500, y + 900, name, color=INK, fontsize=13 if big else 10.5,
                family=font, zorder=6, fontweight="bold" if big else "normal", clip_on=True,
                path_effects=[matplotlib.patheffects.withStroke(linewidth=3, foreground=BG)])


def _reserves(ax, font, label=True):
    nr = gpd.read_file(config.RAW / "vectors.gpkg", layer="nature_reserves")
    nr.plot(ax=ax, facecolor=RESERVE + "55", edgecolor="#C9CECB", linewidth=0.9,
            hatch="////", zorder=4)
    if label:
        for _, r in nr.dissolve("siteName").reset_index().iterrows():
            if r.geometry.area < 2e6:
                continue
            c = r.geometry.representative_point()
            ax.text(c.x, c.y, "CLOSED", color="#F2F4F3", fontsize=8.5, family=font,
                    ha="center", va="center", fontweight="bold", zorder=7,
                    path_effects=[matplotlib.patheffects.withStroke(linewidth=2.5,
                                                                    foreground="#3A403D")])
    return nr


def _natura_on_land(bands, b, crs):
    """Natura 2000 outlines clipped to land (marine-only parts are dropped)."""
    from rasterio.features import shapes
    from rasterio.transform import from_origin
    from shapely.geometry import shape
    from shapely.ops import unary_union
    mask = (bands["land_fraction"] > 0.5).astype("uint8")
    tr = from_origin(b.left, b.top, 250, 250)
    land = unary_union([shape(g) for g, v in shapes(mask, mask=mask == 1, transform=tr)])
    n2k = gpd.read_file(config.RAW / "vectors.gpkg", layer="natura2000")
    return n2k.clip(land)


def tree_map(font):
    bands, hs, b, crs = _load()
    k = 5                                         # composite at 50 m (250 m / 5)
    tree = np.repeat(np.repeat(bands["likely_tree"].astype(int), k, 0), k, 1)
    land = np.isfinite(hs)[: tree.shape[0], : tree.shape[1]]      # crisp 50 m coastline
    relief = _relief(hs, 1)[: tree.shape[0], : tree.shape[1]]
    rgb = np.zeros(tree.shape + (3,), "float32")
    rgb[:] = matplotlib.colors.to_rgb(BG)
    rgb[land] = matplotlib.colors.to_rgb(LAND)
    for code, (col, _) in TREE_COLOURS.items():
        rgb[tree == code] = matplotlib.colors.to_rgb(col)
    rgb[land] *= relief[land][:, None]
    rgb = np.clip(rgb, 0, 1)

    fig = plt.figure(figsize=(18, 11.2), dpi=180, facecolor=BG)
    ax = fig.add_axes([0.01, 0.075, 0.76, 0.82], facecolor=BG)
    extent = (b.left, b.right, b.bottom, b.top)
    ax.imshow(rgb, extent=extent, interpolation="bilinear", zorder=1)
    _natura_on_land(bands, b, crs).boundary.plot(
        ax=ax, color="#DDE6D8", linewidth=0.6, linestyle=(0, (2, 2)), alpha=0.6, zorder=3)
    _reserves(ax, font)
    _labels(ax, crs, font, extent)
    _frame(ax, (b.left + 4000, b.right - 4000, b.bottom, b.top - 10000),
           "Where the partner trees are",
           "Habitat layer · likely host trees on a 250 m grid · Phase 1 preview", font)

    # Legend panel.
    summ = json.loads((config.PROCESSED / "habitat_summary.json").read_text())
    lx = 0.775
    fig.text(lx, 0.83, "Likely tree", color=INK, fontsize=17, fontweight="bold", family=font)
    y = 0.79
    for code, (col, name) in TREE_COLOURS.items():
        km2 = summ["by_tree_km2"].get(name, 0)
        fig.patches.append(plt.Rectangle((lx, y - 0.006), 0.018, 0.026,
                                         transform=fig.transFigure, color=col))
        fig.text(lx + 0.026, y, name, color=INK, fontsize=13.5, family=font, va="bottom")
        fig.text(lx + 0.026, y - 0.022, f"{km2:,.0f} km²", color=INK_SOFT, fontsize=11.5,
                 family=font, va="bottom")
        y -= 0.065
    fig.patches.append(plt.Rectangle((lx, y - 0.006), 0.018, 0.026, transform=fig.transFigure,
                                     facecolor=RESERVE + "88", edgecolor="#C9CECB", hatch="////"))
    fig.text(lx + 0.026, y, "Nature reserve — CLOSED", color=INK, fontsize=13.5, family=font)
    fig.text(lx + 0.026, y - 0.022, "score is always 0", color=INK_SOFT, fontsize=11.5, family=font)
    y -= 0.065
    fig.lines.append(plt.Line2D([lx, lx + 0.018], [y + 0.007] * 2, transform=fig.transFigure,
                                color="#DDE6D8", linestyle=(0, (2, 2)), lw=1.2))
    fig.text(lx + 0.026, y, "Natura 2000 site (open)", color=INK, fontsize=13.5, family=font)

    y -= 0.075
    note = ("“Likely” = inferred from forest type,\naltitude and geology.\n"
            "Not a tree survey.\n\n"
            "No rakes. Pick by hand or knife.\nPut the leaf litter back.")
    fig.text(lx, y, note, color=INK_SOFT, fontsize=12, family=font, va="top", linespacing=1.5)
    fig.text(0.965, 0.065, "Data: Copernicus DEM © DLR e.V., © Airbus · Copernicus HRL Forest Type 2018 · "
             "EEA NatDA + Natura 2000 (CC BY 4.0) · Geological Survey Dept. of Cyprus · © OpenStreetMap",
             color="#6F8276", fontsize=9, family=font, ha="right")
    out = config.PREVIEW / "phase1_trees.png"
    fig.savefig(out, facecolor=BG)
    plt.close(fig)
    return out


def shade_map(font):
    """Close-up of Troodos: the shade score (north/east slopes, valleys, low autumn sun)."""
    bands, hs, b, crs = _load()
    t = Transformer.from_crs("EPSG:4326", crs, always_xy=True)
    x0, y0 = t.transform(32.70, 34.80)
    x1, y1 = t.transform(33.15, 35.08)
    shade = bands["shade_score"].copy()
    shade[bands["forest_type"] == 0] = np.nan            # forest only
    k = 5
    sh = np.repeat(np.repeat(shade, k, 0), k, 1)
    land = np.isfinite(hs)[: sh.shape[0], : sh.shape[1]]
    relief = _relief(hs, 1)[: sh.shape[0], : sh.shape[1]]
    cmap = LinearSegmentedColormap.from_list("shade", ["#E7C66B", "#6FA57A", "#2C6E6A", "#173D52"])
    rgb = np.zeros(sh.shape + (3,), "float32")
    rgb[:] = matplotlib.colors.to_rgb(BG)
    rgb[land] = matplotlib.colors.to_rgb(LAND)
    ok = np.isfinite(sh)
    lo, hi = np.nanpercentile(shade, [2, 98])
    rgb[ok] = cmap(np.clip((sh[ok] - lo) / (hi - lo), 0, 1))[:, :3]
    rgb[land] *= relief[land][:, None]
    rgb = np.clip(rgb, 0, 1)

    fig = plt.figure(figsize=(18, 11.2), dpi=180, facecolor=BG)
    ax = fig.add_axes([0.02, 0.07, 0.74, 0.8], facecolor=BG)
    ax.imshow(rgb, extent=(b.left, b.right, b.bottom, b.top), interpolation="bilinear")
    _reserves(ax, font)
    extent = (x0, x1, y0, y1)
    places = [p for p in _places()]
    _labels(ax, crs, font, extent, kinds=("city", "town", "peak"))
    _frame(ax, extent, "Where the forest stays cool and damp",
           "Shade score in Troodos forest · north/east slopes + valleys + low autumn sun", font)
    lx = 0.775
    fig.text(lx, 0.83, "Shade score", color=INK, fontsize=17, fontweight="bold", family=font)
    grad = np.linspace(0, 1, 256)[None, :]
    cax = fig.add_axes([lx, 0.77, 0.19, 0.03])
    cax.imshow(grad, aspect="auto", cmap=cmap); cax.set_axis_off()
    fig.text(lx, 0.745, "sunny, exposed", color=INK_SOFT, fontsize=12, family=font)
    fig.text(lx + 0.19, 0.745, "deep shade", color=INK_SOFT, fontsize=12, family=font, ha="right")
    note = ("Made of three parts (draft weights):\n"
            "•  slope faces north / east\n•  valley bottom\n"
            "•  little autumn sun, incl. ridge shadows\n   (31 Oct, 08:00–16:00)\n\n"
            "Weight in today's score: 10%.\n\n"
            "Grey hatched = nature reserve, CLOSED.")
    fig.text(lx, 0.69, note, color=INK, fontsize=12.5, family=font, va="top", linespacing=1.6)
    out = config.PREVIEW / "phase1_shade_troodos.png"
    fig.savefig(out, facecolor=BG)
    plt.close(fig)
    return out


def main():
    import matplotlib.patheffects  # noqa: F401  (used for label halos)
    config.PREVIEW.mkdir(parents=True, exist_ok=True)
    font = _font()
    print(tree_map(font))
    print(shade_map(font))


if __name__ == "__main__":
    main()
