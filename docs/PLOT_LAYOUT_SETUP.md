# Plot Layout Persistence Setup

This document describes the setup steps required to enable the plot layout persistence feature.

## Installation Steps

### 1. Install Required Dependencies

```bash
npm install @radix-ui/react-scroll-area
```

### 2. Generate Prisma Client

After updating the schema, regenerate the Prisma client:

```bash
npx prisma generate
```

### 3. Push Database Schema Changes

Apply the new `SavedPlotLayout` model to the database:

```bash
npm run db:push
```

## Feature Overview

The plot layout persistence feature allows users to:

1. **Apply Saved Layout** - Load a previously saved layout
2. **Set Current as Default** - Set the current layout as the default for the context (global, session, or lap)
3. **Save Layout As...** - Save the current plot configuration with a custom name
4. **Manage Layouts** - Comprehensive management dialog to edit, delete, and set defaults

## Context Types

Layouts can be saved in three contexts:

- **global** - Available across all sessions and laps (default)
- **session** - Specific to live session views
- **lap** - Specific to individual lap analysis views

## API Endpoints

- `GET /api/plot-layouts?context={context}` - List all saved layouts for a context
- `POST /api/plot-layouts` - Create a new saved layout
- `GET /api/plot-layouts/{id}` - Get a specific layout
- `PATCH /api/plot-layouts/{id}` - Update a layout
- `DELETE /api/plot-layouts/{id}` - Delete a layout
- `GET /api/plot-layouts/default?context={context}` - Get the default layout for a context
- `POST /api/plot-layouts/default` - Set a layout as default

## Usage

### In the Telemetry Data Panel

The panel header displays the current layout status:
- **"Layout: [Name]"** - Shows the name of the currently loaded layout
- **"(Modified)"** - Appears in orange when you've made changes to the loaded layout
- **"No saved layout active"** - Shows when using the default system layout

Look for the "more" button (three vertical dots) next to the fullscreen toggle. This menu provides:

1. **Apply Saved Layout** - Opens a dialog showing all saved layouts. Click one to load it.
2. **Update Current Layout** - Updates the currently loaded layout with your changes (disabled when no layout is active).
3. **Set Current as Default** - Saves the current layout and marks it as the default.
4. **Save Layout As...** - Opens a dialog to save the current layout with a name and optional description.
5. **Manage Layouts** - Opens a comprehensive management dialog where you can edit, delete, and set defaults for all saved layouts.

### Managing Layouts

The Manage Layouts dialog provides a comprehensive interface for managing all saved layouts:

1. Click the "more" button (⋮) → "Manage Layouts"
2. In the dialog, you can perform these actions on any layout:
   - **Edit Name/Description** - Click the pencil icon to edit inline, then click the checkmark to confirm
   - **Set as Default** - Click the star icon to toggle default status (filled star = default)
   - **Delete** - Click the trash icon to mark for deletion (can be undone before saving)
3. All changes are batched and only applied when you click "Save Changes"
4. Click "Cancel" to discard all pending changes and close the dialog
5. Visual indicators show:
   - **Default badge** - Shows which layout is currently the default
   - **Modified badge** - Shows layouts with pending edits
   - **Marked for deletion** - Shows layouts that will be deleted (with undo option)

### Default Layout Behavior

When viewing telemetry data:
1. First, check if there's a user-defined default layout for the context
2. If not, fall back to the system default (three standard plots)

## Files Modified/Created

### Database
- `packages/db-prisma/prisma/schema.prisma` - Added `SavedPlotLayout` model

### API Routes
- `src/app/api/plot-layouts/route.ts` - List and create layouts
- `src/app/api/plot-layouts/[id]/route.ts` - Get, update, delete specific layout
- `src/app/api/plot-layouts/default/route.ts` - Get and set default layout

### Components
- `packages/web-charts/src/TelemetryPlotPanel.tsx` - Added layout management menu and handlers (exposed to the app via the core lap telemetry plugin)
- `apps/web/src/components/SaveLayoutDialog.tsx` - Dialog for saving layouts
- `apps/web/src/components/LoadLayoutDialog.tsx` - Dialog for loading layouts
- `apps/web/src/components/ManageLayoutsDialog.tsx` - Dialog for managing all layouts
- `apps/web/src/components/ui/scroll-area.tsx` - Scroll area component for dialogs

## Next Steps

After running the setup commands above, the feature will be fully functional. You can:

1. Start the development server: `npm run dev`
2. Navigate to a session or lap view
3. Configure your desired plot layout
4. Use the "more" menu to save, load, or set as default
