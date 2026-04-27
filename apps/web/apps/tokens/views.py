import hashlib
import json
import secrets

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .models import ApiToken


def _require_auth(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthenticated"}, status=401)
    return None


def _token_to_dict(token):
    return {
        "id": str(token.id),
        "userId": str(token.user_id),
        "name": token.name,
        "scopes": json.loads(token.scopes) if token.scopes else [],
        "createdAt": token.created_at.isoformat(),
        "lastUsedAt": token.last_used_at.isoformat() if token.last_used_at else None,
        "revokedAt": token.revoked_at.isoformat() if token.revoked_at else None,
    }


@require_http_methods(["GET", "POST"])
def token_list(request):
    err = _require_auth(request)
    if err:
        return err

    if request.method == "GET":
        tokens = ApiToken.objects.filter(user=request.user).order_by("-created_at")
        return JsonResponse([_token_to_dict(t) for t in tokens], safe=False)

    body = json.loads(request.body)
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    token = ApiToken.objects.create(
        user=request.user,
        name=body.get("name", ""),
        token_hash=token_hash,
        scopes=json.dumps(body.get("scopes", ["mcp:read"])),
    )
    data = _token_to_dict(token)
    data["token"] = raw_token  # Only returned on creation
    return JsonResponse(data, status=201)


@require_http_methods(["GET", "DELETE"])
def token_detail(request, pk):
    err = _require_auth(request)
    if err:
        return err

    try:
        token = ApiToken.objects.get(pk=pk, user=request.user)
    except ApiToken.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(_token_to_dict(token))

    # DELETE — revoke
    from django.utils import timezone
    token.revoked_at = timezone.now()
    token.save(update_fields=["revoked_at"])
    return JsonResponse({"ok": True})
