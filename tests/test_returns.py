import math

import pytest

from finalyst.loader import PriceSeries
from finalyst.returns import analyze, max_drawdown, simple_returns


def test_simple_returns():
    assert simple_returns([100, 110, 99]) == pytest.approx([0.10, -0.10])


def test_total_return_and_cagr_doubling_over_one_year():
    # 12 monthly steps doubling exactly -> total return 100%, CAGR ~100%.
    series = PriceSeries(
        dates=tuple(str(i) for i in range(13)),
        closes=tuple(100 * 2 ** (i / 12) for i in range(13)),
    )
    stats = analyze(series, frequency="monthly")
    assert stats.total_return == pytest.approx(1.0)
    assert stats.cagr == pytest.approx(1.0, rel=1e-9)


def test_max_drawdown():
    # Peak 120 then trough 60 -> -50%.
    assert max_drawdown([100, 120, 90, 60, 80]) == pytest.approx(-0.5)


def test_drawdown_is_zero_for_monotonic_increase():
    assert max_drawdown([100, 101, 105, 110]) == 0.0


def test_sharpe_uses_risk_free_rate():
    series = PriceSeries(
        dates=tuple(str(i) for i in range(13)),
        closes=tuple(100 + i for i in range(13)),
    )
    s0 = analyze(series, frequency="monthly", risk_free_rate=0.0)
    s1 = analyze(series, frequency="monthly", risk_free_rate=0.05)
    assert s0.sharpe_ratio > s1.sharpe_ratio  # higher hurdle -> lower Sharpe


def test_unknown_frequency_raises():
    series = PriceSeries(dates=("a", "b"), closes=(100.0, 110.0))
    with pytest.raises(ValueError):
        analyze(series, frequency="hourly")
