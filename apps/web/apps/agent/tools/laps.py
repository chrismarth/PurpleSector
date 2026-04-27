"""Agent tools for Lap queries."""

from __future__ import annotations

from apps.telemetry.models import Lap
from apps.events.models import Session

from . import ToolDefinition, ToolContext, ToolResult, register_tools

definitions = [
    ToolDefinition(
        name="listLaps",
        description="List all laps for a session, ordered by lap number.",
        input_schema={
            "type": "object",
            "properties": {
                "sessionId": {"type": "string", "description": "The session ID"},
            },
            "required": ["sessionId"],
        },
        category="laps",
    ),
    ToolDefinition(
        name="getLap",
        description="Get details of a specific lap by ID (without full telemetry data).",
        input_schema={
            "type": "object",
            "properties": {
                "lapId": {"type": "string", "description": "The lap ID"},
            },
            "required": ["lapId"],
        },
        category="laps",
    ),
    ToolDefinition(
        name="getLapTelemetry",
        description="Get the full telemetry data for a specific lap.",
        input_schema={
            "type": "object",
            "properties": {
                "lapId": {"type": "string", "description": "The lap ID"},
            },
            "required": ["lapId"],
        },
        category="laps",
    ),
]


async def list_laps(args: dict, ctx: ToolContext) -> ToolResult:
    if not Session.objects.filter(id=args["sessionId"], user_id=ctx.user_id).exists():
        return ToolResult(success=False, message="Session not found.")
    laps = Lap.objects.filter(session_id=args["sessionId"]).order_by("lap_number")
    data = [
        {
            "id": str(lap.id),
            "lapNumber": lap.lap_number,
            "lapTime": lap.lap_time,
            "analyzed": lap.analyzed,
            "tags": lap.tags,
            "createdAt": lap.created_at.isoformat(),
        }
        for lap in laps
    ]
    return ToolResult(success=True, data=data, message=f"Found {len(data)} laps.")


async def get_lap(args: dict, ctx: ToolContext) -> ToolResult:
    try:
        lap = Lap.objects.select_related("session").get(id=args["lapId"])
    except Lap.DoesNotExist:
        return ToolResult(success=False, message="Lap not found.")
    return ToolResult(
        success=True,
        data={
            "id": str(lap.id),
            "lapNumber": lap.lap_number,
            "lapTime": lap.lap_time,
            "analyzed": lap.analyzed,
            "suggestions": lap.suggestions,
            "driverComments": lap.driver_comments,
            "tags": lap.tags,
            "createdAt": lap.created_at.isoformat(),
            "session": {
                "id": str(lap.session.id),
                "name": lap.session.name,
                "eventId": str(lap.session.event_id),
            },
        },
    )


async def get_lap_telemetry(args: dict, ctx: ToolContext) -> ToolResult:
    if not Lap.objects.filter(id=args["lapId"]).exists():
        return ToolResult(success=False, message="Lap not found.")
    return ToolResult(
        success=False,
        message="Lap telemetry frames are stored in Iceberg and are not available via this tool yet.",
    )


handlers = {
    "listLaps": list_laps,
    "getLap": get_lap,
    "getLapTelemetry": get_lap_telemetry,
}

register_tools(definitions, handlers)
