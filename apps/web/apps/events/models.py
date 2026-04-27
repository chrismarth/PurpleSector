import uuid

from django.db import models
from django.conf import settings


class Event(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="events",
        db_column="userId",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    start_date = models.DateTimeField(blank=True, null=True, db_column="startDate")
    end_date = models.DateTimeField(blank=True, null=True, db_column="endDate")
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "Event"
        managed = True
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["user"]),
        ]

    def __str__(self) -> str:
        return self.name


class Session(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sessions",
        db_column="userId",
    )
    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="sessions",
        db_column="eventId",
    )
    name = models.CharField(max_length=255)
    source = models.CharField(max_length=32)
    status = models.CharField(max_length=32, default="active")
    started = models.BooleanField(default=False)
    read_access = models.CharField(max_length=32, default="PRIVATE", db_column="readAccess")
    read_access_org_id = models.CharField(max_length=255, blank=True, null=True, db_column="readAccessOrgId")
    tags = models.TextField(blank=True, null=True)
    plot_configs = models.TextField(blank=True, null=True, db_column="plotConfigs")
    vehicle = models.ForeignKey(
        "vehicles.Vehicle", on_delete=models.SET_NULL, blank=True, null=True,
        related_name="sessions", db_column="vehicleId",
    )
    vehicle_configuration = models.ForeignKey(
        "vehicles.VehicleConfiguration", on_delete=models.SET_NULL, blank=True, null=True,
        related_name="sessions", db_column="vehicleConfigurationId",
    )
    vehicle_setup = models.ForeignKey(
        "vehicles.VehicleSetup", on_delete=models.SET_NULL, blank=True, null=True,
        related_name="sessions", db_column="vehicleSetupId",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "Session"
        managed = True

    def __str__(self) -> str:
        return self.name


class RunPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="run_plans",
        db_column="userId",
    )
    event = models.ForeignKey(
        Event, on_delete=models.SET_NULL, blank=True, null=True,
        related_name="run_plans", db_column="eventId",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=32, default="draft")
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "RunPlan"
        managed = True

    def __str__(self) -> str:
        return self.name


class RunPlanItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run_plan = models.ForeignKey(
        RunPlan, on_delete=models.CASCADE, related_name="items",
        db_column="runPlanId",
    )
    order = models.IntegerField()
    session_name = models.CharField(max_length=255, db_column="sessionName")
    vehicle = models.ForeignKey(
        "vehicles.Vehicle", on_delete=models.SET_NULL, blank=True, null=True,
        related_name="run_plan_items", db_column="vehicleId",
    )
    vehicle_configuration = models.ForeignKey(
        "vehicles.VehicleConfiguration", on_delete=models.SET_NULL, blank=True, null=True,
        related_name="run_plan_items", db_column="vehicleConfigurationId",
    )
    vehicle_setup = models.ForeignKey(
        "vehicles.VehicleSetup", on_delete=models.SET_NULL, blank=True, null=True,
        related_name="run_plan_items", db_column="vehicleSetupId",
    )
    notes = models.TextField(blank=True, null=True)
    session = models.OneToOneField(
        Session, on_delete=models.SET_NULL, blank=True, null=True,
        related_name="run_plan_item", db_column="sessionId",
    )
    status = models.CharField(max_length=32, default="planned")
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")

    class Meta:
        db_table = "RunPlanItem"
        managed = True

    def __str__(self) -> str:
        return f"{self.run_plan_id} #{self.order}: {self.session_name}"
