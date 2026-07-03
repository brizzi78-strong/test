# Ledgerly 💚

A personal-finance app that's **friendlier than QuickBooks**: your money in
plain English — no debits, no credits, no chart of accounts, no jargon.

Tracking works like **Mint** (accounts, transactions, auto-categorization,
net worth) and budgeting works like **EveryDollar** (zero-based: give every
dollar a job until "Left to budget" hits $0).

## Quick start

```bash
pip install -e .
python run.py          # → http://localhost:5000
```

That's it. The database is created and seeded on first run — including the
real accounts and balances pulled from the Blue Ridge Financial Coaching LLC
QuickBooks balance sheet (May 31, 2026): checking, savings, PayPal,
Robinhood, cash, and all four credit cards (Amex Gold, Blue Business Plus,
Spark Cash Select, Visa).

## What's inside

| Page | What it does |
|------|--------------|
| **Home** | Net worth, card balances, "Left to budget", "Safe to spend", spending bars, recent activity |
| **Budget** | Zero-based monthly budget. Plan income, then assign every dollar to a category. A banner tracks you to exactly $0 — green when every dollar has a job. One click copies last month's plan. |
| **Transactions** | Add by hand or fix categories inline. Money out is red, money in is green. |
| **Import** | Drop in a CSV from any bank or card site. Date/description/amount columns are detected automatically (`Transaction Date`, `Merchant`, etc. all work), signs can be flipped for card exports, and rules auto-sort what they can. |
| **Accounts** | All your accounts and live balances; add new ones anytime. |
| **Auto-sort** | Plain-English rules: "if the description contains *whole foods*, sort it into Food · Groceries". Longest match wins. |

### Design choices

- **Plain words.** "Money in / money out", not credits and debits.
- **Zero-based by default.** The budget isn't a report, it's a plan: the app
  pushes you until planned income minus planned spending is exactly $0.
- **Money is integer cents** end to end — no float rounding surprises.
- **No runtime dependencies beyond Flask.** SQLite file database, server-rendered
  pages, zero build step.

## finalyst — the analysis CLI

The repo also ships `finalyst`, a dependency-free CLI used to analyze
financial statements and price series (it powered the ratio analysis of the
QuickBooks books):

```bash
finalyst ratios examples/income_statement.csv     # liquidity/profitability/leverage/…
finalyst returns examples/prices.csv --frequency monthly --risk-free 0.04
```

See `examples/` for input formats; add `--json` for machine-readable output.

## Development

```bash
pip install -e ".[dev]"
pytest          # 38 tests: budget math, money parsing, categorization, CSV import, pages
```

## License

MIT
