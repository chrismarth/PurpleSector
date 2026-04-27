import uuid

from django.db import models
from django.conf import settings


class Vehicle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="vehicles",
        db_column="userId",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    in_service_date = models.DateTimeField(blank=True, null=True, db_column="inServiceDate")
    out_of_service_date = models.DateTimeField(blank=True, null=True, db_column="outOfServiceDate")
    tags = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "Vehicle"
        managed = True

    def __str__(self) -> str:
        return self.name


class VehicleConfiguration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="vehicle_configurations",
        db_column="userId",
    )
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.CASCADE, related_name="configurations",
        db_column="vehicleId",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    parts = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "VehicleConfiguration"
        managed = True

    def __str__(self) -> str:
        return f"{self.vehicle.name} - {self.name}"


class VehicleSetup(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="vehicle_setups",
        db_column="userId",
    )
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.CASCADE, related_name="setups",
        db_column="vehicleId",
    )
    vehicle_configuration = models.ForeignKey(
        VehicleConfiguration, on_delete=models.SET_NULL, blank=True, null=True,
        related_name="setups", db_column="vehicleConfigurationId",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    parameters = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "VehicleSetup"
        managed = True

    def __str__(self) -> str:
        return f"{self.vehicle.name} - {self.name}"
