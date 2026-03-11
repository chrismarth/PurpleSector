# PurpleSector Pipeline Scripts

Utility scripts for managing the telemetry pipeline infrastructure.

## Pipeline Management

### `start-pipeline.sh`

Start the complete telemetry pipeline with automatic initialization.

```bash
./scripts/start-pipeline.sh
```

**What it does:**
- Starts all Docker services (Redpanda, RisingWave, Redis, etc.)
- Waits for services to be healthy
- Automatically initializes RisingWave schema
- Ensures pipeline is ready for data ingestion

**Use this:** When starting the system fresh or after a reboot.

---

### `reset-pipeline.sh`

Reset the entire pipeline by clearing all data and reinitializing schemas.

```bash
./scripts/reset-pipeline.sh
```

**What it does:**
1. Clears all Redpanda topics (deletes and recreates)
2. Drops all RisingWave sources, materialized views, and sinks
3. Clears all Redis telemetry streams
4. Reinitializes RisingWave schema from SQL migrations
5. Restarts Redis bridge and WebSocket server

**Use this when:**
- Pipeline is in a broken state
- You need to clear old/corrupted data
- Schema changes require a clean slate
- Testing from a fresh state

**⚠️ Warning:** This deletes ALL telemetry data. Use with caution in production.

---

### `init-risingwave.sh`

Initialize or reinitialize RisingWave schema without clearing data.

```bash
./scripts/init-risingwave.sh
```

**What it does:**
- Waits for RisingWave to be ready
- Runs all SQL migrations in `infra/risingwave/` in order
- Creates sources, materialized views, and sinks
- Idempotent: safe to run multiple times

**Use this when:**
- RisingWave container was restarted and lost schema
- Adding new SQL migrations
- Schema is missing but data is intact

---

## Development Workflow

### Fresh Start
```bash
# Start everything with initialization
./scripts/start-pipeline.sh

# Start demo data streaming
cd rust && DEMO_USER_ID=__demo__ DEMO_SESSION_ID=shared \
  cargo run -p ps-demo-replay -- \
  /home/racerx/Projects/PurpleSector/collectors/demo-data/demo-telemetry.json
```

### Reset After Issues
```bash
# Clear everything and start fresh
./scripts/reset-pipeline.sh

# Restart demo replay
cd rust && DEMO_USER_ID=__demo__ DEMO_SESSION_ID=shared \
  cargo run -p ps-demo-replay -- \
  /home/racerx/Projects/PurpleSector/collectors/demo-data/demo-telemetry.json
```

### After Container Restart
```bash
# Just reinitialize schema (data preserved)
./scripts/init-risingwave.sh
```

---

## Troubleshooting

### "No data in plots"
1. Check if demo replay is running: `ps aux | grep ps-demo-replay`
2. Check RisingWave has data: 
   ```bash
   docker run --rm --network host postgres:15-alpine \
     psql -h localhost -p 4566 -U root -d dev \
     -c "SELECT COUNT(*) FROM telemetry_samples;"
   ```
3. Check Redis bridge is publishing:
   ```bash
   docker logs ps-redis-bridge --tail 20
   ```
4. If all else fails: `./scripts/reset-pipeline.sh`

### "Pipeline is slow/choppy"
- Check if multiple demo replays are running: `pkill -f ps-demo-replay`
- Restart Redis bridge: `docker restart ps-redis-bridge`
- Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)

### "RisingWave schema errors"
- Run: `./scripts/init-risingwave.sh`
- If that fails: `./scripts/reset-pipeline.sh`

---

## Architecture

The pipeline flow:
```
Collector/Demo Replay
  ↓ (gRPC)
Gateway (ps-grpc-gateway)
  ↓ (Redpanda/Kafka)
RisingWave (stream processing)
  ↓ (PostgreSQL wire protocol)
Redis Bridge (ps-redis-bridge)
  ↓ (Redis Pub/Sub)
WebSocket Server (ps-ws-server)
  ↓ (WebSocket)
Browser (Next.js app)
```

Each script ensures this pipeline is properly initialized and operational.
