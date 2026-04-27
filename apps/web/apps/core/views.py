import json
import os
from pathlib import Path

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET, require_http_methods
from .models import User, UserSettings


@csrf_exempt
@require_POST
def login_view(request):
    """Authenticate user and start Django session."""
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    username = body.get("username", "")
    password = body.get("password", "")

    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"error": "Invalid credentials"}, status=401)

    login(request, user)
    return JsonResponse({
        "id": str(user.id),
        "username": user.username,
        "fullName": user.full_name,
        "avatarUrl": user.avatar_url,
        "role": user.role,
    })


@require_POST
def logout_view(request):
    """End the Django session."""
    logout(request)
    return JsonResponse({"ok": True})


@require_GET
def me(request):
    """Return the currently authenticated user."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthenticated"}, status=401)

    return JsonResponse({
        "user": {
            "id": str(request.user.id),
            "username": request.user.username,
            "fullName": request.user.full_name,
            "avatarUrl": request.user.avatar_url,
            "role": request.user.role,
        }
    })


@require_http_methods(["GET", "PUT"])
def profile(request):
    """GET/PUT user profile (fullName, avatarUrl)."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthenticated"}, status=401)

    if request.method == "GET":
        return JsonResponse({
            "id": str(request.user.id),
            "username": request.user.username,
            "fullName": request.full_name,
            "avatarUrl": request.avatar_url,
            "role": request.role,
        })

    # PUT
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    full_name = body.get("fullName")
    avatar_url = body.get("avatarUrl")

    if full_name is not None:
        request.user.full_name = full_name
    if avatar_url is not None:
        request.user.avatar_url = avatar_url

    request.user.save()

    return JsonResponse({
        "id": str(request.user.id),
        "username": request.user.username,
        "fullName": request.full_name,
        "avatarUrl": request.avatar_url,
        "role": request.role,
    })


@require_http_methods(["GET", "PUT"])
def settings(request):
    """GET/PUT user settings (theme, data)."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthenticated"}, status=401)

    if request.method == "GET":
        user_settings = UserSettings.objects.filter(user=request.user).first()
        return JsonResponse({
            "theme": user_settings.theme if user_settings else None,
            "data": json.loads(user_settings.data) if user_settings and user_settings.data else None,
        })

    # PUT
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    theme = body.get("theme")
    data = body.get("data")

    user_settings, created = UserSettings.objects.get_or_create(user=request.user)
    if theme is not None:
        user_settings.theme = theme
    if data is not None:
        user_settings.data = json.dumps(data) if data is not None else None
    user_settings.save()

    return JsonResponse({
        "theme": user_settings.theme,
        "data": json.loads(user_settings.data) if user_settings.data else None,
    })


@require_POST
def avatar_upload(request):
    """POST avatar upload (writes to web public directory)."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthenticated"}, status=401)

    if "file" not in request.FILES:
        return JsonResponse({"error": "No file provided"}, status=400)

    file = request.FILES["file"]
    MAX_SIZE = 2 * 1024 * 1024  # 2 MB
    if file.size > MAX_SIZE:
        return JsonResponse({"error": "File too large (max 2 MB)"}, status=400)

    ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
    if file.content_type not in ALLOWED_TYPES:
        return JsonResponse(
            {"error": "Invalid file type. Allowed: PNG, JPEG, WebP, SVG"},
            status=400,
        )

    # Determine upload directory (relative to web app)
    # Assuming web app is at ../web from api directory
    web_root = Path(__file__).parent.parent.parent.parent / "web"
    upload_dir = web_root / "public" / "images" / "avatars" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate filename
    ext = file.name.split(".")[-1] if "." in file.name else "png"
    filename = f"{request.user.id}-{int(request.user.created_at.timestamp())}.{ext}"
    filepath = upload_dir / filename

    # Write file
    with open(filepath, "wb") as f:
        for chunk in file.chunks():
            f.write(chunk)

    # Update user avatarUrl
    avatar_url = f"/images/avatars/uploads/{filename}"
    request.user.avatar_url = avatar_url
    request.user.save()

    return JsonResponse({"avatarUrl": avatar_url})
