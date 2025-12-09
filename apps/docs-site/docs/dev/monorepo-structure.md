# Monorepo Structure

Purple Sector uses an Nx monorepo to organize the web app, desktop app, collectors, services, and shared libraries.

## Repository Layout

```text
PurpleSector/
├── apps/
│   ├── web/                   # Next.js app (frontend + API routes)
│   └── desktop/               # Tauri desktop app wrapping the web app
│       └── src-tauri/         # Tauri config & Rust side
├── collectors/                # Runtime collector apps (AC/ACC/demo, Kafka & WebSocket)
├── services/                  # Runtime infra services (Kafka bridge, DB consumer, legacy WS)
├── packages/                  # Shared packages (published via npm/GitHub Packages)
│   ├── core/                  # Core domain types (TelemetryFrame, etc.)
│   ├── telemetry/             # Telemetry parsing & helpers
│   ├── config/                # @purplesector/config
│   ├── logger/                # @purplesector/logger
│   ├── kafka/                 # @purplesector/kafka (producer/admin/consumer)
│   ├── proto/                 # @purplesector/proto (protobuf helpers + telemetry.proto)
│   ├── db-base/               # @purplesector/db-base (DB interfaces)
│   └── db-prisma/             # @purplesector/db-prisma (Prisma implementation + schema)
├── prisma/                    # (legacy) old schema location – kept only for history
├── proto/                     # (legacy) old telemetry.proto location – now under packages/proto
├── scripts/                   # Operational scripts (dev start/stop, Kafka setup, etc.)
└── docs/                      # Architecture and operations documentation (being migrated here)
```

Nx projects correspond to these apps and packages, and services/collectors are wired into the monorepo via scripts and shared packages.
