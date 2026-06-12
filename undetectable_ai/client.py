"""A small, dependency-light client for the Undetectable AI Humanizer API.

The Humanizer API works in two steps:

1. ``POST /submit``   - queue a document for humanizing, returns a document id.
2. ``POST /document`` - retrieve the document by id; the ``output`` field is
   populated once processing finishes, so we poll until it is ready.

API reference: https://docs.undetectable.ai/
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass
from enum import Enum
from typing import Optional

import requests

BASE_URL = "https://humanize.undetectable.ai"

# The API requires the submitted content to be at least this many characters.
MIN_CONTENT_LENGTH = 50


class Readability(str, Enum):
    HIGH_SCHOOL = "High School"
    UNIVERSITY = "University"
    DOCTORATE = "Doctorate"
    JOURNALIST = "Journalist"
    MARKETING = "Marketing"


class Purpose(str, Enum):
    GENERAL_WRITING = "General Writing"
    ESSAY = "Essay"
    ARTICLE = "Article"
    MARKETING_MATERIAL = "Marketing Material"
    STORY = "Story"
    COVER_LETTER = "Cover Letter"
    REPORT = "Report"
    BUSINESS_MATERIAL = "Business Material"
    LEGAL_MATERIAL = "Legal Material"


class Strength(str, Enum):
    QUALITY = "Quality"
    BALANCED = "Balanced"
    MORE_HUMAN = "More Human"


class UndetectableAIError(Exception):
    """Raised when the Undetectable AI API returns an error or times out."""


@dataclass
class HumanizeResult:
    """Result of a completed humanize request."""

    id: str
    output: str
    input: Optional[str] = None
    readability: Optional[str] = None
    purpose: Optional[str] = None
    raw: Optional[dict] = None


class UndetectableAIClient:
    """Client for the Undetectable AI Humanizer API.

    Parameters
    ----------
    api_key:
        Your Undetectable AI API key. If omitted, it is read from the
        ``UNDETECTABLE_API_KEY`` environment variable.
    base_url:
        Override the API base URL (mostly useful for testing).
    timeout:
        Per-request HTTP timeout in seconds.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = BASE_URL,
        timeout: float = 30.0,
    ) -> None:
        self.api_key = api_key or os.environ.get("UNDETECTABLE_API_KEY")
        if not self.api_key:
            raise UndetectableAIError(
                "No API key provided. Pass api_key=... or set the "
                "UNDETECTABLE_API_KEY environment variable."
            )
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._session = requests.Session()
        self._session.headers.update(
            {
                "api-key": self.api_key,
                "Content-Type": "application/json",
            }
        )

    # -- low level endpoints -------------------------------------------------

    def submit(
        self,
        content: str,
        readability: Readability = Readability.UNIVERSITY,
        purpose: Purpose = Purpose.GENERAL_WRITING,
        strength: Strength = Strength.BALANCED,
        model: Optional[str] = None,
    ) -> str:
        """Queue ``content`` for humanizing and return the document id."""
        if len(content) < MIN_CONTENT_LENGTH:
            raise UndetectableAIError(
                f"Content must be at least {MIN_CONTENT_LENGTH} characters "
                f"(got {len(content)})."
            )

        payload = {
            "content": content,
            "readability": _value(readability),
            "purpose": _value(purpose),
            "strength": _value(strength),
        }
        if model:
            payload["model"] = model

        data = self._post("/submit", payload)
        doc_id = data.get("id")
        if not doc_id:
            raise UndetectableAIError(f"Unexpected /submit response: {data!r}")
        return doc_id

    def retrieve(self, document_id: str) -> dict:
        """Fetch the raw document payload for ``document_id``."""
        return self._post("/document", {"id": document_id})

    def credits(self) -> dict:
        """Return the remaining credits for the account."""
        resp = self._session.get(
            f"{self.base_url}/check-user-credits", timeout=self.timeout
        )
        return self._handle(resp)

    # -- high level helper ---------------------------------------------------

    def humanize(
        self,
        content: str,
        readability: Readability = Readability.UNIVERSITY,
        purpose: Purpose = Purpose.GENERAL_WRITING,
        strength: Strength = Strength.BALANCED,
        model: Optional[str] = None,
        poll_interval: float = 3.0,
        max_wait: float = 180.0,
    ) -> HumanizeResult:
        """Submit ``content`` and block until the humanized output is ready.

        Polls ``/document`` every ``poll_interval`` seconds until the
        ``output`` field is populated or ``max_wait`` seconds elapse.
        """
        doc_id = self.submit(
            content,
            readability=readability,
            purpose=purpose,
            strength=strength,
            model=model,
        )

        deadline = time.monotonic() + max_wait
        while True:
            doc = self.retrieve(doc_id)
            output = doc.get("output")
            if output:
                return HumanizeResult(
                    id=doc_id,
                    output=output,
                    input=doc.get("input"),
                    readability=doc.get("readability"),
                    purpose=doc.get("purpose"),
                    raw=doc,
                )
            if time.monotonic() >= deadline:
                raise UndetectableAIError(
                    f"Timed out after {max_wait:.0f}s waiting for document "
                    f"{doc_id} to finish humanizing."
                )
            time.sleep(poll_interval)

    # -- internals -----------------------------------------------------------

    def _post(self, path: str, payload: dict) -> dict:
        resp = self._session.post(
            f"{self.base_url}{path}", json=payload, timeout=self.timeout
        )
        return self._handle(resp)

    @staticmethod
    def _handle(resp: "requests.Response") -> dict:
        if resp.status_code == 401:
            raise UndetectableAIError("Authentication failed - check your API key.")
        if not resp.ok:
            raise UndetectableAIError(
                f"API request failed ({resp.status_code}): {resp.text}"
            )
        try:
            return resp.json()
        except ValueError as exc:  # pragma: no cover - defensive
            raise UndetectableAIError(
                f"Could not decode API response as JSON: {resp.text!r}"
            ) from exc


def _value(maybe_enum) -> str:
    """Accept either an Enum member or a plain string."""
    return maybe_enum.value if isinstance(maybe_enum, Enum) else str(maybe_enum)
