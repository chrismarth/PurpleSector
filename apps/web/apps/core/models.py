import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user extending Django's AbstractUser.

    Mapped to the existing Prisma-created ``User`` table. Uses UUID primary key
    to match the Prisma schema (``gen_random_uuid()``).

    Prisma fields mapped:
      id         → id (UUID pk)
      username   → username (inherited from AbstractUser)
      fullName   → full_name
      avatarUrl  → avatar_url
      role       → role
      createdAt  → created_at (replaces AbstractUser.date_joined)
      updatedAt  → updated_at
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255, db_column="fullName")
    avatar_url = models.CharField(max_length=512, blank=True, null=True, db_column="avatarUrl")
    role = models.CharField(max_length=32, default="USER")
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    # AbstractUser fields we keep: username, password, email, is_active, etc.
    # AbstractUser fields we override to avoid conflicts:
    first_name = None  # type: ignore[assignment]
    last_name = None  # type: ignore[assignment]
    date_joined = None  # type: ignore[assignment]

    REQUIRED_FIELDS: list[str] = ["full_name"]

    class Meta:
        db_table = "User"
        managed = True

    def __str__(self) -> str:
        return self.username


class UserSettings(models.Model):
    """1:1 settings for a user. PK is the user's UUID."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, related_name="settings",
        db_column="userId",
    )
    theme = models.CharField(max_length=16, blank=True, null=True)
    data = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "UserSettings"
        managed = True

    def __str__(self) -> str:
        return f"Settings({self.user_id})"


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "Organization"
        managed = True

    def __str__(self) -> str:
        return self.name


class OrganizationMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="members",
        db_column="organizationId",
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="org_memberships",
        db_column="userId",
    )
    role = models.CharField(max_length=32)
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")

    class Meta:
        db_table = "OrganizationMember"
        managed = True
        unique_together = [("organization", "user")]

    def __str__(self) -> str:
        return f"{self.user_id} @ {self.organization_id} ({self.role})"


class Group(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="groups",
        db_column="organizationId",
    )
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")
    updated_at = models.DateTimeField(auto_now=True, db_column="updatedAt")

    class Meta:
        db_table = "Group"
        managed = True

    def __str__(self) -> str:
        return self.name


class GroupMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(
        Group, on_delete=models.CASCADE, related_name="members",
        db_column="groupId",
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="group_memberships",
        db_column="userId",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_column="createdAt")

    class Meta:
        db_table = "GroupMember"
        managed = True
        unique_together = [("group", "user")]

    def __str__(self) -> str:
        return f"{self.user_id} in group {self.group_id}"
