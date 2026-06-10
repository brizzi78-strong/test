"""SQLite schema, connection handling and seed data."""

from __future__ import annotations

import sqlite3

import click
from flask import Flask, current_app, g

SCHEMA = """
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'checking',   -- checking|savings|cash|credit|investment
  opening_cents INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS category_groups (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort INTEGER NOT NULL DEFAULT 0,
  is_income INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES category_groups(id),
  name TEXT NOT NULL,
  UNIQUE (group_id, name)
);

CREATE TABLE IF NOT EXISTS budgets (
  month TEXT NOT NULL,                     -- YYYY-MM
  category_id INTEGER NOT NULL REFERENCES categories(id),
  planned_cents INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (month, category_id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  date TEXT NOT NULL,                      -- YYYY-MM-DD
  payee TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,           -- positive = money in, negative = money out
  category_id INTEGER REFERENCES categories(id),
  note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY,
  pattern TEXT NOT NULL,                   -- case-insensitive payee substring
  category_id INTEGER NOT NULL REFERENCES categories(id)
);

CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_txn_category ON transactions(category_id);
"""

# EveryDollar-style zero-based groups. (group, is_income, [categories])
DEFAULT_GROUPS = [
    ("Income", 1, ["Paycheck", "Business income", "Other income"]),
    ("Giving", 0, ["Charity", "Tithes"]),
    ("Savings", 0, ["Emergency fund", "Retirement", "Investing (brokerage)", "Sinking funds"]),
    ("Housing", 0, ["Mortgage/Rent", "HOA fee", "Utilities", "Maintenance"]),
    ("Transportation", 0, ["Gas & fuel", "Auto insurance", "Repairs"]),
    ("Food", 0, ["Groceries", "Restaurants"]),
    ("Lifestyle", 0, ["Entertainment", "Subscriptions", "Personal", "Health"]),
    ("Insurance & Tax", 0, ["Insurance", "Taxes & licenses"]),
    ("Debt", 0, ["Credit card payment", "Loan payment"]),
]

# The user's real accounts and balances. Bank/card balances come from the
# QuickBooks balance sheet (Blue Ridge Financial Coaching LLC, 2026-05-31);
# investment balances from the user's investment-tracking app (2026-06-10).
# Credit-card balances are stored negative so net worth sums correctly.
QBO_ACCOUNTS = [
    ("Main Checking (9318)", "checking", 4_624_490),
    ("360 Checking (9815)", "checking", 822),
    ("360 Performance Savings (4293)", "savings", 323),
    ("EMERGENCY (7772)", "savings", 100),
    ("Home (3951)", "savings", 11),
    ("PayPal", "checking", 0),  # QBO balance/deposit pair nets to $0
    ("Cash on hand", "cash", -804_418),  # negative in QBO; needs cleanup there
    ("American Express Gold Card (5002)", "credit", -215_053),
    ("Blue Business Plus Card (2009)", "credit", -260_744),
    ("Spark Cash Select (0356)", "credit", -26_154),
    ("Visa (0114)", "credit", -1_800),
    # Investments (QBO had Robinhood individual at a stale $943.93).
    ("Robinhood traditional IRA (1859)", "investment", 42_605_700),
    ("Fidelity", "investment", 11_000_000),
    ("Robinhood individual (0540)", "investment", 9_615_400),
    ("401(k) Savings Plan (Schwab)", "investment", 9_195_700),
    ("Money Purchase Pension Plan (Schwab)", "investment", 7_415_100),
    ("Hope Publix", "investment", 1_300_000),
    ("Robinhood Crypto (8625)", "investment", 484_800),
    ("IRRA-Edge XZA-X7544", "investment", 19_000),
    # Net proceeds from the sale of the Pensacola house (June 2026).
    ("Pensacola sale proceeds", "savings", 36_000_000),
]

# Starting zero-based plan for June 2026, the first post-Pensacola-sale month.
# Income: Hope's take-home ($3,000/week ≈ $13,000/month) + Robert's $6,000
# take-home incl. bonus + ~$1,200/month interest on the parked sale proceeds.
# Housing carries the Truist mortgage payment on the Raleigh house
# ($4,600/month incl. escrow); the household has no other debt.
#
# Tax-advantaged retirement happens at payroll, BEFORE take-home pay:
# $20,000/yr Roth 401(k) + $8,500/yr HSA ≈ $2,375/month. The take-home
# budgeted here is net of those, so the in-budget Savings lines are ON TOP:
# extra retirement (e.g. backdoor Roth IRAs), brokerage investing, the
# emergency fund and sinking funds — assigned so the plan lands on exactly $0.
DEFAULT_BUDGET_MONTH = "2026-06"
DEFAULT_BUDGET = [
    ("Income", "Paycheck", 1_200_000),  # Hope's take-home, 4 checks/month
    # Book sales + speaking via Blue Ridge Financial Coaching LLC
    # (d/b/a The Cardinal's Promise), net of the ~25-30% tax set-aside.
    ("Income", "Business income", 600_000),
    ("Income", "Other income", 230_000),  # Hope's mom $1,100 + ~$1,200 interest
    ("Giving", "Charity", 166_700),  # $20,000/year
    ("Savings", "Emergency fund", 300_000),
    ("Savings", "Retirement", 150_000),
    ("Savings", "Investing (brokerage)", 347_400),
    ("Savings", "Sinking funds", 150_000),
    ("Housing", "Mortgage/Rent", 460_000),  # Truist payment incl. escrow
    ("Housing", "HOA fee", 20_900),
    ("Housing", "Utilities", 60_000),
    ("Housing", "Maintenance", 30_000),
    ("Transportation", "Gas & fuel", 35_000),
    ("Transportation", "Auto insurance", 20_000),
    ("Transportation", "Repairs", 15_000),
    ("Food", "Groceries", 80_000),
    ("Food", "Restaurants", 30_000),
    ("Lifestyle", "Entertainment", 20_000),
    ("Lifestyle", "Subscriptions", 10_000),
    ("Lifestyle", "Personal", 40_000),
    ("Lifestyle", "Health", 25_000),
    ("Insurance & Tax", "Insurance", 50_000),
    ("Insurance & Tax", "Taxes & licenses", 20_000),
]

