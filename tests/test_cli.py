import json

from finalyst.cli import main


def test_ratios_command_table(capsys):
    rc = main(["ratios", "examples/income_statement.csv"])
    out = capsys.readouterr().out
    assert rc == 0
    assert "Profitability" in out
    assert "Current ratio" in out


def test_ratios_command_json(capsys):
    rc = main(["ratios", "examples/income_statement.csv", "--json"])
    out = capsys.readouterr().out
    assert rc == 0
    data = json.loads(out)
    assert "Liquidity" in data
    assert data["Profitability"]["Net margin"] == 0.12


def test_returns_command_json(capsys):
    rc = main(["returns", "examples/prices.csv", "--frequency", "monthly", "--json"])
    out = capsys.readouterr().out
    assert rc == 0
    data = json.loads(out)
    assert data["periods"] == 11
    assert data["frequency"] == "monthly"


def test_missing_file_returns_error(capsys):
    rc = main(["ratios", "does_not_exist.csv"])
    err = capsys.readouterr().err
    assert rc == 2
    assert "file not found" in err
