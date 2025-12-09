# Plot Layout System

This page summarizes the plot layout system used in Purple Sector for arranging telemetry charts.

## Overview

The plot layout system lets users customize how telemetry plots are arranged and sized:

- Split plots horizontally or vertically.
- Resize plots using a 12-column grid.
- Persist layouts in the database per context (global, session, lap).
- Manage saved layouts via a dedicated dialog.

## Core Concepts

### Layout Structure

Layouts are stored as JSON containing:

- `configs` – plot configurations (title, channels, axes, etc.).
- `layout` – grid layout information for each plot.

Example (simplified):

```json
{
  "configs": [
    {
      "id": "plot_123",
      "title": "Throttle & Brake",
      "xAxis": "time",
      "channels": ["throttle", "brake"]
    }
  ],
  "layout": {
    "cols": 12,
    "items": [
      {
        "plotId": "plot_123",
        "x": 0,
        "y": 0,
        "w": 6,
        "h": 300
      }
    ]
  }
}
```

### Grid System

- **12 columns** – all plots use widths from 1–12 columns.
- `x` / `y` – position within the grid (row/column).
- `w` / `h` – width in columns and height in pixels.

## User Features

From the lap/session view, users can:

- **Split plots horizontally** – create side-by-side plots in a row.
- **Split plots vertically** – stack plots in multiple rows.
- **Resize plots** – drag handles between plots to adjust widths.
- **Delete plots** – remove unwanted plots and let the layout reflow.
- **Save layouts** – save the current configuration under a name.
- **Apply saved layouts** – load layouts per context.
- **Set defaults** – choose a default layout for global/session/lap contexts.

## Layout Persistence

The persistence layer is backed by a Prisma model (e.g., `SavedPlotLayout`) and API routes such as:

- `GET /api/plot-layouts` – list layouts.
- `POST /api/plot-layouts` – create a layout.
- `PATCH /api/plot-layouts/[id]` – update a layout.
- `DELETE /api/plot-layouts/[id]` – delete a layout.
- `GET /api/plot-layouts/default` – get the default layout for a context.
- `POST /api/plot-layouts/default` – set a default layout.

## Manage Layouts Dialog

A dedicated dialog provides batch management capabilities:

- Inline editing of names and descriptions.
- Toggling defaults with a star icon.
- Marking layouts for deletion with undo.
- Visual indicators for default, modified, and pending delete states.
- Batched save of all edits in a single operation.

## Layout Status Tracking

The telemetry panel shows the current layout status:

- `Layout: <Name>` when a saved layout is active.
- `Layout: <Name> (Modified)` when the current configuration differs from the saved version.
- `No saved layout active` when using the system default.

A menu action **Update Current Layout** lets users save changes back to the currently loaded layout, clearing the "Modified" state.

## Developer Notes

Implementation touches:

- Prisma schema (`SavedPlotLayout` model) in `packages/db-prisma`.
- API route handlers under `src/app/api/plot-layouts/*`.
- Frontend components such as:
  - `TelemetryPlotPanel` (layout controls and status).
  - `SaveLayoutDialog`, `LoadLayoutDialog`, `ManageLayoutsDialog`.

For detailed UX flows and testing checklists, see the original plot layout docs in `docs/` (GUIDE, SETUP, MANAGE, LAYOUT_STATUS_TRACKING); this page captures the core concepts and how they fit into the system.
