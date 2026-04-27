# ACC Hybrid Telemetry Collector - Quick Setup Guide

This guide will help you set up the ACC Hybrid Telemetry Collector for complete telemetry analysis.

## Prerequisites

✅ **Windows OS** (Shared Memory only works on Windows)  
✅ **Assetto Corsa Competizione** installed  
✅ **Node.js 18+** installed  
✅ **Purple Sector** cloned and dependencies installed

## Installation Steps

### 1. Install Dependencies

If you haven't already, install the required npm packages:

```bash
npm install
```

This will install `acc-node-wrapper` which provides Shared Memory access.

### 2. Configure ACC Broadcasting

Create or edit the broadcasting configuration file:

**Location:** `Documents/Assetto Corsa Competizione/Config/broadcasting.json`

```json
{
  "updListenerPort": 9000,
  "connectionPassword": "",
  "commandPassword": ""
}
```

**Notes:**
- Leave passwords empty for local use
- Port 9000 is the default (can be changed if needed)
- Restart ACC after creating/modifying this file

### 3. Start the Services

You need **3 terminal windows**:

#### Docker Infrastructure (includes WebSocket server)

```bash
docker compose -f docker-compose.dev.yml up -d
```

Wait for the WS server container to be healthy.

#### Terminal 2: Django + Vite Frontend

```bash
npm run dev
```

Wait for: `Ready on http://localhost:3000`

#### Terminal 3: ACC Hybrid Telemetry Collector

```bash
# Via Rust tray app — select "ACC" as sim type
cd rust && cargo run -p ps-tray-app
```

**Expected startup sequence:**

```
═══════════════════════════════════════════════════
  ACC Hybrid Telemetry Collector
  (Broadcasting + Shared Memory)
═══════════════════════════════════════════════════
✓ UDP server listening on 0.0.0.0:9000

Data sources:
  • Broadcasting: Session state, position, lap times
  • Shared Memory: Throttle, brake, steering, RPM
═══════════════════════════════════════════════════
Initializing ACC Shared Memory...
✓ Shared Memory initialized
Connecting to WebSocket server at ws://localhost:8080...
✓ Connected to WebSocket server
Sending registration request to ACC Broadcasting...
```

### 4. Start ACC and Begin Racing

1. Launch Assetto Corsa Competizione
2. Start any session (Practice, Qualifying, Race, Hotlap)
3. Once on track, the collector should connect:

```
✓ Successfully registered with ACC Broadcasting
  Connection ID: 1
  Update rate: 100ms (10Hz)
✓ Receiving real-time updates from ACC
  Source: 127.0.0.1:9000
  Session: 0, Phase: 1
✓ Shared Memory active - full telemetry available
```

### 5. Create a Session in Purple Sector

1. Open browser to `http://localhost:3000`
2. Click "New Session"
3. Enter session name (e.g., "Monza Practice")
4. Select "Live" telemetry source
5. Start driving!

## Verification

### Check Telemetry is Working

You should see real-time data for:

- ✅ **Speed** - From velocity vector
- ✅ **Throttle** - From shared memory (0-100%)
- ✅ **Brake** - From shared memory (0-100%)
- ✅ **Steering** - From shared memory (-100% to +100%)
- ✅ **Gear** - From broadcasting
- ✅ **RPM** - From shared memory
- ✅ **Lap Number** - From broadcasting
- ✅ **Lap Time** - From broadcasting
- ✅ **Track Position** - From broadcasting (normalized 0-1)
- ✅ **Delta** - From broadcasting (time delta to best lap)

### Troubleshooting

#### "Failed to initialize Shared Memory"

**Cause:** Not running on Windows, or ACC not running

**Solution:**
- Ensure you're on Windows
- Start ACC before starting the collector
- Make sure ACC is in a session (not main menu)

#### "Not registered yet, retrying..."

**Cause:** ACC broadcasting not configured or ACC not running

**Solution:**
- Verify `broadcasting.json` exists and is valid
- Restart ACC after creating the config file
- Check firewall isn't blocking UDP port 9000

#### "Shared Memory unavailable - limited telemetry"

**Cause:** Shared Memory initialization failed but Broadcasting works

**Solution:**
- You'll get position/lap data but no throttle/brake/steering
- Check ACC is running on the same machine
- Try restarting the collector after ACC is fully loaded

#### No telemetry data at all

**Cause:** Not in an active session

**Solution:**
- ACC must be in an active session (driving on track)
- Main menu and replay mode don't provide telemetry
- Pause menu may interrupt data flow

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│              ACC Game (Windows)                      │
│  • Broadcasting: Session context (100ms)            │
│  • Shared Memory: Input data (333Hz)                │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│        ACC Hybrid Telemetry Collector                │
│  1. UDP packet arrives (100ms)                      │
│  2. Read current shared memory                      │
│  3. Merge both data sources                         │
│  4. Send complete telemetry                         │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│           WebSocket Server (8080)                    │
│  • Relays telemetry to frontend                     │
│  • Broadcasts to all connected clients              │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│         Purple Sector Frontend (3000)                │
│  • Live telemetry visualization                     │
│  • Lap recording and analysis                       │
│  • AI-powered coaching                              │
└─────────────────────────────────────────────────────┘
```

## Performance Notes

### Update Rate

- **Broadcasting:** 100ms (10Hz) - configurable
- **Shared Memory:** ~3ms (333Hz) - sampled on-demand
- **Output to WebSocket:** 100ms (10Hz)

### Why 10Hz is Perfect

- ✅ 10 samples per second is excellent for analysis
- ✅ Captures all driver inputs clearly
- ✅ Reasonable bandwidth and storage
- ✅ Smooth visualization in frontend
- ✅ Human reaction time is ~200ms anyway

### Bandwidth Usage

- ~1KB per packet × 10 packets/sec = **~10KB/sec**
- Very reasonable for local network or internet streaming
- Compare to 333Hz: would be ~333KB/sec (33× more!)

## Advanced Configuration

### Change Update Rate

Edit `/services/acc-telemetry-collector-hybrid.js`:

```javascript
const UPDATE_INTERVAL = 100; // Change to 50, 100, 250, etc. (milliseconds)
```

**Recommendations:**
- **50ms (20Hz):** Maximum detail, higher bandwidth
- **100ms (10Hz):** Optimal balance (recommended)
- **250ms (4Hz):** Minimal bandwidth, still useful

### Remote Telemetry

If ACC is on a different machine:

1. Set environment variable:
   ```bash
   set ACC_HOST=192.168.1.100
   ```

2. Use Broadcasting-only mode (no shared memory):
   The Rust tray app automatically falls back to broadcasting-only on non-Windows platforms.

Note: You won't get throttle/brake/steering data remotely.

### Password Protection

If you set passwords in `broadcasting.json`:

Set the ACC connection password in the Rust tray app settings panel, or via the config file:
```toml
# ~/.config/purplesector/ps-tray-app/config.toml
acc_connection_password = "your_connection_password"
```

## Next Steps

Once telemetry is flowing:

1. **Complete laps** - Each lap is automatically saved
2. **Analyze laps** - Click on completed laps for AI analysis
3. **Compare laps** - See delta times and improvements
4. **Ask questions** - Use the chat interface for specific advice

## Support

For issues or questions:

- Check `/docs/ACC_TELEMETRY.md` for detailed technical documentation
- Review troubleshooting section in main README
- Verify all services are running (WebSocket, Frontend, Collector)

---

**Happy Racing! 🏁**
