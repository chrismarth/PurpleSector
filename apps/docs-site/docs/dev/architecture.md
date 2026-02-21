# Architecture

This page describes the high-level architecture of Purple Sector: how telemetry flows from the simulator to the browser and AI analysis, how the plugin system works, and how the app shell is structured.

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Next.js App)                     │
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
                       │  REST API + WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                  Next.js Backend (API Routes)                │
│  /api/auth/*  /api/events/*  /api/sessions/*  /api/laps/*    │
│  /api/vehicles/*  /api/plot-layouts/*  /api/analysis-layouts/*│
│  /api/channels/math/*  /api/plugins/[...path]  /api/chat     │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌────────────┐ ┌─────────┐ ┌──────────────┐
   │  SQLite /   │ │  Kafka  │ │  OpenAI API  │
   │  PostgreSQL │ │ Cluster │ │  (GPT-4)     │
   └────────────┘ └────┬────┘ └──────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
  ┌───────────┐ ┌────────────┐ ┌────────────┐
  │ WS Bridge │ │ DB Consumer│ │ Collectors  │
  │ (Kafka →  │ │ (Kafka →   │ │ (AC / ACC / │
  │  Browser) │ │  Database) │ │  Demo)      │
  └───────────┘ └────────────┘ └────────────┘
```

## Key Components

### Authentication

- **Middleware** (`apps/web/middleware.ts`) — Checks the `ps_user` cookie on every non-public request. Redirects to `/login` if missing.
- **AuthProvider** (`apps/web/src/components/AuthProvider.tsx`) — Client-side React context that fetches `/api/auth/me` on mount with timeout and retry logic. Gates the entire app shell behind a loading spinner until auth resolves.
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
- **Plugin Registry** (`@purplesector/plugin-registry`) — Central loader that manages client and server registrations. Configuration in `plugins.config.ts`.
- **Client loader** (`apps/web/src/plugins/index.ts`) — Imports plugin modules and calls `loadClientPlugins()`.
- **Server loader** (`apps/web/src/lib/plugin-server.ts`) — Loads server-side registrations (API routes, agent tool handlers).
- **API route dispatcher** (`/api/plugins/[...path]`) — Catch-all route that dispatches to plugin-registered API handlers.

For the full plugin API reference, see **Plugin Architecture**.

### Kafka-Based Telemetry Pipeline

The Kafka pipeline provides durable, ordered telemetry transport:

```text
Game Clients (AC/ACC)
   ↓
Collectors (Producers) ── Protobuf + LZ4 ──▶ Kafka Topics
                                              (telemetry-user-*)
Kafka-WebSocket Bridge (Consumers) ──▶ WebSocket Clients
   ↓
Database Consumer ──▶ SQLite / PostgreSQL
```

- **Collectors** — Parse game telemetry (UDP / shared memory), serialize as Protobuf, publish to Kafka.
- **Kafka cluster** — Topics like `telemetry`, `commands`, `telemetry-user-<userId>`. LZ4 compression, per-session ordering.
- **Kafka–WebSocket Bridge** (`services/kafka-websocket-bridge.js`) — Consumes telemetry, broadcasts decoded frames to connected browser clients.
- **Database Consumer** (`services/kafka-database-consumer.js`) — Batch-inserts telemetry frames, detects lap completions, persists sessions and laps.

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

Purple Sector implements user-scoped Kafka topics for multi-tenancy:

- Each user gets a dedicated topic: `telemetry-user-alice`, `telemetry-user-bob`, etc.
- Collectors publish to the user's topic.
- The bridge creates a consumer per user and only forwards frames to that user's WebSocket clients.
- In production, Kafka ACLs can restrict topic access.

### Database

Managed via Prisma (`@purplesector/db-prisma`). Key models:

- **User data** — Event, Session, Lap, TelemetryFrame
- **Vehicles** — Vehicle, VehicleConfiguration, VehicleSetup
- **Analysis** — SavedPlotLayout, AnalysisLayout, MathTelemetryChannel
- **Agent** — AgentConversation, AgentMessage, RunPlan, RunPlanItem (plugin schema)

Plugin schemas are merged via `scripts/merge-plugin-schemas.ts` which scans `packages/plugin-*/prisma/plugin.prisma` files.

SQLite is used in development; PostgreSQL/TimescaleDB is recommended for production.
