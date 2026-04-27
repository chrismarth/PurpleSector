#!/usr/bin/env python3
"""
Database health check — replaces the old check-db-health.ts Prisma script.
Run from the repo root: python scripts/check-db-health.py
"""
import os
import sys
import django

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "web"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "purplesector.settings")
django.setup()

from django.db import connection
from apps.events.models import Event, Session
from apps.telemetry.models import Lap


def check():
    print("Checking database health...")

    event_count = Event.objects.count()
    session_count = Session.objects.count()
    lap_count = Lap.objects.count()

    print(f"  Events:   {event_count}")
    print(f"  Sessions: {session_count}")
    print(f"  Laps:     {lap_count}")

    orphaned_sessions = Session.objects.filter(event__isnull=True).count()
    if orphaned_sessions:
        print(f"  ⚠️  Orphaned sessions (no event): {orphaned_sessions}")

    orphaned_laps = Lap.objects.filter(session__isnull=True).count()
    if orphaned_laps:
        print(f"  ⚠️  Orphaned laps (no session): {orphaned_laps}")

    sessions_without_laps = Session.objects.filter(laps__isnull=True).count()
    print(f"  Sessions without laps: {sessions_without_laps}")

    if not orphaned_sessions and not orphaned_laps:
        print("✅ Database looks healthy")
    else:
        print("❌ Database has integrity issues")
        sys.exit(1)


if __name__ == "__main__":
    check()
