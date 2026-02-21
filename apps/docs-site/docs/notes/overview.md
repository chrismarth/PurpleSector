# Design Notes

Historical notes, migration guides, and architectural decisions for Purple Sector.

## Plugin System Evolution

The plugin system evolved through several phases:

1. **Direct imports** — Features were hardcoded into the web app.
2. **Lap analysis views** — First pluginized feature: telemetry plot panels registered via `PluginContext.registerLapAnalysisView()`.
3. **Analysis panel grid** — Generalized to `AnalysisPanelType` + `AnalysisPanelProvider` with a configurable grid layout, fullscreen support, and synced hover.
4. **App shell plugins** — Extended to `NavTabRegistration`, `ContentTabRegistration`, `ToolbarItemRegistration` for the IDE-style app shell.
5. **Server-side plugins** — Added `PluginServerContext` with `registerApiRoute()` and `registerAgentToolHandler()` for the agent plugin.
6. **Client/server split** — Agent plugin uses separate entry points (`plugin.ts` / `plugin.server.ts`) to avoid bundling Node.js modules in the client.

### Key Decision: `PluginClientContext` vs `PluginContext`

`PluginContext` was renamed to `PluginClientContext` when server-side registrations were added. The old name is kept as a deprecated type alias for backward compatibility.

### Key Decision: Plugin Schema Merging

Rather than a single monolithic Prisma schema, plugins define their own models in `plugin.prisma` files. A merge script combines them into a generated schema. This keeps plugin models co-located with their code while still producing a single Prisma client.

## Analysis Panel Toolbar Refactoring

The panel toolbar was refactored to support a **host-rendered** model:

- Providers return `AnalysisPanelRenderResult` with `title`, `toolbarActions`, and `content`.
- The grid renders a unified toolbar with the provider's title and actions on the left, and host controls (fullscreen, layout actions) on the right.
- This replaced an earlier model where each provider rendered its own toolbar, which led to inconsistent styling and broken fullscreen buttons.

### Panel Actions Persistence Fix

The edit (pencil) button in the panel toolbar was broken because the plugin's `render()` function created a local `let actions = null` on every call. `SimpleTelemetryPlotPanel` registered actions via `onRegisterActions` only once on mount, but subsequent `render()` calls created new null variables. Fixed by using a persistent `panelActionsMap` (`Map<string, PanelActions>`) outside `render()`, keyed by `panelId`.

## Fullscreen Plot Sizing

Fullscreen telemetry plots initially showed a blank box because `ConfigurableTelemetryChart` used a fixed 250px height. The fix involved:

1. `AnalysisPanelGrid` measures the fullscreen content area via `ResizeObserver`.
2. The measured height (minus ~130px for toolbar + chart chrome) is passed as `host.availableHeight`.
3. `SimpleTelemetryPlotPanel` passes this height to `ConfigurableTelemetryChart`.
4. The chart uses the provided height instead of the fixed default.

A CSS-only auto-sizing approach was attempted first but caused layout instability due to circular dependencies between flex containers and the chart's `ResizeObserver`.

## Authentication

The current auth system is a **stub** for development:

- Cookie-based: the `ps_user` cookie contains the username string (`admin` or `user`).
- Middleware checks the cookie on every non-public request.
- `AuthProvider` fetches `/api/auth/me` on mount with timeout and retry logic.
- Two hardcoded users with different roles (`ORG_ADMIN`, `USER`).

This will be replaced with a proper authentication provider (OAuth, JWT, etc.) for production.

## Initial Load Resilience

The initial app load could hang intermittently in dev mode due to:

- Next.js on-demand compilation of API routes queuing up when multiple fetches fire simultaneously.
- Google Font download blocking SSR if the CDN is slow.
- No timeout on `fetch()` calls in `AuthProvider` and `NavContext`.

Fixes applied:
- `AuthProvider`: 5-second timeout + 3 retries with backoff on `/api/auth/me`.
- `NavContext`: 8-second timeout on `/api/events` fetch.
- Google Font: `display: "swap"` to prevent render blocking.
- Root `loading.tsx` for Next.js Suspense boundary.
- `optimizePackageImports` in `next.config.mjs` for faster dev compilation.
- Removed hidden rendering of `page.tsx` children inside `AppShellRoot` to eliminate duplicate fetches.

## Protobuf Migration

Telemetry transport was migrated from JSON to Protocol Buffers for efficiency:

- Schema: `packages/proto/telemetry.proto`
- Encoding: Collectors serialize `TelemetryFrame` as Protobuf before publishing to Kafka.
- Decoding: The WS bridge and frontend decode Protobuf back to objects.
- Compression: LZ4 compression on Kafka messages.

## uPlot Chart Library

Charts use [uPlot](https://github.com/leeoniya/uPlot) for high-performance time-series rendering:

- Lightweight (~35KB) compared to alternatives.
- Handles large datasets (tens of thousands of points) without lag.
- `ConfigurableTelemetryChart` wraps uPlot with React lifecycle management.
- `ResizeObserver` tracks container width; height is controlled via props.
