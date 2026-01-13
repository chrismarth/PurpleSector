# WebSocket Server Issues Fixed

## Problems Identified

### 1. ❌ Global Lap Counter
**Issue**: Server was using a global `currentLapIndex` that incremented across ALL clients.

**Impact**:
- Multiple clients shared the same lap counter
- Lap numbers were incorrect when multiple sessions were active
- Caused duplicate lap saves and data corruption

**Before**:
```javascript
// Global state - BAD!
let demoInterval = null;
let currentLapIndex = 0;

// Override lap number from data
lapNumber: currentLapIndex + 1,  // ❌ Wrong!
```

### 2. ❌ Shared Demo Playback State
**Issue**: Single global `demoInterval` shared by all clients.

**Impact**:
- All clients received the same frames at the same time
- Couldn't have independent playback for different sessions
- Stopping one client's demo stopped all demos

### 3. ❌ Lap Number Override
**Issue**: Server was overriding the `lapNumber` from the telemetry data.

**Impact**:
- Lost the actual lap number from the demo data
- Lap numbers didn't match the telemetry frames
- Caused lap time calculation errors

## Solutions Implemented

### 1. ✅ Per-Client State Management
Changed from global state to per-client state tracking:

```javascript
// Before: Set (no state)
const clients = new Set();

// After: Map with state
const clients = new Map(); // Map<WebSocket, { interval, lapIndex, frameIndex }>
```

Each client now has:
- **interval**: Their own playback timer
- **lapIndex**: Their current lap (independent)
- **frameIndex**: Their position in the lap

### 2. ✅ Independent Demo Playback
Each client gets their own demo playback:

```javascript
function startDemoMode(client) {
  // Initialize client-specific state
  const clientState = clients.get(client) || {};
  clientState.lapIndex = 0;
  clientState.frameIndex = 0;
  
  clientState.interval = setInterval(() => {
    // Client-specific playback logic
    const state = clients.get(client);
    const currentLap = laps[state.lapIndex];
    const frame = currentLap.frames[state.frameIndex];
    
    // Send only to this client
    client.send(message);
    state.frameIndex++;
  }, intervalMs);
  
  clients.set(client, clientState);
}
```

### 3. ✅ Preserve Original Lap Numbers
Server now respects the lap number from the telemetry data:

```javascript
// Before: Override with global counter
lapNumber: currentLapIndex + 1,  // ❌

// After: Use original from data
lapNumber: frame.lapNumber || (state.lapIndex + 1),  // ✅
```

### 4. ✅ Proper Cleanup
Each client's demo is stopped independently:

```javascript
function stopDemoMode(client) {
  if (client) {
    // Stop demo for specific client
    const clientState = clients.get(client);
    if (clientState && clientState.interval) {
      clearInterval(clientState.interval);
      clientState.interval = null;
      clientState.lapIndex = 0;
      clientState.frameIndex = 0;
    }
  } else {
    // Stop demo for all clients
    clients.forEach((clientState, client) => {
      if (clientState.interval) {
        clearInterval(clientState.interval);
        // ... cleanup
      }
    });
  }
}
```

## How It Works Now

### Connection Flow
1. Client connects → Server creates client state entry
2. Client sends `start_demo` → Server starts independent playback for that client
3. Server sends frames with **original lap numbers** from data
4. Client disconnects → Server stops demo and cleans up state

### Multiple Clients
- ✅ Each client has independent playback
- ✅ Each client has correct lap numbers
- ✅ Stopping one client doesn't affect others
- ✅ No shared state or race conditions

### Lap Transitions
```javascript
if (state.frameIndex >= currentLap.frames.length) {
  // Move to next lap (per-client)
  state.lapIndex = (state.lapIndex + 1) % laps.length;
  state.frameIndex = 0;
  console.log(`Demo lap ${state.lapIndex + 1} started`);
  return; // Start fresh next iteration
}
```

## Files Modified
- `services/websocket-server.js` - Complete rewrite of demo mode logic

## Testing Checklist
- [ ] Start single session - laps increment correctly (1, 2, 3, 4, 5)
- [ ] Start multiple sessions simultaneously - each has independent lap numbers
- [ ] Stop one session - other sessions continue unaffected
- [ ] Reconnect after server restart - starts from lap 1
- [ ] Check lap times in database - should be ~28-29 seconds each
- [ ] Verify no "Session not found" errors in server logs

## Expected Behavior

**Before Fix:**
- Lap 1: 0:28.966 ✅
- Lap 2: 0:00.616 ❌ (wrong!)
- Lap 3: 0:00.033 ❌ (wrong!)

**After Fix:**
- Lap 1: 0:28.966 ✅
- Lap 2: 0:28.XXX ✅ (correct!)
- Lap 3: 0:28.XXX ✅ (correct!)

All laps should have similar times (~28-29 seconds) with proper lap number increments!
