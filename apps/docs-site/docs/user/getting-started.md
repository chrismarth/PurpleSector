# Getting Started

This guide walks you through installing Purple Sector and running it locally in development/demo mode.

## Prerequisites

- **Node.js** 18+
- **Docker** (for Kafka)
- **PostgreSQL/TimescaleDB** (for database)
- (Optional) **Assetto Corsa** or **Assetto Corsa Competizione** for live telemetry.
- (Optional) **OpenAI API key** for AI analysis.

## 1. Clone and Install

```bash
git clone <your-repo-url>
cd PurpleSector
npm install
```

## 2. Configure Environment

For a minimal dev/demo setup using SQLite and the embedded WebSocket server:

Create `.env.local` in the repo root:

```env
# OpenAI API Key for AI analysis (optional but recommended)
OPENAI_API_KEY=your_openai_api_key_here

# Database (SQLite in dev)
DATABASE_URL="file:./dev.db"

# WebSocket Server
WS_PORT=8080

# Telemetry Collector (Assetto Corsa UDP port)
TELEMETRY_UDP_PORT=9996
```

Then initialize the database schema:

```bash
npm run db:push
```

## 3. One-Command Dev Environment (Kafka Pipeline)

Purple Sector provides a full Kafka-based dev environment that runs the entire telemetry pipeline with demo data.

Start everything with one command:

```bash
npm run dev:start
```

This will:

1. Start the Kafka cluster (Docker).
2. Create Kafka topics.
3. Start the Kafka–WebSocket bridge.
4. Start the database consumer.
5. Start the demo collector (publishes demo telemetry).
6. Start the Next.js frontend.

After ~30 seconds, open:

```text
http://localhost:3000
```

You should see the Purple Sector UI with live demo telemetry.

To stop the environment:

```bash
# Stop services, keep Kafka running
npm run dev:stop

# Stop services AND Kafka
npm run dev:stop-all
```

For a deeper walkthrough of the dev environment, see **Developer Guide → Development Environment**.
