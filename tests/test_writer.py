"""Tests for GhostWriter using a fake Anthropic client (no network, no key)."""

from __future__ import annotations

from contextlib import contextmanager
from types import SimpleNamespace

import pytest

from ghostwriter.writer import GhostWriter


class _FakeStream:
    def __init__(self, chunks, final):
        self._chunks = chunks
        self._final = final

    @property
    def text_stream(self):
        yield from self._chunks

    def get_final_message(self):
        return self._final


class _FakeMessages:
    def __init__(self, chunks, final):
        self._chunks = chunks
        self._final = final
        self.captured = {}

    @contextmanager
    def stream(self, **kwargs):
        self.captured = kwargs
        yield _FakeStream(self._chunks, self._final)


class _FakeClient:
    def __init__(self, chunks, final):
        self.messages = _FakeMessages(chunks, final)


def _final_message(text):
    return SimpleNamespace(
        content=[SimpleNamespace(type="text", text=text)],
        model="claude-opus-4-8",
        usage=SimpleNamespace(input_tokens=12, output_tokens=34),
    )


def test_write_assembles_draft_and_streams():
    client = _FakeClient(["Hello ", "world"], _final_message("Hello world"))
    writer = GhostWriter(client=client)

    seen = []
    draft = writer.write("draft", "A greeting", on_text=seen.append)

    assert draft.text == "Hello world"
    assert draft.task == "draft"
    assert draft.model == "claude-opus-4-8"
    assert draft.input_tokens == 12
    assert draft.output_tokens == 34
    assert seen == ["Hello ", "world"]


def test_write_passes_adaptive_thinking_and_system_prompt():
    client = _FakeClient(["x"], _final_message("x"))
    writer = GhostWriter(client=client)
    writer.write("rewrite", "some text")

    captured = client.messages.captured
    assert captured["thinking"] == {"type": "adaptive"}
    assert captured["model"] == "claude-opus-4-8"
    assert "ghost writer" in captured["system"].lower()


def test_unknown_task_raises():
    client = _FakeClient(["x"], _final_message("x"))
    writer = GhostWriter(client=client)
    with pytest.raises(ValueError, match="Unknown task"):
        writer.write("translate", "hola")
