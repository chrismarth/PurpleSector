"""Agent tools for saved analysis layouts."""

from __future__ import annotations

import json

from apps.analysis.models import SavedAnalysisLayout

from . import ToolDefinition, ToolContext, ToolResult, register_tools

definitions = [
    ToolDefinition(
        name="getAnalysisLayout",
        description="Get the current analysis panel layout for a given context (e.g. a session or lap).",
        input_schema={
            "type": "object",
            "properties": {
                "context": {"type": "string", "description": 'Layout context string, e.g. "global", "session:<id>", "lap:<id>"'},
            },
            "required": ["context"],
        },
        category="analysis",
    ),
    ToolDefinition(
        name="listSavedAnalysisLayouts",
        description="List all saved analysis layouts for the current user.",
        input_schema={"type": "object", "properties": {}},
        category="analysis",
    ),
    ToolDefinition(
        name="saveAnalysisLayout",
        description="Save the current analysis layout with a name.",
        input_schema={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Layout name"},
                "description": {"type": "string"},
                "layout": {"type": "string", "description": "JSON string of the AnalysisLayoutJSON"},
                "context": {"type": "string", "description": 'Layout context (default: "global")'},
                "isDefault": {"type": "boolean", "description": "Whether this should be the default layout for the context"},
            },
            "required": ["name", "layout"],
        },
        category="analysis",
        mutating=True,
    ),
]


async def get_analysis_layout(args: dict, ctx: ToolContext) -> ToolResult:
    layout = (
        SavedAnalysisLayout.objects.filter(user_id=ctx.user_id, context=args["context"], is_default=True)
        .first()
    )
    if not layout:
        return ToolResult(success=True, data=None, message="No saved layout found for this context. The app uses a default layout.")
    try:
        parsed = json.loads(layout.layout)
    except (json.JSONDecodeError, TypeError):
        parsed = layout.layout
    return ToolResult(
        success=True,
        data={"id": str(layout.id), "name": layout.name, "description": layout.description, "layout": parsed, "context": layout.context},
    )


async def list_saved_analysis_layouts(args: dict, ctx: ToolContext) -> ToolResult:
    layouts = SavedAnalysisLayout.objects.filter(user_id=ctx.user_id).order_by("-created_at")
    data = [
        {
            "id": str(l.id),
            "name": l.name,
            "description": l.description,
            "context": l.context,
            "isDefault": l.is_default,
            "createdAt": l.created_at.isoformat(),
        }
        for l in layouts
    ]
    return ToolResult(success=True, data=data, message=f"Found {len(data)} saved layouts.")


async def save_analysis_layout(args: dict, ctx: ToolContext) -> ToolResult:
    context = args.get("context") or "global"
    is_default = args.get("isDefault", False)

    if is_default:
        SavedAnalysisLayout.objects.filter(user_id=ctx.user_id, context=context, is_default=True).update(is_default=False)

    layout = SavedAnalysisLayout.objects.create(
        user_id=ctx.user_id,
        name=args["name"],
        description=args.get("description") or None,
        layout=args["layout"],
        context=context,
        is_default=is_default,
    )
    return ToolResult(success=True, data={"id": str(layout.id), "name": layout.name}, message=f'Saved layout "{layout.name}".')


handlers = {
    "getAnalysisLayout": get_analysis_layout,
    "listSavedAnalysisLayouts": list_saved_analysis_layouts,
    "saveAnalysisLayout": save_analysis_layout,
}

register_tools(definitions, handlers)
