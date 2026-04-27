from django.contrib import admin
from django.urls import include, path, re_path
from django.conf import settings
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from . import views

urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),

    # ── API routes ───────────────────────────────────────────────────────
    path("api/health", views.health, name="health"),
    path("api/version", views.version, name="version"),

    # Auth
    path("api/auth/", include("apps.core.urls")),

    # Domain APIs — optional trailing slash (APPEND_SLASH=False)
    re_path(r"^api/events/?", include("apps.events.urls")),
    re_path(r"^api/sessions/?", include("apps.events.session_urls")),
    re_path(r"^api/laps/?", include("apps.telemetry.urls")),
    re_path(r"^api/vehicles/?", include("apps.vehicles.urls")),
    re_path(r"^api/channels/math/?", include("apps.channels.urls")),
    re_path(r"^api/analysis-layouts/?", include("apps.analysis.urls")),
    re_path(r"^api/tokens/?", include("apps.tokens.urls")),
    re_path(r"^api/agent/?", include("apps.agent.urls")),
    re_path(r"^api/mcp/?", include("apps.mcp.urls")),
    re_path(r"^api/plugins/?", include("apps.plugins.urls")),

    # ── Inertia page routes ──────────────────────────────────────────────
    path("", views.index, name="index"),
    path("login", views.login_page, name="login"),

    # Events
    path("event/new", views.event_new_page, name="event-new"),
    path("event/<uuid:id>", views.event_detail_page, name="event-detail-page"),
    path("event/<uuid:id>/edit", views.event_edit_page, name="event-edit-page"),
    path("event/<uuid:id>/run-plan", views.event_run_plan_page, name="event-run-plan-page"),

    # Sessions
    path("session/new", views.session_new_page, name="session-new"),
    path("session/<uuid:id>", views.session_detail_page, name="session-detail-page"),
    path("session/<uuid:id>/edit", views.session_edit_page, name="session-edit-page"),

    # Laps
    path("lap/<uuid:id>", views.lap_detail_page, name="lap-detail-page"),

    # Vehicles
    path("vehicle/new", views.vehicle_new_page, name="vehicle-new"),
    path("vehicle/<uuid:id>", views.vehicle_detail_page, name="vehicle-detail-page"),
    path("vehicle/<uuid:id>/edit", views.vehicle_edit_page, name="vehicle-edit-page"),
    path("vehicle/<uuid:id>/configuration/new", views.vehicle_configuration_new_page, name="vehicle-config-new"),
    path("vehicle/<uuid:id>/configuration/<uuid:config_id>", views.vehicle_configuration_detail_page, name="vehicle-config-detail-page"),
    path("vehicle/<uuid:id>/configuration/<uuid:config_id>/edit", views.vehicle_configuration_edit_page, name="vehicle-config-edit-page"),
    path("vehicle/<uuid:id>/setup/new", views.vehicle_setup_new_page, name="vehicle-setup-new"),
    path("vehicle/<uuid:id>/setup/<uuid:setup_id>", views.vehicle_setup_detail_page, name="vehicle-setup-detail-page"),
    path("vehicle/<uuid:id>/setup/<uuid:setup_id>/edit", views.vehicle_setup_edit_page, name="vehicle-setup-edit-page"),
]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()