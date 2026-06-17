"""System prompts and task templates for the ghost writer.

Each task maps to a system prompt that establishes the ghost writer persona and
the specific job, plus a function that builds the user turn from the caller's
input and options.
"""

from __future__ import annotations

from dataclasses import dataclass, field


_BASE_PERSONA = (
    "You are a professional ghost writer. You write in the voice the client "
    "asks for, never your own. Produce clean, publication-ready prose. Do not "
    "add meta-commentary, preambles like 'Here is...', or notes about your "
    "process — return only the finished writing unless explicitly asked for "
    "alternatives or an outline."
)


def _style_clause(tone: str | None, audience: str | None, words: int | None) -> str:
    parts: list[str] = []
    if tone:
        parts.append(f"Write in a {tone} tone.")
    if audience:
        parts.append(f"Write for this audience: {audience}.")
    if words:
        parts.append(
            f"Aim for roughly {words} words; treat this as a target, not a hard cap."
        )
    return (" " + " ".join(parts)) if parts else ""


@dataclass
class Task:
    """A ghost-writing task: a system prompt plus a user-turn builder."""

    name: str
    description: str
    system: str
    build_user: "object" = field(repr=False)


def _draft_user(brief: str, *, tone=None, audience=None, words=None) -> str:
    return (
        "Write a complete first draft based on this brief:\n\n"
        f"{brief}" + _style_clause(tone, audience, words)
    )


def _rewrite_user(text: str, *, tone=None, audience=None, words=None) -> str:
    return (
        "Rewrite the following text, preserving its meaning while improving "
        "clarity, flow, and impact:\n\n"
        f"{text}" + _style_clause(tone, audience, words)
    )


def _expand_user(text: str, *, tone=None, audience=None, words=None) -> str:
    return (
        "Expand the following text with more detail, examples, and depth, "
        "keeping the existing voice and structure:\n\n"
        f"{text}" + _style_clause(tone, audience, words)
    )


def _continue_user(text: str, *, tone=None, audience=None, words=None) -> str:
    return (
        "Continue the following text seamlessly from where it ends. Match the "
        "established voice, tense, and style. Return only the continuation, not "
        "the original:\n\n"
        f"{text}" + _style_clause(tone, audience, words)
    )


def _outline_user(brief: str, *, tone=None, audience=None, words=None) -> str:
    return (
        "Produce a clear, hierarchical outline (Markdown headings and bullet "
        "points) for the following brief. This is the one task where structure, "
        "not prose, is the deliverable:\n\n"
        f"{brief}" + _style_clause(tone, audience, words)
    )


TASKS: dict[str, Task] = {
    "draft": Task(
        "draft",
        "Write a complete first draft from a brief.",
        _BASE_PERSONA,
        _draft_user,
    ),
    "rewrite": Task(
        "rewrite",
        "Rewrite existing text for clarity, flow, and impact.",
        _BASE_PERSONA,
        _rewrite_user,
    ),
    "expand": Task(
        "expand",
        "Expand existing text with more detail and depth.",
        _BASE_PERSONA,
        _expand_user,
    ),
    "continue": Task(
        "continue",
        "Continue existing text seamlessly from where it ends.",
        _BASE_PERSONA,
        _continue_user,
    ),
    "outline": Task(
        "outline",
        "Produce a structured outline from a brief.",
        _BASE_PERSONA,
        _outline_user,
    ),
}
