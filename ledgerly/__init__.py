"""Ledgerly -- a self-contained personal-finance web app.

Mint-style account/transaction tracking with EveryDollar-style zero-based
budgeting: every dollar of planned income is assigned to a budget line, and
the budget screen drives "left to budget" to exactly $0.

Run it with::

    python run.py            # or: flask --app ledgerly run
"""

from __future__ import annotations

import os

from flask import Flask

__version__ = "0.1.0"


def create_app(config: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config["DATABASE"] = os.environ.get(
        "LEDGERLY_DB", os.path.join(app.instance_path, "ledgerly.sqlite3")
    )
    app.config["SECRET_KEY"] = os.environ.get("LEDGERLY_SECRET", "dev-only-secret")
    if config:
        app.config.update(config)

    os.makedirs(app.instance_path, exist_ok=True)

    from . import db, views

    db.init_app(app)
    app.register_blueprint(views.bp)

    from .money import format_cents

    app.jinja_env.filters["money"] = format_cents

    return app
