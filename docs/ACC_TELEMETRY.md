# Assetto Corsa Competizione Telemetry Integration

This document describes the ACC telemetry collector implementations and protocols.

## Overview

Purple Sector provides **two ACC telemetry collectors**:

1. **Broadcasting-only** (`services/acc-telemetry-collector.js`) - Cross-platform, limited telemetry
2. **Hybrid** (`services/acc-telemetry-collector-hybrid.js`) - Windows-only, complete telemetry ✅ **Recommended**

### Comparison

| Feature | Broadcasting Only | Hybrid (Broadcasting + Shared Memory) |
|---------|------------------|--------------------------------------|
| **Platform** | Any (Windows/Linux/Mac) | Windows only |
| **Speed, Position, Lap Times** | ✅ Yes | ✅ Yes |
| **Throttle, Brake, Steering** | ❌ No | ✅ Yes |
| **RPM** | ❌ No | ✅ Yes |
| **Update Rate** | 100ms (10Hz) | 100ms (10Hz) |
| **Setup Complexity** | Simple | Requires npm package |
| **Use Case** | Remote telemetry, basic analysis | Full analysis (recommended) |

**Recommendation:** Use the **hybrid collector** for complete telemetry analysis. It combines ACC's Broadcasting Protocol (for session/position data) with Shared Memory (for input data).

## ACC Broadcasting Protocol

### Protocol Architecture

ACC's broadcasting system uses UDP packets with a request-response pattern:

```
[ACC Telemetry Collector]  ←→  [ACC Game]
         (Client)                (Server)
```

### Connection Flow

1. **Registration Request** (Client → Server)
   - Client sends `REGISTER_COMMAND_APPLICATION` packet
   - Includes display name, password, and update interval
   - Protocol version 4

2. **Registration Result** (Server → Client)
   - Server responds with connection ID
   - Indicates success/failure
   - Provides error message if failed

3. **Real-time Updates** (Server → Client)
   - Server sends periodic updates at requested interval
   - Multiple packet types for different data

4. **Unregistration** (Client → Server)
   - Clean disconnect when shutting down

### Packet Types

#### Outbound (Client → Server)

| Type | ID | Description |
|------|----|----|
| `REGISTER_COMMAND_APPLICATION` | 1 | Initial registration request |
| `UNREGISTER_COMMAND_APPLICATION` | 9 | Disconnect request |
| `REQUEST_ENTRY_LIST` | 10 | Request list of cars in session |
| `REQUEST_TRACK_DATA` | 11 | Request track information |
| `CHANGE_HUD_PAGE` | 49 | Change HUD page (requires command password) |
| `CHANGE_FOCUS` | 50 | Change focused car (requires command password) |
| `INSTANT_REPLAY_REQUEST` | 51 | Request instant replay (requires command password) |

#### Inbound (Server → Client)

| Type | ID | Description |
|------|----|----|
| `REGISTRATION_RESULT` | 1 | Registration confirmation |
| `REALTIME_UPDATE` | 2 | Session state update |
| `REALTIME_CAR_UPDATE` | 3 | Car-specific telemetry |
| `ENTRY_LIST` | 4 | List of all cars in session |
| `TRACK_DATA` | 5 | Track information |
| `ENTRY_LIST_CAR` | 6 | Individual car entry |
| `BROADCASTING_EVENT` | 7 | Session events (lap completed, etc.) |

## Configuration

### ACC Game Configuration

File: `Documents/Assetto Corsa Competizione/Config/broadcasting.json`

```json
{
  "updListenerPort": 9000,
  "connectionPassword": "",
  "commandPassword": ""
}
```

**Parameters:**
- `updListenerPort`: UDP port for broadcasting (default: 9000)
- `connectionPassword`: Optional password for read-only access
- `commandPassword`: Optional password for control commands (HUD, focus, etc.)

### Collector Configuration

Environment variables:

```env
ACC_UDP_PORT=9000              # Port to listen on (must match ACC config)
ACC_UDP_HOST=0.0.0.0          # Listen on all interfaces
ACC_HOST=127.0.0.1            # ACC game machine IP
ACC_BROADCAST_PORT=9000        # ACC broadcasting port
ACC_PASSWORD=                  # Connection password (if set in ACC)
WS_SERVER_URL=ws://localhost:8080  # WebSocket relay server
```

