"""
Create default development users if they don't already exist.

Safe to run repeatedly — skips users that already exist.

Usage:
    python manage.py seed_dev_users
"""

from django.core.management.base import BaseCommand

from apps.core.models import User


DEV_USERS = [
    {
        "username": "admin",
        "password": "password",
        "full_name": "Admin User",
        "role": "ADMIN",
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "username": "user",
        "password": "password",
        "full_name": "Demo User",
        "role": "USER",
    },
]


class Command(BaseCommand):
    help = "Seed development users (admin/password, user/password)"

    def handle(self, *args, **options):
        for spec in DEV_USERS:
            username = spec["username"]
            if User.objects.filter(username=username).exists():
                self.stdout.write(f"  User '{username}' already exists — skipping")
                continue

            user = User(
                username=username,
                full_name=spec["full_name"],
                role=spec.get("role", "USER"),
                is_staff=spec.get("is_staff", False),
                is_superuser=spec.get("is_superuser", False),
            )
            user.set_password(spec["password"])
            user.save()
            self.stdout.write(self.style.SUCCESS(f"  Created user '{username}' ({spec['role']})"))
