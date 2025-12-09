# Database and Telemetry

This page describes the core telemetry data model and how it is represented in the system.

## TelemetryFrame Shape

On the application side, telemetry points are modeled roughly as:

```ts
interface TelemetryFrame {
  timestamp: number;
  throttle: number;    // 0.0 - 1.0
  brake: number;       // 0.0 - 1.0
  steering: number;    // -1.0 to 1.0
  speed: number;       // km/h
  gear: number;
  rpm: number;
  lapTime: number;     // milliseconds
  lapNumber: number;
  normalizedPosition: number; // 0.0 - 1.0 (track position)
}
```

Collectors read this data from the game (UDP or shared memory) and encode it for transport (Kafka + Protobuf in the Kafka-based pipeline). The frontend consumes a decoded form of this structure over WebSockets.

## Database

The database layer is managed via Prisma (in `packages/db-prisma`), with logical entities such as:

- **Session** – A driving session (track, car, time range, etc.).
- **TelemetryFrame** – Individual time-ordered telemetry points.
- **Lap** – Derived from telemetry, with timing data and summary statistics.

In the Kafka pipeline, a dedicated consumer persists frames and laps into PostgreSQL/TimescaleDB, enabling historical queries and analysis beyond a single live session.

For full schema details, see the Prisma schema in `packages/db-prisma`.

### Database Health and Management

Useful scripts and commands include:

- `npm run db:check` – scan for common issues (orphaned sessions/laps, invalid references).
- `npm run db:reset` – reset the dev database (drops and recreates schema; destructive).
- `npm run db:push` – push schema changes.
- `npm run db:studio` – open Prisma Studio.

Common practices derived from the database management guide:

- Prefer creating events and sessions through the UI rather than manually in the DB.
- When starting fresh in dev:
  - Reset DB and clear Next.js cache (`rm -rf .next/`).
  - Then start dev servers and create new events/sessions through the app.
- Avoid deleting sessions/events while telemetry is actively streaming.

In production, you should use PostgreSQL (not SQLite), with:

- Proper connection pooling.
- Backups and (optionally) soft deletes.
- Monitoring for lock or concurrency issues.
