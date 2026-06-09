"""Configuration for the Kit (ConvertKit) MCP server."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Mapping

# Kit V4 API base URL. All endpoints live under this prefix.
DEFAULT_BASE_URL = "https://api.kit.com/v4"


class ConfigError(RuntimeError):
    """Raised when required configuration is missing or invalid."""


def _parse_bool(value: str | None) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Config:
    """Runtime configuration, normally loaded from environment variables."""

    api_key: str
    base_url: str = DEFAULT_BASE_URL
    # When False (the default), send_broadcast refuses to actually send unless
    # the caller passes confirm=True. When True, sends go out unattended.
    auto_send: bool = False
    request_timeout: float = 30.0

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "Config":
        env = env if env is not None else os.environ

        api_key = env.get("KIT_API_KEY", "").strip()
        if not api_key:
            raise ConfigError(
                "KIT_API_KEY is required. Create a V4 API key in your Kit "
                "account under Settings → Developer, then export it as "
                "KIT_API_KEY."
            )

        base_url = env.get("KIT_BASE_URL", DEFAULT_BASE_URL).rstrip("/")

        try:
            timeout = float(env.get("KIT_REQUEST_TIMEOUT", "30"))
        except ValueError as exc:  # pragma: no cover - defensive
            raise ConfigError("KIT_REQUEST_TIMEOUT must be a number") from exc

        return cls(
            api_key=api_key,
            base_url=base_url,
            auto_send=_parse_bool(env.get("KIT_AUTO_SEND", "false")),
            request_timeout=timeout,
        )
