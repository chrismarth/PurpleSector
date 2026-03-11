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

# Check if psql is installed, if not use docker exec with nc to test connectivity
if ! command -v psql &> /dev/null; then
  echo "psql not found, using docker to test connectivity..."
  for i in $(seq 1 $MAX_RETRIES); do
    if docker run --rm --network host postgres:15-alpine psql -h $RISINGWAVE_HOST -p $RISINGWAVE_PORT -U $RISINGWAVE_USER -d $RISINGWAVE_DB -c "SELECT 1" > /dev/null 2>&1; then
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
  
  # Run SQL migrations using docker
  echo "Running RisingWave migrations..."
  for sql_file in infra/risingwave/*.sql; do
    echo "  → $(basename $sql_file)"
    docker run --rm --network host -v "$(pwd):/workspace" -w /workspace postgres:15-alpine psql -h $RISINGWAVE_HOST -p $RISINGWAVE_PORT -U $RISINGWAVE_USER -d $RISINGWAVE_DB -f "$sql_file"
  done
else
  # Use local psql
  for i in $(seq 1 $MAX_RETRIES); do
    if psql -h $RISINGWAVE_HOST -p $RISINGWAVE_PORT -U $RISINGWAVE_USER -d $RISINGWAVE_DB -c "SELECT 1" > /dev/null 2>&1; then
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
  
  # Run SQL migrations
  echo "Running RisingWave migrations..."
  for sql_file in infra/risingwave/*.sql; do
    echo "  → $(basename $sql_file)"
    psql -h $RISINGWAVE_HOST -p $RISINGWAVE_PORT -U $RISINGWAVE_USER -d $RISINGWAVE_DB -f "$sql_file"
  done
fi

echo "✓ RisingWave schema initialized successfully"
