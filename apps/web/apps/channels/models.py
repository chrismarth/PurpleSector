import uuid

from django.db import models
from django.conf import settings


class MathChannel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="math_channels",
        db_column="userId",
    )
    label = models.CharField(max_length=255)
    unit = models.CharField(max_length=64)
    expression = models.TextField()
    inputs = models.TextField()
    validated = models.BooleanField(default=False)
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "MathChannel"
        managed = True

    def __str__(self) -> str:
        return self.label
