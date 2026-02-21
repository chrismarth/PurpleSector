# Development Environment

The development environment runs the full Kafka-based telemetry pipeline with demo data, so you can work on Purple Sector without having Assetto Corsa or ACC running.

## Overview

The dev environment is designed for:

- Rapid iteration on the frontend and services.
- Testing the full pipeline end-to-end.
- Debugging collectors, bridge, and DB consumer.
- Demos without a game client.

> For basic installation and a one-command startup, see **User Guide → Getting Started**.

## One-Command Startup

The recommended way to start everything is:

```bash
npm run dev:start
```

This will:

1. Start the Kafka cluster via Docker.
2. Create Kafka topics.
3. Start the Kafka–WebSocket bridge.
4. Start the Kafka→DB consumer.
5. Start the demo collector (publishes sample telemetry).
6. Start the Next.js frontend.

After startup, the main access points are:

- **Frontend:** `http://localhost:3000`
- **Kafka UI (if enabled):** typically `http://localhost:8090`
- **WebSocket:** `ws://localhost:8080`

To stop the environment:

```bash
# Stop services, keep Kafka running
npm run dev:stop

# Stop services AND Kafka
npm run dev:stop-all
```

## PM2 Process Management

The dev environment uses PM2 to manage services. The configuration is in `ecosystem.dev.config.js`.

### Checking Status

```bash
npx pm2 status
```

Typical services:

| PM2 Name | Description |
|----------|-------------|
| `nextjs-dev` | Next.js dev server (port 3000) |
| `kafka-bridge-dev` | Kafka → WebSocket bridge |
| `kafka-db-consumer-dev` | Kafka → DB consumer |
| `demo-collector-dev` | Demo telemetry publisher |

### Viewing Logs

```bash
npx pm2 logs                    # All services
npx pm2 logs nextjs-dev         # Just the Next.js server
npx pm2 logs kafka-bridge-dev   # Just the bridge
```

### Restarting Services

```bash
npx pm2 restart nextjs-dev
npx pm2 restart all
```

## Manual Startup (Per-Service)

You can also start components individually, for example:

```bash
# Kafka
docker-compose -f docker-compose.kafka.yml up -d

# Kafka topics
npm run kafka:setup

# Bridge
npm run kafka:bridge

# DB consumer
npm run kafka:db-consumer

# Demo collector
npm run telemetry:demo-kafka

# Frontend
npm run dev
```

## Authentication in Dev

The dev environment uses stub authentication with two hardcoded users:

| Username | Role | Cookie Value |
|----------|------|-------------|
| `admin` | `ORG_ADMIN` | `ps_user=admin` |
| `user` | `USER` | `ps_user=user` |

No password is required. The middleware checks the `ps_user` cookie, and the `AuthProvider` fetches `/api/auth/me` to resolve the user object.

## Database

The dev environment uses SQLite by default (`DATABASE_URL="file:./dev.db"`).

### Common Commands

```bash
npm run db:push     # Push schema changes
npm run db:reset    # Reset database (destructive)
npm run db:studio   # Open Prisma Studio
```

### Starting Fresh

If you need a clean slate:

```bash
npm run dev:stop-all
rm -rf .next/
npm run db:reset
npm run dev:start
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
| `TELEMETRY_UDP_PORT` | `9996` | AC telemetry UDP port |

See `.env.example` for the full list.
