# Math Channels - Implementation Complete

## Overview

Math channels are now fully integrated into PurpleSector. Users can create derived telemetry channels using mathematical expressions that are evaluated client-side (with future server-side support).

## What's Been Implemented

### 1. **Shared Telemetry Registry** (`@purplesector/telemetry`)
- `TelemetryChannelDefinition` union type (raw + math channels)
- `RAW_CHANNELS` - in-memory list of all raw telemetry channels
- `CompositeChannelRegistry` - merges raw + math channels with availability checking
- `MathChannelEvaluator` - mathjs-based expression evaluator
- `evaluateMathChannelSeries()` - evaluates math channels over time series

### 2. **Database Schema**
- `MathChannel` model added to Prisma schema
- Fields: id, label, unit, expression, inputs (JSON), timestamps

### 3. **Backend API** (`/api/channels/math`)
- `GET /api/channels/math` - List all math channels
- `POST /api/channels/math` - Create new math channel
- `PUT /api/channels/math/[id]` - Update math channel
- `DELETE /api/channels/math/[id]` - Delete math channel

### 4. **UI Components**
- `ChannelEditorDialog` - Main channel library dialog
  - Lists all raw + math channels
  - Filter by type (All/Raw/Math)
  - Shows availability status
  - Edit/Delete actions for math channels
- `MathChannelForm` - Create/edit math channels
  - Name and unit fields
  - Input channel selection with variable aliases
  - Expression editor with validation
  - Helper text for available functions

### 5. **Chart Integration**
- `ConfigurableTelemetryChart` now supports both raw and math channels
- Automatically evaluates math channels client-side using mathjs
- Seamless integration - math channels appear just like raw channels

### 6. **App Integration** (`LapPage`)
- Registry instantiated with raw + math channels
- CRUD handlers wired to backend API
- Channel Editor dialog integrated

## Final Setup Steps

### 1. Run Prisma Migration

```bash
cd packages/db-prisma
npx prisma migrate dev --name add_math_channels
```

This will:
- Create the `MathChannel` table in your database
- Generate the Prisma client with the new model
- Resolve all TypeScript errors in the API routes

### 2. Test the Feature

1. Start your development server
2. Navigate to any lap page
3. Open the Channel Editor (you'll need to add a button - see below)
4. Create a test math channel:
   - Name: "Brake Bias"
   - Unit: "%"
   - Inputs:
     - brake → alias: `rear`
     - brake → alias: `front` (you'd need separate front/rear in real data)
   - Expression: `rear / (front + rear) * 100`
5. Add the math channel to a plot
6. Verify it evaluates and displays correctly

### 3. Add Channel Editor Button

You'll want to add a button somewhere in your UI to open the Channel Editor. Suggested location: in the TelemetryDataPanel toolbar or header.

Example:
```tsx
<Button
  onClick={() => setShowChannelEditor(true)}
  variant="outline"
  size="sm"
>
  <Calculator className="h-4 w-4 mr-2" />
  Manage Channels
</Button>
```

## How It Works

### Creating a Math Channel

1. User opens Channel Editor
2. Clicks "New Math Channel"
3. Defines:
   - Name and unit
   - Input channels (raw telemetry) with variable aliases
   - Mathematical expression using those aliases
4. Expression is validated
5. Channel is saved to database
6. Immediately available in all plots

### Using a Math Channel

1. User opens plot configuration
2. Selects math channel from dropdown (appears alongside raw channels)
3. Chart detects `kind === 'math'`
4. Builds input series from referenced raw channels
5. Calls `evaluateMathChannelSeries(def, inputSeries)`
6. Displays derived values in the plot

### Expression Language

Powered by mathjs, supports:
- Basic arithmetic: `+`, `-`, `*`, `/`, `%`, `^`
- Functions: `min`, `max`, `abs`, `sqrt`, `pow`, `sin`, `cos`, `tan`, etc.
- Constants: `PI`, `E`
- Variables: user-defined aliases for input channels

Security:
- No `eval()` or `Function()` constructor
- AST validation blocks assignments, function definitions, blocks
- Only whitelisted functions available
- Null/NaN handling prevents bad data propagation

## Architecture Benefits

1. **Single Source of Truth**: All channel metadata in `@purplesector/telemetry`
2. **Isomorphic**: Same evaluator works client-side and server-side
3. **Type-Safe**: Full TypeScript support throughout
4. **Extensible**: Easy to add new functions or validation rules
5. **User-Friendly**: Math channels look and behave like raw channels

## Future Enhancements

- [ ] Server-side precomputation for heavy math channels
- [ ] Expression preview with sample data
- [ ] User-defined reusable functions
- [ ] Math channel templates/library
- [ ] Import/export math channel definitions
- [ ] Conditional expressions (if/else)
- [ ] Vector operations for multi-channel math

## Files Modified/Created

### Created
- `packages/telemetry/src/index.ts` - Extended with registry + evaluator
- `apps/web/src/components/ChannelEditorDialog.tsx`
- `apps/web/src/components/MathChannelForm.tsx`
- `apps/web/src/app/api/channels/math/route.ts`
- `apps/web/src/app/api/channels/math/[id]/route.ts`

### Modified
- `packages/db-prisma/prisma/schema.prisma` - Added MathChannel model
- `apps/web/src/app/lap/[id]/page.tsx` - Integrated registry + editor
- `apps/web/src/types/plotConfig.ts` - Removed CHANNEL_METADATA
- `packages/web-charts/src/ConfigurableTelemetryChart.tsx` - Math evaluation
- `packages/web-charts/src/PlotConfigDialog.tsx` - Uses RAW_CHANNELS
- `package.json` - Added mathjs dependency

## Dependencies Added

- `mathjs@^11.11.0` - Expression parsing and evaluation
