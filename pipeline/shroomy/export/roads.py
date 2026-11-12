"""Nearest forest track and nearest road, from OpenStreetMap (ODbL).

The roads come from our own Protomaps basemap (web/public/tiles/basemap.pmtiles),
read at zoom 14 with GDAL's PMTiles driver. No extra download is needed.
Cached in data/raw/roads/roads.gpkg. If anything fails, the site simply shows
no track/road line (the score never depends on it).

Road access point: the closest point on a drivable road that is NOT inside a
nature reserve (or within RESERVE_BUFFER_M of one). The site's "Drive there"
button sends Google Maps directions to this point, never into a reserve.
"""
import numpy as np
import shapely

from .. import config

CACHE = config.RAW / "roads" / "roads.gpkg"
BASEMAP = config.ROOT / "web" / "public" / "tiles" / "basemap.pmtiles"
RESERVES = config.DATA / "static" / "reserves.geojson"
DRIVE_KINDS = {"highway": "motorway", "major_road": "main road", "minor_road": "minor road"}
ACCESS_SKIP = {"raceway", "driveway"}             # never send directions to these
RESERVE_BUFFER_M = 100                           # keep the access point this far outside reserves


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


def _reserves(crs):
    """Nature reserve polygons in the working CRS (empty if the file is missing)."""
    if not RESERVES.exists():
        return []
    import geopandas as gpd
    return list(gpd.read_file(RESERVES).to_crs(crs).geometry.values)


def access_lines(roads, reserves, buffer_m=RESERVE_BUFFER_M):
    """The drivable road lines with every part inside a reserve (plus a buffer) cut away."""
    roads = np.asarray(roads, dtype=object)
    if not len(reserves):
        return roads
    closed = shapely.union_all(shapely.buffer(np.asarray(reserves, dtype=object), buffer_m))
    out = shapely.difference(roads, closed)
    return out[~shapely.is_empty(out)]


class Nearest:
    """Distances (metres) from points to the nearest track and the nearest drivable road,
    plus the nearest road access point outside nature reserves."""

    def __init__(self, gdf, reserves=(), crs=None):
        from pyproj import Transformer
        tr = gdf[gdf["kind_detail"] == "track"]
        rd = gdf[gdf["kind"].isin(list(DRIVE_KINDS)) & (gdf["kind_detail"] != "service")]
        self.tracks = shapely.STRtree(tr.geometry.values)
        self.roads = shapely.STRtree(rd.geometry.values)
        en = rd["name:en"].fillna("").astype(str).values
        local = rd["name"].fillna("").astype(str).values
        kind = rd["kind"].map(DRIVE_KINDS).values
        self.road_label = np.where(en != "", en, np.where(local != "", local, kind))
        ok = ~rd["kind_detail"].isin(list(ACCESS_SKIP)).values
        crs = crs or gdf.crs
        # No CRS = no lat/lon, so no access point (old callers keep working).
        self.access_geoms = access_lines(rd.geometry.values[ok], list(reserves)) if crs else np.array([], object)
        self.access = shapely.STRtree(self.access_geoms)
        self.to_ll = Transformer.from_crs(crs, "EPSG:4326", always_xy=True) if crs else None

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

    def access_points(self, x, y):
        """Nearest road access point (outside reserves) for each point.
        Returns lat, lon (degrees) and the straight-line distance (metres). NaN = none."""
        pts = shapely.points(np.asarray(x, float), np.asarray(y, float))
        lat, lon, dist = (np.full(len(pts), np.nan) for _ in range(3))
        if not len(self.access_geoms):
            return lat, lon, dist
        idx = self.access.query_nearest(pts, all_matches=False)
        line = shapely.shortest_line(pts[idx[0]], self.access_geoms[idx[1]])
        end = shapely.get_point(line, 1)                         # the end that lies on the road
        lo, la = self.to_ll.transform(shapely.get_x(end), shapely.get_y(end))
        lat[idx[0]], lon[idx[0]] = la, lo
        dist[idx[0]] = shapely.length(line)
        return lat, lon, dist

    def describe(self, x: float, y: float) -> dict:
        dt, dr, ir = self.distances([x], [y])
        out = {"track_km": round(float(dt[0]) / 1000, 1),
               "road_km": round(float(dr[0]) / 1000, 1),
               "road": str(self.road_label[ir[0]]) if ir[0] >= 0 else ""}
        la, lo, d = self.access_points([x], [y])
        if np.isfinite(la[0]):                                   # [lat, lon, km from the zone middle]
            out["at"] = [round(float(la[0]), 5), round(float(lo[0]), 5), round(float(d[0]) / 1000, 1)]
        return out


def square_pins(lat, lon, reserve_id):
    """Pin for each 250 m square: its centre, float32 [lat, lon]. Squares in or touching a
    nature reserve get NaN (no pin), so the site never gives directions into a reserve."""
    out = np.c_[np.asarray(lat, float), np.asarray(lon, float)].astype("float32")
    out[np.asarray(reserve_id) > 0] = np.nan
    return out


def load():
    try:
        crs = config.load("region")["crs"]
        return Nearest(_read(), _reserves(crs), crs)
    except Exception as e:                       # never break the daily run over roads
        print(f" ! roads not available ({e.__class__.__name__}: {e}) — no track/road lines")
        return None
