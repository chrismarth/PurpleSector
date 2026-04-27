"""Agent tools for Event CRUD."""

from __future__ import annotations

from datetime import datetime

from apps.events.models import Event

from . import ToolDefinition, ToolContext, ToolResult, register_tools

# ── Definitions ──────────────────────────────────────────────────────────

definitions = [
    ToolDefinition(
        name="listEvents",
        description="List all events for the current user, ordered by creation date descending.",
        input_schema={"type": "object", "properties": {}},
        category="events",
    ),
    ToolDefinition(
        name="getEvent",
        description="Get details of a specific event by ID, including session count.",
        input_schema={
            "type": "object",
            "properties": {
                "eventId": {"type": "string", "description": "The event ID"},
            },
            "required": ["eventId"],
        },
        category="events",
    ),
    ToolDefinition(
        name="createEvent",
        description="Create a new event (race weekend, track day, etc.).",
        input_schema={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Event name"},
                "description": {"type": "string", "description": "Optional description"},
                "location": {"type": "string", "description": "Track or venue name"},
                "startDate": {"type": "string", "description": "ISO date string for event start"},
                "endDate": {"type": "string", "description": "ISO date string for event end"},
            },
            "required": ["name"],
        },
        category="events",
        mutating=True,
    ),
    ToolDefinition(
        name="updateEvent",
        description="Update an existing event.",
        input_schema={
            "type": "object",
            "properties": {
                "eventId": {"type": "string", "description": "The event ID to update"},
                "name": {"type": "string"},
                "description": {"type": "string"},
                "location": {"type": "string"},
                "startDate": {"type": "string"},
                "endDate": {"type": "string"},
            },
            "required": ["eventId"],
        },
        category="events",
        mutating=True,
    ),
    ToolDefinition(
        name="deleteEvent",
        description="Delete an event and all its sessions/laps.",
        input_schema={
            "type": "object",
            "properties": {
                "eventId": {"type": "string", "description": "The event ID to delete"},
            },
            "required": ["eventId"],
        },
        category="events",
        mutating=True,
    ),
]

# ── Handlers ─────────────────────────────────────────────────────────────


def _serialize_event(e: Event, session_count: int | None = None) -> dict:
    d = {
        "id": str(e.id),
        "name": e.name,
        "description": e.description,
        "location": e.location,
        "startDate": e.start_date.isoformat() if e.start_date else None,
        "endDate": e.end_date.isoformat() if e.end_date else None,
        "createdAt": e.created_at.isoformat(),
    }
    if session_count is not None:
        d["_count"] = {"sessions": session_count}
    return d


async def list_events(args: dict, ctx: ToolContext) -> ToolResult:
    from django.db.models import Count

    events = (
        Event.objects.filter(user_id=ctx.user_id)
        .annotate(session_count=Count("sessions"))
        .order_by("-created_at")
    )
    data = [_serialize_event(e, e.session_count) for e in events]
    return ToolResult(success=True, data=data, message=f"Found {len(data)} events.")


async def get_event(args: dict, ctx: ToolContext) -> ToolResult:
    from django.db.models import Count

    try:
        event = (
            Event.objects.filter(id=args["eventId"], user_id=ctx.user_id)
            .annotate(session_count=Count("sessions"))
            .get()
        )
    except Event.DoesNotExist:
        return ToolResult(success=False, message="Event not found.")
    sessions = list(
        event.sessions.values("id", "name", "status", "created_at").order_by("-created_at")
    )
    d = _serialize_event(event, event.session_count)
    d["sessions"] = [{**s, "id": str(s["id"]), "createdAt": s["created_at"].isoformat()} for s in sessions]
    return ToolResult(success=True, data=d)


async def create_event(args: dict, ctx: ToolContext) -> ToolResult:
    event = Event.objects.create(
        user_id=ctx.user_id,
        name=args["name"],
        description=args.get("description") or None,
        location=args.get("location") or None,
        start_date=datetime.fromisoformat(args["startDate"]) if args.get("startDate") else None,
        end_date=datetime.fromisoformat(args["endDate"]) if args.get("endDate") else None,
    )
    return ToolResult(success=True, data=_serialize_event(event), message=f'Created event "{event.name}".')


async def update_event(args: dict, ctx: ToolContext) -> ToolResult:
    try:
        event = Event.objects.get(id=args["eventId"], user_id=ctx.user_id)
    except Event.DoesNotExist:
        return ToolResult(success=False, message="Event not found.")

    if "name" in args:
        event.name = args["name"]
    if "description" in args:
        event.description = args["description"]
    if "location" in args:
        event.location = args["location"]
    if "startDate" in args:
        event.start_date = datetime.fromisoformat(args["startDate"])
    if "endDate" in args:
        event.end_date = datetime.fromisoformat(args["endDate"])
    event.save()
    return ToolResult(success=True, data=_serialize_event(event), message=f'Updated event "{event.name}".')


async def delete_event(args: dict, ctx: ToolContext) -> ToolResult:
    try:
        event = Event.objects.get(id=args["eventId"], user_id=ctx.user_id)
    except Event.DoesNotExist:
        return ToolResult(success=False, message="Event not found.")
    name = event.name
    event.delete()
    return ToolResult(success=True, message=f'Deleted event "{name}".')


handlers = {
    "listEvents": list_events,
    "getEvent": get_event,
    "createEvent": create_event,
    "updateEvent": update_event,
    "deleteEvent": delete_event,
}

register_tools(definitions, handlers)
