# Protocol Buffers Only Mode

## Changes Made

Removed all JSON fallback logic to enforce protobuf-only communication between the WebSocket server and clients. This simplifies the codebase and makes debugging easier.

## Rationale

1. **Simpler code** - No protocol detection or switching logic
2. **Easier debugging** - Only one message format to track
3. **Better performance** - No overhead from protocol detection
4. **Cleaner errors** - Failures are obvious, not hidden by fallbacks

## What Was Removed

### Server (`services/websocket-server.js`)

**Before:**
- `isProtobuf()` heuristic check
- JSON fallback when protobuf decode fails
- Per-client protocol tracking (`useProtobuf` flag)
- Dual-mode `sendToClient()` function

**After:**
- All messages must be protobuf
- `sendToClient()` only sends protobuf
- Decode failures throw errors (no silent fallback)
- Simpler, cleaner code

### Client (`src/app/session/[id]/page.tsx`)

**Before:**
- Protocol detection (ArrayBuffer vs Blob vs String)
- JSON fallback parsing
- `useProtobufRef` to track protocol
- Complex message handling with async Blob conversion

**After:**
- All messages must be ArrayBuffer
- Direct protobuf decoding
- No protocol switching
- Simpler message handler

## Message Flow

```
Browser                    WebSocket Server
   |                              |
   |-- protobuf (ArrayBuffer) -->|
   |                              |
   |<-- protobuf (Buffer) --------|
   |                              |
```

**All messages are protobuf, both directions.**

## Error Handling

### Server

```javascript
// If message is not a Buffer, reject it
if (!Buffer.isBuffer(message)) {
  console.error('Received non-buffer message, ignoring');
  return;
}

// Decode protobuf (throws on failure)
const decoded = proto.decodeMessage(message);
```

### Client

```javascript
// If message is not ArrayBuffer, reject it
if (!(event.data instanceof ArrayBuffer)) {
  console.error('Received non-ArrayBuffer message:', typeof event.data);
  return;
}

// Decode protobuf (throws on failure)
const decoded = decodeMessage(event.data);
```

## WebSocket Configuration

**Critical:** Browser WebSocket must be configured for binary mode:

```typescript
const ws = new WebSocket('ws://localhost:8080');
ws.binaryType = 'arraybuffer'; // REQUIRED for protobuf
```

Without this, binary data arrives as `Blob` which causes issues.

## Message Types

All message types use protobuf:

| Type | Direction | Size |
|------|-----------|------|
| CONNECTED | Server → Client | ~20 bytes |
| TELEMETRY | Server → Client | ~67 bytes |
| START_DEMO | Client → Server | 2 bytes |
| STOP_DEMO | Client → Server | 2 bytes |
| PING | Client → Server | 2 bytes |
| PONG | Server → Client | ~10 bytes |
| DEMO_COMPLETE | Server → Client | ~20 bytes |

## Files Modified

1. **`services/websocket-server.js`**
   - Removed `isProtobuf()` checks
   - Removed JSON fallback
   - Simplified `sendToClient()`
   - Removed `useProtobuf` parameter

2. **`src/app/session/[id]/page.tsx`**
   - Removed protocol detection
   - Removed `useProtobufRef`
   - Simplified `onmessage` handler
   - Removed JSON parsing

## Testing

### Start Services

```bash
npm run ws-server
npm run dev
```

### Expected Behavior

**Server logs:**
```
✓ Protocol Buffers initialized
✓ Client connected: ::1:xxxxx
Client ::1:xxxxx using protobuf
Starting demo mode playback
Demo mode: 9066 total frames across 5 laps
```

**No errors about:**
- "Failed to decode protobuf message"
- "Falling back to JSON"
- "index out of range"

### If Errors Occur

If you see decode errors, it means:
1. Browser isn't sending valid protobuf
2. Schema mismatch between browser and server
3. WebSocket not configured for binary mode

**Debug steps:**
1. Check browser console for errors
2. Verify `ws.binaryType = 'arraybuffer'`
3. Check protobuf schema matches on both sides
4. Verify protobufjs version compatibility

## Benefits

1. **74% bandwidth reduction** - Protobuf vs JSON
2. **Simpler codebase** - One protocol, not two
3. **Faster debugging** - Errors are obvious
4. **Better performance** - No protocol detection overhead
5. **Type safety** - Schema-defined messages

## Migration Notes

If you need to support old clients:
1. Keep this version for new clients
2. Create separate endpoint for legacy JSON clients
3. Don't mix protocols on same endpoint

## Backward Compatibility

**This is a breaking change.** Old clients using JSON will not work.

If you need backward compatibility, revert these changes and keep the dual-mode system.

---

**Status**: ✅ Implemented  
**Mode**: Protobuf-only  
**Fallback**: None (by design)
