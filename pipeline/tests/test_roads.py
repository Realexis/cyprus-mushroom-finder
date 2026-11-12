"""Tests for the road access point behind the "Drive there" button.
Small fake road maps in UTM 36N (metres) with known answers."""
import geopandas as gpd
import numpy as np
import pytest
from pyproj import Transformer
from shapely.geometry import LineString, Point, box

from shroomy.export import roads

CRS = "EPSG:32636"
X0, Y0 = 500_000, 3_870_000                      # inside Cyprus (Troodos area)
to_xy = Transformer.from_crs("EPSG:4326", CRS, always_xy=True)


def road_map(*rows):
    """rows: (geometry, kind, kind_detail)."""
    return gpd.GeoDataFrame({"kind": [r[1] for r in rows], "kind_detail": [r[2] for r in rows],
                             "name": [""] * len(rows), "name:en": [""] * len(rows)},
                            geometry=[r[0] for r in rows], crs=CRS)


def back_to_xy(lat, lon):
    return to_xy.transform(lon, lat)


def east_west_road(y):
    return LineString([(X0 - 5000, y), (X0 + 5000, y)])


def test_access_point_is_closest_point_on_the_road():
    near = roads.Nearest(road_map((east_west_road(Y0 + 1000), "minor_road", "")), crs=CRS)
    lat, lon, d = near.access_points([X0], [Y0])
    x, y = back_to_xy(lat[0], lon[0])
    assert x == pytest.approx(X0, abs=0.5)
    assert y == pytest.approx(Y0 + 1000, abs=0.5)
    assert d[0] == pytest.approx(1000, abs=0.5)


def test_lat_lon_is_in_cyprus():
    near = roads.Nearest(road_map((east_west_road(Y0 + 1000), "minor_road", "")), crs=CRS)
    lat, lon, _ = near.access_points([X0], [Y0])
    assert 34.5 < lat[0] < 35.8 and 32.2 < lon[0] < 34.7


def test_tracks_service_and_raceways_are_not_access_points():
    near = roads.Nearest(road_map((east_west_road(Y0 + 100), "path", "track"),
                                  (east_west_road(Y0 + 150), "minor_road", "raceway"),
                                  (east_west_road(Y0 + 200), "minor_road", "service"),
                                  (east_west_road(Y0 + 3000), "major_road", "")), crs=CRS)
    lat, lon, d = near.access_points([X0], [Y0])
    assert back_to_xy(lat[0], lon[0])[1] == pytest.approx(Y0 + 3000, abs=0.5)
    assert d[0] == pytest.approx(3000, abs=0.5)


def test_access_point_never_inside_a_reserve():
    # The road passes 500 m north of the point, through a reserve 2 km wide.
    reserve = box(X0 - 1000, Y0, X0 + 1000, Y0 + 2000)
    near = roads.Nearest(road_map((east_west_road(Y0 + 500), "minor_road", "")), [reserve], crs=CRS)
    lat, lon, d = near.access_points([X0], [Y0])
    x, y = back_to_xy(lat[0], lon[0])
    assert not reserve.buffer(roads.RESERVE_BUFFER_M - 1).contains(Point(x, y))
    assert abs(x - X0) == pytest.approx(1000 + roads.RESERVE_BUFFER_M, abs=1)   # just past the edge
    assert y == pytest.approx(Y0 + 500, abs=0.5)


def test_road_fully_inside_a_reserve_is_skipped():
    reserve = box(X0 - 10_000, Y0, X0 + 10_000, Y0 + 2000)
    near = roads.Nearest(road_map((east_west_road(Y0 + 500), "minor_road", ""),
                                  (east_west_road(Y0 - 4000), "minor_road", "")), [reserve], crs=CRS)
    lat, lon, _ = near.access_points([X0], [Y0 + 1000])
    assert back_to_xy(lat[0], lon[0])[1] == pytest.approx(Y0 - 4000, abs=0.5)


def test_no_access_roads_gives_nan():
    reserve = box(X0 - 10_000, Y0 - 10_000, X0 + 10_000, Y0 + 10_000)
    near = roads.Nearest(road_map((east_west_road(Y0 + 500), "minor_road", "")), [reserve], crs=CRS)
    lat, lon, d = near.access_points([X0], [Y0])
    assert np.isnan(lat[0]) and np.isnan(lon[0]) and np.isnan(d[0])
    assert "at" not in near.describe(X0, Y0)


def test_describe_adds_lat_lon_km():
    near = roads.Nearest(road_map((east_west_road(Y0 + 1000), "minor_road", "")), crs=CRS)
    out = near.describe(X0, Y0)
    assert out["road_km"] == 1.0
    lat, lon, km = out["at"]
    assert km == 1.0
    x, y = back_to_xy(lat, lon)
    assert y == pytest.approx(Y0 + 1000, abs=2)                      # 5 decimals ≈ 1 m


def test_square_pins_are_centres_but_never_in_a_reserve():
    pins = roads.square_pins([34.9, 34.95, 35.0], [32.8, 32.85, 32.9], [0, 3, 0])
    assert pins.dtype == np.float32 and pins.shape == (3, 2)
    assert pins[0].tolist() == pytest.approx([34.9, 32.8], abs=1e-5)
    assert np.isnan(pins[1]).all()                                  # in/touching a reserve: no pin
    assert pins[2].tolist() == pytest.approx([35.0, 32.9], abs=1e-5)
