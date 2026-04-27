import uuid

from django.db import models
from django.conf import settings


class ApiToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="api_tokens",
        db_column="userId",
    )
    name = models.CharField(max_length=255)
    token_hash = models.CharField(max_length=255, unique=True, db_column="tokenHash")
    scopes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    last_used_at = models.DateTimeField(blank=True, null=True, db_column="lastUsedAt")
    revoked_at = models.DateTimeField(blank=True, null=True, db_column="revokedAt")

    class Meta:
        db_table = "ApiToken"
        managed = True

    def __str__(self) -> str:
        return f"{self.name} ({self.user_id})"
