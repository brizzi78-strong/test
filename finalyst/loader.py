"""Loading helpers for financial statements and price series.

Two simple, dependency-free CSV shapes are supported so the tool runs anywhere
a stdlib Python is available:

Statement CSV (key/value)::

    item,value
    revenue,1000000
    cogs,600000
    net_income,120000

Price series CSV (ordered oldest -> newest)::

    date,close
    2023-01-31,100.0
    2023-02-28,103.5
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from typing import Dict, List, Tuple


class DataError(ValueError):
    """Raised when an input file is malformed or missing required columns."""


def _open_rows(path: str) -> List[List[str]]:
    with open(path, newline="", encoding="utf-8") as fh:
        return [row for row in csv.reader(fh) if row and any(c.strip() for c in row)]


def _to_float(raw: str, *, context: str) -> float:
    """Parse a numeric cell, tolerating ``$``, thousands commas and ``%``."""
    text = raw.strip().replace("$", "").replace(",", "").replace("%", "")
    if text in ("", "-", "n/a", "N/A", "NA"):
        raise DataError(f"missing numeric value for {context!r}")
    # Accountants write negatives as (123).
    if text.startswith("(") and text.endswith(")"):
        text = "-" + text[1:-1]
    try:
        return float(text)
    except ValueError as exc:  # pragma: no cover - message is the point
        raise DataError(f"could not parse number {raw!r} for {context!r}") from exc


def load_statement(path: str) -> Dict[str, float]:
    """Load a key/value statement CSV into a ``{item: value}`` mapping.

    A header row whose second column is non-numeric (e.g. ``item,value``) is
    skipped automatically. Item names are normalised to lower snake_case so
    ``"Net Income"``, ``"net income"`` and ``"net_income"`` are equivalent.
    """
    rows = _open_rows(path)
    if not rows:
        raise DataError(f"{path}: file is empty")

    out: Dict[str, float] = {}
    for i, row in enumerate(rows):
        if len(row) < 2:
            raise DataError(f"{path}: row {i + 1} needs at least 2 columns")
        key = _normalize_key(row[0])
        # Skip an obvious header row.
        if i == 0:
            try:
                _to_float(row[1], context=key)
            except DataError:
                continue
        out[key] = _to_float(row[1], context=key)
    if not out:
        raise DataError(f"{path}: no data rows found")
    return out


def _normalize_key(raw: str) -> str:
    return "_".join(raw.strip().lower().replace("-", " ").split())


@dataclass(frozen=True)
class PriceSeries:
    """An ordered series of dated closing prices."""

    dates: Tuple[str, ...]
    closes: Tuple[float, ...]

    def __post_init__(self) -> None:
        if len(self.dates) != len(self.closes):
            raise DataError("dates and closes must be the same length")
        if len(self.closes) < 2:
            raise DataError("a price series needs at least two observations")
        if any(c <= 0 for c in self.closes):
            raise DataError("prices must be positive")

    def __len__(self) -> int:
        return len(self.closes)


def load_prices(path: str, *, date_col: str = "date", price_col: str = "close") -> PriceSeries:
    """Load a dated price series from CSV, ordered oldest to newest."""
    rows = _open_rows(path)
    if not rows:
        raise DataError(f"{path}: file is empty")

    header = [c.strip().lower() for c in rows[0]]
    try:
        di = header.index(date_col.lower())
        pi = header.index(price_col.lower())
    except ValueError as exc:
        raise DataError(
            f"{path}: header must contain {date_col!r} and {price_col!r} columns; got {header}"
        ) from exc

    dates: List[str] = []
    closes: List[float] = []
    for i, row in enumerate(rows[1:], start=2):
        if len(row) <= max(di, pi):
            raise DataError(f"{path}: row {i} has too few columns")
        dates.append(row[di].strip())
        closes.append(_to_float(row[pi], context=f"{path}:row {i}"))

    return PriceSeries(dates=tuple(dates), closes=tuple(closes))
