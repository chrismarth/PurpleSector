from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .registry import PluginRegistry


@require_GET
def plugin_list(request):
    """
    GET /api/plugins/

    Returns the list of plugin manifests active for the current user.
    Unauthenticated requests receive only free-tier plugins (the frontend
    needs this before login to render the shell correctly).
    """
    user = request.user if request.user.is_authenticated else None
    manifests = PluginRegistry.get_manifests(user=user)
    return JsonResponse({"plugins": manifests})
