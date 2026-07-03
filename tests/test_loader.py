import pytest

from finalyst.loader import DataError, PriceSeries, load_prices, load_statement


def test_load_statement_normalizes_and_skips_header(tmp_path):
    p = tmp_path / "s.csv"
    # A value containing thousands separators must be quoted in CSV.
    p.write_text('item,value\nNet Income,120000\nTotal-Assets,"$1,200,000"\n')
    data = load_statement(str(p))
    assert data["net_income"] == 120000
    assert data["total_assets"] == 1_200_000  # commas and $ stripped


def test_load_statement_parses_accounting_negatives(tmp_path):
    p = tmp_path / "s.csv"
    p.write_text("item,value\nnet_loss,(5000)\n")
    assert load_statement(str(p))["net_loss"] == -5000


def test_load_statement_empty_file(tmp_path):
    p = tmp_path / "s.csv"
    p.write_text("")
    with pytest.raises(DataError):
        load_statement(str(p))


def test_load_prices_orders_and_parses(tmp_path):
    p = tmp_path / "px.csv"
    p.write_text("date,close\n2023-01-31,100\n2023-02-28,110\n")
    series = load_prices(str(p))
    assert isinstance(series, PriceSeries)
    assert series.closes == (100.0, 110.0)
    assert len(series) == 2


def test_load_prices_missing_column(tmp_path):
    p = tmp_path / "px.csv"
    p.write_text("date,price\n2023-01-31,100\n")
    with pytest.raises(DataError):
        load_prices(str(p))


def test_price_series_requires_two_points():
    with pytest.raises(DataError):
        PriceSeries(dates=("2023-01-31",), closes=(100.0,))


def test_price_series_rejects_nonpositive():
    with pytest.raises(DataError):
        PriceSeries(dates=("a", "b"), closes=(100.0, 0.0))
