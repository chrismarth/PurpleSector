#!/bin/bash

# Database Reset Script for Purple Sector
# This script safely resets the database and applies migrations

set -e

echo "═══════════════════════════════════════════════════"
echo "  Purple Sector - Database Reset"
echo "═══════════════════════════════════════════════════"
echo ""

# Confirm with user
read -p "⚠️  This will DELETE all data. Are you sure? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Reset cancelled"
    exit 0
fi

echo ""
echo "🗑️  Dropping and recreating the database..."
docker exec ps-postgres psql -U purplesector -d postgres -c "DROP DATABASE IF EXISTS purplesector;" > /dev/null
docker exec ps-postgres psql -U purplesector -d postgres -c "CREATE DATABASE purplesector;" > /dev/null

echo "🔧 Ensuring Postgres extensions..."
docker exec ps-postgres psql -U purplesector -d purplesector -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" > /dev/null

echo "📊 Applying Django migrations..."
cd apps/web && .venv/bin/python manage.py migrate
cd ../..

echo "🔧 Applying Postgres SQL migrations (triggers, functions)..."
./scripts/init-postgres.sh

echo ""
echo "✅ Database reset complete!"
echo ""
echo "Next steps:"
echo "  1. Restart your dev server: npm run dev"
echo "  2. Ensure Docker infrastructure is running: docker compose -f docker-compose.dev.yml up -d"
echo "  3. Create a new event and session"
echo ""
