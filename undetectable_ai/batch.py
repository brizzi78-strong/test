"""Batch helpers for the Undetectable AI Humanizer.

Two things live here:

* ``split_into_chunks`` - break a long document into humanizer-sized pieces
  along paragraph boundaries (so sentences are never cut in half).
* ``humanize_document`` / ``humanize_file`` - humanize a long document or a
  single file, splitting and stitching automatically.
"""

from __future__ import annotations

from pathlib import Path
from typing import Callable, List, Optional

from .client import (
    MIN_CONTENT_LENGTH,
    Purpose,
    Readability,
    Strength,
    UndetectableAIClient,
)

# The API accepts large inputs, but splitting keeps each request fast, makes
# failures recoverable, and stays comfortably within plan limits.
DEFAULT_MAX_CHARS = 6000


def split_into_chunks(
    text: str, max_chars: int = DEFAULT_MAX_CHARS
) -> List[str]:
    """Split ``text`` into chunks of at most ``max_chars`` characters.

    Splitting happens on blank-line paragraph boundaries. A single paragraph
    longer than ``max_chars`` is split on sentence-ish boundaries as a
    fallback. Adjacent small chunks are merged so we never emit a chunk
    shorter than the API minimum (when avoidable).
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: List[str] = []
    current = ""

    def flush() -> None:
        nonlocal current
        if current.strip():
            chunks.append(current.strip())
        current = ""

    for para in paragraphs:
        if len(para) > max_chars:
            flush()
            chunks.extend(_split_long_paragraph(para, max_chars))
            continue
        candidate = f"{current}\n\n{para}".strip() if current else para
        if len(candidate) > max_chars:
            flush()
            current = para
        else:
            current = candidate
    flush()

    return _merge_tiny_chunks(chunks, max_chars)


def _split_long_paragraph(para: str, max_chars: int) -> List[str]:
    """Fallback splitter for a paragraph that exceeds ``max_chars``."""
    sentences = para.replace("? ", "?\n").replace("! ", "!\n").replace(
        ". ", ".\n"
    ).split("\n")
    out: List[str] = []
    current = ""
    for sentence in sentences:
        candidate = f"{current} {sentence}".strip() if current else sentence
        if len(candidate) > max_chars and current:
            out.append(current.strip())
            current = sentence
        else:
            current = candidate
    if current.strip():
        out.append(current.strip())
    return out


def _merge_tiny_chunks(chunks: List[str], max_chars: int) -> List[str]:
    """Merge chunks below the API minimum length into a neighbour."""
    merged: List[str] = []
    for chunk in chunks:
        if (
            merged
            and len(chunk) < MIN_CONTENT_LENGTH
            and len(merged[-1]) + len(chunk) + 2 <= max_chars
        ):
            merged[-1] = f"{merged[-1]}\n\n{chunk}"
        else:
            merged.append(chunk)
    return merged


def humanize_document(
    client: UndetectableAIClient,
    text: str,
    readability: Readability = Readability.UNIVERSITY,
    purpose: Purpose = Purpose.GENERAL_WRITING,
    strength: Strength = Strength.BALANCED,
    max_chars: int = DEFAULT_MAX_CHARS,
    on_progress: Optional[Callable[[int, int], None]] = None,
) -> str:
    """Humanize a (possibly long) document, splitting and stitching as needed.

    ``on_progress(done, total)`` is called after each chunk if provided.
    """
    chunks = split_into_chunks(text, max_chars=max_chars)
    total = len(chunks)
    outputs: List[str] = []
    for index, chunk in enumerate(chunks, start=1):
        # Chunks under the minimum length can't be humanized; pass them
        # through unchanged rather than failing the whole document.
        if len(chunk) < MIN_CONTENT_LENGTH:
            outputs.append(chunk)
        else:
            result = client.humanize(
                chunk,
                readability=readability,
                purpose=purpose,
                strength=strength,
            )
            outputs.append(result.output.strip())
        if on_progress:
            on_progress(index, total)
    return "\n\n".join(outputs)


def humanize_file(
    client: UndetectableAIClient,
    src: Path,
    dest: Path,
    readability: Readability = Readability.UNIVERSITY,
    purpose: Purpose = Purpose.GENERAL_WRITING,
    strength: Strength = Strength.BALANCED,
    max_chars: int = DEFAULT_MAX_CHARS,
    on_progress: Optional[Callable[[int, int], None]] = None,
) -> Path:
    """Humanize ``src`` and write the result to ``dest``."""
    text = src.read_text(encoding="utf-8")
    output = humanize_document(
        client,
        text,
        readability=readability,
        purpose=purpose,
        strength=strength,
        max_chars=max_chars,
        on_progress=on_progress,
    )
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(output, encoding="utf-8")
    return dest
