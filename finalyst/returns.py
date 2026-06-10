"""Time-series return and risk analysis for a price series."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional

from .loader import PriceSeries

# Number of periods per year, keyed by sampling frequency.
PERIODS_PER_YEAR = {
    "daily": 252,
    "weekly": 52,
    "monthly": 12,
    "quarterly": 4,
    "annual": 1,
}


@dataclass(frozen=True)
class ReturnStats:
    """Summary statistics for a price series."""

    start_price: float
    end_price: float
    periods: int
    total_return: float            # cumulative, as a fraction (0.25 == +25%)
    period_returns: List[float]
    avg_period_return: float
    cagr: Optional[float]          # annualized; None if span unknown
    annualized_volatility: Optional[float]
    sharpe_ratio: Optional[float]
    max_drawdown: float            # negative fraction (e.g. -0.18)
    best_period: float
    worst_period: float
    frequency: str

    def as_dict(self) -> dict:
        return {
            "start_price": self.start_price,
            "end_price": self.end_price,
            "periods": self.periods,
            "total_return": self.total_return,
            "avg_period_return": self.avg_period_return,
            "cagr": self.cagr,
            "annualized_volatility": self.annualized_volatility,
            "sharpe_ratio": self.sharpe_ratio,
            "max_drawdown": self.max_drawdown,
            "best_period": self.best_period,
            "worst_period": self.worst_period,
            "frequency": self.frequency,
        }


def simple_returns(closes: List[float]) -> List[float]:
    """Period-over-period simple returns."""
    return [closes[i] / closes[i - 1] - 1.0 for i in range(1, len(closes))]


def max_drawdown(closes: List[float]) -> float:
    """Largest peak-to-trough decline, as a non-positive fraction."""
    peak = closes[0]
    worst = 0.0
    for price in closes:
        peak = max(peak, price)
        worst = min(worst, price / peak - 1.0)
    return worst


def _stdev(values: List[float]) -> Optional[float]:
    n = len(values)
    if n < 2:
        return None
    mean = sum(values) / n
    var = sum((v - mean) ** 2 for v in values) / (n - 1)  # sample variance
    return math.sqrt(var)


def analyze(
    series: PriceSeries,
    *,
    frequency: str = "daily",
    risk_free_rate: float = 0.0,
) -> ReturnStats:
    """Compute return and risk statistics for ``series``.

    ``frequency`` controls annualization (see :data:`PERIODS_PER_YEAR`).
    ``risk_free_rate`` is the *annual* risk-free rate used by the Sharpe ratio.
    """
    if frequency not in PERIODS_PER_YEAR:
        raise ValueError(
            f"unknown frequency {frequency!r}; expected one of {sorted(PERIODS_PER_YEAR)}"
        )

    closes = list(series.closes)
    rets = simple_returns(closes)
    ppy = PERIODS_PER_YEAR[frequency]

    start, end = closes[0], closes[-1]
    total_return = end / start - 1.0
    avg = sum(rets) / len(rets)

    years = len(rets) / ppy
    cagr = (end / start) ** (1.0 / years) - 1.0 if years > 0 else None

    sd = _stdev(rets)
    ann_vol = sd * math.sqrt(ppy) if sd is not None else None

    sharpe: Optional[float] = None
    if ann_vol not in (None, 0.0) and cagr is not None:
        sharpe = (cagr - risk_free_rate) / ann_vol

    return ReturnStats(
        start_price=start,
        end_price=end,
        periods=len(rets),
        total_return=total_return,
        period_returns=rets,
        avg_period_return=avg,
        cagr=cagr,
        annualized_volatility=ann_vol,
        sharpe_ratio=sharpe,
        max_drawdown=max_drawdown(closes),
        best_period=max(rets),
        worst_period=min(rets),
        frequency=frequency,
    )
