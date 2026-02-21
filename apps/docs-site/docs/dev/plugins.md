---
id: plugins
title: Plugin Architecture
sidebar_label: Plugins
---

This document describes the Purple Sector plugin architecture — the type system, registration API, client/server split, and how to write a new plugin.

## Overview

- **Plugins** are TypeScript/React packages that implement interfaces from `@purplesector/plugin-api`.
- The **plugin registry** (`@purplesector/plugin-registry`) loads and indexes all registrations at startup.
- Plugins can provide: analysis panel types, nav tabs, content tabs, toolbar items, global panels, settings tabs, agent tools, and API routes.
- Each plugin declares a **manifest** with an ID, name, version, capabilities, and optional tier (`free` / `premium`).

## Plugin API Package

All shared types live in `packages/plugin-api` (`@purplesector/plugin-api`). Key exports:

### PluginManifest

```ts
type PluginCapability =
  | 'lapAnalysisView'
  | 'analysisPanels'
  | 'agentTools'
  | 'apiRoutes'
  | 'settingsTabs'
  | 'globalUI'
  | 'navTab'
  | 'contentTab'
  | 'toolbarItem';

interface PluginManifest {
  id: string;                    // e.g. 'purple-sector.core-lap-views'
  name: string;
  version: string;
  description?: string;
  capabilities: PluginCapability[];
  entry: string;
  tier?: 'free' | 'premium';
  prismaModels?: string;         // Path to plugin.prisma if the plugin has DB models
  dependencies?: string[];       // Other plugin IDs this plugin depends on
}
```

### PluginModule

```ts
interface PluginModule {
  manifest: PluginManifest;
  register?: (ctx: PluginClientContext) => void;       // Client-side registrations
  registerServer?: (ctx: PluginServerContext) => void;  // Server-side registrations
}
```

### PluginClientContext

The client registration context provides methods for each extension point:

```ts
interface PluginClientContext {
  // Lap analysis views (legacy)
  registerLapAnalysisView(view: LapAnalysisView): void;

  // Analysis panel system
  registerAnalysisPanelType(type: AnalysisPanelType): void;
  registerAnalysisPanelProvider(provider: AnalysisPanelProvider): void;

  // App shell extensions
  registerNavTab(tab: NavTabRegistration): void;
  registerContentTab(tab: ContentTabRegistration): void;
  registerToolbarItem(item: ToolbarItemRegistration): void;

  // Global UI
  registerGlobalPanel(panel: GlobalPanelRegistration): void;
  registerSettingsTab(tab: SettingsTabRegistration): void;

  // Agent tools (client-side metadata only)
  registerAgentTool(tool: AgentToolDefinition): void;
}
```

### PluginServerContext

The server registration context handles API routes and agent tool handlers:

```ts
interface PluginServerContext {
  registerApiRoute(route: PluginApiRoute): void;
  registerAgentToolHandler(handler: AgentToolHandler): void;
}
```

---

## Registration Types Reference

### Analysis Panels

```ts
interface AnalysisPanelType {
  id: string;      // e.g. 'plot', 'track-map'
  label: string;   // Human-friendly name
}

interface AnalysisPanelProvider {
  id: string;
  typeId: string;              // References AnalysisPanelType.id
  isDefault?: boolean;
  render: (props: AnalysisPanelProps) => AnalysisPanelRender;
}
```

`AnalysisPanelProps` includes telemetry data, compare data, host API (with `setTitle`, `availableHeight`), panel state, synced hover value, and math channels.

Providers can return either a plain `React.ReactElement` or a structured `AnalysisPanelRenderResult` with `title`, `toolbarActions`, and `content` for host-rendered toolbars.

### Navigation Tabs

```ts
interface NavTabRegistration {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  order: number;
  disabled?: boolean;
  renderTree: (ctx: NavTreeContext) => React.ReactElement;
}
```

### Content Tabs

```ts
interface ContentTabRegistration {
  type: string;    // Matches TabDescriptor.type
  render: (props: {
    entityId?: string;
    parentIds?: Record<string, string>;
  }) => React.ReactElement;
}
```

### Toolbar Items

```ts
interface ToolbarItemRegistration {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  position: 'top' | 'bottom';
  order: number;
  onClick?: (ctx: { openTab: (tab: TabDescriptor) => void }) => void;
  renderPanel?: () => React.ReactElement;
}
```

### Global Panels

