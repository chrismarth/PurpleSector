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

PM2 is used in scripts for process management and monitoring; see the original `docs/DEV_ENVIRONMENT.md` for a fully detailed operational guide.
