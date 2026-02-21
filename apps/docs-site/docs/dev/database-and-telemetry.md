# Database and Telemetry

This page describes the database schema, telemetry data model, and how data is persisted in Purple Sector.

## Database Stack

- **ORM:** Prisma (`@purplesector/db-prisma`)
- **Dev database:** SQLite (`file:./dev.db`)
- **Production:** PostgreSQL / TimescaleDB recommended
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
| telemetryFrames | TelemetryFrame[] | Raw telemetry data |

### TelemetryFrame

Individual time-ordered telemetry data points.

```ts
interface TelemetryFrame {
  timestamp: number;
  throttle: number;           // 0.0 – 1.0
  brake: number;              // 0.0 – 1.0
  steering: number;           // -1.0 to 1.0
  speed: number;              // km/h
  gear: number;
  rpm: number;
  lapTime: number;            // milliseconds
  lapNumber: number;
  normalizedPosition: number; // 0.0 – 1.0 (track position)
}
```

Collectors read this data from the game (UDP or shared memory) and encode it for transport (Kafka + Protobuf). The frontend consumes a decoded form over WebSockets.

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

### Kafka Transport

In the Kafka pipeline, telemetry flows:

1. **Collector** reads game data → serializes as Protobuf → publishes to Kafka topic.
2. **DB Consumer** subscribes to topic → batch-inserts frames → detects lap completions → persists laps.
3. **WS Bridge** subscribes to topic → decodes Protobuf → broadcasts to WebSocket clients.

### Protobuf Encoding

Telemetry frames are encoded using Protocol Buffers for efficient binary transport. The schema lives in `packages/proto/`. The frontend includes a generated decoder (`apps/web/src/proto/telemetry.js`) for client-side deserialization.

### Per-User Topics

Each user gets a dedicated Kafka topic (`telemetry-user-<userId>`) for data isolation. See **Architecture → User Isolation** for details.
