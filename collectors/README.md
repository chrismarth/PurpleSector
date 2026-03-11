# Purple Sector Telemetry Collectors

All telemetry capture is now handled by the Rust crates in `rust/crates/`.
This directory only contains static demo data.

## Rust Capture Crates

| Crate | Path | Purpose |
|-------|------|---------|
| `ps-tray-app` | `rust/crates/ps-tray-app` | System tray app — captures AC/ACC/Demo telemetry, streams via gRPC |
| `ps-demo-replay` | `rust/crates/ps-demo-replay` | CLI tool — replays demo data through the cloud pipeline |
| `ps-telemetry-core` | `rust/crates/ps-telemetry-core` | Shared library — `AcSource`, `AccSource`, `DemoSource`, batch assembly, gRPC transport |

### Capture Sources (`ps-telemetry-core::capture`)

| Source | Game | Transport | Notes |
|--------|------|-----------|-------|
| `AcSource` | Assetto Corsa | UDP (port 9996) | Handshake + binary packet parsing |
| `AccSource` | ACC | UDP broadcast + SHM | Full telemetry on Windows, broadcast-only cross-platform |
| `DemoSource` | — | JSON file replay | Reads `collectors/demo-data/demo-telemetry.json` at configurable Hz |

### Running

```bash
# Tray app (production — connects to cloud pipeline via gRPC)
cd rust && cargo run -p ps-tray-app

# Demo replay (single pass through gRPC → Redpanda → RisingWave)
cd rust && cargo run -p ps-demo-replay -- collectors/demo-data/demo-telemetry.json

# Tauri desktop app with demo mode
TELEMETRY_SOURCE=demo cargo tauri dev
```

## Demo Data

| File | Description |
|------|-------------|
| `demo-data/demo-telemetry.json` | Pre-recorded correlated physics model (~30s laps, 60Hz) |

## Architecture

```
Sim Game (AC/ACC) or DemoSource
    │ UDP / SHM / JSON file
    ▼
ps-telemetry-core (capture)
    │ TelemetryFrame
    ├─── Tray App path:  batch → WAL → gRPC → Gateway → Redpanda
    └─── Desktop path:   Tauri event → embedded Next.js UI

Cloud:  Redpanda → RisingWave → Redis → WebSocket → Frontend
```

## Sim Configuration

### Assetto Corsa
Edit `Documents/Assetto Corsa/cfg/telemetry.ini`:
```ini
[TELEMETRY]
ENABLED=1
UDP_PORT=9996
UDP_ADDRESS=127.0.0.1
```

### ACC
Edit `Documents/Assetto Corsa Competizione/Config/broadcasting.json`:
```json
{
  "updListenerPort": 9000,
  "connectionPassword": "",
  "commandPassword": ""
}
```
**Note:** ACC Shared Memory requires Windows and the sim running on the same machine.

## Documentation

- [Cloud Pipeline](../docs/CLOUD_PIPELINE.md) — Full architecture
- [Dev Environment](../docs/DEV_ENVIRONMENT.md) — Local setup
