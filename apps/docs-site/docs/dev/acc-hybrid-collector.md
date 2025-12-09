# ACC Hybrid Telemetry Collector

This page explains the hybrid ACC telemetry collector that combines the ACC Broadcasting Protocol with Shared Memory to provide complete telemetry.

## Overview

The hybrid collector is:

- **Platform:** Windows only (Shared Memory).
- **Data sources:**
  - Broadcasting – session context, position, lap times, etc.
  - Shared Memory – throttle, brake, steering, RPM, and other physics data.
- **Output:** merged telemetry at ~10 Hz, suitable for analysis and visualization.

Compared to broadcasting-only collectors, the hybrid collector adds full input channels and richer physics data.

## Prerequisites

- Windows OS.
- Assetto Corsa Competizione installed and configured for broadcasting.
- Node.js 18+.
- Purple Sector codebase and dependencies installed (includes `acc-node-wrapper`).

## Setup Summary

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure ACC broadcasting in `Documents/Assetto Corsa Competizione/Config/broadcasting.json`:

   ```json
   {
     "updListenerPort": 9000,
     "connectionPassword": "",
     "commandPassword": ""
   }
   ```

3. Start services:

   - WebSocket server (legacy path):

     ```bash
     npm run ws-server
     ```

   - Next.js frontend:

     ```bash
     npm run dev
     ```

   - Hybrid collector:

     ```bash
     npm run telemetry:acc-hybrid
     ```

4. Launch ACC, start a session, and drive. The collector will register with ACC and begin streaming full telemetry.

## Data Merging Strategy

The hybrid collector pipeline is:

```text
ACC Broadcasting (UDP, ~10 Hz)
          +
ACC Shared Memory (Physics, ~333 Hz)
          ↓
Hybrid Collector → WebSocket/Kafka → Frontend
```

On each broadcasting update (e.g., every 100 ms):

1. Receive session/position data from ACC via UDP.
2. Read the current physics state from Shared Memory (throttle, brake, steering, RPM, etc.).
3. Merge both into a single telemetry frame.
4. Forward the merged frame into the Purple Sector pipeline.

This gives you fresh input data from a high-frequency source while keeping output at a manageable 10 Hz.

## Verifying Telemetry

With the hybrid collector running and ACC in a session, you should see:

- Speed, gear, lap number, lap time, and track position.
- Throttle/brake values (0–100%).
- Steering angle (-100% to +100%).
- RPM and related engine channels.

If Shared Memory fails to initialize, the collector will fall back to broadcasting-only behavior and log errors; common causes include ACC not running or not being in a session.

## Advanced Configuration

Typical tuning points:

- **Update interval** – how often to merge and send frames (e.g., 100 ms).
- **Remote ACC host** – using `ACC_HOST` when ACC runs on a different machine; in that case you may be limited to broadcasting-only telemetry.
- **Broadcast/passwords** – set `ACC_PASSWORD` if you enable passwords in `broadcasting.json`.

See the original `docs/ACC_HYBRID_SETUP.md` for the full, step-by-step setup guide and troubleshooting tips; this page captures the conceptual design and integration details.
