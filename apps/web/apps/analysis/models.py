import uuid

from django.db import models
from django.conf import settings


class SavedAnalysisLayout(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="analysis_layouts",
        db_column="userId",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    layout = models.TextField()
    context = models.CharField(max_length=64, default="global")
    is_default = models.BooleanField(default=False, db_column="isDefault")
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "SavedAnalysisLayout"
        managed = True

    def __str__(self) -> str:
        return self.name
