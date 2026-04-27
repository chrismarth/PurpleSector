"""
CSRF exemption for /api/* paths.

Django's CSRF middleware protects browser-driven form submissions.
The JSON API endpoints are called by the React SPA (via the Next.js
rewrite proxy or directly from the Vite dev server).  These requests
use session cookies for auth and don't go through Django's form flow,
so CSRF protection adds friction without security benefit for same-origin
requests.

This middleware marks all /api/ requests as CSRF-safe so that POST /
PUT / PATCH / DELETE calls from the frontend work without a CSRF token.
"""

from django.middleware.csrf import CsrfViewMiddleware


class ApiCsrfExemptMiddleware(CsrfViewMiddleware):
    """Skip CSRF checks for /api/* requests."""

    def process_view(self, request, callback, callback_args, callback_kwargs):
        if request.path.startswith("/api/"):
            return None  # exempt — skip CSRF check
        return super().process_view(request, callback, callback_args, callback_kwargs)
