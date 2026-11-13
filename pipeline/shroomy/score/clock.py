"""The mushroom clock [BRIEF]: time since the last soaking rain.

A soaking event = a `window`-day rain total >= soaking_event_mm (brief: >= ~20 mm over 1-3 days).
Fruiting window opens  `opens` days after the event ends (brief: +7)
                and closes `closes` days after it   (brief: +20),
both shifted earlier by `shift` days for high/cool cells (brief: "adjusted earlier"; size = DRAFT).
"""
import numpy as np

NONE = -1


def days_since_soak(precip: np.ndarray, t: int, window: int, soaking_mm: float,
                    wet_day_mm: float = 1.0) -> np.ndarray:
    """Days from the end of the most recent soaking event up to day t (0 = ends on day t).

    The event must end on a wet day, so a single storm is dated to the storm, not 2 dry days later.

    precip: (points, days). Returns int array; NONE (-1) if no event in the data.
    """
    n = precip.shape[0]
    out = np.full(n, NONE, dtype=int)
    for end in range(t, window - 2, -1):                 # newest first
        s = np.nansum(precip[:, max(0, end - window + 1): end + 1], axis=1)
        hit = (s >= soaking_mm) & (precip[:, end] >= wet_day_mm) & (out == NONE)
        out[hit] = t - end
        if (out != NONE).all():
            break
    return out


def state(days_since, opens: int, closes: int, shift=0):
    """Plain state per point: 'open', 'waiting' or 'none' + days to the next change.

    Returns (state array of str, days_to_change int array; -1 when not applicable).
    """
    d = np.asarray(days_since)
    o = opens - np.asarray(shift)
    c = closes - np.asarray(shift)
    st = np.where(d == NONE, "none", np.where(d < o, "waiting", np.where(d <= c, "open", "none")))
    to_change = np.where(st == "waiting", o - d, np.where(st == "open", c - d, -1))
    return st, to_change


def sentence(days_since: int, opens: int, closes: int, shift: int = 0) -> str:
    """One plain-English line for the spot panel and the summary.
    opens = days after this soaking rain the window opens (window(): 18 for the season's first,
    2 for a later one, negative when it is already open)."""
    st, k = state(np.array([days_since]), opens, closes, shift)
    st, k = str(st[0]), int(k[0])
    if days_since == NONE or (st == "none" and days_since > closes - shift):
        if days_since == NONE:
            return "No soaking rain (20 mm+) yet this season. Fruiting window closed."
        return f"Last soaking rain was {days_since} days ago. Fruiting window has closed."
    if st == "waiting":
        return f"Soaking rain {days_since} days ago. Window opens in {k} day{'s' if k != 1 else ''}."
    return f"Soaking rain {days_since} days ago. Window OPEN — about {k} more day{'s' if k != 1 else ''}."


def season_start_index(dates, t: int, start_mmdd: str = "09-01") -> int:
    """Index of the season's first day (1 September before day t), or 0 when the data starts later
    (then the clock falls back to "the first soaking rain in the days we have")."""
    if dates is None:
        return 0
    day = str(dates[t])
    year = int(day[:4]) if day[5:] >= start_mmdd else int(day[:4]) - 1
    start = f"{year}-{start_mmdd}"
    return next((i for i, d in enumerate(dates) if str(d) >= start), 0)


def window(precip: np.ndarray, t: int, S: dict, dates=None):
    """The fruiting window on day t, per weather point, with the rules in scoring.yaml.

    Returns (state array 'open' / 'waiting' / 'none',
             days since the latest soaking rain (NONE = no soaking rain),
             days after that latest rain the window opens (can be negative: already open)).

    Old rule (no `later_window_opens_days` in the config): opens N days after the latest
    soaking rain, closes M days after it.
    New rule [LOI19]: the season's FIRST soaking rain opens the window after 18 days.
    Once a window has been open this season, each new soaking rain opens it again after
    2 days. A window that is already open stays open. It closes 20 days after the latest
    soaking rain. "First" counts from 1 September (or from the first day we have).
    """
    rp, mc = S["rain_pulse"], S["mushroom_clock"]
    win, soak, wet = rp["window_days"], rp["soaking_event_mm"], mc["wet_day_mm"]
    closes = mc["window_closes_days_after_pulse"]
    if "later_window_opens_days" not in mc:
        d = days_since_soak(precip, t, win, soak, wet)
        opens = np.full(len(d), mc["window_opens_days_after_pulse"])
        st, _ = state(d, opens, closes)
        return st, d, opens

    first_open, later_open = mc["first_window_opens_days"], mc["later_window_opens_days"]
    n = precip.shape[0]
    first = np.full(n, NONE)
    latest = np.full(n, NONE)
    open_day = np.full(n, NONE)
    for e in range(season_start_index(dates, t, mc.get("season_starts", "09-01")), t + 1):
        s = np.nansum(precip[:, max(0, e - win + 1): e + 1], axis=1)
        hit = (s >= soak) & (precip[:, e] >= wet)
        if not hit.any():
            continue
        is_open = (open_day != NONE) & (e >= open_day) & (e <= latest + closes)
        new_first = hit & (first == NONE)
        first[new_first] = e
        open_day[new_first] = e + first_open
        again = hit & ~new_first & (e >= first + first_open) & ~is_open
        open_day[again] = e + later_open
        latest[hit] = e

    d = np.where(latest == NONE, NONE, t - latest)
    st = np.where(latest == NONE, "none",
                  np.where(t < open_day, "waiting", np.where(t <= latest + closes, "open", "none")))
    opens = np.where(latest == NONE, first_open, open_day - latest)
    return st, d, opens
