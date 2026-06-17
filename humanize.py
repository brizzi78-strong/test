#!/usr/bin/env python3
"""Command-line entry point for the Undetectable AI Humanizer.

Examples
--------
    # Humanize text passed as an argument
    python humanize.py "Some AI generated text that is at least fifty chars..."

    # Humanize text piped on stdin
    cat draft.txt | python humanize.py

    # Check remaining credits
    python humanize.py --credits

The API key is read from the UNDETECTABLE_API_KEY environment variable
(a .env file in this directory is loaded automatically if present).
"""

from __future__ import annotations

import argparse
import sys

from undetectable_ai import (
    Purpose,
    Readability,
    Strength,
    UndetectableAIClient,
    UndetectableAIError,
)


def _load_dotenv() -> None:
    """Best-effort load of a local .env file without extra dependencies."""
    try:
        from pathlib import Path

        env_path = Path(__file__).with_name(".env")
        if not env_path.exists():
            return
        import os

        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    except OSError:
        pass


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Humanize text via Undetectable AI.")
    parser.add_argument(
        "text",
        nargs="?",
        help="Text to humanize. If omitted, text is read from stdin.",
    )
    parser.add_argument(
        "--readability",
        choices=[r.value for r in Readability],
        default=Readability.UNIVERSITY.value,
    )
    parser.add_argument(
        "--purpose",
        choices=[p.value for p in Purpose],
        default=Purpose.GENERAL_WRITING.value,
    )
    parser.add_argument(
        "--strength",
        choices=[s.value for s in Strength],
        default=Strength.BALANCED.value,
    )
    parser.add_argument(
        "--credits",
        action="store_true",
        help="Print remaining account credits and exit.",
    )
    args = parser.parse_args(argv)

    _load_dotenv()

    try:
        client = UndetectableAIClient()
    except UndetectableAIError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if args.credits:
        try:
            print(client.credits())
        except UndetectableAIError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 1
        return 0

    content = args.text if args.text is not None else sys.stdin.read()
    content = content.strip()
    if not content:
        print("error: no input text provided.", file=sys.stderr)
        return 2

    try:
        result = client.humanize(
            content,
            readability=args.readability,
            purpose=args.purpose,
            strength=args.strength,
        )
    except UndetectableAIError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(result.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
