# Development Environment Setup

## Overview

Purple Sector provides a complete development environment that runs the entire
streaming data pipeline locally with Docker — **no game required!**

- **One-command startup** — `./scripts/start-dev.sh`
- **No game needed** — replay demo data via `ps-demo-replay`
- **Full cloud pipeline** — Redpanda, RisingWave, Redis, MinIO, LakeKeeper, Trino, gRPC gateway
- **Cross-platform** — Linux, macOS, Windows (WSL)

---

## Quick Start

```bash
# Start Docker infrastructure + PM2 services
./scripts/start-dev.sh

# (Optional) Replay demo telemetry through the pipeline
cd rust && cargo run -p ps-demo-replay -- --file ../public/demo-telemetry.json
```

**Open:** http://localhost:3000

### Stop

```bash
./scripts/stop-dev.sh              # Stop PM2 + Docker
./scripts/stop-dev.sh --keep-docker  # Stop PM2 only, keep infra running
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Docker + Compose | Latest | Infrastructure containers |
| Node.js | 18+ | PM2 services, Vite dev server |
| Rust toolchain | Stable | ps-demo-replay, ps-tray-app |
| PM2 | Latest | Process manager (`npm i -g pm2`) |
| System packages | — | `protobuf-compiler cmake libcurl4-openssl-dev libssl-dev` |

---

## Initial Setup

```bash
git clone <your-repo-url>
cd PurpleSector
npm install
cp .env.example .env
```

Edit `.env`:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/purplesector"
WS_PORT=8080
LOG_LEVEL=info
```

Setup database:
```bash
npm run db:push
```

---

## What Gets Started

### Docker (`docker-compose.dev.yml`)

| Service | Ports | Description |
|---------|-------|-------------|
| Redpanda | 9092, 8081, 8082 | Kafka-compatible broker |
| Redpanda Console | 8090 | Web UI for topics/messages |
| RisingWave | 4566, 5691 | Stream processing + Dashboard |
| Math Channel UDF | 8815 | Python expression evaluator |
| Redis | 6379 | Live telemetry streams |
| MinIO | 9000, 9001 | S3-compatible storage |
| LakeKeeper | 8181 | Iceberg REST catalog |
| Trino | 8083 | Unified query layer |
| Postgres | 5432 | App metadata DB |

### PM2 (`ecosystem.dev.config.js`)

| Service | Purpose |
|---------|---------|
| `vite-dev` | Vite dev server (:5173) |

---

## Data Flow

```
Sim / Demo Replay
    │ gRPC
    ▼
gRPC Gateway (:50051)
    │ Protobuf
    ▼
Redpanda (:9092)
    │
    ▼
RisingWave (:4566)
    │ Materialized Views + Sinks
    ├──→ Redis Pub/Sub + Streams (live)
    │        │
    │        ▼
    │   Redis WS Server (:8080)
    │        │ WebSocket
    │        ▼
    │   Django + Vite Frontend (:3000)
    │
    └──→ Iceberg raw_samples via LakeKeeper + MinIO (archive)
             │
             ▼
         Trino (:8083)
             │
             ▼
       Django archived lap APIs
```

---

## Managing Services

```bash
# PM2 (Vite dev server)
pm2 status                     # View service status
pm2 logs vite-dev              # Vite dev server logs
pm2 restart all                # Restart Vite dev server

# Docker services (including WS server)
docker compose -f docker-compose.dev.yml logs -f ws-server  # WS server logs
docker compose -f docker-compose.dev.yml restart ws-server  # Restart WS server
```

---

## Injecting Test Data

Without a sim running, use the Rust demo replayer:

```bash
cd rust && cargo run -p ps-demo-replay -- --file ../public/demo-telemetry.json
```

Or generate fresh demo data:
```bash
node scripts/generate-demo-telemetry.js
```

---

## Switching to a Real Game

```bash
# Rust tray app (recommended — captures AC/ACC/Demo, streams via gRPC)
cd rust && cargo run -p ps-tray-app

# Or replay demo data through the cloud pipeline
cd rust && cargo run -p ps-demo-replay -- ../collectors/demo-data/demo-telemetry.json
```

---

## Accessing Services

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Redpanda Console** | http://localhost:8090 |
| **RisingWave Dashboard** | http://localhost:5691 |
| **MinIO Console** | http://localhost:9001 |
| **Prisma Studio** | `npm run db:studio` |
| **WebSocket** | ws://localhost:8080 |

---

## Troubleshooting

### Docker not running

```bash
sudo systemctl start docker
```

### Database connection failed

```bash
docker ps | grep postgres
npm run db:push
```

### No telemetry in frontend

1. Check Redis WS server: `docker compose -f docker-compose.dev.yml logs ws-server`
2. Check Redpanda has messages: http://localhost:8090
3. Check RisingWave MVs: `psql -h localhost -p 4566 -d dev -c "SELECT count(*) FROM telemetry_samples;"`
4. Check browser console for WebSocket connection

### Port conflicts

Change ports in `.env`:
- `WS_PORT` (default 8080 — set via docker-compose.dev.yml)
- `PORT` (default 3000)

---

## Resource Usage (Typical)

| Component | CPU | Memory |
|-----------|-----|--------|
| Docker stack (incl. WS server) | 10-20% | ~2 GB |
| Vite (dev) | 10-20% | 200 MB |
| **Total** | **~30%** | **~2.2 GB** |
