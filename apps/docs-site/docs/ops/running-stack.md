# Running the Stack

This page describes how to start the full Purple Sector stack: Docker infrastructure, Node.js services, and the web app.

## One-Command Dev Environment

```bash
./scripts/start-dev.sh
```

This will:

1. Start Docker infrastructure (Redpanda, gRPC Gateway, RisingWave, Redis, MinIO, Trino, Postgres).
2. Wait for Redpanda and Postgres health checks.
3. Check database readiness.
4. Start PM2 services (Redis WebSocket Server, Next.js).

After startup, open: http://localhost:3000

See **Developer Guide → Development Environment** for details.

## Manual Startup

### 1. Start Docker Infrastructure

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 2. Start PM2 Services

```bash
npx pm2 start ecosystem.dev.config.js
```

### 3. Inject Test Data (No Game Required)

```bash
cd rust && cargo run -p ps-demo-replay -- --file ../public/demo-telemetry.json
```

### 4. Start a Live Collector (With Game)

```bash
# Rust tray app (captures AC/ACC/Demo, streams via gRPC)
cd rust && cargo run -p ps-tray-app

# Or replay demo data through the pipeline
cd rust && cargo run -p ps-demo-replay -- ../collectors/demo-data/demo-telemetry.json
```

### 5. Start the Frontend (if not using PM2)

```bash
npm run dev
```

## PM2 Process Management

```bash
# PM2 (Next.js only)
npx pm2 status                       # Check service status
npx pm2 logs nextjs-dev              # Next.js logs
npx pm2 restart all                  # Restart Next.js

# Docker services (including WS server)
docker compose -f docker-compose.dev.yml logs -f ws-server  # WS server logs
docker compose -f docker-compose.dev.yml restart ws-server  # Restart WS server
```

## Quick Pipeline Test

Verify the full pipeline end-to-end (no game needed):

1. Start Docker infrastructure:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

2. Start the Redis WebSocket server:
   ```bash
   node services/redis-websocket-server.js
   ```

3. Start the frontend:
   ```bash
   npm run dev
   ```

4. Replay demo data:
   ```bash
   cd rust && cargo run -p ps-demo-replay -- --file ../public/demo-telemetry.json
   ```

5. Open http://localhost:3000 and confirm telemetry is streaming.

## Stopping the Environment

```bash
./scripts/stop-dev.sh              # Stop PM2 + Docker
./scripts/stop-dev.sh --keep-docker  # Stop PM2 only
```
