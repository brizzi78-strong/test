"""Core ghost writer — wraps the Anthropic SDK to turn a task + input into prose."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterator

import anthropic

from ghostwriter.prompts import TASKS, Task

# Default to the most capable Claude model. Override per call if needed.
DEFAULT_MODEL = "claude-opus-4-8"


@dataclass
class Draft:
    """The result of a ghost-writing run."""

    text: str
    task: str
    model: str
    input_tokens: int
    output_tokens: int


class GhostWriter:
    """A ghost writer backed by Claude.

    Reads credentials from the environment (ANTHROPIC_API_KEY) by default, the
    same way the Anthropic SDK does. Pass an explicit client only for testing or
    custom configuration.
    """

    def __init__(
        self,
        *,
        model: str = DEFAULT_MODEL,
        max_tokens: int = 8000,
        client: anthropic.Anthropic | None = None,
    ) -> None:
        self.model = model
        self.max_tokens = max_tokens
        self._client = client or anthropic.Anthropic()

    def write(
        self,
        task: str,
        text: str,
        *,
        tone: str | None = None,
        audience: str | None = None,
        words: int | None = None,
        on_text: Callable[[str], None] | None = None,
    ) -> Draft:
        """Run a ghost-writing task and return the finished Draft.

        If ``on_text`` is given, it receives text chunks as they stream in —
        useful for live terminal output. The full text is always returned in the
        Draft regardless.
        """
        spec = self._resolve_task(task)
        user_turn = spec.build_user(
            text, tone=tone, audience=audience, words=words
        )

        # Stream so long outputs don't trip request timeouts; adaptive thinking
        # lets the model decide how much to reason about voice and structure.
        with self._client.messages.stream(
            model=self.model,
            max_tokens=self.max_tokens,
            thinking={"type": "adaptive"},
            system=spec.system,
            messages=[{"role": "user", "content": user_turn}],
        ) as stream:
            for chunk in stream.text_stream:
                if on_text is not None:
                    on_text(chunk)
            final = stream.get_final_message()

        body = "".join(
            block.text for block in final.content if block.type == "text"
        )
        return Draft(
            text=body,
            task=spec.name,
            model=final.model,
            input_tokens=final.usage.input_tokens,
            output_tokens=final.usage.output_tokens,
        )

    @staticmethod
    def _resolve_task(task: str) -> Task:
        try:
            return TASKS[task]
        except KeyError:
            valid = ", ".join(sorted(TASKS))
            raise ValueError(
                f"Unknown task {task!r}. Valid tasks: {valid}."
            ) from None

    @staticmethod
    def tasks() -> Iterator[Task]:
        """Yield the available tasks, for help text and discovery."""
        yield from TASKS.values()
