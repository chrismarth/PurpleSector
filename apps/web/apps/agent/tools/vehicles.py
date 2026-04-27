"""Agent tools for Vehicle / Configuration / Setup CRUD."""

from __future__ import annotations

from apps.vehicles.models import Vehicle, VehicleConfiguration, VehicleSetup

from . import ToolDefinition, ToolContext, ToolResult, register_tools

definitions = [
    ToolDefinition(
        name="listVehicles",
        description="List all vehicles for the current user.",
        input_schema={"type": "object", "properties": {}},
        category="vehicles",
    ),
    ToolDefinition(
        name="createVehicle",
        description="Create a new vehicle.",
        input_schema={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": 'Vehicle name (e.g. "Porsche 911 GT3 R")'},
                "description": {"type": "string"},
                "tags": {"type": "string", "description": "JSON array of tags"},
            },
            "required": ["name"],
        },
        category="vehicles",
        mutating=True,
    ),
    ToolDefinition(
        name="getVehicleConfigurations",
        description="List configurations for a vehicle.",
        input_schema={
            "type": "object",
            "properties": {
                "vehicleId": {"type": "string", "description": "The vehicle ID"},
            },
            "required": ["vehicleId"],
        },
        category="vehicles",
    ),
    ToolDefinition(
        name="createVehicleConfiguration",
        description="Create a new vehicle configuration (parts/aero setup).",
        input_schema={
            "type": "object",
            "properties": {
                "vehicleId": {"type": "string", "description": "The vehicle ID"},
                "name": {"type": "string", "description": 'Configuration name (e.g. "High Downforce Spa")'},
                "description": {"type": "string"},
                "parts": {"type": "string", "description": 'JSON object of parts (e.g. {"frontWing": "High Downforce"})'},
            },
            "required": ["vehicleId", "name", "parts"],
        },
        category="vehicles",
        mutating=True,
    ),
    ToolDefinition(
        name="getVehicleSetups",
        description="List setups for a vehicle, optionally filtered by configuration.",
        input_schema={
            "type": "object",
            "properties": {
                "vehicleId": {"type": "string", "description": "The vehicle ID"},
                "vehicleConfigurationId": {"type": "string", "description": "Optional configuration ID to filter by"},
            },
            "required": ["vehicleId"],
        },
        category="vehicles",
    ),
    ToolDefinition(
        name="createVehicleSetup",
        description="Create a new vehicle setup (suspension, alignment, etc.).",
        input_schema={
            "type": "object",
            "properties": {
                "vehicleId": {"type": "string", "description": "The vehicle ID"},
                "vehicleConfigurationId": {"type": "string", "description": "Optional configuration ID"},
                "name": {"type": "string", "description": 'Setup name (e.g. "Wet Setup v2")'},
                "description": {"type": "string"},
                "parameters": {"type": "string", "description": "JSON object of setup parameters"},
            },
            "required": ["vehicleId", "name", "parameters"],
        },
        category="vehicles",
        mutating=True,
    ),
]


async def list_vehicles(args: dict, ctx: ToolContext) -> ToolResult:
    from django.db.models import Count

    vehicles = (
        Vehicle.objects.filter(user_id=ctx.user_id)
        .annotate(
            config_count=Count("configurations"),
            setup_count=Count("setups"),
            session_count=Count("sessions"),
        )
        .order_by("-created_at")
    )
    data = [
        {
            "id": str(v.id),
            "name": v.name,
            "description": v.description,
            "tags": v.tags,
            "createdAt": v.created_at.isoformat(),
            "_count": {"configurations": v.config_count, "setups": v.setup_count, "sessions": v.session_count},
        }
        for v in vehicles
    ]
    return ToolResult(success=True, data=data, message=f"Found {len(data)} vehicles.")


async def create_vehicle(args: dict, ctx: ToolContext) -> ToolResult:
    vehicle = Vehicle.objects.create(
        user_id=ctx.user_id,
        name=args["name"],
        description=args.get("description") or None,
        tags=args.get("tags") or None,
    )
    return ToolResult(
        success=True,
        data={"id": str(vehicle.id), "name": vehicle.name},
        message=f'Created vehicle "{vehicle.name}".',
    )


async def get_vehicle_configurations(args: dict, ctx: ToolContext) -> ToolResult:
    if not Vehicle.objects.filter(id=args["vehicleId"], user_id=ctx.user_id).exists():
        return ToolResult(success=False, message="Vehicle not found.")
    configs = VehicleConfiguration.objects.filter(vehicle_id=args["vehicleId"], user_id=ctx.user_id).order_by("-created_at")
    data = [
        {"id": str(c.id), "name": c.name, "description": c.description, "parts": c.parts, "createdAt": c.created_at.isoformat()}
        for c in configs
    ]
    return ToolResult(success=True, data=data, message=f"Found {len(data)} configurations.")


async def create_vehicle_configuration(args: dict, ctx: ToolContext) -> ToolResult:
    if not Vehicle.objects.filter(id=args["vehicleId"], user_id=ctx.user_id).exists():
        return ToolResult(success=False, message="Vehicle not found.")
    config = VehicleConfiguration.objects.create(
        user_id=ctx.user_id,
        vehicle_id=args["vehicleId"],
        name=args["name"],
        description=args.get("description") or None,
        parts=args["parts"],
    )
    return ToolResult(success=True, data={"id": str(config.id), "name": config.name}, message=f'Created configuration "{config.name}".')


async def get_vehicle_setups(args: dict, ctx: ToolContext) -> ToolResult:
    if not Vehicle.objects.filter(id=args["vehicleId"], user_id=ctx.user_id).exists():
        return ToolResult(success=False, message="Vehicle not found.")
    qs = VehicleSetup.objects.filter(vehicle_id=args["vehicleId"], user_id=ctx.user_id)
    if args.get("vehicleConfigurationId"):
        qs = qs.filter(vehicle_configuration_id=args["vehicleConfigurationId"])
    setups = qs.order_by("-created_at")
    data = [
        {"id": str(s.id), "name": s.name, "description": s.description, "parameters": s.parameters, "createdAt": s.created_at.isoformat()}
        for s in setups
    ]
    return ToolResult(success=True, data=data, message=f"Found {len(data)} setups.")


async def create_vehicle_setup(args: dict, ctx: ToolContext) -> ToolResult:
    if not Vehicle.objects.filter(id=args["vehicleId"], user_id=ctx.user_id).exists():
        return ToolResult(success=False, message="Vehicle not found.")
    setup = VehicleSetup.objects.create(
        user_id=ctx.user_id,
        vehicle_id=args["vehicleId"],
        vehicle_configuration_id=args.get("vehicleConfigurationId") or None,
        name=args["name"],
        description=args.get("description") or None,
        parameters=args["parameters"],
    )
    return ToolResult(success=True, data={"id": str(setup.id), "name": setup.name}, message=f'Created setup "{setup.name}".')


handlers = {
    "listVehicles": list_vehicles,
    "createVehicle": create_vehicle,
    "getVehicleConfigurations": get_vehicle_configurations,
    "createVehicleConfiguration": create_vehicle_configuration,
    "getVehicleSetups": get_vehicle_setups,
    "createVehicleSetup": create_vehicle_setup,
}

register_tools(definitions, handlers)
