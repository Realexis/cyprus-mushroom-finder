"""Terrain maths on a DEM grid (pure numpy, so it is easy to test).

Conventions:
- Rows run north -> south, columns west -> east.
- Aspect = the compass direction a slope FACES (0 = north, 90 = east).
- Sun azimuth = compass direction OF the sun (0 = north, 180 = south).
"""
from datetime import date, datetime, timedelta

import numpy as np
from scipy import ndimage


# ---------------------------------------------------------------- slope + aspect
def slope_aspect(dem: np.ndarray, res: float):
    """Slope (degrees) and aspect (degrees, direction the slope faces)."""
    dz_drow, dz_dcol = np.gradient(dem.astype("float64"), res)
    dz_dx = dz_dcol            # rise going east
    dz_dy = -dz_drow           # rise going north (rows go south)
    slope = np.degrees(np.arctan(np.hypot(dz_dx, dz_dy)))
    # The slope faces downhill = minus the gradient.
    aspect = np.degrees(np.arctan2(-dz_dx, -dz_dy)) % 360.0
    return slope.astype("float32"), aspect.astype("float32")


# ---------------------------------------------------------------- sun
def sun_positions(lat: float, lon: float, day: date, hours_local, utc_offset: float):
    """Sun (azimuth, elevation) in degrees for each local clock hour.

    Standard solar geometry (declination + equation of time). Accurate to
    well under a degree, which is plenty for hillshade.
    """
    out = []
    n = day.timetuple().tm_yday
    decl = np.radians(23.44) * np.sin(2 * np.pi * (284 + n) / 365.0)
    b = 2 * np.pi * (n - 81) / 364.0
    eot_min = 9.87 * np.sin(2 * b) - 7.53 * np.cos(b) - 1.5 * np.sin(b)
    phi = np.radians(lat)
    for h in hours_local:
        utc_h = h - utc_offset
        solar_h = utc_h + lon / 15.0 + eot_min / 60.0
        ha = np.radians(15.0 * (solar_h - 12.0))
        sin_el = np.sin(phi) * np.sin(decl) + np.cos(phi) * np.cos(decl) * np.cos(ha)
        el = np.arcsin(sin_el)
        cos_az = (np.sin(decl) - sin_el * np.sin(phi)) / (np.cos(el) * np.cos(phi))
        az = np.degrees(np.arccos(np.clip(cos_az, -1, 1)))
        if ha > 0:                      # afternoon: sun is west of south
            az = 360.0 - az
        out.append((float(az), float(np.degrees(el))))
    return out


def illumination(slope, aspect, sun_az, sun_el):
    """Direct-sun strength on each slope, 0..1 (cosine of the incidence angle)."""
    s, a = np.radians(slope), np.radians(aspect)
    z = np.radians(90.0 - sun_el)
    v = np.cos(z) * np.cos(s) + np.sin(z) * np.sin(s) * np.cos(np.radians(sun_az) - a)
    return np.clip(v, 0, None).astype("float32")


def cast_shadow(dem: np.ndarray, res: float, sun_az: float, sun_el: float,
                max_dist_m: float) -> np.ndarray:
    """True where a ridge between the cell and the sun blocks the sun.

    Looks along the line towards the sun. If any point on that line is
    higher than the sun ray from this cell, the cell is in shadow.
    """
    if sun_el <= 0:
        return np.ones(dem.shape, bool)
    h, w = dem.shape
    tan_el = np.tan(np.radians(sun_el))
    east, north = np.sin(np.radians(sun_az)), np.cos(np.radians(sun_az))
    max_px = int(max_dist_m / res)
    # Fine steps near the cell, coarser further away (keeps it fast).
    steps = np.unique(np.round(np.geomspace(1, max_px, 160)).astype(int))
    horizon = np.full(dem.shape, -np.inf, dtype="float32")
    for d in steps:
        dc = int(round(d * east))           # columns towards the sun
        dr = int(round(-d * north))         # rows towards the sun (north = up)
        if abs(dc) >= w or abs(dr) >= h:
            continue
        shifted = np.full(dem.shape, -np.inf, dtype="float32")
        src_r = slice(max(dr, 0), h + min(dr, 0))
        dst_r = slice(max(-dr, 0), h + min(-dr, 0))
        src_c = slice(max(dc, 0), w + min(dc, 0))
        dst_c = slice(max(-dc, 0), w + min(-dc, 0))
        shifted[dst_r, dst_c] = dem[src_r, src_c]
        dist = res * np.hypot(dc, dr)       # true distance of the rounded step
        np.maximum(horizon, shifted - dist * tan_el, out=horizon)
    return horizon > dem


# ---------------------------------------------------------------- shade parts
def facing_score(slope, aspect, best_az: float, full_effect_slope: float):
    """1 = faces the best (cool) direction, 0 = faces the opposite way.

    Flat ground gets a neutral 0.5; the effect grows with steepness.
    """
    f = (1.0 + np.cos(np.radians(aspect - best_az))) / 2.0
    wgt = np.clip(slope / full_effect_slope, 0, 1)
    return (0.5 * (1 - wgt) + f * wgt).astype("float32")


def tpi(dem: np.ndarray, res: float, radius_m: float) -> np.ndarray:
    """Topographic Position Index: height minus the local average.

    Negative = valley or hollow, positive = ridge or hilltop.
    """
    size = 2 * int(round(radius_m / res)) + 1
    mean = ndimage.uniform_filter(dem.astype("float64"), size=size, mode="nearest")
    return (dem - mean).astype("float32")


def valley_score(tpi_m: np.ndarray, full_effect_m: float):
    """1 = deep valley bottom, 0 = flat or ridge."""
    return np.clip(-tpi_m / full_effect_m, 0, 1).astype("float32")


def low_sun_score(mean_illum, flat_illum: float):
    """Share of flat-ground autumn sunlight that this spot misses (0..1)."""
    return np.clip(1.0 - mean_illum / flat_illum, 0, 1).astype("float32")


def combine_shade(facing, valley, low_sun, weights: dict):
    tot = weights["facing"] + weights["valley"] + weights["low_sun"]
    return ((weights["facing"] * facing + weights["valley"] * valley
             + weights["low_sun"] * low_sun) / tot).astype("float32")
