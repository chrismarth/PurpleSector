import uuid

from django.db import models
from django.conf import settings


class Lap(models.Model):
    """
    Mapped to Prisma ``laps`` table (note: Prisma uses @@map("laps")).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        "events.Session", on_delete=models.CASCADE, related_name="laps",
        db_column="session_id",
    )
    lap_number = models.IntegerField(db_column="lap_number")
    lap_time = models.FloatField(blank=True, null=True, db_column="lap_time")
    analyzed = models.BooleanField(default=False)
    suggestions = models.TextField(blank=True, null=True)
    driver_comments = models.TextField(blank=True, null=True, db_column="driver_comments")
    tags = models.TextField(blank=True, null=True)
    plot_configs = models.TextField(blank=True, null=True, db_column="plot_configs")
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")

    class Meta:
        db_table = "laps"
        managed = True
        unique_together = [("session", "lap_number")]

    def __str__(self) -> str:
        return f"Lap {self.lap_number} (session {self.session_id})"


class ChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_messages",
        db_column="userId",
    )
    lap = models.ForeignKey(
        Lap, on_delete=models.CASCADE, related_name="chat_messages",
        db_column="lapId",
    )
    role = models.CharField(max_length=32)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")

    class Meta:
        db_table = "ChatMessage"
        managed = True

    def __str__(self) -> str:
        return f"{self.role}: {self.content[:50]}"
