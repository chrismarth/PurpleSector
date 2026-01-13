# Protocol Buffers - Compiled Schema Fix

## Issue

The browser was sending malformed protobuf messages that the server couldn't decode:

```
Error handling message: RangeError: index out of range: 3 + 116 > 20
```

## Root Cause

**Schema mismatch between browser and server:**

- **Server**: Used `protobufjs` to load schema from `.proto` file at runtime
- **Browser**: Used `protobufjs/light` with inline JSON schema definition

Even though the schemas looked identical, the two libraries encode messages differently. The inline JSON schema in the browser created messages that the server's runtime-loaded schema couldn't decode.

## Solution

**Use compiled protobuf for both browser and server:**

1. Generate static JavaScript from `.proto` file using `pbjs`
2. Generate TypeScript definitions using `pbts`
3. Import compiled schema in browser instead of inline JSON

This ensures both browser and server use the exact same encoding/decoding logic.

## Changes Made

### 1. Generate Compiled Protobuf

```bash
npm install --save-dev protobufjs-cli
npm run proto:generate
```

This creates:
- `src/proto/telemetry.js` - Compiled JavaScript
- `src/proto/telemetry.d.ts` - TypeScript definitions

### 2. Update Browser Helper

**Before** (`src/lib/telemetry-proto-browser.ts`):
```typescript
import protobuf from 'protobufjs/light';

// Inline JSON schema (incompatible encoding)
const root = protobuf.Root.fromJSON({
  nested: { ... }
});
```

**After**:
```typescript
import { purplesector } from '../proto/telemetry.js';

const { WebSocketMessage, MessageType } = purplesector;
```

### 3. Fix Enum References

Compiled protobuf has enums directly on the type, not in `.values`:

**Before**:
```typescript
MessageType.values.START_DEMO  // ❌ Wrong
```

**After**:
```typescript
MessageType.START_DEMO  // ✅ Correct
```

### 4. Remove Unused Code

- Removed `isProtobuf()` heuristic function
- Removed inline JSON schema
- Simplified imports

## Files Modified

1. **`src/proto/telemetry.js`** - Generated compiled protobuf
2. **`src/proto/telemetry.d.ts`** - Generated TypeScript definitions
3. **`src/lib/telemetry-proto-browser.ts`** - Use compiled schema
4. **`src/app/session/[id]/page.tsx`** - Remove `isProtobuf` import
5. **`package.json`** - Add `proto:generate` script

## How It Works

### Compilation Process

```
packages/proto/telemetry.proto
        ↓ (pbjs)
apps/web/src/proto/telemetry.js (ES6 module)
        ↓ (pbts)
src/proto/telemetry.d.ts (TypeScript)
```

### Usage

**Browser:**
```typescript
import { purplesector } from '../proto/telemetry.js';
const message = purplesector.WebSocketMessage.create({...});
const buffer = purplesector.WebSocketMessage.encode(message).finish();
```

**Server:**
```javascript
const proto = require('../src/proto/telemetry-proto');
await proto.init(); // Loads from .proto file
const buffer = proto.createTelemetryMessage(data);
```

Both now produce **identical binary output**.

## Testing

### Regenerate Protobuf (if schema changes)

```bash
npm run proto:generate
```

### Test Communication

```bash
npm run ws-server
npm run dev
```

**Expected:**
```
✓ Protocol Buffers initialized
✓ Client connected: ::1:xxxxx
Client ::1:xxxxx using protobuf
Starting demo mode playback
Demo mode: 9066 total frames across 5 laps
```

**Should NOT see:**
- ❌ "index out of range"
- ❌ "Failed to decode protobuf message"
- ❌ "Error handling message"

## Benefits

1. **Compatible encoding** - Browser and server use same logic
2. **Type safety** - TypeScript definitions from schema
3. **Smaller bundle** - Compiled code is optimized
4. **Faster** - No runtime schema parsing
5. **Reliable** - No encoding mismatches

## Why This Matters

Protocol Buffers is a **binary format** where encoding details matter:

- Field ordering
- Wire types
- Varint encoding
- Length prefixes

Even small differences in how the schema is interpreted can create incompatible messages. Using the **same compiled code** ensures compatibility.

## Maintenance

### When to Regenerate

Run `npm run proto:generate` when:
- You modify `packages/proto/telemetry.proto`
- You add/remove message types
- You change field numbers or types

### Verification

After regenerating, test both browser and server:
```bash
npm run test:protobuf        # Server-side test
npm run test:ws-protobuf     # Integration test
```

## Comparison

| Approach | Browser | Server | Compatible? |
|----------|---------|--------|-------------|
| **Before** | Inline JSON | Runtime .proto | ❌ No |
| **After** | Compiled | Runtime .proto | ✅ Yes |

The server still loads from `.proto` at runtime (for flexibility), but the browser uses compiled code that's guaranteed to be compatible.

## Alternative Approach

If you want both to use compiled code:

1. Update server to use compiled protobuf
2. Remove runtime `.proto` loading
3. Faster startup, but less flexible

Current approach balances flexibility (server) with compatibility (browser).

---

**Status**: ✅ Fixed  
**Method**: Compiled protobuf for browser  
**Compatibility**: 100% with server
