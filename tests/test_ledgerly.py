import io

import pytest

from ledgerly import create_app
from ledgerly.budget import BudgetLine, GroupSummary, next_month, prev_month, summarize
from ledgerly.categorize import match
from ledgerly.money import MoneyError, format_cents, parse_cents


# ---------- money ----------

def test_parse_cents_variants():
    assert parse_cents("45.20") == 4520
    assert parse_cents("$1,250.50") == 125050
    assert parse_cents("(12.34)") == -1234
    assert parse_cents(-3.5) == -350


def test_parse_cents_rejects_garbage():
    with pytest.raises(MoneyError):
        parse_cents("a lot")


def test_format_cents():
    assert format_cents(125050) == "$1,250.50"
    assert format_cents(-4520) == "-$45.20"


# ---------- zero-based budget math ----------

def _line(planned, actual, income=False, cid=1):
    return BudgetLine(
        category_id=cid, category="x", group="g", is_income=income,
        planned_cents=planned, actual_cents=actual,
    )


def test_left_to_budget_drives_to_zero():
    income = GroupSummary("Income", True, [_line(500_000, 480_000, income=True)])
    spend = GroupSummary("Food", False, [_line(300_000, 100_000), _line(200_000, 0, cid=2)])
    s = summarize([income, spend])
    assert s.left_to_budget_cents == 0
    assert s.is_zero_based


def test_overbudgeted_is_negative():
    income = GroupSummary("Income", True, [_line(100_000, 0, income=True)])
    spend = GroupSummary("Food", False, [_line(150_000, 0)])
    assert summarize([income, spend]).left_to_budget_cents == -50_000


def test_safe_to_spend_never_negative():
    income = GroupSummary("Income", True, [_line(100_000, 0, income=True)])
    spend = GroupSummary("Food", False, [_line(50_000, 80_000)])  # overspent
    assert summarize([income, spend]).safe_to_spend_cents == 0


def test_line_over_and_progress():
    line = _line(10_000, 12_500)
    assert line.over
    assert line.remaining_cents == -2_500
    assert line.progress_pct == 100  # clamped


def test_month_arithmetic():
    assert prev_month("2026-01") == "2025-12"
    assert next_month("2025-12") == "2026-01"
    assert next_month("2026-06") == "2026-07"


# ---------- categorization ----------

def test_longest_rule_wins():
    rules = [
        {"pattern": "foods", "category_id": 1},
        {"pattern": "whole foods", "category_id": 2},
    ]
    assert match("WHOLE FOODS MKT #401", rules) == 2
    assert match("ACME FOODS", rules) == 1
    assert match("SHELL OIL", rules) is None


# ---------- the app itself ----------

@pytest.fixture()
def client(tmp_path):
    app = create_app({"DATABASE": str(tmp_path / "test.sqlite3"), "TESTING": True})
    return app.test_client()


def test_dashboard_shows_real_accounts(client):
    page = client.get("/").get_data(as_text=True)
    assert "Net worth" in page
    assert "American Express Gold Card (5002)" in page
    assert "Main Checking (9318)" in page


def test_seeded_june_budget_is_zero_based(client):
    from ledgerly.db import DEFAULT_BUDGET

    income = sum(c for g, _, c in DEFAULT_BUDGET if g == "Income")
    expenses = sum(c for g, _, c in DEFAULT_BUDGET if g != "Income")
    assert income == expenses == 1_420_000  # $14,200 in, $14,200 assigned

    page = client.get("/budget?month=2026-06").get_data(as_text=True)
    assert "zero-based budget" in page


def test_budget_page_renders_groups(client):
    page = client.get("/budget?month=2026-06").get_data(as_text=True)
    for group in ("Income", "Giving", "Housing", "Food", "Debt"):
        assert group in page


def test_plan_and_zero_based_banner(client):
    # Plan $1000 income and $1000 groceries -> zero-based.
    def cid(group, name):
        from ledgerly.db import get_db
        app = client.application
        with app.app_context():
            return get_db().execute(
                "SELECT c.id FROM categories c JOIN category_groups g ON g.id=c.group_id"
                " WHERE g.name=? AND c.name=?", (group, name),
            ).fetchone()["id"]

    client.post("/budget/plan", data={
        "month": "2026-06", "category_id": cid("Income", "Paycheck"), "planned": "1000",
    })
    client.post("/budget/plan", data={
        "month": "2026-06", "category_id": cid("Food", "Groceries"), "planned": "1,000.00",
    })
    page = client.get("/budget?month=2026-06").get_data(as_text=True)
    assert "zero-based budget" in page


def test_add_transaction_auto_categorizes(client):
    client.post("/transactions/add", data={
        "date": "2026-06-05", "payee": "Kroger grocery run", "amount": "84.20",
        "direction": "out", "account_id": "1", "category_id": "",
    }, follow_redirects=True)
    page = client.get("/transactions").get_data(as_text=True)
    assert "Kroger grocery run" in page
    assert "-$84.20" in page


def test_csv_import_with_flip_and_rules(client):
    csv_bytes = (
        "Transaction Date,Description,Amount\n"
        "06/01/2026,WHOLE FOODS MARKET,84.20\n"      # flip -> -84.20, rule "market"
        "06/02/2026,PAYROLL ACME INC,-2500.00\n"      # flip -> +2500, rule "payroll"
    ).encode()
    resp = client.post(
        "/import",
        data={"account_id": "1", "flip": "on", "file": (io.BytesIO(csv_bytes), "card.csv")},
        content_type="multipart/form-data",
        follow_redirects=True,
    )
    page = resp.get_data(as_text=True)
    assert "Imported 2 transactions (2 auto-categorized)" in page
    assert "$2,500.00" in page
    assert "-$84.20" in page


def test_budget_copy_from_previous_month(client):
    from ledgerly.db import get_db
    app = client.application
    with app.app_context():
        cat = get_db().execute("SELECT id FROM categories LIMIT 1").fetchone()["id"]
    client.post("/budget/plan", data={"month": "2026-05", "category_id": cat, "planned": "300"})
    client.post("/budget/copy", data={"month": "2026-06"}, follow_redirects=True)
    with app.app_context():
        row = get_db().execute(
            "SELECT planned_cents FROM budgets WHERE month='2026-06' AND category_id=?", (cat,)
        ).fetchone()
    assert row["planned_cents"] == 30_000
