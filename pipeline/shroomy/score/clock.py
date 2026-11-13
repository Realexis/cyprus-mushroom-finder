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
    """One plain-English line for the spot panel and the summary."""
    st, k = state(np.array([days_since]), opens, closes, shift)
    st, k = str(st[0]), int(k[0])
    if days_since == NONE or (st == "none" and days_since > closes - shift):
        if days_since == NONE:
            return "No soaking rain (20 mm+) in the last month. Fruiting window closed."
        return f"Last soaking rain was {days_since} days ago. Fruiting window has closed."
    if st == "waiting":
        return f"Soaking rain {days_since} days ago. Window opens in {k} day{'s' if k != 1 else ''}."
    return f"Soaking rain {days_since} days ago. Window OPEN — about {k} more day{'s' if k != 1 else ''}."


def window(precip: np.ndarray, t: int, S: dict, dates=None):
    """The fruiting window on day t, per weather point, with the rules in scoring.yaml.

    Returns (state array 'open' / 'waiting' / 'none', days since the latest soaking rain,
    days after that rain the window opens).
    """
    rp, mc = S["rain_pulse"], S["mushroom_clock"]
    d = days_since_soak(precip, t, rp["window_days"], rp["soaking_event_mm"], mc["wet_day_mm"])
    opens = np.full(len(d), mc["window_opens_days_after_pulse"])
    st, _ = state(d, opens, mc["window_closes_days_after_pulse"])
    return st, d, opens
