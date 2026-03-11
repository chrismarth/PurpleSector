#!/bin/bash
# Trim Redis Streams to keep only recent telemetry data
# Run this periodically (e.g., every 5 minutes) to prevent memory issues

set -e

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
MAX_STREAM_LENGTH="${MAX_STREAM_LENGTH:-5000}"  # Keep ~83 seconds at 60Hz

echo "Trimming Redis Streams to max length: $MAX_STREAM_LENGTH"

# Get all telemetry stream keys
STREAM_KEYS=$(docker exec ps-redis redis-cli KEYS "telemetry:*:*" 2>/dev/null || echo "")

if [ -z "$STREAM_KEYS" ]; then
    echo "No telemetry streams found"
    exit 0
fi

# Trim each stream
for key in $STREAM_KEYS; do
    # Skip pub/sub channels (they start with telemetry:live:)
    if [[ $key == telemetry:live:* ]]; then
        continue
    fi
    
    # Get current length
    length=$(docker exec ps-redis redis-cli XLEN "$key" 2>/dev/null || echo "0")
    
    if [ "$length" -gt "$MAX_STREAM_LENGTH" ]; then
        echo "Trimming $key (current: $length, target: $MAX_STREAM_LENGTH)"
        docker exec ps-redis redis-cli XTRIM "$key" MAXLEN "~" "$MAX_STREAM_LENGTH" >/dev/null
    fi
done

echo "✓ Stream trimming complete"
