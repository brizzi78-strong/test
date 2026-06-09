import pytest

from kit_mcp.config import DEFAULT_BASE_URL, Config, ConfigError


def test_from_env_requires_api_key():
    with pytest.raises(ConfigError):
        Config.from_env({})


def test_from_env_defaults():
    cfg = Config.from_env({"KIT_API_KEY": "kit_abc"})
    assert cfg.api_key == "kit_abc"
    assert cfg.base_url == DEFAULT_BASE_URL
    assert cfg.auto_send is False        # safe by default
    assert cfg.request_timeout == 30.0


@pytest.mark.parametrize("value,expected", [
    ("true", True), ("True", True), ("1", True), ("yes", True), ("on", True),
    ("false", False), ("0", False), ("no", False), ("", False), ("nope", False),
])
def test_auto_send_parsing(value, expected):
    cfg = Config.from_env({"KIT_API_KEY": "k", "KIT_AUTO_SEND": value})
    assert cfg.auto_send is expected


def test_base_url_trailing_slash_stripped():
    cfg = Config.from_env({"KIT_API_KEY": "k", "KIT_BASE_URL": "https://x/v4/"})
    assert cfg.base_url == "https://x/v4"


def test_whitespace_only_api_key_is_rejected():
    with pytest.raises(ConfigError):
        Config.from_env({"KIT_API_KEY": "   "})
