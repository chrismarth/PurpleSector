# Monorepo Structure

Purple Sector uses an Nx monorepo to organize the web app, desktop app, documentation site, collectors, services, and shared libraries.

## Repository Layout

```text
PurpleSector/
├── apps/
│   ├── web/                          # Django web app (backend API + serves React SPA)
│   ├── desktop/                      # Tauri desktop app wrapping the web app
│   │   └── src-tauri/                # Tauri config & Rust side
│   ├── docs-site/                    # Docusaurus documentation site
│   ├── mcp-analysis/                 # MCP server for analysis tools
│   └── mcp-telemetry/               # MCP server for telemetry tools
│
├── collectors/                       # Static demo data (all capture is now Rust-based)
│
├── services/                         # Runtime infra services
│   ├── redis-websocket-server.js     # RisingWave → Redis → WebSocket → Frontend (Docker container)
│   └── Dockerfile.ws-server          # Docker build for the WS server
│
├── packages/                         # Shared packages
│   ├── proto/                        # @purplesector/proto — Protobuf types + telemetry.proto
│   ├── web-telemetry/                # @purplesector/web-telemetry — parsing & helpers, MathTelemetryChannel
│   ├── web-charts/                   # @purplesector/web-charts — chart components (uPlot)
│   │                                 #   SimpleTelemetryPlotPanel, ConfigurableTelemetryChart
│   │
│   ├── web-core/                     # @purplesector/web-core — React SPA core (pages, components, stores)
│   ├── plugin-api/                   # @purplesector/plugin-api — plugin type definitions
│   │                                 #   PluginManifest, PluginClientContext, PluginServerContext,
│   │                                 #   AnalysisPanelProvider, GlobalPanelRegistration,
│   │                                 #   NavTabRegistration, ContentTabRegistration, etc.
│   ├── plugin-agent/                 # @purplesector/plugin-agent — AI agent (premium tier)
│   │                                 #   Split entry: plugin.ts (client), plugin.server.ts (server)
│   │                                 #   Subpath export: @purplesector/plugin-agent/server
│   ├── plugin-core-lap-telemetry/    # @purplesector/plugin-core-lap-telemetry — telemetry plot panels
│   └── plugin-vehicles/              # @purplesector/plugin-vehicles — vehicle management UI
│
├── scripts/                          # Operational scripts
│   ├── dev-start.sh / dev-stop.sh    # One-command dev environment
│   ├── merge-plugin-schemas.ts       # Merges plugin.prisma files into generated schema
│   └── ...
│
├── docker-compose.dev.yml            # Full dev infrastructure (Redpanda, RisingWave, Redis, etc.)
├── ecosystem.config.js               # PM2 config (production)
├── ecosystem.dev.config.js           # PM2 config (development)
├── vite.config.ts                    # Vite configuration (in packages/web-core/)
├── nx.json                           # Nx workspace configuration
├── package.json                      # Root package.json with scripts
└── tsconfig.json                     # Root TypeScript configuration
```

## Key Directories

### `apps/web/`

The Django web application — serves the React SPA via Inertia.js and provides REST API endpoints. Key subdirectories:

- `purplesector/` — Django app with models, views, URLs, and middleware.
- `templates/` — Django templates for Inertia.js rendering.
- `static/` — Static files served by Django.
- `requirements.txt` — Python dependencies.
- `asgi.py` — ASGI application entry point.

### `packages/web-core/`

The React SPA core — contains all the frontend pages, components, and stores. Key subdirectories:

- `src/pages/` — React page components (Home, Sessions, Laps, etc.).
- `src/components/` — Shared UI components (AuthProvider, AnalysisPanelGrid, dialogs, etc.).
- `src/stores/` — Zustand state stores.
- `src/lib/` — Frontend utilities and helpers.
- `vite.config.ts` — Vite build configuration.
- `src/inertia.tsx` — Inertia.js app entry point.

### `packages/plugin-api/`

Defines all the TypeScript interfaces that plugins implement:

- `plugin.ts` — `PluginModule`, `PluginClientContext`, `PluginServerContext`
- `types.ts` — `PluginManifest`, `PluginCapability`
- `analysisPanels.ts` — `AnalysisPanelType`, `AnalysisPanelProvider`, `AnalysisPanelProps`
- `globalUI.ts` — `NavTabRegistration`, `ContentTabRegistration`, `ToolbarItemRegistration`, `TabDescriptor`
- `agentTools.ts` — `AgentToolDefinition`, `AgentToolHandler`
- `serverPlugin.ts` — `PluginServerContext`, `PluginApiRoute`

### `packages/plugin-registry/`

Central plugin loader. Key files:

- `src/plugins.config.ts` — Lists enabled plugin manifest IDs.
- `src/loader.ts` — `loadClientPlugins()`, `loadServerPlugins()`, and all accessor functions.

### `packages/plugin-agent/`

The AI agent plugin. Has split entry points to avoid bundling Node.js-only dependencies in the client bundle:

- `src/plugin.ts` — Client registrations (chat panel, toolbar item, settings tab, tool definitions).
- `src/plugin.server.ts` — Server registrations (API routes, tool handlers).
- `src/shared/tool-definitions.ts` — Client-safe tool metadata.
- `prisma/plugin.prisma` — Agent-specific database models.

### `packages/db-prisma/`

Prisma ORM implementation. The schema is composed of:

- `prisma/schema.prisma` — Core models (Event, Session, Lap, TelemetryFrame, Vehicle, etc.).
- `prisma/schema.generated.prisma` — Auto-generated from plugin schemas (gitignored).

The merge script (`scripts/merge-plugin-schemas.ts`) scans `packages/plugin-*/prisma/plugin.prisma` and produces the generated file.

## Path Resolution

The `apps/web/tsconfig.json` has its own `paths` that override the root `tsconfig.json`. When adding a new package, you **must** add path mappings to **both** tsconfig files.

## Build and Dev Scripts

Key npm scripts from `package.json`:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server only |
| `npm run dev:start` | Start full Kafka pipeline + dev server |
| `npm run dev:stop` | Stop services, keep Kafka running |
| `npm run dev:stop-all` | Stop everything including Kafka |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:reset` | Reset database (destructive) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run kafka:setup` | Create Kafka topics |
