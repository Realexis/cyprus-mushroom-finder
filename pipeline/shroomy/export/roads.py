"""Nearest forest track and nearest road, from OpenStreetMap (ODbL).

The roads come from our own Protomaps basemap (web/public/tiles/basemap.pmtiles),
read at zoom 14 with GDAL's PMTiles driver. No extra download is needed.
Cached in data/raw/roads/roads.gpkg. If anything fails, the site simply shows
no track/road line (the score never depends on it).
"""
import numpy as np
import shapely

from .. import config

CACHE = config.RAW / "roads" / "roads.gpkg"
BASEMAP = config.ROOT / "web" / "public" / "tiles" / "basemap.pmtiles"
DRIVE_KINDS = {"highway": "motorway", "major_road": "main road", "minor_road": "minor road"}


def _read():
    import geopandas as gpd
    import pyogrio
    crs = config.load("region")["crs"]
    if not CACHE.exists():
        df = pyogrio.read_dataframe(BASEMAP, layer="roads", columns=["kind", "kind_detail", "name", "name:en"],
                                    ZOOM_LEVEL=14)
        df = df[df["kind"].isin(list(DRIVE_KINDS)) | (df["kind_detail"] == "track")].to_crs(crs)
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        df.to_file(CACHE, driver="GPKG")
    return gpd.read_file(CACHE)


class Nearest:
    """Distances (metres) from points to the nearest track and the nearest drivable road."""

    def __init__(self, gdf):
        tr = gdf[gdf["kind_detail"] == "track"]
        rd = gdf[gdf["kind"].isin(list(DRIVE_KINDS)) & (gdf["kind_detail"] != "service")]
        self.tracks = shapely.STRtree(tr.geometry.values)
        self.roads = shapely.STRtree(rd.geometry.values)
        en = rd["name:en"].fillna("").astype(str).values
        local = rd["name"].fillna("").astype(str).values
        kind = rd["kind"].map(DRIVE_KINDS).values
        self.road_label = np.where(en != "", en, np.where(local != "", local, kind))

    @staticmethod
    def _query(tree, pts):
        idx, dist = tree.query_nearest(pts, return_distance=True, all_matches=False)
        out_d = np.full(len(pts), np.nan)
        out_i = np.full(len(pts), -1)
        out_d[idx[0]] = dist
        out_i[idx[0]] = idx[1]
        return out_d, out_i

    def distances(self, x, y):
        pts = shapely.points(np.asarray(x, float), np.asarray(y, float))
        dt, _ = self._query(self.tracks, pts)
        dr, ir = self._query(self.roads, pts)
        return dt, dr, ir

    def describe(self, x: float, y: float) -> dict:
        dt, dr, ir = self.distances([x], [y])
        return {"track_km": round(float(dt[0]) / 1000, 1),
                "road_km": round(float(dr[0]) / 1000, 1),
                "road": str(self.road_label[ir[0]]) if ir[0] >= 0 else ""}


def load():
    try:
        return Nearest(_read())
    except Exception as e:                       # never break the daily run over roads
        print(f" ! roads not available ({e.__class__.__name__}: {e}) — no track/road lines")
        return None
