# Architecture

This page describes the high-level architecture of Purple Sector: how telemetry flows from the simulator to the browser and AI analysis, and how the Kafka-based pipeline is structured.

## System Overview

At a high level:

```text
[Assetto Corsa / ACC Telemetry]
          ↓
[Telemetry Collector]
          ↓
[Kafka] → [Kafka-WebSocket Bridge] → [WebSocket]
          ↓                          ↓
   [DB Consumer] → [PostgreSQL/TimescaleDB]
          ↓
      [Next.js / React Frontend]
          ↓
      [OpenAI GPT-4 Analysis]
```

Key components:

- **Collectors** – Read telemetry from AC/ACC (UDP + shared memory) and publish to Kafka.
- **Kafka cluster** – Durable transport for telemetry and commands.
- **Kafka–WebSocket bridge** – Consumes telemetry and exposes it over WebSockets to the frontend.
- **Database consumer** – Persists telemetry and lap data into PostgreSQL/TimescaleDB via Prisma.
- **Next.js app** – Frontend and API routes for managing sessions, laps, and AI analysis.
- **AI analysis service** – Uses GPT-4 to generate coaching suggestions from telemetry.

## Kafka-Based Telemetry Architecture

The Kafka-based pipeline provides:

- **Guaranteed delivery** and **durability**.
- **Per-session ordering** via partitioning.
- **Horizontal scalability** across many concurrent sessions/users.
- **Efficient binary encoding** via Protobuf.

```text
Game Clients (AC/ACC)
   ↓
Collectors (Producers) ── Protobuf + LZ4 ──▶ Kafka Topics
   ↓                                          (telemetry-user-*)
Kafka-WebSocket Bridge (Consumers) ──▶ WebSocket Clients
   ↓
Database Consumer ──▶ TimescaleDB / PostgreSQL
```

### Collectors

- Live under `collectors/` (Kafka and WebSocket variants).
- Responsibilities:
  - Parse game telemetry (UDP / shared memory).
  - Map raw data into `TelemetryFrame` structures.
  - Serialize frames using Protobuf.
  - Publish to Kafka with appropriate keys for ordering.

### Kafka Cluster

- Topics such as:
  - `telemetry` – main telemetry stream.
  - `commands` – control commands.
  - `telemetry-user-<userId>` – per-user streams in the user isolation model.
- Tuned with compression (LZ4), retention, and replication appropriate to the environment (dev vs prod).

### Kafka–WebSocket Bridge

- File: `services/kafka-websocket-bridge.js`.
- Responsibilities:
  - Consume telemetry from Kafka.
  - Maintain per-user or per-session consumers.
  - Broadcast decoded Protobuf frames to connected WebSocket clients.
  - Support demo playback.

### Database Consumer

- File: `services/kafka-database-consumer.js`.
- Responsibilities:
  - Subscribe to user telemetry topics.
  - Batch-insert telemetry frames for performance.
  - Detect lap completions and persist laps.
  - Maintain session metadata.

### Frontend and AI

- Next.js app (under `apps/web`) connects to the WebSocket bridge and renders telemetry views.
- API routes trigger AI analysis on laps using GPT-4 and return coaching suggestions to the UI.

## User Isolation Architecture

Purple Sector implements **user-scoped Kafka topics** to ensure user data isolation (multi-tenancy):

- Each user gets a dedicated topic:

  ```text
  telemetry-user-alice
  telemetry-user-bob
  telemetry-user-...
  ```

- Collectors publish to the users topic (e.g., `telemetry-user-alice`).
- The bridge creates a consumer per user and only forwards frames to WebSocket clients for that user.
- Frontend connections include `userId` (or equivalent identity) so the bridge can wire the right consumer.

This model provides:

- **Strong isolation** – User As data never appears on User Bs topic.
- **Scalability** – Kafka handles many topics; consumers are created/destroyed per active user.
- **Security** – In production, Kafka ACLs can restrict topic access by user and consumer group.

For the full rationale and implementation details, see the original `docs/USER_ISOLATION_ARCHITECTURE.md` (being migrated into this section).
