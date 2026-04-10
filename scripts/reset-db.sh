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
echo "🗑️  Removing existing database..."

echo "🔧 Ensuring Postgres extension pgcrypto exists (for gen_random_uuid)..."
docker exec ps-postgres psql -U purplesector -d purplesector -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" > /dev/null

echo "🧩 Merging plugin Prisma schemas..."
npx tsx scripts/merge-plugin-schemas.ts > /dev/null

echo "📊 Pushing schema to database..."
npx prisma db push --force-reset --schema=packages/db-prisma/prisma/schema.generated.prisma

echo "🔄 Generating Prisma Client..."
npx prisma generate --schema=packages/db-prisma/prisma/schema.generated.prisma

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
