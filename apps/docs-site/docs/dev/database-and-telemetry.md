# Database and Telemetry

This page describes the database schema, telemetry data model, and how data is persisted in Purple Sector.

## Database Stack

- **ORM:** Prisma (`@purplesector/db-prisma`)
- **Dev database:** SQLite (`file:./dev.db`) is common for app metadata
- **Cloud-style local stack:** PostgreSQL is also used by Docker services such as LakeKeeper
- **Production:** PostgreSQL recommended for app metadata
- **Schema location:** `packages/db-prisma/prisma/schema.prisma` (core) + `schema.generated.prisma` (plugin models)

## Core Models

### Event

Top-level container for organizing sessions (e.g., a track day or race weekend).

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| userId | String | Owner |
| name | String | Event name |
| description | String? | Optional description |
| location | String? | Track / venue |
| startDate | DateTime? | Event start |
| endDate | DateTime? | Event end |
| sessions | Session[] | Child sessions |

### Session

A single driving stint within an event.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| userId | String | Owner |
| eventId | String? | Parent event |
| name | String | Session name |
| source | String | Telemetry source (live, demo, etc.) |
| status | String | recording, completed, etc. |
| tags | String? | Comma-separated tags |
| laps | Lap[] | Child laps |

### Lap

A single lap within a session.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| sessionId | String | Parent session |
| lapNumber | Int | Lap number within session |
| lapTime | Float? | Lap time in seconds |
| analyzed | Boolean | Whether AI analysis has been run |
| suggestions | String? | Serialized analysis output |
| driverComments | String? | Driver notes |
| tags | String? | Serialized tags |

Lap metadata lives in Prisma. Raw telemetry frames do **not** live in Prisma anymore — archived lap telemetry is queried from Iceberg through Trino, and live telemetry is delivered through Redis-backed WebSockets.

### Vehicle

Represents a racing vehicle.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| userId | String | Owner |
| name | String | Vehicle name |
| description | String? | Optional description |
| tags | Json? | Tags array |
| configurations | VehicleConfiguration[] | Parts lists |
| setups | VehicleSetup[] | Tuning parameter sets |

### VehicleConfiguration

A named parts list for a vehicle.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| vehicleId | String | Parent vehicle |
| name | String | Configuration name |
| description | String? | Optional description |
| parts | Json | Key/value object of parts |

### VehicleSetup

A named set of tuning parameters for a vehicle.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| vehicleId | String | Parent vehicle |
| configurationId | String? | Optional linked configuration |
| name | String | Setup name |
| description | String? | Optional description |
| parameters | Json | Array of `{ key, value, units }` objects |

### SavedPlotLayout

Persisted plot layout configurations.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| userId | String | Owner |
| name | String | Layout name |
| description | String? | Optional description |
| configs | Json | Plot configurations |
| layout | Json | Grid layout information |
| isDefault | Boolean | Whether this is the default layout |

### MathTelemetryChannel

User-defined derived telemetry channels.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| userId | String | Owner |
| name | String | Channel name |
| formula | String | Math expression |
| unit | String? | Display unit |

## Plugin Models (Agent)

The agent plugin adds its own models via `packages/plugin-agent/prisma/plugin.prisma`:

- **AgentConversation** — A chat conversation with the AI agent.
- **AgentMessage** — Individual messages within a conversation (user and assistant).
- **RunPlan** — A proposed set of actions for user approval.
- **RunPlanItem** — Individual steps within a run plan.

These are merged into the generated schema by `scripts/merge-plugin-schemas.ts`.

## Schema Management

### Merging Plugin Schemas

Plugin schemas are merged into a single generated file:

```bash
npx ts-node scripts/merge-plugin-schemas.ts
```

This scans `packages/plugin-*/prisma/plugin.prisma` and outputs `packages/db-prisma/prisma/schema.generated.prisma` (gitignored).

### Common Commands

| Command | Description |
|---------|-------------|
| `npm run db:push` | Push schema changes to the database |
| `npm run db:reset` | Reset the database (destructive — drops and recreates) |
| `npm run db:studio` | Open Prisma Studio for visual inspection |
| `npm run db:check` | Scan for common issues (orphaned records, invalid references) |

### Best Practices

- Prefer creating events and sessions through the UI rather than manually in the DB.
- When starting fresh in dev: reset DB, clear Next.js cache (`rm -rf .next/`), then start dev servers.
- Avoid deleting sessions/events while telemetry is actively streaming.
- In production, use PostgreSQL with proper connection pooling, backups, and monitoring.

## Telemetry Pipeline

Telemetry now has two storage/delivery paths:

1. **Live path** — Collectors / demo replay → gRPC Gateway → Redpanda → RisingWave → Redis sinks → Redis WebSocket server → browser.
2. **Archive path** — Collectors / demo replay → gRPC Gateway → Redpanda → RisingWave → Iceberg sink (`raw_samples`) → LakeKeeper + MinIO → Trino → Next.js API routes.

RisingWave is responsible for:

- Joining raw telemetry to `active_sessions`
- Assigning `session_id` and `user_id`
- Detecting lap boundaries
- Producing `telemetry_samples`
- Sinking live telemetry to Redis and archived telemetry to Iceberg

### Protobuf Encoding

Telemetry frames are encoded using Protocol Buffers for efficient binary transport. The single schema source of truth lives at `proto/telemetry.proto`. The frontend includes generated decoder output in `apps/web/src/proto/telemetry.js`.

### Current Isolation Model

Purple Sector no longer uses per-user Kafka topics.

- Redpanda uses the shared `telemetry-batches` topic.
- Session ownership is assigned in RisingWave via the `active_sessions` table.
- Live Redis channels are user- and session-scoped.
- Archived lap access is protected by authenticated Prisma lookups before Trino queries run.
