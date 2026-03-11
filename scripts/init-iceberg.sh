#!/bin/bash
# Initialize Iceberg via LakeKeeper REST catalog
# This creates the catalog namespace that both RisingWave and Trino will use

set -e

echo "Initializing Iceberg with LakeKeeper..."

# Wait for LakeKeeper to be ready
MAX_RETRIES=30
for i in $(seq 1 $MAX_RETRIES); do
  if timeout 1 bash -c '</dev/tcp/localhost/8181' 2>/dev/null; then
    echo "✓ LakeKeeper is ready"
    break
  fi
  
  if [ $i -eq $MAX_RETRIES ]; then
    echo "✗ LakeKeeper failed to start after $MAX_RETRIES attempts"
    exit 1
  fi
  
  echo "Waiting for LakeKeeper... (attempt $i/$MAX_RETRIES)"
  sleep 2
done

# Bootstrap LakeKeeper (unlocks the API)
echo "Bootstrapping LakeKeeper..."
BOOTSTRAP_RESULT=$(curl -s -w "%{http_code}" -X POST http://localhost:8181/management/v1/bootstrap \
     -H 'Content-Type: application/json' \
     -d '{"accept-terms-of-use": true}')
BOOTSTRAP_CODE="${BOOTSTRAP_RESULT: -3}"
if [ "$BOOTSTRAP_CODE" = "200" ] || [ "$BOOTSTRAP_CODE" = "201" ]; then
  echo "✓ LakeKeeper bootstrapped"
elif [ "$BOOTSTRAP_CODE" = "400" ]; then
  echo "✓ LakeKeeper already bootstrapped"
else
  echo "  Bootstrap returned: $BOOTSTRAP_CODE"
fi

# Create warehouse
echo "Creating warehouse..."
WAREHOUSE_RESULT=$(curl -s -w "%{http_code}" -X POST http://localhost:8181/management/v1/warehouse \
     -H 'Content-Type: application/json' \
     -d '{
       "warehouse-name": "purplesector-iceberg",
       "storage-profile": {
         "type": "s3",
         "bucket": "purplesector-iceberg",
         "region": "us-east-1",
         "endpoint": "http://minio:9000",
         "path-style-access": true,
         "sts-enabled": false
       },
       "storage-credential": {
         "type": "s3",
         "credential-type": "access-key",
         "aws-access-key-id": "minioadmin",
         "aws-secret-access-key": "minioadmin"
       }
     }')
WAREHOUSE_CODE="${WAREHOUSE_RESULT: -3}"
if [ "$WAREHOUSE_CODE" = "200" ] || [ "$WAREHOUSE_CODE" = "201" ]; then
  echo "✓ Warehouse created"
elif [ "$WAREHOUSE_CODE" = "409" ]; then
  echo "✓ Warehouse already exists"
else
  echo "  Warehouse creation returned: $WAREHOUSE_CODE"
fi

# Wait for Trino to be ready
for i in $(seq 1 30); do
  if docker exec ps-trino trino --execute "SELECT 1" > /dev/null 2>&1; then
    echo "✓ Trino is ready"
    break
  fi
  
  if [ $i -eq 30 ]; then
    echo "✗ Trino failed to start after 30 attempts"
    exit 1
  fi
  
  echo "Waiting for Trino... (attempt $i/30)"
  sleep 2
done

# Create Iceberg namespace via Trino (REST catalog)
# Tables will be created automatically by RisingWave sinks with correct schemas
echo "Creating Iceberg namespace..."
docker exec ps-trino trino --execute "
CREATE SCHEMA IF NOT EXISTS iceberg.telemetry;
" 2>&1 | grep -v "^$" || true

echo "✓ Iceberg namespace initialized (tables will be created by RisingWave)"
