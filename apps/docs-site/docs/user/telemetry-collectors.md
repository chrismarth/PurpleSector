# Telemetry Collectors

Telemetry collectors are the bridge between your racing simulator and Purple Sector. They read live data from the game and feed it into the telemetry pipeline.

## Available Collectors

Purple Sector ships with several collectors under the `collectors/` directory:

| Collector | Game | Transport | Platform | Channels |
|-----------|------|-----------|----------|----------|
| **AC (Kafka)** | Assetto Corsa | Kafka | Windows | Full (UDP) |
| **AC (WebSocket)** | Assetto Corsa | WebSocket | Windows | Full (UDP) |
| **ACC Broadcasting** | ACC | Kafka / WebSocket | Cross-platform | Limited (no inputs) |
| **ACC Hybrid** | ACC | WebSocket | Windows only | Full (broadcasting + shared memory) |
| **Demo (Kafka)** | None | Kafka | Any | Simulated data |
| **Demo (WebSocket)** | None | WebSocket | Any | Simulated data |

## Assetto Corsa (AC)

The AC collector reads telemetry via UDP from Assetto Corsa.

### Game Configuration

Edit `Documents/Assetto Corsa/cfg/telemetry.ini`:

```ini
[TELEMETRY]
ENABLED=1
UDP_PORT=9996
UDP_ADDRESS=127.0.0.1
```

### Running the Collector

```bash
# Via Rust tray app (recommended)
cd rust && cargo run -p ps-tray-app
# Select "Assetto Corsa" as sim type in settings
```

### Available Channels

Throttle, brake, steering, speed, gear, RPM, lap time, lap number, normalized track position.

## Assetto Corsa Competizione (ACC)

ACC provides two collector options. See **Developer Guide → ACC Telemetry Collectors** and **ACC Hybrid Telemetry Collector** for in-depth technical details.

### Broadcasting-Only Collector

Cross-platform, uses ACC's UDP broadcasting protocol. Provides session context, car position, lap times, and speed — but **not** throttle, brake, or steering inputs.

```bash
# Via Rust tray app — select "ACC" as sim type
cd rust && cargo run -p ps-tray-app
```

### Hybrid Collector (Recommended)

Windows-only. Combines broadcasting with shared memory to provide **full telemetry** including throttle, brake, steering, and RPM.

```bash
# Via Rust tray app — select "ACC" as sim type (auto-detects SHM on Windows)
cd rust && cargo run -p ps-tray-app
```

### Game Configuration

Edit `Documents/Assetto Corsa Competizione/Config/broadcasting.json`:

```json
{
  "updListenerPort": 9000,
  "connectionPassword": "",
  "commandPassword": ""
}
```

## Demo Collector

The demo collector publishes pre-recorded telemetry data — no game required. It is started automatically by `npm run dev:start`, or you can run it manually:

```bash
# Rust demo replayer (streams through gRPC gateway)
cd rust && cargo run -p ps-demo-replay -- collectors/demo-data/demo-telemetry.json

# Or use the Rust tray app with "Demo / Replay" sim type
cd rust && cargo run -p ps-tray-app
```

This is useful for development, testing, and demos.

## Transport Architecture

All telemetry flows through a single pipeline:

1. **Capture** — Rust `ps-telemetry-core` reads UDP/SHM/JSON
2. **Cloud path** — Batched, compressed, sent via gRPC → Redpanda → RisingWave → Redis → WebSocket → Frontend
3. **Desktop path** — Tauri events → embedded Next.js UI (no cloud infrastructure needed)

## Verifying Telemetry

After starting a collector:

1. Open `http://localhost:3000` and log in.
2. Check the nav tree — a new session should appear under an event.
3. Click the session to see live telemetry (if streaming) or click a lap for analysis.
4. Check Redpanda Console at http://localhost:8090 for messages on the `telemetry-batches` topic.

## Troubleshooting

- **No data appearing** — Verify the game is running and in a session (not just at the menu). Check UDP ports and firewall rules.
- **Missing channels** — If using the ACC broadcasting-only collector, throttle/brake/steering will be absent. Use the hybrid collector for full data.
- **Collector crashes** — Check logs for connection errors. Ensure the game's broadcasting config matches the collector's environment variables.

For more details, see **Troubleshooting**.
