"""
Auth middleware — port of apps/web/middleware.ts.

Redirects unauthenticated users to /login for protected routes.
Allows:
  - /login, /admin
  - /api/* (API routes handle their own auth via 401)
  - Static assets (/static, /images, /favicon)
"""

from django.http import HttpResponseRedirect
from django.urls import reverse


class LoginRequiredMiddleware:
    """Redirect unauthenticated requests to the login page."""

    PUBLIC_PREFIXES = (
        "/login",
        "/admin",
        "/api/",
        "/static/",
        "/images/",
        "/favicon",
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        is_auth = request.user.is_authenticated
        print(f"[LoginRequiredMiddleware] path={path} is_authenticated={is_auth}")

        # Allow public paths
        if any(path.startswith(prefix) for prefix in self.PUBLIC_PREFIXES):
            print(f"[LoginRequiredMiddleware] allowing public path")
            return self.get_response(request)

        # Allow authenticated users
        if request.user.is_authenticated:
            print(f"[LoginRequiredMiddleware] allowing authenticated user")
            return self.get_response(request)

        # Redirect to login with ?next= parameter
        print(f"[LoginRequiredMiddleware] redirecting to login")
        login_url = reverse("login")
        qs = request.META.get("QUERY_STRING", "")
        next_url = f"{path}?{qs}" if qs else path
        return HttpResponseRedirect(f"{login_url}?next={next_url}")