DEFAULT_RULES = [
    ("mortgage", "Housing", "Mortgage/Rent"),
    ("rent", "Housing", "Mortgage/Rent"),
    ("electric", "Housing", "Utilities"),
    ("water", "Housing", "Utilities"),
    ("internet", "Housing", "Utilities"),
    ("grocery", "Food", "Groceries"),
    ("market", "Food", "Groceries"),
    ("restaurant", "Food", "Restaurants"),
    ("coffee", "Food", "Restaurants"),
    ("gas", "Transportation", "Gas & fuel"),
    ("fuel", "Transportation", "Gas & fuel"),
    ("insurance", "Insurance & Tax", "Insurance"),
    ("netflix", "Lifestyle", "Subscriptions"),
    ("spotify", "Lifestyle", "Subscriptions"),
    ("pharmacy", "Lifestyle", "Health"),
    ("payroll", "Income", "Paycheck"),
    ("deposit", "Income", "Other income"),
    ("amex", "Debt", "Credit card payment"),
    ("card payment", "Debt", "Credit card payment"),
    ("charity", "Giving", "Charity"),
    ("church", "Giving", "Tithes"),
]


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(_exc=None) -> None:
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db() -> None:
    db = get_db()
    db.executescript(SCHEMA)
    db.commit()


def seed_defaults(db: sqlite3.Connection) -> None:
    """Idempotently insert category groups, rules and the QBO accounts."""
    for sort, (group, is_income, cats) in enumerate(DEFAULT_GROUPS):
        db.execute(
            "INSERT OR IGNORE INTO category_groups(name, sort, is_income) VALUES (?,?,?)",
            (group, sort, is_income),
        )
        gid = db.execute(
            "SELECT id FROM category_groups WHERE name=?", (group,)
        ).fetchone()["id"]
        for cat in cats:
            db.execute(
                "INSERT OR IGNORE INTO categories(group_id, name) VALUES (?,?)", (gid, cat)
            )

    for name, type_, opening in QBO_ACCOUNTS:
        db.execute(
            "INSERT OR IGNORE INTO accounts(name, type, opening_cents) VALUES (?,?,?)",
            (name, type_, opening),
        )

    if not db.execute("SELECT 1 FROM budgets LIMIT 1").fetchone():
        for group, cat, planned in DEFAULT_BUDGET:
            row = db.execute(
                "SELECT c.id FROM categories c JOIN category_groups g ON g.id=c.group_id"
                " WHERE g.name=? AND c.name=?",
                (group, cat),
            ).fetchone()
            if row:
                db.execute(
                    "INSERT OR IGNORE INTO budgets(month, category_id, planned_cents)"
                    " VALUES (?,?,?)",
                    (DEFAULT_BUDGET_MONTH, row["id"], planned),
                )

    for pattern, group, cat in DEFAULT_RULES:
        row = db.execute(
            "SELECT c.id FROM categories c JOIN category_groups g ON g.id=c.group_id"
            " WHERE g.name=? AND c.name=?",
            (group, cat),
        ).fetchone()
        if row:
            exists = db.execute(
                "SELECT 1 FROM rules WHERE pattern=? AND category_id=?", (pattern, row["id"])
            ).fetchone()
            if not exists:
                db.execute(
                    "INSERT INTO rules(pattern, category_id) VALUES (?,?)", (pattern, row["id"])
                )
    db.commit()


@click.command("init-db")
def init_db_command() -> None:
    """Create tables and seed default groups, rules and accounts."""
    init_db()
    seed_defaults(get_db())
    click.echo("Initialized and seeded the Ledgerly database.")


def init_app(app: Flask) -> None:
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
    # Create the schema (and seed on first run) automatically so `python run.py`
    # works with zero setup.
    with app.app_context():
        init_db()
        if not get_db().execute("SELECT 1 FROM accounts LIMIT 1").fetchone():
            seed_defaults(get_db())
