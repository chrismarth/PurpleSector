import json

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .models import MathChannel


def _require_auth(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthenticated"}, status=401)
    return None


def _channel_to_dict(ch):
    return {
        "id": str(ch.id),
        "userId": str(ch.user_id),
        "label": ch.label,
        "unit": ch.unit,
        "expression": ch.expression,
        "inputs": json.loads(ch.inputs) if ch.inputs else [],
        "validated": ch.validated,
        "comment": ch.comment,
        "createdAt": ch.created_at.isoformat(),
        "updatedAt": ch.updated_at.isoformat(),
    }


@require_http_methods(["GET", "POST"])
def math_channel_list(request):
    err = _require_auth(request)
    if err:
        return err

    if request.method == "GET":
        channels = MathChannel.objects.filter(user=request.user).order_by("-created_at")
        return JsonResponse([_channel_to_dict(ch) for ch in channels], safe=False)

    body = json.loads(request.body)
    ch = MathChannel.objects.create(
        user=request.user,
        label=body.get("label", ""),
        unit=body.get("unit", ""),
        expression=body.get("expression", ""),
        inputs=json.dumps(body.get("inputs", [])),
        comment=body.get("comment"),
    )

    # Best-effort RisingWave dual-write
    from purplesector.services.risingwave import upsert_math_channel_rule
    upsert_math_channel_rule(ch)

    return JsonResponse(_channel_to_dict(ch), status=201)


@require_http_methods(["GET", "PUT", "DELETE"])
def math_channel_detail(request, pk):
    err = _require_auth(request)
    if err:
        return err

    try:
        ch = MathChannel.objects.get(pk=pk, user=request.user)
    except MathChannel.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(_channel_to_dict(ch))

    if request.method == "PUT":
        body = json.loads(request.body)
        for field in ("label", "unit", "expression", "comment"):
            if field in body:
                setattr(ch, field, body[field])
        if "inputs" in body:
            ch.inputs = json.dumps(body["inputs"])
        if "validated" in body:
            ch.validated = body["validated"]
        ch.save()

        from purplesector.services.risingwave import upsert_math_channel_rule
        upsert_math_channel_rule(ch)

        return JsonResponse(_channel_to_dict(ch))

    # DELETE
    from purplesector.services.risingwave import delete_math_channel_rule
    delete_math_channel_rule(str(request.user.id), str(ch.id))

    ch.delete()
    return JsonResponse({"ok": True})
