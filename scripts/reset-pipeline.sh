#!/bin/bash
# Reset the entire telemetry pipeline
# Clears all data from Redpanda, RisingWave, and Redis, then reinitializes schemas

set -e

echo "═══════════════════════════════════════════════════"
echo "  PurpleSector Pipeline Reset"
echo "═══════════════════════════════════════════════════"
echo ""
echo "This will:"
echo "  1. Clear all data from Redpanda topics"
echo "  2. Drop and recreate RisingWave sources/views"
echo "  3. Clear Redis streams and pub/sub channels"
echo "  4. Reinitialize RisingWave schema"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1: Clearing Redpanda topics..."
echo "────────────────────────────────────────────────────"

# Delete and recreate telemetry-batches topic
docker exec ps-redpanda rpk topic delete telemetry-batches 2>/dev/null || echo "  Topic doesn't exist, skipping delete"
docker exec ps-redpanda rpk topic create telemetry-batches --partitions 3 --replicas 1
echo "  ✓ telemetry-batches topic reset"

echo ""
echo "Step 2: Clearing RisingWave..."
echo "────────────────────────────────────────────────────"

# Drop all materialized views and sources
docker run --rm --network host postgres:15-alpine psql -h localhost -p 4566 -U root -d dev <<EOF
-- Drop materialized views (cascade to dependent objects)
DROP MATERIALIZED VIEW IF EXISTS channel_acceleration CASCADE;
DROP MATERIALIZED VIEW IF EXISTS telemetry_1s CASCADE;
DROP MATERIALIZED VIEW IF EXISTS telemetry_samples CASCADE;

-- Drop sources
DROP SOURCE IF EXISTS telemetry_batches CASCADE;

-- Drop sinks
DROP SINK IF EXISTS telemetry_redis_sink CASCADE;
DROP SINK IF EXISTS telemetry_iceberg_sink CASCADE;
DROP SINK IF EXISTS telemetry_1s_iceberg_sink CASCADE;

-- Drop math channel table
DROP TABLE IF EXISTS math_channel_rules CASCADE;
EOF

echo "  ✓ RisingWave objects dropped"

echo ""
echo "Step 3: Clearing Redis..."
echo "────────────────────────────────────────────────────"

# Clear all telemetry-related keys
docker exec ps-redis redis-cli --scan --pattern "telemetry:*" | xargs -r docker exec -i ps-redis redis-cli DEL 2>/dev/null || true
echo "  ✓ Redis telemetry streams cleared"

echo ""
echo "Step 4: Reinitializing RisingWave schema..."
echo "────────────────────────────────────────────────────"

# Run initialization script
./scripts/init-risingwave.sh

echo ""
echo "Step 5: Restarting services..."
echo "────────────────────────────────────────────────────"

# Restart Redis bridge and WebSocket server to clear any cached state
docker restart ps-redis-bridge ps-ws-server

echo "  ✓ Services restarted"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Pipeline Reset Complete!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "The pipeline is now ready for fresh data."
echo "Start your collectors or demo replay to begin streaming."
echo ""
