# Analysis Panels

The analysis panel system powers the lap analysis view. It provides a configurable grid of panels where each panel is rendered by a plugin-provided `AnalysisPanelProvider`. This page covers the grid component, panel lifecycle, and how to create custom panel types.

## Overview

```text
┌─────────────────────────────────────────────────────┐
│  Analysis Toolbar (layout actions, save/load, etc.) │
├────────────────────────┬────────────────────────────┤
│  Panel A               │  Panel B                   │
│  ┌──────────────────┐  │  ┌──────────────────────┐  │
│  │ Toolbar (title,  │  │  │ Toolbar (title,      │  │
│  │ edit, fullscreen) │  │  │ edit, fullscreen)    │  │
│  ├──────────────────┤  │  ├──────────────────────┤  │
│  │                  │  │  │                      │  │
│  │  Chart content   │  │  │  Chart content       │  │
│  │                  │  │  │                      │  │
│  └──────────────────┘  │  └──────────────────────┘  │
├────────────────────────┴────────────────────────────┤
│  Panel C (full width)                               │
│  ┌──────────────────────────────────────────────┐   │
│  │ Toolbar + Chart content                      │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Key Components

### AnalysisPanelGrid

**File:** `apps/web/src/components/AnalysisPanelGrid.tsx`

The grid component manages:

- **Panel layout** — A list of panel definitions with IDs, types, sizes, and optional state.
- **Fullscreen** — Any panel can be toggled to fill the entire grid area. The grid measures the available height via `ResizeObserver` and passes it to the panel through `host.availableHeight`.
- **Layout actions** — Split horizontal, split vertical, remove panel.
- **Synced hover** — A shared hover value (e.g., time in seconds) is broadcast to all panels so they can highlight the same point.
- **Panel toolbar** — The grid renders a unified toolbar for each panel with the title (from the provider), edit button, fullscreen button, and layout actions.

### AnalysisPanelProvider

Plugins register providers that render panel content:

```ts
interface AnalysisPanelProvider {
  id: string;
  typeId: string;        // e.g. 'plot'
  isDefault?: boolean;
  render: (props: AnalysisPanelProps) => AnalysisPanelRender;
}
```

### AnalysisPanelProps

The grid passes these props to every provider:

```ts
interface AnalysisPanelProps {
  context: 'live' | 'singleLap' | 'lapComparison';
  telemetry: TelemetryFrame[];
  compareTelemetry?: TelemetryFrame[];
  compareLapId?: string | null;
  host: AnalysisHostAPI;
  panelId?: string;
  panelState?: unknown;
  syncedHoverValue?: number | null;
  onHoverChange?: (value: number | null) => void;
  mathChannels?: MathTelemetryChannel[];
}
```

### AnalysisHostAPI

The host API lets panels communicate back to the grid:

```ts
interface AnalysisHostAPI {
  setTitle?: (title: React.ReactNode) => void;
  availableHeight?: number;  // Set when panel is fullscreen
}
```

### Render Result

Providers can return either a plain `React.ReactElement` or a structured result:

```ts
interface AnalysisPanelRenderResult {
  title?: React.ReactNode;
  toolbarActions?: React.ReactNode;  // Rendered in the panel toolbar
  content: React.ReactElement;       // Main body
}
```

This allows providers to inject custom toolbar actions (e.g., the edit/pencil button) while the grid handles fullscreen, layout actions, and positioning.

## Fullscreen Behavior

When a panel is toggled to fullscreen:

1. The grid hides all other panels and expands the selected panel to fill the available area.
2. A `ResizeObserver` measures the inner content wrapper's height.
3. The measured height (minus ~130px for toolbar and chart chrome) is passed as `host.availableHeight`.
4. The panel provider uses this height to size its chart correctly.
5. Clicking the fullscreen button again (or pressing Escape) collapses back to the grid.

## Synced Hover

All panels in the grid share a hover value:

1. When the user hovers over a point in Panel A, the panel calls `onHoverChange(timeValue)`.
2. The grid stores this value and passes it as `syncedHoverValue` to all panels.
3. Each panel highlights the corresponding point on its chart.
4. When the mouse leaves, `onHoverChange(null)` clears the highlight.

## Layout Persistence

Panel arrangements are persisted as **analysis layouts** and **plot layouts**:

- **Analysis layouts** — Which panels exist, their types, sizes, and positions.
- **Plot layouts** — Per-panel configuration (channels, axes, colors, title).

API routes:

- `GET/POST /api/analysis-layouts` — List and create analysis layouts.
- `GET/PATCH/DELETE /api/analysis-layouts/[id]` — Manage individual layouts.
- `GET/POST /api/plot-layouts` — List and create plot layouts.
- `GET/PATCH/DELETE /api/plot-layouts/[id]` — Manage individual layouts.
- `GET/POST /api/plot-layouts/default` — Get/set the default layout.

## Creating a Custom Panel Type

### 1. Register the Type and Provider

In your plugin's `register()` function:

```ts
ctx.registerAnalysisPanelType({
  id: 'track-map',
  label: 'Track Map',
});

ctx.registerAnalysisPanelProvider({
  id: 'core-track-map',
  typeId: 'track-map',
  isDefault: true,
  render: (props) => ({
    title: 'Track Map',
    content: <TrackMapPanel {...props} />,
  }),
});
```

### 2. Implement the Panel Component

Your component receives `AnalysisPanelProps`:

```tsx
function TrackMapPanel(props: AnalysisPanelProps) {
  const { telemetry, compareTelemetry, host, syncedHoverValue } = props;

  // Use host.availableHeight for fullscreen sizing
  const height = host.availableHeight ?? 300;

  return (
    <div style={{ height }}>
      {/* Render your visualization */}
    </div>
  );
}
```

### 3. Handle Synced Hover

To participate in cross-panel hover synchronization:

```tsx
function TrackMapPanel(props: AnalysisPanelProps) {
  const { syncedHoverValue, onHoverChange } = props;

  // Highlight the point at syncedHoverValue
  // Call onHoverChange(value) when the user hovers over your panel
  // Call onHoverChange(null) when the mouse leaves
}
```

## Built-In Panel: Telemetry Plot

The `plugin-core-lap-telemetry` plugin registers the `plot` panel type with a provider that renders `SimpleTelemetryPlotPanel` → `ConfigurableTelemetryChart` (uPlot-based).

Key features:
- Channel selection (throttle, brake, steering, speed, RPM, gear, etc.)
- Compare-lap overlay with dashed lines
- Math channel support
- Configurable axes and colors
- Edit mode for changing plot configuration
- Fullscreen-aware sizing via `host.availableHeight`
