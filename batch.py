#!/usr/bin/env python3
"""Batch humanize a folder of text files via Undetectable AI.

Long documents are automatically split into humanizer-sized chunks along
paragraph boundaries and stitched back together, so you can feed whole
documents without worrying about length.

Examples
--------
    # Humanize every .txt file in ./drafts into ./humanized
    python batch.py drafts/ -o humanized/

    # Humanize a single long file with specific settings
    python batch.py report.txt -o out/ --readability Doctorate --purpose Report
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from undetectable_ai import (
    Purpose,
    Readability,
    Strength,
    UndetectableAIClient,
    UndetectableAIError,
    humanize_file,
)

# Reuse the .env loader from the single-file CLI.
from humanize import _load_dotenv


def _gather_inputs(path: Path, pattern: str) -> list[Path]:
    if path.is_dir():
        return sorted(path.glob(pattern))
    return [path]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Batch humanize text files via Undetectable AI."
    )
    parser.add_argument(
        "input",
        help="A text file, or a directory of text files to humanize.",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="humanized",
        help="Output directory (default: ./humanized).",
    )
    parser.add_argument(
        "--pattern",
        default="*.txt",
        help="Glob for selecting files when input is a directory (default: *.txt).",
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
        "--max-chars",
        type=int,
        default=6000,
        help="Max characters per chunk for long documents (default: 6000).",
    )
    args = parser.parse_args(argv)

    _load_dotenv()

    in_path = Path(args.input)
    if not in_path.exists():
        print(f"error: input not found: {in_path}", file=sys.stderr)
        return 2

    files = _gather_inputs(in_path, args.pattern)
    if not files:
        print(f"error: no files matching {args.pattern!r} in {in_path}", file=sys.stderr)
        return 2

    try:
        client = UndetectableAIClient()
    except UndetectableAIError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    out_dir = Path(args.output)
    failures = 0
    for src in files:
        dest = out_dir / src.name

        def progress(done: int, total: int, _name: str = src.name) -> None:
            print(f"  {_name}: chunk {done}/{total}", file=sys.stderr)

        print(f"Humanizing {src} -> {dest}", file=sys.stderr)
        try:
            humanize_file(
                client,
                src,
                dest,
                readability=args.readability,
                purpose=args.purpose,
                strength=args.strength,
                max_chars=args.max_chars,
                on_progress=progress,
            )
        except (UndetectableAIError, OSError) as exc:
            failures += 1
            print(f"  failed: {exc}", file=sys.stderr)

    done = len(files) - failures
    print(f"Done: {done}/{len(files)} file(s) humanized into {out_dir}/", file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
