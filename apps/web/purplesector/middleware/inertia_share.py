"""
Inertia shared props middleware.

Calls inertia.share() on every request so that every Inertia page
response automatically includes global data the frontend always needs:

    - plugins   : list of plugin manifests active for the current user
    - auth.user : currently authenticated user (or None)

Add new shared props here as the application grows (feature flags,
org settings, notification counts, etc.).
"""

from inertia import share


class InertiaShareMiddleware:
    """Inject shared props into every Inertia response."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from apps.plugins.registry import PluginRegistry

        user = request.user if request.user.is_authenticated else None

        share(
            request,
            plugins=PluginRegistry.get_manifests(user=user),
            auth={
                "user": {
                    "id": str(user.id),
                    "username": user.username,
                    "fullName": user.full_name,
                    "avatarUrl": user.avatar_url,
                    "role": user.role,
                } if user else None,
            },
        )

        return self.get_response(request)
