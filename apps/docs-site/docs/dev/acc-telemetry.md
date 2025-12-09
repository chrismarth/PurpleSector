# ACC Telemetry Collectors

This page describes the Assetto Corsa Competizione (ACC) telemetry collectors and how they integrate with Purple Sector.

## Overview

Purple Sector provides two ACC collectors:

1. **Broadcasting-only** – Cross-platform, limited telemetry.
2. **Hybrid (Broadcasting + Shared Memory)** – Windows-only, full telemetry (throttle, brake, steering, RPM, etc.).

The hybrid collector is recommended when you want complete input telemetry; the broadcasting-only collector is useful for remote or cross-platform setups.

## ACC Broadcasting Protocol

ACC exposes a UDP-based broadcasting protocol:

- The collector registers with ACC using a registration packet.
- ACC responds with a connection ID and begins sending periodic updates.
- Multiple packet types provide session, car, track, and event data.

Key inbound packet types:

- `REGISTRATION_RESULT` – confirms registration.
- `REALTIME_UPDATE` – session-level state.
- `REALTIME_CAR_UPDATE` – car-specific telemetry (speed, position, lap time, etc.).
- `ENTRY_LIST`, `ENTRY_LIST_CAR` – cars in the session.
- `TRACK_DATA` – track information.
- `BROADCASTING_EVENT` – events like lap completed.

## Game Configuration

ACC broadcasting is configured via:

```text
Documents/Assetto Corsa Competizione/Config/broadcasting.json
```

Example:

```json
{
  "updListenerPort": 9000,
  "connectionPassword": "",
  "commandPassword": ""
}
```

- `updListenerPort` – UDP port used by ACC (default: 9000).
- `connectionPassword` – optional read-only password.
- `commandPassword` – optional password for control commands.

## Collector Configuration

Typical environment variables for the ACC collectors include:

```env
ACC_UDP_PORT=9000          # Port to listen on (must match ACC config)
ACC_HOST=127.0.0.1         # ACC game machine IP
ACC_BROADCAST_PORT=9000    # ACC broadcasting port
ACC_PASSWORD=              # Connection password (if set in ACC)
```

The broadcasting-only collector uses these values to:

- Register with ACC.
- Receive periodic `REALTIME_*` updates.
- Forward telemetry into the Purple Sector pipeline (WebSocket or Kafka, depending on collector implementation).

For full hybrid behavior (combining broadcasting with shared memory), see **ACC Hybrid Telemetry Collector**.