## Telemetry Data

### Available Channels

The ACC Broadcasting Protocol provides the following telemetry:

**From REALTIME_CAR_UPDATE:**
- `speed` - Vehicle speed (km/h)
- `gear` - Current gear (-1 = reverse, 0 = neutral, 1+ = forward gears)
- `worldPos` - 3D position (X, Y, Z)
- `velocity` - 3D velocity vector
- `rotation` - Yaw, pitch, roll
- `carDamage` - Damage levels for 5 zones (0-1)
- `currentLap` - Current lap number
- `currentLapTime` - Current lap time (ms)
- `lastLap` - Last lap time (ms)
- `bestSessionLap` - Best lap time in session (ms)
- `splinePosition` - Normalized track position (0-1)
- `trackPosition` - Position in race/session
- `delta` - Time delta to best lap (ms)

**From REALTIME_UPDATE:**
- `sessionType` - Type of session (Practice, Qualifying, Race, etc.)
- `sessionTime` - Current session time (seconds)
- `sessionEndTime` - Session end time (seconds)
- `phase` - Session phase (Pre-session, Session, Post-session, etc.)
- `focusedCarIndex` - Index of currently focused car

### Limitations

The ACC Broadcasting Protocol does **not** provide:
- Throttle input (0-1)
- Brake input (0-1)
- Steering input (-1 to 1)
- RPM
- Individual tire data
- Suspension data
- Aerodynamic data

These channels are available through ACC's Shared Memory interface but not through the Broadcasting API. For full telemetry access, a Shared Memory implementation would be required.

### Data Mapping

The collector converts ACC data to Purple Sector's standard format:

```javascript
{
  timestamp: Date.now(),
  speed: carUpdate.speed,           // From velocity vector
  throttle: 0,                      // Not available
  brake: 0,                         // Not available
  steering: 0,                      // Not available
  gear: carUpdate.gear,
  rpm: 0,                           // Not available
  normalizedPosition: carUpdate.splinePosition,
  lapNumber: carUpdate.currentLap,
  lapTime: carUpdate.currentLapTime,
  sessionTime: realtimeUpdate.sessionTime,
  sessionType: realtimeUpdate.sessionType,
  trackPosition: carUpdate.trackPosition,
  delta: carUpdate.delta,
}
```

## Implementation Details

### String Encoding

ACC uses UTF-16LE encoding for strings with a length prefix:

```javascript
// Write string
function writeString(buffer, offset, str) {
  const length = str.length;
  buffer.writeUInt16LE(length, offset);
  buffer.write(str, offset + 2, length, 'utf16le');
  return offset + 2 + (length * 2);
}

// Read string
function readString(buffer, offset) {
  const length = buffer.readUInt16LE(offset);
  const str = buffer.toString('utf16le', offset + 2, offset + 2 + (length * 2));
  return { value: str, nextOffset: offset + 2 + (length * 2) };
}
```

### Registration Packet Structure

```
Offset | Type     | Description
-------|----------|-------------
0      | uint8    | Message type (1)
1      | uint8    | Protocol version (4)
2      | string   | Display name (length-prefixed UTF-16LE)
?      | string   | Connection password (length-prefixed UTF-16LE)
?      | int32    | Update interval (milliseconds)
?      | string   | Command password (length-prefixed UTF-16LE)
```

### Car Update Packet Structure

```
Offset | Type     | Description
-------|----------|-------------
0      | uint8    | Message type (3)
1      | uint16   | Car index
3      | uint16   | Driver index
5      | uint8    | Driver count
6      | int8     | Gear
7      | float32  | World position X
11     | float32  | World position Y
15     | float32  | World position Z
19     | float32  | Velocity X
23     | float32  | Velocity Y
27     | float32  | Velocity Z
31     | float32  | Yaw
35     | float32  | Pitch
39     | float32  | Roll
43     | float32  | Car damage [0]
47     | float32  | Car damage [1]
51     | float32  | Car damage [2]
55     | float32  | Car damage [3]
59     | float32  | Car damage [4]
63     | uint16   | Current lap
65     | int32    | Delta (ms)
69     | int32    | Best session lap (ms)
73     | int32    | Last lap (ms)
77     | int32    | Current lap time (ms)
81     | uint16   | Laps
83     | uint16   | Cup position
85     | uint16   | Track position
87     | float32  | Spline position
91     | uint16   | Speed (km/h)
```

