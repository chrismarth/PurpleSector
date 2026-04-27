import uuid

from django.db import models
from django.conf import settings


class AgentConversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="agent_conversations",
        db_column="userId",
    )
    title = models.CharField(max_length=255, blank=True, null=True)
    summary = models.TextField(blank=True, null=True)
    context = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "AgentConversation"
        managed = True

    def __str__(self) -> str:
        return self.title or f"Conversation {self.id}"


class AgentMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        AgentConversation, on_delete=models.CASCADE, related_name="messages",
        db_column="conversationId",
    )
    role = models.CharField(max_length=32)
    content = models.TextField()
    tool_calls = models.TextField(blank=True, null=True, db_column="toolCalls")
    tool_results = models.TextField(blank=True, null=True, db_column="toolResults")
    plan = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")

    class Meta:
        db_table = "AgentMessage"
        managed = True

    def __str__(self) -> str:
        return f"{self.role}: {self.content[:50]}"
