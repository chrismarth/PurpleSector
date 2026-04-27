"""
Agent tool definitions and handlers.

Each tool has a definition (JSON Schema for LangChain) and a handler function
that receives (args, context) and returns a ToolResult dict.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Awaitable


@dataclass
class ToolDefinition:
    name: str
    description: str
    input_schema: dict[str, Any]
    category: str
    mutating: bool = False


@dataclass
class ToolContext:
    user_id: str
    app_context: dict[str, Any] | None = None


@dataclass
class ToolResult:
    success: bool
    message: str = ""
    data: Any = None


# Type alias for handler functions
ToolHandler = Callable[[dict[str, Any], ToolContext], Awaitable[ToolResult]]


# ── Registry ─────────────────────────────────────────────────────────────

_definitions: list[ToolDefinition] = []
_handlers: dict[str, ToolHandler] = {}


def register_tools(
    definitions: list[ToolDefinition],
    handlers: dict[str, ToolHandler],
) -> None:
    _definitions.extend(definitions)
    _handlers.update(handlers)


def get_all_definitions() -> list[ToolDefinition]:
    return list(_definitions)


def get_all_handlers() -> dict[str, ToolHandler]:
    return dict(_handlers)


def get_mutating_tool_names() -> list[str]:
    return [d.name for d in _definitions if d.mutating]


# ── Auto-register all tool modules on import ──

from . import events, sessions, laps, vehicles, analysis, run_plans, lap_analysis, system  # noqa: E402, F401