```ts
interface GlobalPanelRegistration {
  id: string;
  position: 'sidebar-right' | 'sidebar-left' | 'drawer-bottom';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  render: () => React.ReactElement;
}
```

### Settings Tabs

```ts
interface SettingsTabRegistration {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  order?: number;
  render: () => React.ReactElement;
}
```

### Agent Tools

```ts
interface AgentToolDefinition {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, unknown>;  // JSON Schema
}

interface AgentToolHandler {
  name: string;
  handler: (params: unknown, ctx: PluginRequestContext) => Promise<unknown>;
}
```

---

## Plugin Registry

The registry (`packages/plugin-registry`) manages all registrations:

- **`plugins.config.ts`** — Lists enabled plugin manifest IDs. Remove an ID to disable a plugin.
- **`loadClientPlugins(modules)`** — Called at app startup. Iterates modules, checks if enabled, calls `register()`.
- **`loadServerPlugins(modules)`** — Called server-side. Calls `registerServer()`.
- **Accessor functions** — `getNavTabs()`, `getContentTabs()`, `getAnalysisPanelProviders()`, `getToolbarItems()`, `getAgentToolDefinitions()`, etc.

## Client/Server Split

Some plugins have both client and server code. The agent plugin demonstrates the pattern:

- **Client entry** (`plugin.ts`) — Registers UI components, tool definitions (metadata only).
- **Server entry** (`plugin.server.ts`) — Registers API routes, tool handlers (with Node.js dependencies).
- **Subpath export** — `@purplesector/plugin-agent/server` for the server entry.

This split prevents Node.js-only modules (LangGraph, Prisma) from being bundled into the client webpack.

The client loader (`apps/web/src/plugins/index.ts`) imports `plugin.ts`. The server loader (`apps/web/src/lib/plugin-server.ts`) imports `plugin.server.ts`.

## API Route Dispatcher

Plugin API routes are served by a catch-all Next.js route:

```text
apps/web/src/app/api/plugins/[...path]/route.ts
```

It matches URLs like `/api/plugins/<pluginId>/<path>` and dispatches to the registered `PluginApiRoute` handler.

## Plugin Database Models

Plugins can define their own Prisma models in `prisma/plugin.prisma` within their package directory. The merge script (`scripts/merge-plugin-schemas.ts`) scans all `packages/plugin-*/prisma/plugin.prisma` files and produces `packages/db-prisma/prisma/schema.generated.prisma`.

Run the merge after adding or modifying plugin schemas:

```bash
npx ts-node scripts/merge-plugin-schemas.ts
npm run db:push
```

---

## Writing a New Plugin

### 1. Create the Package

```bash
mkdir packages/plugin-my-feature
cd packages/plugin-my-feature
npm init -y
```

Set the package name to `@purplesector/plugin-my-feature`.

### 2. Define the Manifest

```ts
// src/plugin.tsx
import type { PluginModule, PluginManifest } from '@purplesector/plugin-api';

const manifest: PluginManifest = {
  id: 'purple-sector.my-feature',
  name: 'My Feature',
  version: '0.1.0',
  description: 'Adds my custom feature',
  capabilities: ['contentTab', 'navTab'],
  entry: './plugin',
};
```

### 3. Implement Registrations

```ts
const plugin: PluginModule = {
  manifest,
  register(ctx) {
    ctx.registerNavTab({ /* ... */ });
    ctx.registerContentTab({ /* ... */ });
  },
};

export default plugin;
```

### 4. Wire Into the App

Add the import to `apps/web/src/plugins/index.ts`:

```ts
import myFeaturePlugin from '@purplesector/plugin-my-feature';

const allPlugins: PluginModule[] = [
  coreLapViewsPlugin,
  agentPlugin,
  vehiclesPlugin,
  myFeaturePlugin,  // ← add here
];
```

Add the manifest ID to `packages/plugin-registry/src/plugins.config.ts`:

```ts
export const enabledPlugins = [
  'purple-sector.core-lap-views',
  'purple-sector.agent',
  'purple-sector.vehicles',
  'purple-sector.my-feature',  // ← add here
];
```

Add path mappings to **both** `tsconfig.json` (root) and `apps/web/tsconfig.json`.

### 5. (Optional) Add Database Models

Create `packages/plugin-my-feature/prisma/plugin.prisma` with your models, then run the merge script.

### 6. Test

Start the dev server and verify your nav tab, content view, or other registrations appear in the UI.
