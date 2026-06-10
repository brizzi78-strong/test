"""Zero-based budget math (pure functions, no database access).

The model follows EveryDollar: every dollar of planned income is assigned to
a budget line before the month starts. ``left_to_budget`` is planned income
minus everything planned elsewhere, and the goal is exactly zero.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List


@dataclass(frozen=True)
class BudgetLine:
    category_id: int
    category: str
    group: str
    is_income: bool
    planned_cents: int
    actual_cents: int  # money received (income) or spent (expense), positive

    @property
    def remaining_cents(self) -> int:
        """Expense: planned minus spent. Income: planned minus received."""
        return self.planned_cents - self.actual_cents

    @property
    def over(self) -> bool:
        return self.remaining_cents < 0

    @property
    def progress_pct(self) -> int:
        """How much of the plan is used, clamped to 0-100 for progress bars."""
        if self.planned_cents <= 0:
            return 100 if self.actual_cents > 0 else 0
        return max(0, min(100, round(100 * self.actual_cents / self.planned_cents)))


@dataclass
class GroupSummary:
    name: str
    is_income: bool
    lines: List[BudgetLine] = field(default_factory=list)

    @property
    def planned_cents(self) -> int:
        return sum(l.planned_cents for l in self.lines)

    @property
    def actual_cents(self) -> int:
        return sum(l.actual_cents for l in self.lines)

    @property
    def remaining_cents(self) -> int:
        return self.planned_cents - self.actual_cents


@dataclass(frozen=True)
class MonthSummary:
    planned_income_cents: int
    planned_expense_cents: int
    received_cents: int
    spent_cents: int

    @property
    def left_to_budget_cents(self) -> int:
        """Planned income not yet given a job. The goal is exactly 0."""
        return self.planned_income_cents - self.planned_expense_cents

    @property
    def is_zero_based(self) -> bool:
        return self.left_to_budget_cents == 0 and self.planned_income_cents > 0

    @property
    def safe_to_spend_cents(self) -> int:
        """Planned expenses not yet spent (never negative)."""
        return max(0, self.planned_expense_cents - self.spent_cents)


def summarize(groups: List[GroupSummary]) -> MonthSummary:
    planned_income = sum(g.planned_cents for g in groups if g.is_income)
    planned_expense = sum(g.planned_cents for g in groups if not g.is_income)
    received = sum(g.actual_cents for g in groups if g.is_income)
    spent = sum(g.actual_cents for g in groups if not g.is_income)
    return MonthSummary(
        planned_income_cents=planned_income,
        planned_expense_cents=planned_expense,
        received_cents=received,
        spent_cents=spent,
    )


def prev_month(month: str) -> str:
    y, m = int(month[:4]), int(month[5:7])
    return f"{y - 1}-12" if m == 1 else f"{y}-{m - 1:02d}"


def next_month(month: str) -> str:
    y, m = int(month[:4]), int(month[5:7])
    return f"{y + 1}-01" if m == 12 else f"{y}-{m + 1:02d}"
