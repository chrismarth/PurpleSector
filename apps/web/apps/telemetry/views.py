import json

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .models import Lap


def _require_auth(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthenticated"}, status=401)
    return None


def _lap_to_dict(lap):
    return {
        "id": str(lap.id),
        "sessionId": str(lap.session_id),
        "lapNumber": lap.lap_number,
        "lapTime": lap.lap_time,
        "analyzed": lap.analyzed,
        "suggestions": lap.suggestions,
        "driverComments": lap.driver_comments,
        "tags": lap.tags,
        "createdAt": lap.created_at.isoformat(),
    }


@require_http_methods(["GET", "POST"])
def lap_list(request):
    err = _require_auth(request)
    if err:
        return err

    if request.method == "GET":
        session_id = request.GET.get("sessionId")
        qs = Lap.objects.filter(session__user=request.user)
        if session_id:
            qs = qs.filter(session_id=session_id)
        return JsonResponse({"laps": [_lap_to_dict(l) for l in qs.order_by("lap_number")]})

    # POST — create
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    lap = Lap.objects.create(
        session_id=body.get("sessionId"),
        lap_number=body.get("lapNumber", 0),
        lap_time=body.get("lapTime"),
    )
    return JsonResponse(_lap_to_dict(lap), status=201)


@require_http_methods(["GET", "PATCH", "DELETE"])
def lap_detail(request, pk):
    err = _require_auth(request)
    if err:
        return err

    try:
        lap = Lap.objects.select_related("session").get(pk=pk, session__user=request.user)
    except Lap.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(_lap_to_dict(lap))

    if request.method == "PATCH":
        try:
            body = json.loads(request.body)
        except (json.JSONDecodeError, ValueError):
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        if "driverComments" in body:
            lap.driver_comments = body["driverComments"]
        if "tags" in body:
            lap.tags = body["tags"] if body["tags"] else None
        if "plotConfigs" in body:
            lap.plot_configs = body["plotConfigs"] if body["plotConfigs"] else None
        lap.save()
        return JsonResponse(_lap_to_dict(lap))

    # DELETE
    lap.delete()
    return JsonResponse({"ok": True})


@require_http_methods(["GET"])
def lap_frames(request, pk):
    """Fetch telemetry frames from Iceberg via Trino."""
    err = _require_auth(request)
    if err:
        return err

    try:
        lap = Lap.objects.select_related("session").get(pk=pk, session__user=request.user)
    except Lap.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    from purplesector.services.trino import get_lap_frames_from_iceberg

    frames = get_lap_frames_from_iceberg(
        str(lap.session_id),
        lap.lap_number,
    )
    return JsonResponse({"frames": frames})


@require_http_methods(["POST"])
def lap_analyze(request, pk):
    """Trigger AI analysis for a lap. Placeholder for Phase 3."""
    err = _require_auth(request)
    if err:
        return err

    try:
        lap = Lap.objects.select_related("session").get(pk=pk, session__user=request.user)
    except Lap.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    # TODO: Phase 3 — integrate Python lap analysis pipeline
    return JsonResponse({"error": "Not implemented yet"}, status=501)
