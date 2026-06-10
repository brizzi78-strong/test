"""Financial-statement ratio analysis.

Given a mapping of statement line items (see :func:`finalyst.loader.load_statement`),
:func:`analyze` computes the standard ratios grouped into liquidity,
profitability, leverage/solvency, efficiency and valuation. Ratios whose inputs
are missing or would divide by zero are skipped rather than raising, so a
partial statement still yields a partial—but correct—report.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Dict, List, Mapping, Optional


@dataclass(frozen=True)
class Ratio:
    """A single computed ratio."""

    name: str
    value: float
    unit: str = "x"  # "x" multiple, "%" percentage, or "$" currency
    note: str = ""

    def formatted(self) -> str:
        if self.unit == "%":
            return f"{self.value * 100:,.2f}%"
        if self.unit == "$":
            return f"${self.value:,.2f}"
        return f"{self.value:,.2f}x"


@dataclass
class RatioGroup:
    title: str
    ratios: List[Ratio] = field(default_factory=list)


# Each entry: (display name, unit, list of required items, compute fn).
_Spec = tuple


def _div(num: float, den: float) -> Optional[float]:
    return None if den == 0 else num / den


def _derive(items: Mapping[str, float]) -> Dict[str, float]:
    """Fill in line items that can be derived from others, if absent."""
    d = dict(items)
    if "gross_profit" not in d and {"revenue", "cogs"} <= d.keys():
        d["gross_profit"] = d["revenue"] - d["cogs"]
    if "ebit" not in d and "operating_income" in d:
        d["ebit"] = d["operating_income"]
    if "total_liabilities" not in d and {"total_assets", "total_equity"} <= d.keys():
        d["total_liabilities"] = d["total_assets"] - d["total_equity"]
    if "total_equity" not in d and {"total_assets", "total_liabilities"} <= d.keys():
        d["total_equity"] = d["total_assets"] - d["total_liabilities"]
    return d


# (group, name, unit, required items, fn(items) -> Optional[float])
_DEFINITIONS: List[tuple] = [
    # Liquidity
    ("Liquidity", "Current ratio", "x", ("current_assets", "current_liabilities"),
     lambda d: _div(d["current_assets"], d["current_liabilities"])),
    ("Liquidity", "Quick ratio", "x", ("current_assets", "inventory", "current_liabilities"),
     lambda d: _div(d["current_assets"] - d["inventory"], d["current_liabilities"])),
    ("Liquidity", "Cash ratio", "x", ("cash", "current_liabilities"),
     lambda d: _div(d["cash"], d["current_liabilities"])),

    # Profitability
    ("Profitability", "Gross margin", "%", ("gross_profit", "revenue"),
     lambda d: _div(d["gross_profit"], d["revenue"])),
    ("Profitability", "Operating margin", "%", ("operating_income", "revenue"),
     lambda d: _div(d["operating_income"], d["revenue"])),
    ("Profitability", "Net margin", "%", ("net_income", "revenue"),
     lambda d: _div(d["net_income"], d["revenue"])),
    ("Profitability", "Return on assets (ROA)", "%", ("net_income", "total_assets"),
     lambda d: _div(d["net_income"], d["total_assets"])),
    ("Profitability", "Return on equity (ROE)", "%", ("net_income", "total_equity"),
     lambda d: _div(d["net_income"], d["total_equity"])),

    # Leverage / solvency
    ("Leverage", "Debt-to-equity", "x", ("total_liabilities", "total_equity"),
     lambda d: _div(d["total_liabilities"], d["total_equity"])),
    ("Leverage", "Debt ratio", "x", ("total_liabilities", "total_assets"),
     lambda d: _div(d["total_liabilities"], d["total_assets"])),
    ("Leverage", "Equity multiplier", "x", ("total_assets", "total_equity"),
     lambda d: _div(d["total_assets"], d["total_equity"])),
    ("Leverage", "Interest coverage", "x", ("ebit", "interest_expense"),
     lambda d: _div(d["ebit"], d["interest_expense"])),

    # Efficiency
    ("Efficiency", "Asset turnover", "x", ("revenue", "total_assets"),
     lambda d: _div(d["revenue"], d["total_assets"])),
    ("Efficiency", "Inventory turnover", "x", ("cogs", "inventory"),
     lambda d: _div(d["cogs"], d["inventory"])),

    # Valuation
    ("Valuation", "Earnings per share (EPS)", "$", ("net_income", "shares_outstanding"),
     lambda d: _div(d["net_income"], d["shares_outstanding"])),
    ("Valuation", "Book value per share", "$", ("total_equity", "shares_outstanding"),
     lambda d: _div(d["total_equity"], d["shares_outstanding"])),
    ("Valuation", "Price / earnings (P/E)", "x", ("price", "net_income", "shares_outstanding"),
     lambda d: _div(d["price"], _div(d["net_income"], d["shares_outstanding"]) or 0.0)),
    ("Valuation", "Price / book (P/B)", "x", ("price", "total_equity", "shares_outstanding"),
     lambda d: _div(d["price"], _div(d["total_equity"], d["shares_outstanding"]) or 0.0)),
]

# Stable group ordering for reports.
GROUP_ORDER = ["Liquidity", "Profitability", "Leverage", "Efficiency", "Valuation"]


def analyze(items: Mapping[str, float]) -> List[RatioGroup]:
    """Compute every ratio whose inputs are present, grouped by category."""
    d = _derive(items)
    groups: Dict[str, RatioGroup] = {g: RatioGroup(g) for g in GROUP_ORDER}

    for group, name, unit, required, fn in _DEFINITIONS:
        if not all(k in d for k in required):
            continue
        try:
            value = fn(d)
        except (KeyError, ZeroDivisionError, TypeError):
            value = None
        if value is None:
            continue
        groups[group].ratios.append(Ratio(name=name, value=value, unit=unit))

    return [groups[g] for g in GROUP_ORDER if groups[g].ratios]


def required_items() -> List[str]:
    """All line items referenced by at least one ratio definition."""
    seen: Dict[str, None] = {}
    for _group, _name, _unit, required, _fn in _DEFINITIONS:
        for item in required:
            seen.setdefault(item, None)
    return list(seen)
