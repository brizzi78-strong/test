"""All routes. Plain pages, plain words — friendlier than QuickBooks."""

from __future__ import annotations

import csv
import datetime as dt
import io
from typing import Dict, List

from flask import (
    Blueprint,
    flash,
    redirect,
    render_template,
    request,
    url_for,
)

from . import budget as budget_mod
from .categorize import match as match_rule
from .db import get_db
from .money import MoneyError, format_cents, parse_cents

bp = Blueprint("ledgerly", __name__)


def _this_month() -> str:
    return dt.date.today().strftime("%Y-%m")


def _month_label(month: str) -> str:
    return dt.date(int(month[:4]), int(month[5:7]), 1).strftime("%B %Y")


def _account_balances() -> List[dict]:
    rows = get_db().execute(
        """
        SELECT a.id, a.name, a.type, a.opening_cents,
               COALESCE(SUM(t.amount_cents), 0) AS txn_cents
        FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id
        GROUP BY a.id ORDER BY a.type, a.name
        """
    ).fetchall()
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "type": r["type"],
            "balance_cents": r["opening_cents"] + r["txn_cents"],
        }
        for r in rows
    ]


def _budget_groups(month: str) -> List[budget_mod.GroupSummary]:
    db = get_db()
    rows = db.execute(
        """
        SELECT c.id AS category_id, c.name AS category,
               g.name AS grp, g.is_income, g.sort,
               COALESCE(b.planned_cents, 0) AS planned_cents,
               COALESCE((
                   SELECT SUM(CASE WHEN g.is_income THEN t.amount_cents
                                   ELSE -t.amount_cents END)
                   FROM transactions t
                   WHERE t.category_id = c.id AND substr(t.date, 1, 7) = :month
               ), 0) AS actual_cents
        FROM categories c
        JOIN category_groups g ON g.id = c.group_id
        LEFT JOIN budgets b ON b.category_id = c.id AND b.month = :month
        ORDER BY g.sort, c.name
        """,
        {"month": month},
    ).fetchall()

    groups: Dict[str, budget_mod.GroupSummary] = {}
    for r in rows:
        grp = groups.setdefault(
            r["grp"], budget_mod.GroupSummary(name=r["grp"], is_income=bool(r["is_income"]))
        )
        grp.lines.append(
            budget_mod.BudgetLine(
                category_id=r["category_id"],
                category=r["category"],
                group=r["grp"],
                is_income=bool(r["is_income"]),
                planned_cents=r["planned_cents"],
                # Outflows are stored negative; the SQL flips expense signs so
                # both income received and money spent come back positive.
                actual_cents=max(0, r["actual_cents"]),
            )
        )
    return list(groups.values())


@bp.route("/")
def dashboard():
    month = _this_month()
    accounts = _account_balances()
    net_worth = sum(a["balance_cents"] for a in accounts)
    cards = [a for a in accounts if a["type"] == "credit"]
    card_debt = -sum(a["balance_cents"] for a in cards)

    groups = _budget_groups(month)
    summary = budget_mod.summarize(groups)

    recent = get_db().execute(
        """
        SELECT t.*, a.name AS account, c.name AS category
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id
        LEFT JOIN categories c ON c.id = t.category_id
        ORDER BY t.date DESC, t.id DESC LIMIT 8
        """
    ).fetchall()

    spend_by_group = [
        {"name": g.name, "spent_cents": g.actual_cents}
        for g in groups
        if not g.is_income and g.actual_cents > 0
    ]
    max_spend = max((g["spent_cents"] for g in spend_by_group), default=0)

    return render_template(
        "dashboard.html",
        month=month,
        month_label=_month_label(month),
        accounts=accounts,
        net_worth=net_worth,
        card_debt=card_debt,
        summary=summary,
        recent=recent,
        spend_by_group=spend_by_group,
        max_spend=max_spend,
    )


@bp.route("/budget")
def budget():
    month = request.args.get("month") or _this_month()
    groups = _budget_groups(month)
    summary = budget_mod.summarize(groups)
    return render_template(
        "budget.html",
        month=month,
        month_label=_month_label(month),
        prev_month=budget_mod.prev_month(month),
        next_month=budget_mod.next_month(month),
        groups=groups,
        summary=summary,
    )


