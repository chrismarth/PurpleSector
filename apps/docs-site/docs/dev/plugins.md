---
id: plugins
title: Plugin Architecture
sidebar_label: Plugins
---

This document describes the Purple Sector plugin architecture, with a focus on **lap analysis view plugins**. Over time, the same pattern will be used for vehicles, live views, and analysis modules.

## Overview

- **Core app** exposes a small runtime and a typed plugin API.
- **Plugins** are regular TypeScript/React modules that implement interfaces from `@purplesector/plugin-api`.
- The web app discovers and registers plugins at startup, then calls them to render parts of the UI.

Right now, the first pluginized feature is the **lap analysis telemetry plots**.

---

## Plugin API package

The shared types live in the workspace package:

- `packages/plugin-api` → published (locally) as `@purplesector/plugin-api`

Key exports for lap views:

```ts
// packages/plugin-api/src/lapAnalysis.ts

export type LapAnalysisViewContext = 'singleLap' | 'lapComparison';

export interface LapAnalysisHostAPI {
  // Reserved for future helpers (navigation, theming, etc.)
}

export interface PlotConfig { /* trimmed for docs */ }
export interface PlotLayout { /* trimmed for docs */ }

export interface LapAnalysisViewProps {
  context: LapAnalysisViewContext;
  telemetry: TelemetryFrame[];
  compareTelemetry?: TelemetryFrame[];
  compareLapId?: string | null;
  plotConfigs: PlotConfig[];
  plotLayout: PlotLayout;
  onPlotConfigsChange: (configs: PlotConfig[]) => void;
  onPlotLayoutChange: (layout: PlotLayout) => void;
  host: LapAnalysisHostAPI;
}

export interface LapAnalysisView {
  id: string;
  title: string;
  context: LapAnalysisViewContext;
  render: (props: LapAnalysisViewProps) => React.ReactElement;
}
```

and the generic plugin contracts:

```ts
// packages/plugin-api/src/plugin.ts

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  capabilities: ('lapAnalysisView')[];
  entry: string;
}

export interface PluginContext {
  registerLapAnalysisView(view: LapAnalysisView): void;
}

export interface PluginModule {
  manifest: PluginManifest;
  register: (ctx: PluginContext) => void;
}
```

---

## Writing a lap analysis view plugin

A lap analysis view plugin is any module that exports a `PluginModule` and registers one or more `LapAnalysisView` implementations.

### 1. Create the module

Example (simplified) core plugin (actual code lives in `packages/plugin-core-lap-telemetry/src/plugin.tsx`):

```ts title="packages/plugin-core-lap-telemetry/src/plugin.tsx"
"use client";

import * as React from 'react';
import type {
  PluginModule,
  PluginContext,
  LapAnalysisView,
  LapAnalysisViewProps,
  PluginManifest,
} from '@purplesector/plugin-api';
import { TelemetryPlotPanel } from '@purplesector/web-charts';

const lapTelemetryPlotsView: LapAnalysisView = {
  id: 'core-lap-telemetry-plots',
  title: 'Telemetry Plots',
  context: 'singleLap',
  render: (props: LapAnalysisViewProps) => {
    const {
      telemetry,
      compareTelemetry,
      compareLapId,
      plotConfigs,
      plotLayout,
      onPlotConfigsChange,
      onPlotLayoutChange,
    } = props;

    return (
      <TelemetryPlotPanel
        data={telemetry}
        compareData={compareTelemetry}
        compareLapId={compareLapId ?? undefined}
        initialPlotConfigs={plotConfigs}
        initialLayout={plotLayout}
        onPlotConfigsChange={onPlotConfigsChange}
        onLayoutChange={onPlotLayoutChange}
      />
    );
  },
};

const manifest: PluginManifest = {
  id: 'purple-sector.core-lap-views',
  name: 'Core Lap Telemetry Views',
  version: '0.1.0',
  description: 'Built-in lap telemetry plot views',
  capabilities: ['lapAnalysisView'],
  entry: './plugin',
};

const plugin: PluginModule = {
  manifest,
  register(ctx: PluginContext) {
    ctx.registerLapAnalysisView(lapTelemetryPlotsView);
  },
};

export default plugin;
```

### 2. Implement `render`

`render` receives all telemetry and plot configuration data; the plugin is free to:

- Render any React UI it wants.
- Respect or ignore the existing `plotConfigs`/`plotLayout` model.
- Use `context` to switch between single-lap and comparison behaviour.

Because the host passes data by value, plugins do **not** talk directly to the database or collectors.

---

## Host integration (web app)

The web app currently has a very small plugin registry:

```ts title="apps/web/src/plugins/index.ts"
import type { PluginContext, PluginModule, LapAnalysisView } from '@purplesector/plugin-api';
import coreLapViewsPlugin from '@purplesector/plugin-core-lap-telemetry';

const lapAnalysisViews: LapAnalysisView[] = [];

const pluginContext: PluginContext = {
  registerLapAnalysisView(view: LapAnalysisView) {
    lapAnalysisViews.push(view);
  },
};

function loadPlugin(module: PluginModule) {
  module.register(pluginContext);
}

// Register built-in plugins here
[coreLapViewsPlugin].forEach(loadPlugin);

export function getLapAnalysisViews(): LapAnalysisView[] {
  return lapAnalysisViews.slice();
}
```

The lap page uses the first registered view for now:

```ts title="apps/web/src/app/lap/[id]/page.tsx"{4-14}
import { getLapAnalysisViews } from '@/plugins';

// ... inside the component render
const views = getLapAnalysisViews().filter(v => v.context === 'singleLap');
const view = views[0];

return view
  ? view.render({
      context: compareLapId ? 'lapComparison' : 'singleLap',
      telemetry: telemetryFrames,
      compareTelemetry: compareTelemetry.length > 0 ? compareTelemetry : undefined,
      compareLapId,
      plotConfigs,
      plotLayout,
      onPlotConfigsChange: setPlotConfigs,
      onPlotLayoutChange: setPlotLayout,
      host: {},
    })
  : null;
```

In the future this registry will move into a shared `@purplesector` package and support multiple plugin sources (workspace packages, local folders, npm). For now, plugins are discovered by being statically imported into the web app.

---

## Roadmap for other plugin types

The same pattern will be reused for:

- **Vehicle definition providers** – custom vehicle config UI and telemetry mapping.
- **Live session views** – extra panels in the live dashboard.
- **Analyzers and reports** – computation plugins that produce structured analysis results.

When those are implemented, the plugin API will grow additional registration methods on `PluginContext` (e.g. `registerVehicleDefinition`, `registerLiveSessionView`, etc.).
