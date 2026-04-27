"""Agent tools for Session CRUD."""

from __future__ import annotations

from apps.events.models import Event, Session

from . import ToolDefinition, ToolContext, ToolResult, register_tools

definitions = [
    ToolDefinition(
        name="listSessions",
        description="List all sessions, optionally filtered by event ID.",
        input_schema={
            "type": "object",
            "properties": {
                "eventId": {"type": "string", "description": "Optional event ID to filter by"},
            },
        },
        category="sessions",
    ),
    ToolDefinition(
        name="getSession",
        description="Get details of a specific session by ID, including lap count.",
        input_schema={
            "type": "object",
            "properties": {
                "sessionId": {"type": "string", "description": "The session ID"},
            },
            "required": ["sessionId"],
        },
        category="sessions",
    ),
    ToolDefinition(
        name="createSession",
        description="Create a new session within an event.",
        input_schema={
            "type": "object",
            "properties": {
                "eventId": {"type": "string", "description": "The event ID to create the session in"},
                "name": {"type": "string", "description": 'Session name (e.g. "Practice 1", "Qualifying")'},
                "source": {"type": "string", "description": 'Data source: "live" or "demo"'},
                "vehicleId": {"type": "string", "description": "Optional vehicle ID"},
                "vehicleConfigurationId": {"type": "string", "description": "Optional vehicle configuration ID"},
                "vehicleSetupId": {"type": "string", "description": "Optional vehicle setup ID"},
            },
            "required": ["eventId", "name", "source"],
        },
        category="sessions",
        mutating=True,
    ),
    ToolDefinition(
        name="updateSession",
        description="Update an existing session (name, status, vehicle assignment, etc.).",
        input_schema={
            "type": "object",
            "properties": {
                "sessionId": {"type": "string", "description": "The session ID to update"},
                "name": {"type": "string"},
                "status": {"type": "string", "description": '"active" | "paused" | "archived"'},
                "vehicleId": {"type": "string"},
                "vehicleConfigurationId": {"type": "string"},
                "vehicleSetupId": {"type": "string"},
            },
            "required": ["sessionId"],
        },
        category="sessions",
        mutating=True,
    ),
    ToolDefinition(
        name="deleteSession",
        description="Delete a session and all its laps.",
        input_schema={
            "type": "object",
            "properties": {
                "sessionId": {"type": "string", "description": "The session ID to delete"},
            },
            "required": ["sessionId"],
        },
        category="sessions",
        mutating=True,
    ),
]


def _serialize_session(s: Session, lap_count: int | None = None) -> dict:
    d = {
        "id": str(s.id),
        "name": s.name,
        "source": s.source,
        "status": s.status,
        "started": s.started,
        "eventId": str(s.event_id),
        "vehicleId": str(s.vehicle_id) if s.vehicle_id else None,
        "vehicleConfigurationId": str(s.vehicle_configuration_id) if s.vehicle_configuration_id else None,
        "vehicleSetupId": str(s.vehicle_setup_id) if s.vehicle_setup_id else None,
        "createdAt": s.created_at.isoformat(),
    }
    if lap_count is not None:
        d["_count"] = {"laps": lap_count}
    return d


async def list_sessions(args: dict, ctx: ToolContext) -> ToolResult:
    from django.db.models import Count

    qs = Session.objects.filter(user_id=ctx.user_id).annotate(lap_count=Count("laps"))
    if args.get("eventId"):
        qs = qs.filter(event_id=args["eventId"])
    sessions = qs.order_by("-created_at")
    data = [_serialize_session(s, s.lap_count) for s in sessions]
    return ToolResult(success=True, data=data, message=f"Found {len(data)} sessions.")


async def get_session(args: dict, ctx: ToolContext) -> ToolResult:
    from django.db.models import Count

    try:
        session = (
            Session.objects.filter(id=args["sessionId"], user_id=ctx.user_id)
            .annotate(lap_count=Count("laps"))
            .select_related("event", "vehicle", "vehicle_configuration", "vehicle_setup")
            .get()
        )
    except Session.DoesNotExist:
        return ToolResult(success=False, message="Session not found.")
    d = _serialize_session(session, session.lap_count)
    d["event"] = {"id": str(session.event.id), "name": session.event.name}
    if session.vehicle:
        d["vehicle"] = {"id": str(session.vehicle.id), "name": session.vehicle.name}
    if session.vehicle_configuration:
        d["vehicleConfiguration"] = {"id": str(session.vehicle_configuration.id), "name": session.vehicle_configuration.name}
    if session.vehicle_setup:
        d["vehicleSetup"] = {"id": str(session.vehicle_setup.id), "name": session.vehicle_setup.name}
    return ToolResult(success=True, data=d)


async def create_session(args: dict, ctx: ToolContext) -> ToolResult:
    if not Event.objects.filter(id=args["eventId"], user_id=ctx.user_id).exists():
        return ToolResult(success=False, message="Event not found.")
    session = Session.objects.create(
        user_id=ctx.user_id,
        event_id=args["eventId"],
        name=args["name"],
        source=args["source"],
        status="active",
        started=True,
        vehicle_id=args.get("vehicleId") or None,
        vehicle_configuration_id=args.get("vehicleConfigurationId") or None,
        vehicle_setup_id=args.get("vehicleSetupId") or None,
    )
    return ToolResult(success=True, data=_serialize_session(session), message=f'Created session "{session.name}".')


async def update_session(args: dict, ctx: ToolContext) -> ToolResult:
    try:
        session = Session.objects.get(id=args["sessionId"], user_id=ctx.user_id)
    except Session.DoesNotExist:
        return ToolResult(success=False, message="Session not found.")

    for field in ("name", "status"):
        if field in args:
            setattr(session, field, args[field])
    for fk_field, attr in [("vehicleId", "vehicle_id"), ("vehicleConfigurationId", "vehicle_configuration_id"), ("vehicleSetupId", "vehicle_setup_id")]:
        if fk_field in args:
            setattr(session, attr, args[fk_field] or None)
    session.save()
    return ToolResult(success=True, data=_serialize_session(session), message=f'Updated session "{session.name}".')


async def delete_session(args: dict, ctx: ToolContext) -> ToolResult:
    try:
        session = Session.objects.get(id=args["sessionId"], user_id=ctx.user_id)
    except Session.DoesNotExist:
        return ToolResult(success=False, message="Session not found.")
    name = session.name
    session.delete()
    return ToolResult(success=True, message=f'Deleted session "{name}".')


handlers = {
    "listSessions": list_sessions,
    "getSession": get_session,
    "createSession": create_session,
    "updateSession": update_session,
    "deleteSession": delete_session,
}

register_tools(definitions, handlers)
