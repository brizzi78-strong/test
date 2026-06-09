"""MCP server exposing Kit (ConvertKit) email broadcasts to Claude.

Tools:
  - verify_connection      sanity-check the API key
  - list_broadcasts        recent broadcasts (drafts + sent)
  - get_broadcast          full content of one broadcast
  - draft_broadcast        create a NEW draft (never sent)
  - edit_broadcast         edit subject/content of an existing draft
  - send_broadcast         send or schedule a broadcast  (GUARDED)
  - broadcast_stats        open/click stats for a sent broadcast
  - list_subscribers       page through your subscriber list
  - list_tags              your tags (for targeting)

Safety model: drafting and editing are always free. Actually pushing mail to
your subscribers (send_broadcast) is the one irreversible step, so it is
guarded — it refuses unless KIT_AUTO_SEND=true or the call passes confirm=True.
"""

from __future__ import annotations

import datetime as _dt
import json
from functools import lru_cache
from typing import Any

from mcp.server.fastmcp import FastMCP

from .client import KitClient
from .config import Config

mcp = FastMCP("kit-email")


@lru_cache(maxsize=1)
def _config() -> Config:
    return Config.from_env()


@lru_cache(maxsize=1)
def _client() -> KitClient:
    return KitClient(_config())


def _pretty(data: Any) -> str:
    return json.dumps(data, indent=2, ensure_ascii=False)


def _now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat()


@mcp.tool()
def verify_connection() -> str:
    """Confirm the API key works by returning the connected Kit account."""
    return _pretty(_client().get_account())


@mcp.tool()
def list_broadcasts(per_page: int = 20) -> str:
    """List recent broadcasts (both drafts and already-sent)."""
    return _pretty(_client().list_broadcasts(per_page=per_page))


@mcp.tool()
def get_broadcast(broadcast_id: int) -> str:
    """Get the full content and metadata of a single broadcast."""
    return _pretty(_client().get_broadcast(broadcast_id))


@mcp.tool()
def draft_broadcast(subject: str, content: str,
                    description: str | None = None) -> str:
    """Create a NEW broadcast as a draft. It is never sent by this tool.

    Args:
        subject: The email subject line.
        content: The email body. HTML is supported.
        description: Optional internal label shown in the Kit dashboard.
    """
    fields: dict[str, Any] = {
        "subject": subject,
        "content": content,
        "public": False,   # draft, not published
        "send_at": None,    # explicitly unscheduled
    }
    if description:
        fields["description"] = description
    return _pretty(_client().create_broadcast(fields))


@mcp.tool()
def edit_broadcast(broadcast_id: int, subject: str | None = None,
                   content: str | None = None,
                   description: str | None = None) -> str:
    """Edit the subject, content, or description of an existing draft broadcast.

    Only the fields you pass are changed.
    """
    fields: dict[str, Any] = {}
    if subject is not None:
        fields["subject"] = subject
    if content is not None:
        fields["content"] = content
    if description is not None:
        fields["description"] = description
    if not fields:
        return "Nothing to change: pass at least one of subject, content, description."
    return _pretty(_client().update_broadcast(broadcast_id, fields))


@mcp.tool()
def send_broadcast(broadcast_id: int, send_at: str | None = None,
                   confirm: bool = False) -> str:
    """Send or schedule a broadcast to your subscribers. IRREVERSIBLE.

    Args:
        broadcast_id: The broadcast to send.
        send_at: ISO-8601 time to schedule (e.g. "2026-06-10T14:00:00Z").
            Omit to send immediately.
        confirm: Must be True to actually send when KIT_AUTO_SEND is not enabled.

    When auto-send is disabled and confirm is False, this returns a preview and
    sends nothing.
    """
    client = _client()
    if not (_config().auto_send or confirm):
        preview = client.get_broadcast(broadcast_id)
        return (
            "REFUSED — sending is guarded.\n"
            "Review the broadcast below, then call again with confirm=true "
            "(or set KIT_AUTO_SEND=true for unattended sending).\n\n"
            + _pretty(preview)
        )

    when = send_at or _now_iso()
    result = client.update_broadcast(
        broadcast_id, {"public": True, "send_at": when}
    )
    verb = "scheduled" if send_at else "sent"
    return f"Broadcast {broadcast_id} {verb} (send_at={when}).\n\n" + _pretty(result)


@mcp.tool()
def broadcast_stats(broadcast_id: int) -> str:
    """Get open/click statistics for a sent broadcast."""
    return _pretty(_client().get_broadcast_stats(broadcast_id))


@mcp.tool()
def list_subscribers(per_page: int = 50) -> str:
    """Page through your subscriber list."""
    return _pretty(_client().list_subscribers(per_page=per_page))


@mcp.tool()
def list_tags() -> str:
    """List your tags, useful for targeting future broadcasts."""
    return _pretty(_client().list_tags())


def main() -> None:
    """Entry point for `python -m kit_mcp` / the `kit-mcp` console script."""
    mcp.run()


if __name__ == "__main__":
    main()
