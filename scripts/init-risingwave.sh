#!/bin/bash
# Initialize RisingWave schema for telemetry pipeline
# This script waits for RisingWave to be ready and then runs all SQL migrations

set -e

RISINGWAVE_HOST=${RISINGWAVE_HOST:-localhost}
RISINGWAVE_PORT=${RISINGWAVE_PORT:-4566}
RISINGWAVE_USER=${RISINGWAVE_USER:-root}
RISINGWAVE_DB=${RISINGWAVE_DB:-dev}
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "Waiting for RisingWave to be ready..."

# Helper: run a psql command against RisingWave.
# Prefers local psql, falls back to docker container network, then host network.
psql_cmd() {
  if psql --version &> /dev/null 2>&1; then
    psql -h $RISINGWAVE_HOST -p $RISINGWAVE_PORT -U $RISINGWAVE_USER -d $RISINGWAVE_DB "$@"
  elif docker inspect ps-risingwave > /dev/null 2>&1; then
    docker run --rm --network container:ps-risingwave \
      -v "$(pwd):/workspace" -w /workspace \
      postgres:15-alpine psql -h localhost -p $RISINGWAVE_PORT -U $RISINGWAVE_USER -d $RISINGWAVE_DB "$@"
  else
    docker run --rm --network host \
      -v "$(pwd):/workspace" -w /workspace \
      postgres:15-alpine psql -h $RISINGWAVE_HOST -p $RISINGWAVE_PORT -U $RISINGWAVE_USER -d $RISINGWAVE_DB "$@"
  fi
}

for i in $(seq 1 $MAX_RETRIES); do
  if psql_cmd -c "SELECT 1" > /dev/null 2>&1; then
    echo "✓ RisingWave is ready"
    break
  fi

  if [ $i -eq $MAX_RETRIES ]; then
    echo "✗ RisingWave failed to start after $MAX_RETRIES attempts"
    exit 1
  fi

  echo "Waiting for RisingWave... (attempt $i/$MAX_RETRIES)"
  sleep $RETRY_INTERVAL
done

echo "Running RisingWave migrations..."
for sql_file in infra/risingwave/*.sql; do
  echo "  → $(basename $sql_file)"
  psql_cmd -f "$sql_file"
done

echo "✓ RisingWave schema initialized successfully"
