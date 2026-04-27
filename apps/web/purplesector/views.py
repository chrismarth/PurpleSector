from django.http import JsonResponse
from inertia import render as inertia_render


# ── JSON health endpoints ────────────────────────────────────────────────────

def health(request):
    return JsonResponse({"status": "ok"})


def version(request):
    return JsonResponse({
        "frontend": {"name": "PurpleSector Web", "version": "0.1.0"},
        "backend": {"name": "Django", "version": "0.1.0"},
        "runtime": {"node": "N/A", "env": "python"},
    })


# ── Inertia page views ──────────────────────────────────────────────────────
# Each renders an Inertia component, passing route params as page props.
# The React component receives these via usePage().props.

def index(request):
    return inertia_render(request, "Home")


def login_page(request):
    return inertia_render(request, "Login", {"next": request.GET.get("next", "/")})


# Events

def event_new_page(request):
    return inertia_render(request, "Events/New")


def event_detail_page(request, id):
    return inertia_render(request, "Events/Detail", {"id": str(id)})


def event_edit_page(request, id):
    return inertia_render(request, "Events/Edit", {"id": str(id)})


def event_run_plan_page(request, id):
    return inertia_render(request, "Events/RunPlan", {"id": str(id)})


# Sessions

def session_new_page(request):
    return inertia_render(request, "Sessions/New", {
        "eventId": request.GET.get("eventId", ""),
    })


def session_detail_page(request, id):
    return inertia_render(request, "Sessions/Detail", {"id": str(id)})


def session_edit_page(request, id):
    return inertia_render(request, "Sessions/Edit", {"id": str(id)})


# Laps

def lap_detail_page(request, id):
    return inertia_render(request, "Laps/Detail", {"id": str(id)})


# Vehicles

def vehicle_new_page(request):
    return inertia_render(request, "Vehicles/New")


def vehicle_detail_page(request, id):
    return inertia_render(request, "Vehicles/Detail", {"id": str(id)})


def vehicle_edit_page(request, id):
    return inertia_render(request, "Vehicles/Edit", {"id": str(id)})


def vehicle_configuration_new_page(request, id):
    return inertia_render(request, "Vehicles/ConfigurationNew", {"id": str(id)})


def vehicle_configuration_detail_page(request, id, config_id):
    return inertia_render(request, "Vehicles/ConfigurationDetail", {
        "id": str(id),
        "configId": str(config_id),
    })


def vehicle_configuration_edit_page(request, id, config_id):
    return inertia_render(request, "Vehicles/ConfigurationEdit", {
        "id": str(id),
        "configId": str(config_id),
    })


def vehicle_setup_new_page(request, id):
    return inertia_render(request, "Vehicles/SetupNew", {"id": str(id)})


def vehicle_setup_detail_page(request, id, setup_id):
    return inertia_render(request, "Vehicles/SetupDetail", {
        "id": str(id),
        "setupId": str(setup_id),
    })


def vehicle_setup_edit_page(request, id, setup_id):
    return inertia_render(request, "Vehicles/SetupEdit", {
        "id": str(id),
        "setupId": str(setup_id),
    })