@bp.post("/budget/plan")
def budget_plan():
    month = request.form["month"]
    category_id = int(request.form["category_id"])
    try:
        planned = parse_cents(request.form.get("planned", "0") or "0")
    except MoneyError:
        flash("That amount didn't look like a number — try something like 250 or 1,250.50.")
        return redirect(url_for("ledgerly.budget", month=month))
    db = get_db()
    db.execute(
        "INSERT INTO budgets(month, category_id, planned_cents) VALUES (?,?,?)"
        " ON CONFLICT(month, category_id) DO UPDATE SET planned_cents=excluded.planned_cents",
        (month, category_id, planned),
    )
    db.commit()
    return redirect(url_for("ledgerly.budget", month=month))


@bp.post("/budget/copy")
def budget_copy():
    month = request.form["month"]
    source = budget_mod.prev_month(month)
    db = get_db()
    copied = db.execute(
        """
        INSERT INTO budgets(month, category_id, planned_cents)
        SELECT ?, category_id, planned_cents FROM budgets WHERE month = ?
        ON CONFLICT(month, category_id) DO UPDATE SET planned_cents=excluded.planned_cents
        """,
        (month, source),
    ).rowcount
    db.commit()
    if copied:
        flash(f"Copied {copied} planned amounts from {_month_label(source)}.")
    else:
        flash(f"Nothing to copy — {_month_label(source)} has no budget yet.")
    return redirect(url_for("ledgerly.budget", month=month))


@bp.route("/transactions")
def transactions():
    month = request.args.get("month", "")
    db = get_db()
    where, params = "", []
    if month:
        where = "WHERE substr(t.date, 1, 7) = ?"
        params.append(month)
    rows = db.execute(
        f"""
        SELECT t.*, a.name AS account, c.name AS category
        FROM transactions t
        JOIN accounts a ON a.id = t.account_id
        LEFT JOIN categories c ON c.id = t.category_id
        {where}
        ORDER BY t.date DESC, t.id DESC LIMIT 500
        """,
        params,
    ).fetchall()
    accounts = db.execute("SELECT * FROM accounts ORDER BY name").fetchall()
    categories = db.execute(
        """
        SELECT c.id, c.name, g.name AS grp FROM categories c
        JOIN category_groups g ON g.id = c.group_id ORDER BY g.sort, c.name
        """
    ).fetchall()
    return render_template(
        "transactions.html",
        rows=rows,
        accounts=accounts,
        categories=categories,
        month=month,
        today=dt.date.today().isoformat(),
    )


@bp.post("/transactions/add")
def transaction_add():
    form = request.form
    try:
        amount = parse_cents(form["amount"])
    except MoneyError:
        flash("That amount didn't look like a number — try something like -45.20 or 1,500.")
        return redirect(url_for("ledgerly.transactions"))
    if form.get("direction") == "out" and amount > 0:
        amount = -amount
    db = get_db()
    category_id = int(form["category_id"]) if form.get("category_id") else None
    if category_id is None:
        rules = db.execute("SELECT pattern, category_id FROM rules").fetchall()
        category_id = match_rule(form["payee"], rules)
    db.execute(
        "INSERT INTO transactions(account_id, date, payee, amount_cents, category_id, note)"
        " VALUES (?,?,?,?,?,?)",
        (
            int(form["account_id"]),
            form["date"],
            form["payee"].strip(),
            amount,
            category_id,
            form.get("note", "").strip(),
        ),
    )
    db.commit()
    flash("Added.")
    return redirect(url_for("ledgerly.transactions"))


@bp.post("/transactions/<int:txn_id>/categorize")
def transaction_categorize(txn_id: int):
    category_id = int(request.form["category_id"]) if request.form.get("category_id") else None
    db = get_db()
    db.execute("UPDATE transactions SET category_id=? WHERE id=?", (category_id, txn_id))
    db.commit()
    return redirect(request.referrer or url_for("ledgerly.transactions"))


@bp.post("/transactions/<int:txn_id>/delete")
def transaction_delete(txn_id: int):
    db = get_db()
    db.execute("DELETE FROM transactions WHERE id=?", (txn_id,))
    db.commit()
    flash("Deleted.")
    return redirect(request.referrer or url_for("ledgerly.transactions"))


# Header names we recognise in bank/card CSV exports, lowercase.
_DATE_COLS = ("date", "transaction date", "posted date")
_PAYEE_COLS = ("payee", "description", "merchant", "name", "memo")
_AMOUNT_COLS = ("amount", "amount (usd)", "transaction amount")


