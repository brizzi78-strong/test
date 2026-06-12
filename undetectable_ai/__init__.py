"""Python client for the Undetectable AI Humanizer API."""

from .client import (
    UndetectableAIClient,
    UndetectableAIError,
    HumanizeResult,
    Readability,
    Purpose,
    Strength,
)

__all__ = [
    "UndetectableAIClient",
    "UndetectableAIError",
    "HumanizeResult",
    "Readability",
    "Purpose",
    "Strength",
]

__version__ = "0.1.0"
