# Monorepo Structure

Purple Sector uses an Nx monorepo to organize the web app, desktop app, documentation site, collectors, services, and shared libraries.

## Repository Layout

```text
PurpleSector/
├── apps/
│   ├── web/                          # Next.js app (frontend + API routes)
│   ├── desktop/                      # Tauri desktop app wrapping the web app
│   │   └── src-tauri/                # Tauri config & Rust side
│   ├── docs-site/                    # Docusaurus documentation site
│   ├── mcp-analysis/                 # MCP server for analysis tools
│   └── mcp-telemetry/               # MCP server for telemetry tools
│
├── collectors/                       # Runtime collector apps (AC/ACC/demo, Kafka & WebSocket)
│
├── services/                         # Runtime infra services
│   ├── kafka-websocket-bridge.js     # Kafka → WebSocket bridge
│   ├── kafka-database-consumer.js    # Kafka → DB consumer
│   └── ...                           # Legacy WebSocket server, etc.
│
├── packages/                         # Shared packages
│   ├── core/                         # @purplesector/core — domain types (TelemetryFrame, etc.)
│   ├── telemetry/                    # @purplesector/telemetry — parsing & helpers, MathTelemetryChannel
│   ├── config/                       # @purplesector/config — configuration utilities
│   ├── logger/                       # @purplesector/logger — structured logging
│   ├── kafka/                        # @purplesector/kafka — producer/admin/consumer
│   ├── proto/                        # @purplesector/proto — Protobuf helpers + telemetry.proto
│   ├── db-base/                      # @purplesector/db-base — DB interfaces
│   ├── db-prisma/                    # @purplesector/db-prisma — Prisma implementation + schema
│   ├── web-charts/                   # @purplesector/web-charts — chart components (uPlot)
│   │                                 #   SimpleTelemetryPlotPanel, ConfigurableTelemetryChart
│   │
│   ├── plugin-api/                   # @purplesector/plugin-api — plugin type definitions
│   │                                 #   PluginManifest, PluginClientContext, PluginServerContext,
│   │                                 #   AnalysisPanelProvider, GlobalPanelRegistration,
│   │                                 #   NavTabRegistration, ContentTabRegistration, etc.
│   ├── plugin-registry/              # @purplesector/plugin-registry — central loader & accessors
│   │                                 #   loadClientPlugins(), loadServerPlugins(), plugins.config.ts
│   ├── plugin-core-lap-telemetry/    # @purplesector/plugin-core-lap-telemetry — telemetry plot panels
│   ├── plugin-vehicles/              # @purplesector/plugin-vehicles — vehicle management UI
│   ├── plugin-agent/                 # @purplesector/plugin-agent — AI agent (premium tier)
│   │                                 #   Split entry: plugin.ts (client), plugin.server.ts (server)
│   │                                 #   Subpath export: @purplesector/plugin-agent/server
│   │
│   ├── lap-analysis-base/            # @purplesector/lap-analysis-base — LapAnalyzer interface
│   ├── lap-analysis-simple/          # @purplesector/lap-analysis-simple — single-call analyzer
│   ├── lap-analysis-langgraph/       # @purplesector/lap-analysis-langgraph — agentic DAG analyzer
│   └── lap-analysis-factory/         # @purplesector/lap-analysis-factory — createAnalyzer() factory
│
├── scripts/                          # Operational scripts
│   ├── dev-start.sh / dev-stop.sh    # One-command dev environment
│   ├── merge-plugin-schemas.ts       # Merges plugin.prisma files into generated schema
│   └── ...                           # Kafka setup, topic creation, etc.
│
├── docker-compose.kafka.yml          # Kafka cluster for dev
├── ecosystem.config.js               # PM2 config (production)
├── ecosystem.dev.config.js           # PM2 config (development)
├── next.config.mjs                   # Next.js configuration
├── nx.json                           # Nx workspace configuration
├── package.json                      # Root package.json with scripts
└── tsconfig.json                     # Root TypeScript configuration
```

## Key Directories

### `apps/web/`

The Next.js application — both the React frontend and the API routes. Key subdirectories:

- `src/app/` — Next.js App Router pages and API routes.
- `src/components/app-shell/` — App shell components (AppShell, NavPane, ContentPane, ToolbarPane, etc.).
- `src/components/` — Shared UI components (AuthProvider, AnalysisPanelGrid, dialogs, etc.).
- `src/plugins/index.ts` — Client-side plugin loader.
- `src/lib/` — Server utilities (auth, plugin-server loader, API auth helpers).

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
