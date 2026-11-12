import numpy as np

from shroomy import config
from shroomy.score import clock as C

S = config.load("scoring")["score"]
W = S["rain_pulse"]["window_days"]
SOAK = S["rain_pulse"]["soaking_event_mm"]
OPEN = S["mushroom_clock"]["window_opens_days_after_pulse"]
CLOSE = S["mushroom_clock"]["window_closes_days_after_pulse"]


def series(n_days=40, **rain_on_day):
    p = np.zeros((1, n_days))
    for k, v in rain_on_day.items():
        p[0, int(k[1:])] = v
    return p


def test_brief_numbers_in_config():
    assert (W, SOAK, OPEN, CLOSE) == (3, 20, 7, 20)


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
