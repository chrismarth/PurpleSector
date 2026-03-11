# Development Environment

The development environment runs the full Redpanda/RisingWave/Redis/Iceberg telemetry pipeline with demo data, so you can work on Purple Sector without having Assetto Corsa or ACC running.

## Overview

The dev environment is designed for:

- Rapid iteration on the frontend and services.
- Testing the full live + archive telemetry pipeline end-to-end.
- Debugging collectors, Redis live delivery, archived lap retrieval, and Trino queries.
- Demos without a game client.

> For basic installation and a one-command startup, see **User Guide → Getting Started**.

## One-Command Startup

The recommended way to start everything is:

```bash
./scripts/start-dev.sh
```

This will:

1. Start the Docker infrastructure defined in `docker-compose.dev.yml`.
2. Start PM2-managed app processes such as `nextjs-dev`.
3. Bring up Redpanda, RisingWave, Redis, MinIO, Trino, Postgres, and LakeKeeper.
4. Leave you ready to replay demo telemetry through the live pipeline.

After startup, the main access points are:

- **Frontend:** `http://localhost:3000`
- **Redpanda Console:** `http://localhost:8090`
- **WebSocket:** `ws://localhost:8080`

To stop the environment:

```bash
# Stop PM2 + Docker
./scripts/stop-dev.sh

# Stop PM2 only, keep Docker running
./scripts/stop-dev.sh --keep-docker
```

## PM2 Process Management

The dev environment uses PM2 to manage services. The configuration is in `ecosystem.dev.config.js`.

### Checking Status

```bash
npx pm2 status
```

Typical PM2 services:

| PM2 Name | Description |
|----------|-------------|
| `nextjs-dev` | Next.js dev server (port 3000) |
| `demo-replay` | Optional demo replay process when started via PM2 |

### Viewing Logs

```bash
npx pm2 logs                    # All services
npx pm2 logs nextjs-dev         # Just the Next.js server
npx pm2 logs demo-replay        # Demo replay process
```

### Restarting Services

```bash
npx pm2 restart nextjs-dev
npx pm2 restart all
```

## Manual Startup (Per-Service)

You can also start components individually, for example:

```bash
# Docker infrastructure (Redpanda, RisingWave, Redis, etc.)
docker compose -f docker-compose.dev.yml up -d

# RisingWave SQL initialization
psql -h localhost -p 4566 -d dev -f infra/risingwave/001_sources.sql
psql -h localhost -p 4566 -d dev -f infra/risingwave/002_materialized_views.sql
psql -h localhost -p 4566 -d dev -f infra/risingwave/003_redis_sinks.sql
psql -h localhost -p 4566 -d dev -f infra/risingwave/004_math_channels.sql
psql -h localhost -p 4566 -d dev -f infra/risingwave/005_iceberg_connection.sql
psql -h localhost -p 4566 -d dev -f infra/risingwave/006_iceberg_sinks.sql

# Redis WebSocket server
node services/redis-websocket-server.js

# Demo replay (Rust)
cd rust && cargo run -p ps-demo-replay -- --file ../public/demo-telemetry.json

# Frontend
npx nx serve web
```

## Authentication in Dev

The dev environment uses stub authentication with two hardcoded users:

| Username | Role | Cookie Value |
|----------|------|-------------|
| `admin` | `ORG_ADMIN` | `ps_user=admin` |
| `user` | `USER` | `ps_user=user` |

No password is required. The middleware checks the `ps_user` cookie, and the `AuthProvider` fetches `/api/auth/me` to resolve the user object.

## Database

The dev environment commonly uses SQLite by default (`DATABASE_URL="file:./dev.db"`), while the Docker stack also provides PostgreSQL for the cloud-style pipeline services.

### Common Commands

```bash
npm run db:push     # Push schema changes
npm run db:reset    # Reset database (destructive)
npm run db:studio   # Open Prisma Studio
```

### Starting Fresh

If you need a clean slate:

```bash
./scripts/stop-dev.sh
rm -rf .next/
npm run db:reset
./scripts/start-dev.sh
```

## Plugin Schema Merging

If you modify a plugin's `plugin.prisma` file, regenerate the merged schema:

```bash
npx ts-node scripts/merge-plugin-schemas.ts
npm run db:push
```

## First Load Behavior

On first load after starting the dev server, Next.js compiles pages and API routes on demand. This can take 10–30 seconds. The `AuthProvider` has timeout and retry logic to handle slow initial compilation gracefully. If the app shows a spinner for an extended time, wait a moment and then reload.

## Environment Variables

Key variables in `.env.local`:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./dev.db` | Database connection string |
| `OPENAI_API_KEY` | — | Required for AI analysis and agent |
| `WS_PORT` | `8080` | WebSocket server port |
| `TRINO_HOST` | `localhost` | Trino hostname for archived lap queries |
| `TRINO_PORT` | `8083` | Trino port |
| `RISINGWAVE_HOST` | `localhost` | RisingWave SQL host for best-effort writes |
| `TELEMETRY_UDP_PORT` | `9996` | AC telemetry UDP port |

See `.env.example` for the full list.