## Hybrid Collector Architecture

The hybrid collector uses a **synchronized sampling strategy**:

```
┌─────────────────────────────────────────────────────────┐
│                    ACC Game (Windows)                    │
├──────────────────────┬──────────────────────────────────┤
│  Broadcasting UDP    │      Shared Memory               │
│  (Session Context)   │      (Input Data)                │
│  • Position          │      • Throttle                  │
│  • Lap times         │      • Brake                     │
│  • Delta             │      • Steering                  │
│  • Track position    │      • RPM                       │
│  Update: 100ms       │      Update: ~3ms (333Hz)        │
└──────────┬───────────┴─────────────┬────────────────────┘
           │                         │
           │ UDP Packet (100ms)      │ On-demand read
           ▼                         ▼
    ┌──────────────────────────────────────┐
    │   Hybrid Telemetry Collector         │
    │   1. Receive UDP packet              │
    │   2. Read current shared memory      │
    │   3. Merge both data sources         │
    │   4. Send to WebSocket (100ms rate)  │
    └──────────────────┬───────────────────┘
                       │
                       ▼
              WebSocket Server (10Hz)
```

**Key Benefits:**
- Broadcasting provides reliable session context at 10Hz
- Shared Memory provides fresh input data synchronized with position updates
- Avoids overwhelming the system with 333Hz data
- Perfect balance for analysis (10 samples/second)

## Running the Collectors

### Hybrid Collector (Recommended)

**Requirements:**
- Windows OS
- ACC running on same machine
- `npm install` to get `acc-node-wrapper` package

```bash
npm run telemetry:acc-hybrid
```

**Expected Output:**

```
═══════════════════════════════════════════════════
  ACC Hybrid Telemetry Collector
  (Broadcasting + Shared Memory)
═══════════════════════════════════════════════════
✓ UDP server listening on 0.0.0.0:9000

Data sources:
  • Broadcasting: Session state, position, lap times
  • Shared Memory: Throttle, brake, steering, RPM

Make sure ACC broadcasting is configured:
  File: Documents/Assetto Corsa Competizione/Config/broadcasting.json
  {
    "updListenerPort": 9000
  }
═══════════════════════════════════════════════════
Initializing ACC Shared Memory...
✓ Shared Memory initialized
Connecting to WebSocket server at ws://localhost:8080...
✓ Connected to WebSocket server
Sending registration request to ACC Broadcasting...
✓ Successfully registered with ACC Broadcasting
  Connection ID: 1
  Update rate: 100ms (10Hz)
✓ Receiving real-time updates from ACC
  Source: 127.0.0.1:9000
  Session: 0, Phase: 1
✓ Shared Memory active - full telemetry available
```

### Broadcasting-Only Collector

For non-Windows systems or remote telemetry:

```bash
npm run telemetry:acc
```

**Expected Output:**

```
═══════════════════════════════════════════════════
  Assetto Corsa Competizione Telemetry Collector
═══════════════════════════════════════════════════
✓ UDP server listening on 0.0.0.0:9000

Waiting for telemetry data from ACC...

Make sure ACC broadcasting is configured:
  File: Documents/Assetto Corsa Competizione/Config/broadcasting.json
  {
    "updListenerPort": 9000
  }
═══════════════════════════════════════════════════
Connecting to WebSocket server at ws://localhost:8080...
✓ Connected to WebSocket server
Sending registration request to ACC...
✓ Successfully registered with ACC
  Connection ID: 1
  Read-only: true
✓ Receiving real-time updates from ACC
  Source: 127.0.0.1:9000
  Session: 0, Phase: 1
```

## Troubleshooting

### Registration Fails

**Symptom:** "Registration failed" error message

**Solutions:**
1. Check that ACC is running and in a session (not main menu)
2. Verify `broadcasting.json` exists and is valid JSON
3. Check that the password matches if one is set
4. Ensure the UDP port is not blocked by firewall
5. Verify ACC is listening on the correct port

### No Telemetry Data

