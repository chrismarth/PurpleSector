#!/bin/bash
# Initialize Postgres with application-level SQL (triggers, functions, etc.)
# that cannot be expressed in the Prisma schema.
#
# Run this AFTER `prisma db push` so that application tables already exist.
# Safe to re-run: all statements use CREATE OR REPLACE / DROP IF EXISTS.

set -e

POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_USER=${POSTGRES_USER:-purplesector}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-devpassword}
POSTGRES_DB=${POSTGRES_DB:-purplesector}

# Helper: run SQL (from stdin) against the app Postgres DB.
# Prefers local psql, falls back to docker exec with stdin.
psql_stdin() {
  if psql --version &> /dev/null 2>&1; then
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
      -U "$POSTGRES_USER" -d "$POSTGRES_DB"
  else
    docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" ps-postgres \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
  fi
}

echo "Applying Postgres SQL migrations..."
for sql_file in infra/postgres/migrations/*.sql; do
  [ -f "$sql_file" ] || continue
  echo "  → $(basename $sql_file)"
  psql_stdin < "$sql_file"
done

echo "✓ Postgres SQL migrations applied"
