"""Render analysis results as readable, fixed-width text."""

from __future__ import annotations

from typing import List, Optional

from .ratios import RatioGroup
from .returns import ReturnStats


def _pct(value: Optional[float]) -> str:
    return "n/a" if value is None else f"{value * 100:,.2f}%"


def _num(value: Optional[float], suffix: str = "") -> str:
    return "n/a" if value is None else f"{value:,.2f}{suffix}"


def render_ratios(groups: List[RatioGroup], *, title: str = "Financial Ratios") -> str:
    if not groups:
        return f"{title}\n{'=' * len(title)}\n(no ratios could be computed from the inputs)"

    width = max(len(r.name) for g in groups for r in g.ratios)
    lines: List[str] = [title, "=" * len(title)]
    for group in groups:
        lines.append("")
        lines.append(group.title)
        lines.append("-" * len(group.title))
        for r in group.ratios:
            lines.append(f"  {r.name:<{width}}  {r.formatted():>14}")
    return "\n".join(lines)


def render_returns(stats: ReturnStats, *, title: str = "Return & Risk Analysis") -> str:
    rows = [
        ("Observations", f"{stats.periods + 1} prices ({stats.periods} {stats.frequency} periods)"),
        ("Start price", _num(stats.start_price, "")),
        ("End price", _num(stats.end_price, "")),
        ("Total return", _pct(stats.total_return)),
        ("CAGR (annualized)", _pct(stats.cagr)),
        ("Avg period return", _pct(stats.avg_period_return)),
        ("Annualized volatility", _pct(stats.annualized_volatility)),
        ("Sharpe ratio", _num(stats.sharpe_ratio)),
        ("Max drawdown", _pct(stats.max_drawdown)),
        ("Best period", _pct(stats.best_period)),
        ("Worst period", _pct(stats.worst_period)),
    ]
    width = max(len(label) for label, _ in rows)
    lines = [title, "=" * len(title)]
    for label, value in rows:
        lines.append(f"  {label:<{width}}  {value:>22}")
    return "\n".join(lines)
