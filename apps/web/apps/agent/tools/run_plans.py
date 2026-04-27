"""Agent tools for Run Plan CRUD."""

from __future__ import annotations

from apps.events.models import RunPlan, RunPlanItem

from . import ToolDefinition, ToolContext, ToolResult, register_tools

definitions = [
    ToolDefinition(
        name="listRunPlans",
        description="List all run plans for the current user.",
        input_schema={
            "type": "object",
            "properties": {
                "eventId": {"type": "string", "description": "Optional event ID to filter by"},
            },
        },
        category="runPlans",
    ),
    ToolDefinition(
        name="getRunPlan",
        description="Get a run plan with all its items (session/vehicle-config combinations).",
        input_schema={
            "type": "object",
            "properties": {
                "runPlanId": {"type": "string", "description": "The run plan ID"},
            },
            "required": ["runPlanId"],
        },
        category="runPlans",
    ),
    ToolDefinition(
        name="createRunPlan",
        description="Create a new run plan — a named collection of planned session/vehicle-configuration combinations.",
        input_schema={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Run plan name"},
                "description": {"type": "string"},
                "eventId": {"type": "string", "description": "Optional event ID to associate with"},
                "items": {
                    "type": "array",
                    "description": "Array of planned items",
                    "items": {
                        "type": "object",
                        "properties": {
                            "sessionName": {"type": "string", "description": "Planned session name"},
                            "vehicleId": {"type": "string"},
                            "vehicleConfigurationId": {"type": "string"},
                            "vehicleSetupId": {"type": "string"},
                            "notes": {"type": "string"},
                        },
                        "required": ["sessionName"],
                    },
                },
            },
            "required": ["name"],
        },
        category="runPlans",
        mutating=True,
    ),
    ToolDefinition(
        name="updateRunPlan",
        description="Update a run plan (name, description, status) or replace its items.",
        input_schema={
            "type": "object",
            "properties": {
                "runPlanId": {"type": "string", "description": "The run plan ID"},
                "name": {"type": "string"},
                "description": {"type": "string"},
                "status": {"type": "string", "description": '"draft" | "active" | "completed"'},
                "items": {
                    "type": "array",
                    "description": "If provided, replaces all items",
                    "items": {
                        "type": "object",
                        "properties": {
                            "sessionName": {"type": "string"},
                            "vehicleId": {"type": "string"},
                            "vehicleConfigurationId": {"type": "string"},
                            "vehicleSetupId": {"type": "string"},
                            "notes": {"type": "string"},
                        },
                        "required": ["sessionName"],
                    },
                },
            },
            "required": ["runPlanId"],
        },
        category="runPlans",
        mutating=True,
    ),
    ToolDefinition(
        name="deleteRunPlan",
        description="Delete a run plan and all its items.",
        input_schema={
            "type": "object",
            "properties": {
                "runPlanId": {"type": "string", "description": "The run plan ID to delete"},
            },
            "required": ["runPlanId"],
        },
        category="runPlans",
        mutating=True,
    ),
]


def _serialize_plan(plan: RunPlan, include_items: bool = False) -> dict:
    d = {
        "id": str(plan.id),
        "name": plan.name,
        "description": plan.description,
        "status": plan.status,
        "eventId": str(plan.event_id) if plan.event_id else None,
        "createdAt": plan.created_at.isoformat(),
    }
    if include_items:
        items = plan.items.order_by("order").select_related("vehicle", "vehicle_configuration", "vehicle_setup", "session")
        d["items"] = [
            {
                "id": str(item.id),
                "order": item.order,
                "sessionName": item.session_name,
                "vehicleId": str(item.vehicle_id) if item.vehicle_id else None,
                "vehicle": {"id": str(item.vehicle.id), "name": item.vehicle.name} if item.vehicle else None,
                "vehicleConfigurationId": str(item.vehicle_configuration_id) if item.vehicle_configuration_id else None,
                "vehicleConfiguration": {"id": str(item.vehicle_configuration.id), "name": item.vehicle_configuration.name} if item.vehicle_configuration else None,
                "vehicleSetupId": str(item.vehicle_setup_id) if item.vehicle_setup_id else None,
                "vehicleSetup": {"id": str(item.vehicle_setup.id), "name": item.vehicle_setup.name} if item.vehicle_setup else None,
                "notes": item.notes,
                "session": {"id": str(item.session.id), "name": item.session.name, "status": item.session.status} if item.session else None,
            }
            for item in items
        ]
    return d


