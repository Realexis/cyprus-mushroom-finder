"""The v1 scoring factors (pure numpy). Every threshold comes from config/scoring.yaml.

Time arrays are shaped (..., days) with day index `t` = the day being scored.
"Days ago" counts back from that day: t-1 is 1 day ago.
"""
import numpy as np

MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]


def ramp(x, zero_at, full_at):
    """0 at/below zero_at, 1 at/above full_at, straight line between."""
    return np.clip((np.asarray(x, "float64") - zero_at) / (full_at - zero_at), 0, 1)


def trapezoid(x, a, b, c, d):
    """0 below a, rises to 1 at b, flat to c, falls to 0 at d."""
    x = np.asarray(x, "float64")
    up = np.clip((x - a) / (b - a), 0, 1)
    down = np.clip((d - x) / (d - c), 0, 1)
    return np.minimum(up, down)


# ------------------------------------------------------------------ rain
def rain_total(precip, t, days):
    """Rain over the `days` days ending on day t (inclusive)."""
    return np.nansum(precip[..., t - days + 1: t + 1], axis=-1)


def rain_pulse(precip, t, window, min_ago, max_ago):
    """Biggest `window`-day rain sum that lies fully between max_ago and min_ago days ago.

    Returns (pulse_mm, days_ago_of_the_pulse_end).
    """
    best = np.full(precip.shape[:-1], -1.0)
    best_end = np.zeros(precip.shape[:-1], "int16")
    for end_ago in range(min_ago, max_ago - window + 2):
        end = t - end_ago
        s = np.nansum(precip[..., end - window + 1: end + 1], axis=-1)
        better = s > best
        best = np.where(better, s, best)
        best_end = np.where(better, end_ago, best_end)
    return np.maximum(best, 0), best_end


# ------------------------------------------------------------------ temperature
def mean_last(x, t, days):
    """Mean of the `days` days ending on day t (inclusive)."""
    return np.nanmean(x[..., t - days + 1: t + 1], axis=-1)


def frost_days(tmin, t, days, threshold):
    return np.sum(tmin[..., t - days + 1: t + 1] <= threshold, axis=-1)


def temperature_factor(t7_mean, n_frost, c):
    f = trapezoid(t7_mean, c["zero_at_c"], c["best_from_c"], c["best_to_c"], c["zero_again_c"])
    return np.clip(f - c["frost_penalty_per_day"] * n_frost, 0, 1)


def to_sea_level(temp_c, elev_m, lapse_c_per_km):
    """Remove the height effect: what the temperature would be at 0 m."""
    return temp_c - lapse_c_per_km * np.asarray(elev_m) / 1000.0


def from_sea_level(temp0_c, elev_m, lapse_c_per_km):
    """Put the height effect back for a cell at elev_m."""
    return temp0_c + lapse_c_per_km * np.asarray(elev_m) / 1000.0


# ------------------------------------------------------------------ soil
def percentile_in(value, sorted_history):
    """Percentile (0-100) of `value` within each row of `sorted_history` (NaN padded)."""
    value = np.atleast_1d(value)
    out = np.full(value.shape, np.nan)
    for i, (v, row) in enumerate(zip(value, np.atleast_2d(sorted_history))):
        row = row[np.isfinite(row)]
        if np.isfinite(v) and row.size:
            out[i] = 100.0 * np.searchsorted(row, v, side="right") / row.size
    return out


# ------------------------------------------------------------------ season
def season_factor(month: int, band, table: dict):
    """Look up month x altitude band. band: 1 low, 2 mid, 3 high, 0 none."""
    m = MONTHS[month - 1]
    lut = np.array([0.0, table["low"][m], table["mid"][m], table["high"][m]])
    return lut[np.asarray(band, int)]


# ------------------------------------------------------------------ combine
FACTORS = ["rain_total", "rain_pulse", "temperature", "soil_moisture", "season_altitude", "shade"]


def combine(factors: dict, weights: dict, habitat_filter):
    """score = habitat_filter (0/1) x weighted sum x 100   [BRIEF]"""
    total_w = sum(weights[k] for k in FACTORS)
    s = sum(weights[k] * np.nan_to_num(factors[k], nan=0.0) for k in FACTORS) / total_w
    return (np.asarray(habitat_filter) > 0) * s * 100.0


# ------------------------------------------------------------------ water gate
def max_window_rain(precip, t, days, window):
    """Biggest `window`-day rain sum that lies fully inside the `days` days ending on day t."""
    best = np.zeros(precip.shape[:-1])
    for end in range(t - days + window, t + 1):
        best = np.maximum(best, np.nansum(precip[..., end - window + 1: end + 1], axis=-1))
    return best


def water_gate(big_rain_mm, full_at_mm):
    """0..1: biggest 3-day rain of the last month / the soaking amount, never above 1.
    No soaking rain = the score is cut; one soaking rain (20 mm+) = no cut."""
    return np.clip(np.asarray(big_rain_mm, "float64") / full_at_mm, 0, 1)
