import math

from finalyst.ratios import analyze, required_items


def _flatten(groups):
    return {r.name: r.value for g in groups for r in g.ratios}


SAMPLE = {
    "revenue": 1_000_000,
    "cogs": 600_000,
    "operating_income": 180_000,
    "net_income": 120_000,
    "interest_expense": 15_000,
    "cash": 90_000,
    "inventory": 140_000,
    "current_assets": 420_000,
    "current_liabilities": 210_000,
    "total_assets": 1_200_000,
    "total_liabilities": 500_000,
    "total_equity": 700_000,
    "shares_outstanding": 100_000,
    "price": 18.50,
}


def test_core_ratios_values():
    r = _flatten(analyze(SAMPLE))
    assert math.isclose(r["Current ratio"], 420_000 / 210_000)
    assert math.isclose(r["Quick ratio"], (420_000 - 140_000) / 210_000)
    assert math.isclose(r["Gross margin"], 0.40)
    assert math.isclose(r["Net margin"], 0.12)
    assert math.isclose(r["Return on equity (ROE)"], 120_000 / 700_000)
    assert math.isclose(r["Debt-to-equity"], 500_000 / 700_000)
    assert math.isclose(r["Interest coverage"], 180_000 / 15_000)
    assert math.isclose(r["Asset turnover"], 1_000_000 / 1_200_000)


def test_valuation_ratios():
    r = _flatten(analyze(SAMPLE))
    eps = 120_000 / 100_000
    assert math.isclose(r["Earnings per share (EPS)"], eps)
    assert math.isclose(r["Price / earnings (P/E)"], 18.50 / eps)


def test_gross_profit_is_derived_when_absent():
    items = {"revenue": 1000, "cogs": 700}
    r = _flatten(analyze(items))
    assert math.isclose(r["Gross margin"], 0.30)


def test_missing_inputs_are_skipped_not_errored():
    groups = analyze({"revenue": 1000, "net_income": 100})
    r = _flatten(groups)
    assert "Net margin" in r
    assert "Current ratio" not in r  # no balance-sheet data supplied


def test_zero_denominator_skipped():
    r = _flatten(analyze({"current_assets": 100, "current_liabilities": 0}))
    assert "Current ratio" not in r


def test_required_items_covers_known_fields():
    items = set(required_items())
    assert {"revenue", "net_income", "total_equity", "price"} <= items