**Symptom:** Registered successfully but no data received

**Solutions:**
1. Make sure you're actively driving (not in pits/menu)
2. Check that a car is focused (ACC must have a focused car)
3. Verify the update interval is reasonable (100ms recommended)
4. Check WebSocket server is running and connected

### Connection Drops

**Symptom:** Collector disconnects after some time

**Solutions:**
1. ACC may close the connection if idle too long
2. Restart the collector and ACC
3. Check network stability if ACC is on a different machine

### Wrong Car Data

**Symptom:** Receiving data for wrong car

**Solutions:**
1. The collector tracks the focused car from `REALTIME_UPDATE`
2. Change focus in ACC to the desired car
3. Or implement `CHANGE_FOCUS` command (requires command password)

## Update Frequencies Explained

### Broadcasting Protocol (UDP)

The `REALTIME_CAR_UPDATE` packet frequency is **configurable** during registration:

- **Default in our implementation:** 100ms (10Hz)
- **Configurable range:** 50-1000ms
- **Recommended:** 100ms for optimal balance

**Why 100ms?**
- Provides 10 samples per second (excellent for analysis)
- Reasonable bandwidth (~1KB/sec)
- Synchronized with typical display refresh needs
- Matches human perception of "real-time"

### Shared Memory

Shared Memory updates at **~333Hz** (approximately every 3ms):

- **Physics data:** 333Hz (gas, brake, steering, RPM, forces, etc.)
- **Graphics data:** Variable (depends on game rendering)
- **Static data:** Only on session changes

**Why not stream at 333Hz?**
- Would generate 333 packets/second = ~333KB/sec bandwidth
- Overwhelming for WebSocket, database, and frontend
- Most analysis doesn't need sub-10ms resolution
- Human reaction time is ~200ms anyway

### Hybrid Strategy (Best of Both Worlds)

Our hybrid approach:

1. **Broadcasting triggers at 100ms** → Provides session context
2. **Shared Memory sampled on-demand** → Reads current input state
3. **Merged data sent at 100ms** → Synchronized, complete telemetry

This gives you:
- ✅ Complete telemetry (all channels)
- ✅ Reasonable data rate (10Hz)
- ✅ Fresh input data (sampled from 333Hz source)
- ✅ Synchronized with position/lap data
- ✅ Perfect for analysis and visualization

**Example:** When a UDP packet arrives at 100ms intervals, we read the "current" throttle/brake/steering from shared memory (which is being updated at 333Hz), ensuring we always get the latest input state without streaming all 333 samples per second.

## Future Enhancements

### Potential Improvements

1. **Extended Physics Data** ✅ (Partial - can be expanded)
   - Tire temperatures and pressures (available in shared memory)
   - Suspension travel and forces (available in shared memory)
   - Aerodynamic forces (available in shared memory)
   - G-forces and acceleration (available in shared memory)

2. **Multi-car Support**
   - Track multiple cars simultaneously
   - Compare telemetry between cars
   - Spectator mode for analyzing other drivers

3. **Session Events**
   - Parse `BROADCASTING_EVENT` packets
   - Track lap completions, incidents, penalties
   - Session state changes

4. **Entry List Integration**
   - Parse `ENTRY_LIST` and `ENTRY_LIST_CAR` packets
   - Display driver names, car numbers
   - Track all cars in session

5. **Track Data**
   - Parse `TRACK_DATA` packets
   - Display track name, configuration
   - Track-specific analysis

## References

- [ACC Broadcasting Protocol Documentation](https://www.assettocorsa.net/forum/index.php?threads/acc-broadcasting-protocol-documentation.59965/)
- ACC SDK (included with game installation)
- Purple Sector WebSocket Protocol: See `services/websocket-server.js`

## Related Files

- `/services/acc-telemetry-collector-hybrid.js` - **Hybrid collector (recommended)** - Broadcasting + Shared Memory
- `/services/acc-telemetry-collector.js` - Broadcasting-only collector (cross-platform)
- `/services/websocket-server.js` - WebSocket relay server
- `/services/ac-telemetry-collector.js` - Original AC collector (for comparison)
- `/docs/DATABASE_MANAGEMENT.md` - Database schema and lap storage
- `package.json` - Dependencies including `acc-node-wrapper`
