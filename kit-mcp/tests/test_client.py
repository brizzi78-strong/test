import httpx
import pytest

from kit_mcp.client import KitClient, KitError
from kit_mcp.config import Config


def make_client(handler):
    """Build a KitClient backed by an in-memory transport (no network)."""
    cfg = Config(api_key="kit_test", base_url="https://api.kit.com/v4")
    transport = httpx.MockTransport(handler)
    http = httpx.Client(
        base_url=cfg.base_url,
        headers={"X-Kit-Api-Key": cfg.api_key},
        transport=transport,
    )
    return KitClient(cfg, http_client=http)


def test_get_account_sends_api_key_header():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["path"] = request.url.path
        captured["key"] = request.headers.get("X-Kit-Api-Key")
        return httpx.Response(200, json={"account": {"name": "Rob"}})

    client = make_client(handler)
    result = client.get_account()

    assert captured["path"] == "/v4/account"
    assert captured["key"] == "kit_test"
    assert result["account"]["name"] == "Rob"


def test_create_broadcast_posts_fields():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        captured["path"] = request.url.path
        captured["body"] = request.read().decode()
        return httpx.Response(201, json={"broadcast": {"id": 99}})

    client = make_client(handler)
    out = client.create_broadcast({"subject": "Hi", "content": "<p>Hello</p>"})

    assert captured["method"] == "POST"
    assert captured["path"] == "/v4/broadcasts"
    assert "Hello" in captured["body"]
    assert out["broadcast"]["id"] == 99


def test_update_broadcast_targets_id():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "PUT"
        assert request.url.path == "/v4/broadcasts/42"
        return httpx.Response(200, json={"broadcast": {"id": 42, "public": True}})

    client = make_client(handler)
    out = client.update_broadcast(42, {"public": True, "send_at": "2026-06-10T00:00:00Z"})
    assert out["broadcast"]["public"] is True


def test_list_broadcasts_passes_pagination_params():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["query"] = dict(request.url.params)
        return httpx.Response(200, json={"broadcasts": []})

    client = make_client(handler)
    client.list_broadcasts(per_page=5, cursor="abc")
    assert captured["query"] == {"per_page": "5", "after": "abc"}


def test_error_response_raises_kit_error_with_messages():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(422, json={"errors": ["subject is required"]})

    client = make_client(handler)
    with pytest.raises(KitError) as exc:
        client.create_broadcast({"content": "x"})

    assert exc.value.status_code == 422
    assert "subject is required" in str(exc.value)


def test_empty_body_returns_empty_dict():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(204)

    client = make_client(handler)
    assert client.delete_broadcast(7) == {}
