#!/bin/bash
#
# Start the Rust demo telemetry replay tool
# This sends demo telemetry data to the gRPC gateway for cloud pipeline testing
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Environment variables
export KAFKA_BROKERS="${KAFKA_BROKERS:-localhost:9092}"
export KAFKA_TOPIC="${KAFKA_TOPIC:-telemetry-batches}"
export GRPC_GATEWAY="${GRPC_GATEWAY:-http://localhost:50051}"
export RUST_LOG="${RUST_LOG:-info,ps_demo_replay=debug,ps_telemetry_core=debug}"
export DEMO_USER_ID="${DEMO_USER_ID:-demo-user}"
export DEMO_SESSION_ID="${DEMO_SESSION_ID:-demo-session}"

# Demo data file path (absolute)
DEMO_DATA_FILE="${PROJECT_ROOT}/collectors/demo-data/demo-telemetry.json"

echo "🚀 Starting Rust Demo Replay"
echo "   Project Root: $PROJECT_ROOT"
echo "   Demo Data: $DEMO_DATA_FILE"
echo "   User ID: $DEMO_USER_ID"
echo "   Session ID: $DEMO_SESSION_ID"
echo "   gRPC Gateway: $GRPC_GATEWAY"
echo "   Kafka Brokers: $KAFKA_BROKERS"
echo "   Kafka Topic: $KAFKA_TOPIC"
echo ""

# Check if demo data exists
if [ ! -f "$DEMO_DATA_FILE" ]; then
    echo "❌ Demo data file not found: $DEMO_DATA_FILE"
    echo "   Run: npm run generate-demo"
    exit 1
fi

# Check if gRPC gateway is running
if ! nc -z localhost 50051 2>/dev/null; then
    echo "⚠️  Warning: gRPC gateway not reachable at localhost:50051"
    echo "   Make sure Docker infrastructure is running: docker compose -f docker-compose.dev.yml up -d"
    echo ""
fi

# Build and run with absolute path to demo data
cd "$PROJECT_ROOT/rust"
cargo run --release -p ps-demo-replay -- "$DEMO_DATA_FILE"
