"""Money helpers. All amounts are stored as integer cents."""

from __future__ import annotations


class MoneyError(ValueError):
    """Raised when an amount string cannot be parsed."""


def parse_cents(raw: str | float | int) -> int:
    """Parse a user-supplied amount into integer cents.

    Tolerates ``$``, thousands commas, surrounding whitespace and accounting
    negatives like ``(12.34)``.
    """
    if isinstance(raw, (int, float)):
        return round(raw * 100)
    text = raw.strip().replace("$", "").replace(",", "")
    if not text:
        raise MoneyError("amount is empty")
    if text.startswith("(") and text.endswith(")"):
        text = "-" + text[1:-1]
    try:
        return round(float(text) * 100)
    except ValueError as exc:
        raise MoneyError(f"could not parse amount {raw!r}") from exc


def format_cents(cents: int | None) -> str:
    """Render cents as ``$1,234.56`` (negatives as ``-$1,234.56``)."""
    if cents is None:
        return "$0.00"
    sign = "-" if cents < 0 else ""
    return f"{sign}${abs(cents) / 100:,.2f}"
