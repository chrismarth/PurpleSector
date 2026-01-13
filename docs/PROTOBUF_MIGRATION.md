# Protocol Buffers Migration Guide

## Overview

The telemetry system has been migrated from JSON to Protocol Buffers (protobuf) for improved performance and reduced bandwidth usage. The system maintains **backward compatibility** with JSON, automatically detecting and handling both formats.

## Benefits

- **Smaller message size**: Protobuf messages are typically 3-10x smaller than JSON
- **Faster serialization**: Binary format is faster to encode/decode
- **Type safety**: Schema-defined messages with strong typing
- **Backward compatible**: System automatically detects and handles both JSON and protobuf

## Architecture

### Components Updated

1. **WebSocket Server** (`services/websocket-server.js`)
   - Auto-detects client protocol preference
   - Sends messages in client's preferred format
   - Maintains per-client protocol state

2. **Telemetry Collectors**
   - `collectors/ac-kafka/ac-collector-kafka.js`
   - `collectors/acc-kafka/acc-collector-kafka.js`
   - `collectors/acc-websocket/acc-collector-websocket.js` (legacy)
   - All send protobuf by default, fallback to JSON if protobuf fails

3. **Frontend** (`src/app/session/[id]/page.tsx`)
   - Attempts protobuf first
   - Automatically falls back to JSON if server sends JSON
   - Transparent to user

### Protocol Buffer Schema

Located in `packages/proto/telemetry.proto`:

```protobuf
message TelemetryFrame {
  int64 timestamp = 1;
  float speed = 2;
  float throttle = 3;
  float brake = 4;
  float steering = 5;
  int32 gear = 6;
  int32 rpm = 7;
  float normalized_position = 8;
  int32 lap_number = 9;
  int32 lap_time = 10;
  optional float session_time = 11;
  optional int32 session_type = 12;
  optional int32 track_position = 13;
  optional int32 delta = 14;
}

message WebSocketMessage {
  enum MessageType {
    UNKNOWN = 0;
    CONNECTED = 1;
    TELEMETRY = 2;
    START_DEMO = 3;
    STOP_DEMO = 4;
    DEMO_COMPLETE = 5;
    PING = 6;
    PONG = 7;
  }
  
  MessageType type = 1;
  oneof payload {
    TelemetryFrame telemetry = 2;
    StatusMessage status = 3;
  }
}
```

## How It Works

### Server-Side (Node.js)

The server uses `protobufjs` to load and encode/decode messages:

```javascript
const proto = require('../src/proto/telemetry-proto');

// Initialize
await proto.init();

// Send telemetry
const buffer = proto.createTelemetryMessage(telemetryData);
wsClient.send(buffer);

// Decode incoming message
const decoded = proto.decodeMessage(buffer);
```

### Client-Side (Browser)

The frontend uses `protobufjs/light` for minimal bundle size:

```typescript
import { isProtobuf, decodeMessage, createStartDemoMessage } from '@/lib/telemetry-proto-browser';

// Check if data is protobuf
if (isProtobuf(buffer)) {
  const decoded = decodeMessage(buffer);
  // Use decoded.data
}

// Send protobuf message
ws.send(createStartDemoMessage());
```

## Protocol Detection

### Server Detection

The WebSocket server detects the protocol used by each client:

1. Client connects (defaults to JSON)
2. If client sends protobuf, server switches that client to protobuf mode
3. Server remembers preference per-client
4. All subsequent messages use client's preferred protocol

### Client Detection

The frontend detects the protocol used by the server:

1. Starts with protobuf preference
2. If server sends JSON, switches to JSON mode
3. Continues using detected protocol

## Performance Comparison

### Message Size (Typical Telemetry Frame)

- **JSON**: ~200-250 bytes
- **Protobuf**: ~50-80 bytes
- **Savings**: 60-70% reduction

### At 60 Hz Telemetry Rate

- **JSON**: ~15 KB/s per client
- **Protobuf**: ~4.5 KB/s per client
- **Savings**: ~10.5 KB/s per client

### For 10 Concurrent Clients

- **JSON**: ~150 KB/s
- **Protobuf**: ~45 KB/s
- **Savings**: ~105 KB/s (70% reduction)

## Backward Compatibility

The system is fully backward compatible:

- Old clients using JSON continue to work
- New clients using protobuf work with old servers
- Mixed environments (some JSON, some protobuf) work seamlessly
- No configuration required - automatic detection

## Troubleshooting

### Protobuf Not Working

If protobuf fails to initialize, the system automatically falls back to JSON:

```
Failed to initialize Protocol Buffers: [error]
Falling back to JSON mode
```

This is normal and the system will continue working with JSON.

### Checking Protocol in Use

**Server logs:**
```
✓ Protocol Buffers initialized
Client [address] switched to protobuf mode
```

**Browser console:**
```
Received JSON, switching to JSON mode
```

### Force JSON Mode

To force JSON mode (for debugging):

**Server:** Comment out protobuf initialization in the service files

**Client:** Set `useProtobufRef.current = false` in the session page

## Development

### Adding New Fields

1. Edit `packages/proto/telemetry.proto`
2. Add new field with unique field number
3. Restart services (protobuf loads schema at runtime)
4. Update TypeScript types if needed

Example:
```protobuf
message TelemetryFrame {
  // ... existing fields ...
  optional float fuel_level = 15;  // New field
}
```

### Testing

Test both protocols:

1. **Protobuf mode**: Normal operation
2. **JSON mode**: Disable protobuf initialization
3. **Mixed mode**: Connect multiple clients with different protocols

## Files Modified

### New Files
- `packages/proto/telemetry.proto` - Protocol buffer schema
- `packages/proto/index.js` - Node.js protobuf helper (@purplesector/proto)
- `apps/web/src/lib/telemetry-proto-browser.ts` - Browser protobuf helper
- `docs/PROTOBUF_MIGRATION.md` - This document

### Modified Files
- `services/websocket-server.js` - Protobuf support + auto-detection
- `services/acc-telemetry-collector.js` - Protobuf encoding
- `services/ac-telemetry-collector.js` - Protobuf encoding
- `services/acc-telemetry-collector-hybrid.js` - Protobuf encoding
- `src/app/session/[id]/page.tsx` - Protobuf decoding + auto-detection
- `package.json` - Added protobufjs dependency

## Dependencies

- **protobufjs** (^7.5.4): Protocol buffer runtime for Node.js and browser
  - Server uses full version with runtime loading
  - Browser uses light version for minimal bundle size

## Future Enhancements

1. **Compression**: Add gzip compression on top of protobuf for even smaller messages
2. **Streaming**: Use protobuf streaming for continuous telemetry
3. **Versioning**: Add version field to handle schema evolution
4. **Metrics**: Add telemetry to track protobuf vs JSON usage
