import json

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .models import Vehicle, VehicleConfiguration, VehicleSetup


def _require_auth(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthenticated"}, status=401)
    return None


def _vehicle_to_dict(v):
    return {
        "id": str(v.id),
        "userId": str(v.user_id),
        "name": v.name,
        "description": v.description,
        "inServiceDate": v.in_service_date.isoformat() if v.in_service_date else None,
        "outOfServiceDate": v.out_of_service_date.isoformat() if v.out_of_service_date else None,
        "tags": json.loads(v.tags) if v.tags else None,
        "createdAt": v.created_at.isoformat(),
        "updatedAt": v.updated_at.isoformat(),
    }


def _config_to_dict(c):
    return {
        "id": str(c.id),
        "vehicleId": str(c.vehicle_id),
        "name": c.name,
        "description": c.description,
        "parts": json.loads(c.parts) if c.parts else {},
        "createdAt": c.created_at.isoformat(),
        "updatedAt": c.updated_at.isoformat(),
    }


def _setup_to_dict(s):
    return {
        "id": str(s.id),
        "vehicleId": str(s.vehicle_id),
        "vehicleConfigurationId": str(s.vehicle_configuration_id) if s.vehicle_configuration_id else None,
        "name": s.name,
        "description": s.description,
        "parameters": json.loads(s.parameters) if s.parameters else {},
        "createdAt": s.created_at.isoformat(),
        "updatedAt": s.updated_at.isoformat(),
    }


# ── Vehicles ─────────────────────────────────────────────────────────────────

@require_http_methods(["GET", "POST"])
def vehicle_list(request):
    err = _require_auth(request)
    if err:
        return err

    if request.method == "GET":
        vehicles = Vehicle.objects.filter(user=request.user).order_by("-created_at")
        return JsonResponse([_vehicle_to_dict(v) for v in vehicles], safe=False)

    body = json.loads(request.body)
    vehicle = Vehicle.objects.create(
        user=request.user,
        name=body.get("name", ""),
        description=body.get("description"),
    )
    return JsonResponse(_vehicle_to_dict(vehicle), status=201)


@require_http_methods(["GET", "PATCH", "DELETE"])
def vehicle_detail(request, pk):
    err = _require_auth(request)
    if err:
        return err

    try:
        vehicle = Vehicle.objects.get(pk=pk, user=request.user)
    except Vehicle.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if request.method == "GET":
        data = _vehicle_to_dict(vehicle)
        data["configurations"] = [_config_to_dict(c) for c in vehicle.configurations.all()]
        data["setups"] = [_setup_to_dict(s) for s in vehicle.setups.all()]
        return JsonResponse(data)

    if request.method == "PATCH":
        body = json.loads(request.body)
        for field in ("name", "description"):
            if field in body:
                setattr(vehicle, field, body[field])
        if "tags" in body:
            vehicle.tags = json.dumps(body["tags"]) if body["tags"] else None
        vehicle.save()
        return JsonResponse(_vehicle_to_dict(vehicle))

    vehicle.delete()
    return JsonResponse({"ok": True})


# ── Configurations ───────────────────────────────────────────────────────────

@require_http_methods(["GET", "POST"])
def configuration_list(request, pk):
    err = _require_auth(request)
    if err:
        return err

    try:
        vehicle = Vehicle.objects.get(pk=pk, user=request.user)
    except Vehicle.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if request.method == "GET":
        configs = vehicle.configurations.order_by("-created_at")
        return JsonResponse([_config_to_dict(c) for c in configs], safe=False)

    body = json.loads(request.body)
    config = VehicleConfiguration.objects.create(
        user=request.user,
        vehicle=vehicle,
        name=body.get("name", ""),
        description=body.get("description"),
        parts=json.dumps(body.get("parts", {})),
    )
    return JsonResponse(_config_to_dict(config), status=201)


@require_http_methods(["GET", "PATCH", "DELETE"])
def configuration_detail(request, pk, config_pk):
    err = _require_auth(request)
    if err:
        return err

    try:
        config = VehicleConfiguration.objects.get(pk=config_pk, vehicle_id=pk, user=request.user)
    except VehicleConfiguration.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(_config_to_dict(config))

    if request.method == "PATCH":
        body = json.loads(request.body)
        for field in ("name", "description"):
            if field in body:
                setattr(config, field, body[field])
        if "parts" in body:
            config.parts = json.dumps(body["parts"])
        config.save()
        return JsonResponse(_config_to_dict(config))

    config.delete()
    return JsonResponse({"ok": True})


# ── Setups ───────────────────────────────────────────────────────────────────

@require_http_methods(["GET", "POST"])
def setup_list(request, pk):
    err = _require_auth(request)
    if err:
        return err

    try:
        vehicle = Vehicle.objects.get(pk=pk, user=request.user)
    except Vehicle.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if request.method == "GET":
        setups = vehicle.setups.order_by("-created_at")
        return JsonResponse([_setup_to_dict(s) for s in setups], safe=False)

    body = json.loads(request.body)
    setup = VehicleSetup.objects.create(
        user=request.user,
        vehicle=vehicle,
        vehicle_configuration_id=body.get("vehicleConfigurationId"),
        name=body.get("name", ""),
        description=body.get("description"),
        parameters=json.dumps(body.get("parameters", {})),
    )
    return JsonResponse(_setup_to_dict(setup), status=201)


@require_http_methods(["GET", "PATCH", "DELETE"])
def setup_detail(request, pk, setup_pk):
    err = _require_auth(request)
    if err:
        return err

    try:
        setup = VehicleSetup.objects.get(pk=setup_pk, vehicle_id=pk, user=request.user)
    except VehicleSetup.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(_setup_to_dict(setup))

    if request.method == "PATCH":
        body = json.loads(request.body)
        for field in ("name", "description"):
            if field in body:
                setattr(setup, field, body[field])
        if "parameters" in body:
            setup.parameters = json.dumps(body["parameters"])
        setup.save()
        return JsonResponse(_setup_to_dict(setup))

    setup.delete()
    return JsonResponse({"ok": True})
