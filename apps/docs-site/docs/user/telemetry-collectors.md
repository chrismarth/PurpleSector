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
# Kafka transport (recommended for full pipeline)
npm run telemetry:ac-kafka

# WebSocket transport (direct to browser)
npm run telemetry
```

### Available Channels

Throttle, brake, steering, speed, gear, RPM, lap time, lap number, normalized track position.

## Assetto Corsa Competizione (ACC)

ACC provides two collector options. See **Developer Guide → ACC Telemetry Collectors** and **ACC Hybrid Telemetry Collector** for in-depth technical details.

### Broadcasting-Only Collector

Cross-platform, uses ACC's UDP broadcasting protocol. Provides session context, car position, lap times, and speed — but **not** throttle, brake, or steering inputs.

```bash
npm run telemetry:acc-kafka
```

### Hybrid Collector (Recommended)

Windows-only. Combines broadcasting with shared memory to provide **full telemetry** including throttle, brake, steering, and RPM.

```bash
npm run telemetry:acc-hybrid
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
# Kafka transport
npm run telemetry:demo-kafka

# WebSocket transport
npm run telemetry:demo
```

This is useful for development, testing, and demos.

## Choosing a Transport

- **Kafka** — Recommended for the full pipeline. Provides durable delivery, per-session ordering, and feeds both the WebSocket bridge and the database consumer.
- **WebSocket** — Direct connection to the browser. Simpler setup but no persistence or replay.

When using `npm run dev:start`, the Kafka transport is used by default with the demo collector.

## Verifying Telemetry

After starting a collector:

1. Open `http://localhost:3000` and log in.
2. Check the nav tree — a new session should appear under an event.
3. Click the session to see live telemetry (if streaming) or click a lap for analysis.
4. Check collector logs for errors:

```bash
# If using PM2
npx pm2 logs demo-collector-dev
```

## Troubleshooting

- **No data appearing** — Verify the game is running and in a session (not just at the menu). Check UDP ports and firewall rules.
- **Missing channels** — If using the ACC broadcasting-only collector, throttle/brake/steering will be absent. Use the hybrid collector for full data.
- **Collector crashes** — Check logs for connection errors. Ensure the game's broadcasting config matches the collector's environment variables.

For more details, see **Troubleshooting**.
