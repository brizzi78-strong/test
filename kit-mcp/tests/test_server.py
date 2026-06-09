"""Tests for the send-safety guard and draft tools.

These exercise the tool functions directly with a fake client injected, so no
network and no real Kit account are involved.
"""

import pytest

import kit_mcp.server as srv
from kit_mcp.config import Config


class FakeClient:
    def __init__(self):
        self.updated = None
        self.created = None

    def get_broadcast(self, broadcast_id):
        return {"id": broadcast_id, "subject": "Draft subject"}

    def create_broadcast(self, fields):
        self.created = dict(fields)
        return {"id": 1, **self.created}

    def update_broadcast(self, broadcast_id, fields):
        self.updated = (broadcast_id, dict(fields))
        return {"id": broadcast_id, **fields}


@pytest.fixture
def fake(monkeypatch):
    client = FakeClient()

    def configure(auto_send=False):
        monkeypatch.setattr(srv, "_config", lambda: Config(api_key="k", auto_send=auto_send))
        monkeypatch.setattr(srv, "_client", lambda: client)
        return client

    return configure


def test_send_refused_without_confirm_or_autosend(fake):
    client = fake(auto_send=False)
    result = srv.send_broadcast(5)
    assert "REFUSED" in result
    assert client.updated is None          # nothing was sent


def test_send_proceeds_with_explicit_confirm(fake):
    client = fake(auto_send=False)
    result = srv.send_broadcast(5, confirm=True)
    assert client.updated is not None
    broadcast_id, fields = client.updated
    assert broadcast_id == 5
    assert fields["public"] is True
    assert fields["send_at"]               # immediate send time filled in
    assert "sent" in result


def test_send_proceeds_when_autosend_enabled(fake):
    client = fake(auto_send=True)
    srv.send_broadcast(9)
    assert client.updated is not None
    assert client.updated[0] == 9


def test_scheduled_send_uses_given_time(fake):
    client = fake(auto_send=True)
    result = srv.send_broadcast(3, send_at="2026-12-25T09:00:00Z")
    assert client.updated[1]["send_at"] == "2026-12-25T09:00:00Z"
    assert "scheduled" in result


def test_draft_broadcast_is_never_published(fake):
    client = fake(auto_send=True)   # even with auto-send on, drafting stays a draft
    srv.draft_broadcast("Subject", "<p>Body</p>")
    assert client.created["public"] is False
    assert client.created["send_at"] is None


def test_edit_with_no_fields_is_a_noop(fake):
    client = fake()
    result = srv.edit_broadcast(1)
    assert "Nothing to change" in result
    assert client.updated is None
