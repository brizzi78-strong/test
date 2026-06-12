"""Python client for the Undetectable AI Humanizer API."""

from .client import (
    UndetectableAIClient,
    UndetectableAIError,
    HumanizeResult,
    Readability,
    Purpose,
    Strength,
)
from .batch import (
    split_into_chunks,
    humanize_document,
    humanize_file,
)

__all__ = [
    "UndetectableAIClient",
    "UndetectableAIError",
    "HumanizeResult",
    "Readability",
    "Purpose",
    "Strength",
    "split_into_chunks",
    "humanize_document",
    "humanize_file",
]

__version__ = "0.1.0"