@bp.route("/import", methods=["GET", "POST"])
def import_csv():
    db = get_db()
    accounts = db.execute("SELECT * FROM accounts ORDER BY name").fetchall()

    if request.method == "POST":
        file = request.files.get("file")
        if not file or not file.filename:
            flash("Choose a CSV file first.")
            return redirect(url_for("ledgerly.import_csv"))
        account_id = int(request.form["account_id"])
        flip = request.form.get("flip") == "on"

        try:
            text = file.read().decode("utf-8-sig")
        except UnicodeDecodeError:
            flash("That file doesn't look like a text CSV.")
            return redirect(url_for("ledgerly.import_csv"))

        reader = csv.DictReader(io.StringIO(text))
        fields = {(f or "").strip().lower(): f for f in (reader.fieldnames or [])}

        def pick(candidates):
            return next((fields[c] for c in candidates if c in fields), None)

        date_col, payee_col, amount_col = (
            pick(_DATE_COLS), pick(_PAYEE_COLS), pick(_AMOUNT_COLS),
        )
        if not (date_col and payee_col and amount_col):
            flash(
                "Couldn't find the needed columns. The CSV needs a date, a "
                "description/payee, and an amount column."
            )
            return redirect(url_for("ledgerly.import_csv"))

        rules = db.execute("SELECT pattern, category_id FROM rules").fetchall()
        imported = skipped = categorized = 0
        for row in reader:
            try:
                amount = parse_cents(row[amount_col])
                date = _parse_date(row[date_col])
            except (MoneyError, ValueError):
                skipped += 1
                continue
            if flip:
                amount = -amount
            payee = (row[payee_col] or "").strip() or "(no description)"
            category_id = match_rule(payee, rules)
            if category_id:
                categorized += 1
            db.execute(
                "INSERT INTO transactions(account_id, date, payee, amount_cents, category_id)"
                " VALUES (?,?,?,?,?)",
                (account_id, date, payee, amount, category_id),
            )
            imported += 1
        db.commit()
        msg = f"Imported {imported} transactions ({categorized} auto-categorized)."
        if skipped:
            msg += f" Skipped {skipped} rows that couldn't be read."
        flash(msg)
        return redirect(url_for("ledgerly.transactions"))

    return render_template("import.html", accounts=accounts)


def _parse_date(raw: str) -> str:
    raw = raw.strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return dt.datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    raise ValueError(f"unrecognised date {raw!r}")


@bp.route("/accounts")
def accounts():
    return render_template("accounts.html", accounts=_account_balances())


@bp.post("/accounts/add")
def account_add():
    form = request.form
    try:
        opening = parse_cents(form.get("opening", "0") or "0")
    except MoneyError:
        flash("That starting balance didn't look like a number.")
        return redirect(url_for("ledgerly.accounts"))
    db = get_db()
    db.execute(
        "INSERT OR IGNORE INTO accounts(name, type, opening_cents) VALUES (?,?,?)",
        (form["name"].strip(), form["type"], opening),
    )
    db.commit()
    return redirect(url_for("ledgerly.accounts"))


@bp.route("/rules")
def rules():
    db = get_db()
    rule_rows = db.execute(
        """
        SELECT r.id, r.pattern, c.name AS category, g.name AS grp
        FROM rules r JOIN categories c ON c.id = r.category_id
        JOIN category_groups g ON g.id = c.group_id
        ORDER BY r.pattern
        """
    ).fetchall()
    categories = db.execute(
        """
        SELECT c.id, c.name, g.name AS grp FROM categories c
        JOIN category_groups g ON g.id = c.group_id ORDER BY g.sort, c.name
        """
    ).fetchall()
    return render_template("rules.html", rules=rule_rows, categories=categories)


@bp.post("/rules/add")
def rule_add():
    pattern = request.form["pattern"].strip()
    if pattern:
        db = get_db()
        db.execute(
            "INSERT INTO rules(pattern, category_id) VALUES (?,?)",
            (pattern, int(request.form["category_id"])),
        )
        db.commit()
    return redirect(url_for("ledgerly.rules"))


@bp.post("/rules/<int:rule_id>/delete")
def rule_delete(rule_id: int):
    db = get_db()
    db.execute("DELETE FROM rules WHERE id=?", (rule_id,))
    db.commit()
    return redirect(url_for("ledgerly.rules"))
