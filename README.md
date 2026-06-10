# finalyst

A small, dependency-free **command-line financial analyst**. Point it at a CSV
and it computes the standard financial-statement ratios or the return/risk
profile of a price series.

- **No runtime dependencies** — pure Python standard library, runs on any
  Python ≥ 3.8.
- Two commands: `ratios` (statement analysis) and `returns` (price-series
  analysis).
- Human-readable tables or `--json` for piping into other tools.

## Install

```bash
# From the repo root
pip install -e .

# Or run without installing
python -m finalyst --help
```

## Usage

### Financial-statement ratios

Give it a key/value CSV of statement line items:

```csv
item,value
revenue,1000000
cogs,600000
net_income,120000
current_assets,420000
current_liabilities,210000
total_assets,1200000
total_equity,700000
```

```bash
finalyst ratios examples/income_statement.csv
```

```
Financial Ratios
================

Liquidity
---------
  Current ratio                          2.00x
  Quick ratio                            1.33x
  ...

Profitability
-------------
  Gross margin                          40.00%
  Net margin                            12.00%
  Return on equity (ROE)                17.14%
  ...
```

Ratios computed (when their inputs are present):

| Group | Ratios |
|-------|--------|
| Liquidity | current, quick, cash |
| Profitability | gross / operating / net margin, ROA, ROE |
| Leverage | debt-to-equity, debt ratio, equity multiplier, interest coverage |
| Efficiency | asset turnover, inventory turnover |
| Valuation | EPS, book value/share, P/E, P/B |

Missing inputs are skipped rather than erroring, so a partial statement still
produces a partial report. Some items are derived automatically (e.g.
`gross_profit` from `revenue − cogs`).

### Return & risk analysis

Give it a dated price series (oldest → newest):

```csv
date,close
2023-01-31,100.00
2023-02-28,103.20
...
```

```bash
finalyst returns examples/prices.csv --frequency monthly --risk-free 0.04
```

Reports total return, **CAGR**, annualized **volatility**, **Sharpe ratio**,
**maximum drawdown**, and best/worst period. Use `--frequency`
(`daily|weekly|monthly|quarterly|annual`) to control annualization.

Add `--json` to either command for machine-readable output.

## Input formats

- Numbers tolerate `$`, thousands separators, `%`, and accounting negatives
  `(123)`.
- Statement item names are normalised to `lower_snake_case`, so `"Net Income"`,
  `net income`, and `net_income` are equivalent.

## Development

```bash
pip install -e ".[dev]"
pytest
```

## License

MIT
