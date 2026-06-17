"""Command-line interface for the ghost writer."""

from __future__ import annotations

import argparse
import os
import sys

import anthropic

from ghostwriter import __version__
from ghostwriter.prompts import TASKS
from ghostwriter.writer import DEFAULT_MODEL, GhostWriter


def _read_input(positional: str | None, file: str | None) -> str:
    """Resolve the input text from an argument, a file, or stdin."""
    if file:
        with open(file, "r", encoding="utf-8") as fh:
            return fh.read()
    if positional is not None:
        return positional
    if not sys.stdin.isatty():
        return sys.stdin.read()
    return ""


def build_parser() -> argparse.ArgumentParser:
    task_help = "\n".join(
        f"  {name:<9} {task.description}" for name, task in TASKS.items()
    )
    parser = argparse.ArgumentParser(
        prog="ghostwriter",
        description="An AI ghost writer powered by Claude.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"tasks:\n{task_help}",
    )
    parser.add_argument(
        "task",
        choices=list(TASKS),
        metavar="TASK",
        help="What to do: " + ", ".join(TASKS),
    )
    parser.add_argument(
        "text",
        nargs="?",
        help="The brief or text. Omit to read from --file or stdin.",
    )
    parser.add_argument("-f", "--file", help="Read input from this file.")
    parser.add_argument(
        "-o", "--output", help="Write the result to this file instead of stdout."
    )
    parser.add_argument("--tone", help="Desired tone, e.g. 'warm and conversational'.")
    parser.add_argument("--audience", help="Intended audience.")
    parser.add_argument(
        "--words", type=int, help="Approximate target length in words."
    )
    parser.add_argument(
        "--model", default=DEFAULT_MODEL, help=f"Claude model (default: {DEFAULT_MODEL})."
    )
    parser.add_argument(
        "--max-tokens", type=int, default=8000, help="Max output tokens (default: 8000)."
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Don't stream output live; print only the final result.",
    )
    parser.add_argument("--version", action="version", version=f"ghostwriter {__version__}")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print(
            "error: ANTHROPIC_API_KEY is not set.\n"
            "Get a key at https://console.anthropic.com and export it:\n"
            "  export ANTHROPIC_API_KEY=sk-ant-...",
            file=sys.stderr,
        )
        return 2

    text = _read_input(args.text, args.file)
    if not text.strip():
        print("error: no input. Pass text, use --file, or pipe via stdin.", file=sys.stderr)
        return 2

    writer = GhostWriter(model=args.model, max_tokens=args.max_tokens)

    # Stream to stderr so stdout/--output stays clean for piping.
    stream_to_terminal = not args.quiet and not args.output
    on_text = (lambda chunk: print(chunk, end="", file=sys.stderr, flush=True)) \
        if stream_to_terminal else None

    try:
        draft = writer.write(
            args.task,
            text,
            tone=args.tone,
            audience=args.audience,
            words=args.words,
            on_text=on_text,
        )
    except anthropic.APIError as exc:
        print(f"\nAPI error: {exc}", file=sys.stderr)
        return 1

    if stream_to_terminal:
        print(file=sys.stderr)  # newline after the streamed text

    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(draft.text)
        print(f"Wrote {len(draft.text)} chars to {args.output}", file=sys.stderr)
    elif args.quiet:
        print(draft.text)

    print(
        f"[{draft.task} · {draft.model} · "
        f"{draft.input_tokens} in / {draft.output_tokens} out]",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
