"""Rule-based auto-categorization of transactions.

Rules are case-insensitive payee substrings. The longest matching pattern
wins, so a specific rule ("whole foods") beats a generic one ("foods").
"""

from __future__ import annotations

from typing import Iterable, Mapping, Optional


def match(payee: str, rules: Iterable[Mapping]) -> Optional[int]:
    """Return the category_id of the best matching rule, or None."""
    haystack = payee.lower()
    best_id: Optional[int] = None
    best_len = -1
    for rule in rules:
        pattern = rule["pattern"].strip().lower()
        if pattern and pattern in haystack and len(pattern) > best_len:
            best_id = rule["category_id"]
            best_len = len(pattern)
    return best_id
