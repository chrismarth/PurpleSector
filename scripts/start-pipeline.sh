#!/bin/bash
# DEPRECATED: This script is now integrated into start-dev.sh
# Please use: ./scripts/start-dev.sh instead
#
# This script is kept for backwards compatibility but will be removed in the future.

echo "⚠️  DEPRECATED: start-pipeline.sh is deprecated"
echo "Please use: ./scripts/start-dev.sh instead"
echo ""
echo "Redirecting to start-dev.sh in 3 seconds..."
sleep 3

./scripts/start-dev.sh
exit 0

# ── OLD IMPLEMENTATION (NO LONGER USED) ────────────────────────────────

set -e

echo "═══════════════════════════════════════════════════"
echo "  Starting PurpleSector Telemetry Pipeline"
echo "═══════════════════════════════════════════════════"
echo ""

# Start Docker services
echo "Step 1: Starting Docker services..."
echo "────────────────────────────────────────────────────"
docker compose -f docker-compose.dev.yml up -d

echo ""
echo "Step 2: Waiting for services to be healthy..."
echo "────────────────────────────────────────────────────"
sleep 5

echo ""
echo "Step 3: Initializing RisingWave schema..."
echo "────────────────────────────────────────────────────"
./scripts/init-risingwave.sh

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Pipeline Started Successfully!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Services running:"
echo "  • Redpanda (Kafka)     → localhost:9092"
echo "  • RisingWave (SQL)     → localhost:4566"
echo "  • Redis                → localhost:6379"
echo "  • WebSocket Server     → localhost:8080"
echo "  • gRPC Gateway         → localhost:50051"
echo "  • Trino                → localhost:8083"
echo "  • MinIO (S3)           → localhost:9000"
echo ""
echo "Next steps:"
echo "  • Start demo replay: cd rust && cargo run -p ps-demo-replay"
echo "  • Or start your collector to begin streaming telemetry"
echo ""
