"""Agent tools for system/context queries."""

from __future__ import annotations

from . import ToolDefinition, ToolContext, ToolResult, register_tools

definitions = [
    ToolDefinition(
        name="getCurrentContext",
        description="Get the current application context — what page the user is on, which event/session/lap is selected.",
        input_schema={"type": "object", "properties": {}},
        category="system",
    ),
]


async def get_current_context(args: dict, ctx: ToolContext) -> ToolResult:
    return ToolResult(
        success=True,
        data=ctx.app_context or {"page": "unknown"},
        message=f'User is on page "{ctx.app_context["page"]}".' if ctx.app_context else "No application context available.",
    )


handlers = {
    "getCurrentContext": get_current_context,
}

register_tools(definitions, handlers)
