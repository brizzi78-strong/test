"""Kit (ConvertKit) MCP server — automate email broadcasts from Claude."""

from .config import Config, ConfigError
from .client import KitClient, KitError

__all__ = ["Config", "ConfigError", "KitClient", "KitError"]
__version__ = "0.1.0"
