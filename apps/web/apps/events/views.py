import json

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .models import Event, Session
from purplesector.services import risingwave


def _require_auth(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthenticated"}, status=401)
    return None


def _event_to_dict(event):
    return {
        "id": str(event.id),
        "userId": str(event.user_id),
        "name": event.name,
        "description": event.description,
        "location": event.location,
        "startDate": event.start_date.isoformat() if event.start_date else None,
        "endDate": event.end_date.isoformat() if event.end_date else None,
        "createdAt": event.created_at.isoformat(),
        "updatedAt": event.updated_at.isoformat(),
    }


def _session_to_dict(session):
    return {
        "id": str(session.id),
        "userId": str(session.user_id),
        "eventId": str(session.event_id),
        "name": session.name,
        "source": session.source,
        "status": session.status,
        "started": session.started,
        "readAccess": session.read_access,
        "tags": session.tags,  # raw JSON string — frontend parses it
        "lapCount": session.laps.count(),
        "vehicleId": str(session.vehicle_id) if session.vehicle_id else None,
        "vehicleConfigurationId": str(session.vehicle_configuration_id) if session.vehicle_configuration_id else None,
        "vehicleSetupId": str(session.vehicle_setup_id) if session.vehicle_setup_id else None,
        "createdAt": session.created_at.isoformat(),
        "updatedAt": session.updated_at.isoformat(),
    }


# ── Events ───────────────────────────────────────────────────────────────────

@require_http_methods(["GET", "POST"])
def event_list(request):
    err = _require_auth(request)
    if err:
        return err

    if request.method == "GET":
        events = Event.objects.filter(user=request.user).order_by("-created_at")
        return JsonResponse([_event_to_dict(e) for e in events], safe=False)

    # POST — create
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    event = Event.objects.create(
        user=request.user,
        name=body.get("name", ""),
        description=body.get("description"),
        location=body.get("location"),
        start_date=body.get("startDate"),
        end_date=body.get("endDate"),
    )
    return JsonResponse(_event_to_dict(event), status=201)


@require_http_methods(["GET", "PATCH", "DELETE"])
def event_detail(request, pk):
    err = _require_auth(request)
    if err:
        return err

    try:
        event = Event.objects.get(pk=pk, user=request.user)
    except Event.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if request.method == "GET":
        data = _event_to_dict(event)
        data["sessions"] = [
            _session_to_dict(s) for s in event.sessions.order_by("-created_at")
        ]
        return JsonResponse(data)

    if request.method == "PATCH":
        try:
            body = json.loads(request.body)
        except (json.JSONDecodeError, ValueError):
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        for field in ("name", "description", "location"):
            if field in body:
                setattr(event, field, body[field])
        if "startDate" in body:
            event.start_date = body["startDate"]
        if "endDate" in body:
            event.end_date = body["endDate"]
        event.save()
        return JsonResponse(_event_to_dict(event))

    # DELETE
    event.delete()
    return JsonResponse({"ok": True})


# ── Sessions ─────────────────────────────────────────────────────────────────

@require_http_methods(["GET", "POST"])
def session_list(request):
    err = _require_auth(request)
    if err:
        return err

    if request.method == "GET":
        qs = Session.objects.filter(user=request.user)
        event_id = request.GET.get("eventId")
        if event_id:
            qs = qs.filter(event_id=event_id)
        sessions = qs.order_by("-created_at")
        return JsonResponse([_session_to_dict(s) for s in sessions], safe=False)

    # POST — create
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    source = body.get("source", "live")
    session = Session.objects.create(
        user=request.user,
        event_id=body.get("eventId"),
        name=body.get("name", ""),
        source=source,
        started=source == "demo",
        status="active" if source == "demo" else "pending",
        vehicle_id=body.get("vehicleId") or None,
        vehicle_configuration_id=body.get("vehicleConfigurationId") or None,
        vehicle_setup_id=body.get("vehicleSetupId") or None,
    )
    # For demo sessions, register immediately so telemetry pipeline starts routing
    if source == "demo":
        risingwave.register_active_session(
            user_id=str(request.user.id),
            session_id=str(session.id),
            source=source,
        )
    return JsonResponse(_session_to_dict(session), status=201)


@require_http_methods(["GET", "PATCH", "DELETE"])
def session_detail(request, pk):
    err = _require_auth(request)
    if err:
        return err

    try:
        session = Session.objects.get(pk=pk, user=request.user)
    except Session.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if request.method == "GET":
        data = _session_to_dict(session)
        data["event"] = _event_to_dict(session.event) if session.event_id else None
        data["laps"] = [
            {
                "id": str(lap.id),
                "sessionId": str(session.id),
                "lapNumber": lap.lap_number,
                "lapTime": lap.lap_time,
                "analyzed": lap.analyzed,
            }
            for lap in session.laps.order_by("lap_number")
        ]
        return JsonResponse(data)

    if request.method == "PATCH":
        try:
            body = json.loads(request.body)
        except (json.JSONDecodeError, ValueError):
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        for field in ("name", "source", "status"):
            if field in body:
                setattr(session, field, body[field])
        if "tags" in body:
            session.tags = json.dumps(body["tags"]) if body["tags"] else None
        if "vehicleId" in body:
            session.vehicle_id = body["vehicleId"]
        if "vehicleConfigurationId" in body:
            session.vehicle_configuration_id = body["vehicleConfigurationId"]
        if "vehicleSetupId" in body:
            session.vehicle_setup_id = body["vehicleSetupId"]
        session.save()
        if "status" in body:
            risingwave.update_active_session_status(str(session.id), body["status"])
        return JsonResponse(_session_to_dict(session))

    # DELETE
    risingwave.update_active_session_status(str(session.id), "deleted")
    session.delete()
    return JsonResponse({"ok": True})


@require_http_methods(["POST"])
def session_start(request, pk):
    """Mark a session as started (telemetry collection begins)."""
    err = _require_auth(request)
    if err:
        return err

    try:
        session = Session.objects.get(pk=pk, user=request.user)
    except Session.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    session.started = True
    session.status = "active"
    session.save(update_fields=["started", "status", "updated_at"])
    # Register in RisingWave so telemetry pipeline routes frames to this session
    risingwave.register_active_session(
        user_id=str(request.user.id),
        session_id=str(session.id),
        source=session.source,
    )
    data = _session_to_dict(session)
    data["event"] = _event_to_dict(session.event) if session.event_id else None
    return JsonResponse(data)
