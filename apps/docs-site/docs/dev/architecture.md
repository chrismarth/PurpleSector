# Architecture

This page describes the high-level architecture of Purple Sector: how telemetry flows from the simulator to the browser and AI analysis, how the plugin system works, and how the app shell is structured.

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                Browser (React + Vite SPA)                   │
│                                                             │
│  AuthProvider → AppShellRoot → AppShell                     │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────────────┐│
│  │ Toolbar   │  │  Nav Pane   │  │     Content Pane         ││
│  │ (plugins) │  │ (Events /   │  │  (Session / Lap / Vehicle││
│  │           │  │  Vehicles)  │  │   detail tabs)           ││
│  └──────────┘  └────────────┘  └──────────────────────────┘│
│                                  ┌──────────────────────────┐│
│                                  │  Agent Panel (slide-over) ││
│                                  └──────────────────────────┘│
└──────────────────────┬──────────────────────────────────────┘
                       │  REST API + WebSocket (Inertia.js)
┌──────────────────────▼──────────────────────────────────────┐
│                Django Backend (ASGI)                         │
│  /api/auth/*  /api/events/*  /api/sessions/*  /api/laps/*    │
│  /api/vehicles/*  /api/plot-layouts/*  /api/analysis-layouts/*│
│  /api/channels/math/*  /api/plugins/[...path]  /api/chat     │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌────────────┐ ┌────────────┐ ┌──────────────┐
   │ PostgreSQL │ │  Redpanda  │ │  OpenAI API  │
   │             │ │ + RisingWave│ │  (GPT-4)    │
   └────────────┘ └────┬───────┘ └──────────────┘
                       │
        ┌──────────────┼───────────────────────────────┐
        ▼              ▼                               ▼
  ┌────────────┐ ┌──────────────┐              ┌──────────────┐
  │ Redis WS   │ │ LakeKeeper + │              │ Collectors / │
  │ Server     │ │ Trino +      │              │ Tray App /   │
  │            │ │ MinIO        │              │ Demo Replay  │
  └────────────┘ └──────────────┘              └──────────────┘
```

## Key Components

### Authentication

- **Django Middleware** (`apps/web/purplesector/middleware/auth.py`) — Checks the `ps_user` cookie on every non-public request. Redirects to `/login` if missing.
- **AuthProvider** (`packages/web-core/src/components/AuthProvider.tsx`) — Client-side React context that fetches `/api/auth/me` on mount with timeout and retry logic. Gates the entire app shell behind a loading spinner until auth resolves.
- **Stub auth** — In development, two hardcoded users (`admin`, `user`) are available. The cookie value is the username string.

### App Shell

The app shell (`AppShell.tsx`) is a tab-based IDE-style layout with four regions:

- **Toolbar Pane** — Narrow icon strip on the left. Plugin-provided toolbar items (settings, agent, etc.).
- **Navigation Pane** — Collapsible tree sidebar. Tabs at the top switch between data trees (Events, Vehicles). Each tree is provided by a plugin via `NavTabRegistration`.
- **Content Pane** — Tabbed workspace. Each nav tree item opens a content tab. Tab types are provided by plugins via `ContentTabRegistration`.
- **Status Bar** — Bottom strip with contextual info.

State is managed by `AppShellContext` which tracks open tabs, the active tab, and provides `openTab()` / `closeTab()` actions.

For implementation details, see **App Shell Architecture**.

### Plugin System

Purple Sector uses a plugin architecture where features are delivered as `PluginModule` packages:

- **Plugin API** (`@purplesector/plugin-api`) — TypeScript interfaces for all registration types.
- **Plugin Agent** (`@purplesector/plugin-agent`) — Client-side plugin registry that manages registrations. Configuration in `plugins.config.ts`.
- **Client loader** (`packages/plugin-agent/src/index.ts`) — Imports plugin modules and calls `loadClientPlugins()`.
- **Django plugin views** (`apps/web/purplesector/views/plugins.py`) — Loads server-side registrations (API routes, agent tool handlers).
- **API route dispatcher** (`/api/plugins/[...path]`) — Django URL pattern that dispatches to plugin-registered API handlers.

For the full plugin API reference, see **Plugin Architecture**.

### Telemetry Pipeline

The current telemetry pipeline uses Redpanda for ingestion, RisingWave for stream processing, Redis for live delivery, and Iceberg for archival queryability:

```text
Game Clients / Demo Replay
   ↓
Collectors / Tray App ── Protobuf + Zstd ──▶ gRPC Gateway
                                              ↓
                                          Redpanda (:9092)
                                              ↓
                                   RisingWave SOURCE telemetry_frames
                                              ↓
                         telemetry_with_sessions → telemetry_samples
                                   ↓                          ↓
                         Redis sinks (live)      Iceberg sink archive_raw
                                   ↓                          ↓
                           Redis WS Server              LakeKeeper + MinIO
                                   ↓                          ↓
                             WebSocket Clients            Trino queries
```

- **Collectors / Tray App / Demo Replay** — Capture or replay telemetry and send batched Protobuf frames through the gRPC ingress path.
- **gRPC Gateway** — Authenticates and forwards telemetry batches to Redpanda.
- **Redpanda** — Kafka-compatible message broker. Topic: `telemetry-batches`.
- **RisingWave** — Stream SQL engine that assigns sessions, detects lap boundaries, computes `telemetry_samples`, and sinks to Redis and Iceberg.
- **Redis WebSocket Server** (`services/redis-websocket-server.js`) — Reads live telemetry from Redis and pushes it to connected browser clients.
- **LakeKeeper + MinIO + Trino** — LakeKeeper manages the Iceberg catalog, MinIO stores Iceberg data files, and Trino is the query layer used by the web app for archived laps.

### Analysis Panel Grid

The lap analysis view uses a configurable grid of panels (`AnalysisPanelGrid`):

- Each panel is rendered by an `AnalysisPanelProvider` registered by a plugin.
- Panels support fullscreen, split horizontal/vertical, remove, and resize.
- Cross-panel hover synchronization highlights the same time/position across all panels.
- Plot layouts (panel arrangement + configuration) can be saved, loaded, and managed.

For details, see **Analysis Panels**.

### AI Agent

The agent plugin (`@purplesector/plugin-agent`) provides:

- **Frontend** — Chat panel, conversation list, run plan approval UI, settings tab.
- **Backend** — LangGraph `StateGraph` runtime with ~28 tools. Auto-detects mutating tools and generates run plans for user approval.
- **API routes** — `/api/plugins/purple-sector.agent/chat`, `/conversations`, `/plan/approve`, `/plan/reject`.
- **Database models** — `AgentConversation`, `AgentMessage`, `RunPlan`, `RunPlanItem` (in plugin's `plugin.prisma`).

### Lap Analysis Engine

Multiple analyzer implementations behind a factory:

- **Simple Analyzer** (`@purplesector/lap-analysis-simple`) — Single OpenAI call.
- **LangGraph Analyzer** (`@purplesector/lap-analysis-langgraph`) — Multi-step agentic DAG with fetch, compare, analyze, and parse nodes.
- **Factory** (`@purplesector/lap-analysis-factory`) — `createAnalyzer()` selects the appropriate implementation.

### User Isolation

Purple Sector currently isolates live telemetry by session registration and user-scoped Redis channel names:

- Collectors publish into the shared `telemetry-batches` stream in Redpanda.
- RisingWave joins incoming frames to `active_sessions` and assigns the owning `session_id` and `user_id`.
- Redis channels and streams are named with the session owner: `telemetry:live:{user_id}:{session_id}` and `telemetry:{user_id}:{session_id}`.
- Archived telemetry is queried by `session_id` and `lap_number`, with lap metadata access still protected by authenticated Prisma lookups.

### Database

Managed via Prisma (`@purplesector/db-prisma`). Key models:

- **User data** — Event, Session, Lap
- **Vehicles** — Vehicle, VehicleConfiguration, VehicleSetup
- **Analysis** — SavedPlotLayout, AnalysisLayout, MathTelemetryChannel
- **Agent** — AgentConversation, AgentMessage, RunPlan, RunPlanItem (plugin schema)

Plugin schemas are merged via `scripts/merge-plugin-schemas.ts` which scans `packages/plugin-*/prisma/plugin.prisma` files.

SQLite is used in development; PostgreSQL/TimescaleDB is recommended for production.
