# Purple Sector Services

Node.js runtime services that run alongside the Docker infrastructure.

## Architecture

```
Docker (docker-compose.dev.yml):
  Redpanda          → Kafka-compatible message buffer (:9092)
  gRPC Gateway      → Telemetry ingress (:50051)
  RisingWave        → Stream processing (:4566)
  Math Channel UDF  → Python expression evaluator (:8815)
  Redis             → Live telemetry state (:6379)
  WS Server         → Redis → WebSocket → Frontend (:8080)
  MinIO             → S3-compatible storage (:9000)
  Trino             → Semantic query layer (:8083)
  Postgres          → App metadata DB (:5432)

PM2 (ecosystem.dev.config.js):
  Next.js app       → Frontend (:3000)
```

## Services

### Redis WebSocket Server

**File:** `redis-websocket-server.js`

Reads telemetry from Redis Streams (populated by RisingWave materialized views)
and pushes to frontend WebSocket clients in real-time.

**Data flow:** `RisingWave → Redis Streams → This Server → WebSocket → Frontend`

**Environment variables:**
- `REDIS_URL` — Redis connection URL (default: `redis://localhost:6379`)
- `WS_PORT` — WebSocket server port (default: `8080`)
- `WS_HOST` — WebSocket bind host (default: `0.0.0.0`)
- `BACKFILL_COUNT` — Entries to backfill on client connect (default: `1000`)
- `POLL_INTERVAL_MS` — Redis polling interval in ms (default: `50`)

**Usage:** Runs as a Docker container (`ps-ws-server`) via `docker-compose.dev.yml`.

## Development

### Quick Start

```bash
# Start everything (Docker infra + PM2 services)
./scripts/start-dev.sh

# Or manually:
docker compose -f docker-compose.dev.yml up -d
npx pm2 start ecosystem.dev.config.js
```

### Inject Test Data

```bash
# Rust demo replay → gRPC gateway → Redpanda → RisingWave
cd rust && cargo run -p ps-demo-replay
```

### Stop

```bash
./scripts/stop-dev.sh              # Stop everything
./scripts/stop-dev.sh --keep-docker  # Stop PM2 only
```

## Production

```bash
# WS server runs as a Docker container (ps-ws-server)
docker compose -f docker-compose.dev.yml logs -f ws-server

# Next.js runs via PM2
pm2 start ecosystem.config.js
pm2 logs nextjs-app
```

## Documentation

- [Cloud Pipeline](../docs/CLOUD_PIPELINE.md) — End-to-end architecture
- [Dev Environment](../docs/DEV_ENVIRONMENT.md) — Local setup guide
