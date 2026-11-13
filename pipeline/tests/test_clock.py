import numpy as np

from shroomy import config
from shroomy.score import clock as C

S = config.load("scoring")["score"]
W = S["rain_pulse"]["window_days"]
SOAK = S["rain_pulse"]["soaking_event_mm"]
OPEN = 7                                  # state() and sentence() tests: the old brief window (7-20)
CLOSE = S["mushroom_clock"]["window_closes_days_after_pulse"]


def series(n_days=40, **rain_on_day):
    p = np.zeros((1, n_days))
    for k, v in rain_on_day.items():
        p[0, int(k[1:])] = v
    return p


def test_numbers_in_config():
    mc = S["mushroom_clock"]
    assert (W, SOAK, CLOSE) == (3, 20, 20)                                   # [BRIEF]
    assert (mc["first_window_opens_days"], mc["later_window_opens_days"]) == (18, 2)   # [LOI19]


def test_soak_over_three_days_counts():
    p = series(d20=7, d21=7, d22=7)          # 21 mm over 3 days, ends on day 22
    assert C.days_since_soak(p, 30, W, SOAK)[0] == 8


def test_small_rain_does_not_count():
    p = series(d20=5, d21=5, d22=5)          # 15 mm
    assert C.days_since_soak(p, 30, W, SOAK)[0] == C.NONE


def test_most_recent_event_wins():
    p = series(d5=30, d25=25)
    assert C.days_since_soak(p, 30, W, SOAK)[0] == 5


def test_states():
    st, k = C.state(np.array([3, 7, 15, 20, 21, C.NONE]), OPEN, CLOSE)
    assert st.tolist() == ["waiting", "open", "open", "open", "none", "none"]
    assert k.tolist() == [4, 13, 5, 0, -1, -1]


def test_shift_opens_earlier_for_cool_cells():
    st, _ = C.state(np.array([5]), OPEN, CLOSE, shift=2)
    assert st[0] == "open"


def test_sentences():
    assert "opens in 4 days" in C.sentence(3, OPEN, CLOSE)
    assert "OPEN" in C.sentence(12, OPEN, CLOSE)
    assert "closed" in C.sentence(C.NONE, OPEN, CLOSE)
    assert "has closed" in C.sentence(25, OPEN, CLOSE)


# ---------------------------------------------------------------- window() with the LOI19 rules
def _S(**mc):
    base = {"rain_pulse": {"window_days": 3, "soaking_event_mm": 20},
            "mushroom_clock": {"wet_day_mm": 1.0, "window_opens_days_after_pulse": 18,
                               "first_window_opens_days": 18, "later_window_opens_days": 2,
                               "window_closes_days_after_pulse": 20}}
    base["mushroom_clock"].update(mc)
    return base


def test_first_rain_opens_after_18_days_then_closes_at_20():
    p = np.zeros((1, 60)); p[0, 10] = 25
    st = [C.window(p, t, _S())[0][0] for t in (27, 28, 30, 31)]
    assert st == ["waiting", "open", "open", "none"]


def test_later_rain_opens_after_2_days():
    p = np.zeros((1, 80)); p[0, 10] = 25; p[0, 50] = 25       # window 28-30 was open, then closed
    assert C.window(p, 51, _S())[0][0] == "waiting"
    st, d, opens = C.window(p, 52, _S())
    assert (st[0], d[0], opens[0]) == ("open", 2, 2)
    assert C.window(p, 70, _S())[0][0] == "open" and C.window(p, 71, _S())[0][0] == "none"


def test_second_rain_before_first_window_keeps_18_day_wait():
    p = np.zeros((1, 60)); p[0, 10] = 25; p[0, 20] = 25
    st, d, opens = C.window(p, 27, _S())
    assert (st[0], d[0], opens[0]) == ("waiting", 7, 8)      # opens on day 28, 8 days after day 20
    assert C.window(p, 40, _S())[0][0] == "open"          # closes 20 days after day 20


def test_rain_while_open_keeps_window_open():
    p = np.zeros((1, 60)); p[0, 10] = 25; p[0, 29] = 25       # window open since day 28
    assert C.window(p, 30, _S())[0][0] == "open"
    assert C.window(p, 49, _S())[0][0] == "open"


def test_old_rule_without_later_key():
    S = _S(); del S["mushroom_clock"]["later_window_opens_days"]
    S["mushroom_clock"]["window_opens_days_after_pulse"] = 7
    p = np.zeros((1, 60)); p[0, 10] = 25
    assert C.window(p, 17, S)[0][0] == "open"


def test_first_of_season_counts_from_september():
    dates = [f"2025-08-{d:02d}" for d in range(1, 32)] + [f"2025-09-{d:02d}" for d in range(1, 31)]
    p = np.zeros((1, len(dates))); p[0, 5] = 25; p[0, 40] = 25   # August rain does not count
    st, d, opens = C.window(p, 50, _S(season_starts="09-01"), dates)
    assert (st[0], opens[0]) == ("waiting", 18)
