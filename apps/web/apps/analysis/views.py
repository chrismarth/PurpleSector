import json

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .models import SavedAnalysisLayout


def _require_auth(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthenticated"}, status=401)
    return None


def _layout_to_dict(layout):
    return {
        "id": str(layout.id),
        "userId": str(layout.user_id),
        "name": layout.name,
        "description": layout.description,
        "layout": json.loads(layout.layout) if layout.layout else None,
        "context": layout.context,
        "isDefault": layout.is_default,
        "createdAt": layout.created_at.isoformat(),
        "updatedAt": layout.updated_at.isoformat(),
    }


@require_http_methods(["GET", "POST"])
def layout_list(request):
    err = _require_auth(request)
    if err:
        return err

    if request.method == "GET":
        context = request.GET.get("context")
        qs = SavedAnalysisLayout.objects.filter(user=request.user)
        if context:
            qs = qs.filter(context=context)
        return JsonResponse([_layout_to_dict(l) for l in qs.order_by("-created_at")], safe=False)

    body = json.loads(request.body)
    layout = SavedAnalysisLayout.objects.create(
        user=request.user,
        name=body.get("name", ""),
        description=body.get("description"),
        layout=json.dumps(body.get("layout", {})),
        context=body.get("context", "global"),
        is_default=body.get("isDefault", False),
    )
    return JsonResponse(_layout_to_dict(layout), status=201)


@require_http_methods(["GET", "PATCH", "DELETE"])
def layout_detail(request, pk):
    err = _require_auth(request)
    if err:
        return err

    try:
        layout = SavedAnalysisLayout.objects.get(pk=pk, user=request.user)
    except SavedAnalysisLayout.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(_layout_to_dict(layout))

    if request.method == "PATCH":
        body = json.loads(request.body)
        for field in ("name", "description", "context"):
            if field in body:
                setattr(layout, field, body[field])
        if "layout" in body:
            layout.layout = json.dumps(body["layout"])
        if "isDefault" in body:
            layout.is_default = body["isDefault"]
        layout.save()
        return JsonResponse(_layout_to_dict(layout))

    layout.delete()
    return JsonResponse({"ok": True})
