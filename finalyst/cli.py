"""Command-line interface for finalyst.

Usage examples::

    finalyst ratios examples/income_statement.csv
    finalyst returns examples/prices.csv --frequency monthly --risk-free 0.04
    finalyst returns examples/prices.csv --json
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import List, Optional

from . import __version__
from .loader import DataError, load_prices, load_statement
from .ratios import analyze as analyze_ratios
from .returns import PERIODS_PER_YEAR
from .returns import analyze as analyze_returns
from .report import render_ratios, render_returns


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="finalyst",
        description="A command-line financial analysis toolkit.",
    )
    parser.add_argument("--version", action="version", version=f"finalyst {__version__}")
    sub = parser.add_subparsers(dest="command", required=True)

    p_ratios = sub.add_parser(
        "ratios",
        help="compute financial ratios from a statement CSV",
        description="Compute liquidity, profitability, leverage, efficiency and "
        "valuation ratios from a key/value statement CSV.",
    )
    p_ratios.add_argument("statement", help="path to a key/value statement CSV")
    p_ratios.add_argument("--json", action="store_true", help="emit JSON instead of a table")

    p_returns = sub.add_parser(
        "returns",
        help="analyze a price time series",
        description="Compute total return, CAGR, volatility, Sharpe ratio and "
        "maximum drawdown for a dated price series.",
    )
    p_returns.add_argument("prices", help="path to a date/close price CSV")
    p_returns.add_argument(
        "--frequency",
        choices=sorted(PERIODS_PER_YEAR),
        default="daily",
        help="sampling frequency used for annualization (default: daily)",
    )
    p_returns.add_argument(
        "--risk-free",
        type=float,
        default=0.0,
        metavar="RATE",
        help="annual risk-free rate for the Sharpe ratio, e.g. 0.04 (default: 0)",
    )
    p_returns.add_argument("--date-col", default="date", help="date column name (default: date)")
    p_returns.add_argument("--price-col", default="close", help="price column name (default: close)")
    p_returns.add_argument("--json", action="store_true", help="emit JSON instead of a table")

    return parser


def _cmd_ratios(args: argparse.Namespace) -> int:
    items = load_statement(args.statement)
    groups = analyze_ratios(items)
    if args.json:
        payload = {
            g.title: {r.name: r.value for r in g.ratios} for g in groups
        }
        print(json.dumps(payload, indent=2))
    else:
        print(render_ratios(groups))
    return 0


def _cmd_returns(args: argparse.Namespace) -> int:
    series = load_prices(args.prices, date_col=args.date_col, price_col=args.price_col)
    stats = analyze_returns(series, frequency=args.frequency, risk_free_rate=args.risk_free)
    if args.json:
        print(json.dumps(stats.as_dict(), indent=2))
    else:
        print(render_returns(stats))
    return 0


def main(argv: Optional[List[str]] = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    try:
        if args.command == "ratios":
            return _cmd_ratios(args)
        if args.command == "returns":
            return _cmd_returns(args)
    except (DataError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    except FileNotFoundError as exc:
        print(f"error: file not found: {exc.filename}", file=sys.stderr)
        return 2

    parser.error("no command given")  # pragma: no cover
    return 2


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
