import json
from django.http import JsonResponse, HttpRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods


@csrf_exempt
@require_http_methods(["GET", "POST", "DELETE"])
def mcp_handler(request):
    """MCP server HTTP handler."""
    # This is a simplified handler - a full MCP implementation would need SSE support
    # For now, we'll return a basic JSON response indicating the MCP server is available
    # but full protocol handling requires async/ASGI setup
    return JsonResponse({
        "name": "purplesector-mcp",
        "version": "1.0.0",
        "status": "available",
        "note": "Full MCP protocol requires ASGI setup - this is a basic stub",
        "tools": ["ping", "get_session", "list_sessions", "create_event"],
    })
