"""Thin HTTP client around the Kit (ConvertKit) V4 API.

Only the pieces needed to read, draft, edit, and send broadcasts (plus a few
subscriber/tag helpers) are wrapped. The client is deliberately small and
pass-through: create/update accept arbitrary fields so it keeps working as the
Kit API evolves.
"""

from __future__ import annotations

from typing import Any, Mapping

import httpx

from .config import Config


class KitError(RuntimeError):
    """Raised when the Kit API returns an error response."""

    def __init__(self, status_code: int, message: str, payload: Any = None):
        super().__init__(f"Kit API error {status_code}: {message}")
        self.status_code = status_code
        self.payload = payload


class KitClient:
    """Synchronous client for the Kit V4 API."""

    def __init__(self, config: Config, http_client: httpx.Client | None = None):
        self._config = config
        self._client = http_client or httpx.Client(
            base_url=config.base_url,
            timeout=config.request_timeout,
            headers={
                "X-Kit-Api-Key": config.api_key,
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        )

    def close(self) -> None:
        self._client.close()

    # -- core -----------------------------------------------------------------

    def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        response = self._client.request(method, path, **kwargs)
        if response.status_code >= 400:
            message = response.text
            payload: Any = None
            try:
                payload = response.json()
                # Kit returns {"errors": [...]} on failure.
                if isinstance(payload, dict) and payload.get("errors"):
                    message = "; ".join(str(e) for e in payload["errors"])
            except ValueError:
                pass
            raise KitError(response.status_code, message, payload)

        if not response.content:
            return {}
        return response.json()

    # -- account --------------------------------------------------------------

    def get_account(self) -> dict[str, Any]:
        """Return the authenticated account — handy for verifying the API key."""
        return self._request("GET", "/account")

    # -- broadcasts -----------------------------------------------------------

    def list_broadcasts(self, per_page: int | None = None,
                        cursor: str | None = None) -> dict[str, Any]:
        params: dict[str, Any] = {}
        if per_page is not None:
            params["per_page"] = per_page
        if cursor is not None:
            params["after"] = cursor
        return self._request("GET", "/broadcasts", params=params)

    def get_broadcast(self, broadcast_id: int) -> dict[str, Any]:
        return self._request("GET", f"/broadcasts/{broadcast_id}")

    def create_broadcast(self, fields: Mapping[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/broadcasts", json=dict(fields))

    def update_broadcast(self, broadcast_id: int,
                         fields: Mapping[str, Any]) -> dict[str, Any]:
        return self._request("PUT", f"/broadcasts/{broadcast_id}", json=dict(fields))

    def delete_broadcast(self, broadcast_id: int) -> dict[str, Any]:
        return self._request("DELETE", f"/broadcasts/{broadcast_id}")

    def get_broadcast_stats(self, broadcast_id: int) -> dict[str, Any]:
        return self._request("GET", f"/broadcasts/{broadcast_id}/stats")

    # -- subscribers & tags ---------------------------------------------------

    def list_subscribers(self, per_page: int | None = None,
                         cursor: str | None = None) -> dict[str, Any]:
        params: dict[str, Any] = {}
        if per_page is not None:
            params["per_page"] = per_page
        if cursor is not None:
            params["after"] = cursor
        return self._request("GET", "/subscribers", params=params)

    def list_tags(self) -> dict[str, Any]:
        return self._request("GET", "/tags")