async def list_run_plans(args: dict, ctx: ToolContext) -> ToolResult:
    from django.db.models import Count

    qs = RunPlan.objects.filter(user_id=ctx.user_id).annotate(item_count=Count("items")).select_related("event")
    if args.get("eventId"):
        qs = qs.filter(event_id=args["eventId"])
    plans = qs.order_by("-created_at")
    data = [
        {
            **_serialize_plan(p),
            "event": {"id": str(p.event.id), "name": p.event.name} if p.event else None,
            "_count": {"items": p.item_count},
        }
        for p in plans
    ]
    return ToolResult(success=True, data=data, message=f"Found {len(data)} run plans.")


async def get_run_plan(args: dict, ctx: ToolContext) -> ToolResult:
    try:
        plan = RunPlan.objects.select_related("event").get(id=args["runPlanId"], user_id=ctx.user_id)
    except RunPlan.DoesNotExist:
        return ToolResult(success=False, message="Run plan not found.")
    d = _serialize_plan(plan, include_items=True)
    d["event"] = {"id": str(plan.event.id), "name": plan.event.name} if plan.event else None
    return ToolResult(success=True, data=d)


async def create_run_plan(args: dict, ctx: ToolContext) -> ToolResult:
    items_data = args.get("items") or []
    plan = RunPlan.objects.create(
        user_id=ctx.user_id,
        name=args["name"],
        description=args.get("description") or None,
        event_id=args.get("eventId") or None,
        status="draft",
    )
    for i, item in enumerate(items_data):
        RunPlanItem.objects.create(
            run_plan=plan,
            order=i,
            session_name=item["sessionName"],
            vehicle_id=item.get("vehicleId") or None,
            vehicle_configuration_id=item.get("vehicleConfigurationId") or None,
            vehicle_setup_id=item.get("vehicleSetupId") or None,
            notes=item.get("notes") or None,
        )
    return ToolResult(
        success=True,
        data=_serialize_plan(plan, include_items=True),
        message=f'Created run plan "{plan.name}" with {len(items_data)} items.',
    )


async def update_run_plan(args: dict, ctx: ToolContext) -> ToolResult:
    try:
        plan = RunPlan.objects.get(id=args["runPlanId"], user_id=ctx.user_id)
    except RunPlan.DoesNotExist:
        return ToolResult(success=False, message="Run plan not found.")

    if "name" in args:
        plan.name = args["name"]
    if "description" in args:
        plan.description = args["description"]
    if "status" in args:
        plan.status = args["status"]
    plan.save()

    if "items" in args:
        plan.items.all().delete()
        for i, item in enumerate(args["items"]):
            RunPlanItem.objects.create(
                run_plan=plan,
                order=i,
                session_name=item["sessionName"],
                vehicle_id=item.get("vehicleId") or None,
                vehicle_configuration_id=item.get("vehicleConfigurationId") or None,
                vehicle_setup_id=item.get("vehicleSetupId") or None,
                notes=item.get("notes") or None,
            )

    return ToolResult(success=True, data=_serialize_plan(plan, include_items=True), message=f'Updated run plan "{plan.name}".')


async def delete_run_plan(args: dict, ctx: ToolContext) -> ToolResult:
    try:
        plan = RunPlan.objects.get(id=args["runPlanId"], user_id=ctx.user_id)
    except RunPlan.DoesNotExist:
        return ToolResult(success=False, message="Run plan not found.")
    name = plan.name
    plan.delete()
    return ToolResult(success=True, message=f'Deleted run plan "{name}".')


handlers = {
    "listRunPlans": list_run_plans,
    "getRunPlan": get_run_plan,
    "createRunPlan": create_run_plan,
    "updateRunPlan": update_run_plan,
    "deleteRunPlan": delete_run_plan,
}

register_tools(definitions, handlers)
