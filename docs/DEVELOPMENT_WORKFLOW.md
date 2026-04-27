# Development Workflow

## Quick Reference

### Making Code Changes

**For ALL Docker services (gRPC Gateway, WebSocket Server):**
```bash
# 1. Make your code changes
# 2. Rebuild the service (always rebuilds from scratch, no cache)
./scripts/rebuild-services.sh <service-name>

# Examples:
./scripts/rebuild-services.sh grpc-gateway
./scripts/rebuild-services.sh ws-server

# Or rebuild all services at once:
./scripts/rebuild-services.sh all
```

**For PM2 services (Vite dev server, Demo Replay):**
```bash
# Restart specific service
npx pm2 restart vite-dev
npx pm2 restart demo-replay

# Or restart all PM2 services
npx pm2 restart all
```

**For Rust binaries used by PM2 (Demo Replay):**
```bash
# 1. Rebuild the binary
cd rust && cargo build --release -p ps-demo-replay

# 2. Restart PM2 service
npx pm2 restart demo-replay
```

## Development Setup

### docker-compose.dev.override.yml

The project uses Docker Compose override files to enable hot-reloading in development:

- **Rust binaries**: Volume-mounted from `rust/target/release/`
- **Node.js source**: Volume-mounted directly from `services/`
- **Build cache**: Disabled to prevent stale code issues

This means:
1. ✅ No Docker rebuild needed for code changes
2. ✅ Just rebuild the binary (Rust) or restart the service (Node.js)
3. ✅ Changes are picked up immediately

### Troubleshooting Stale Code

If a service isn't picking up your changes:

1. **Check if the binary/source is actually updated:**
   ```bash
   ls -lh rust/target/release/ps-grpc-gateway
   # Should show recent timestamp
   ```

2. **Restart the service:**
   ```bash
   docker compose -f docker-compose.dev.yml restart <service-name>
   ```

3. **Check the logs to verify new code is running:**
   ```bash
   docker logs ps-grpc-gateway --tail 20
   ```

4. **If still not working, force rebuild:**
   ```bash
   ./scripts/rebuild-services.sh <service-name>
   ```

## Common Workflows

### Adding a New Feature to gRPC Gateway

```bash
# 1. Edit the code
vim rust/crates/ps-grpc-gateway/src/gateway.rs

# 2. Rebuild
cd rust && cargo build --release -p ps-grpc-gateway

# 3. Restart
docker compose -f docker-compose.dev.yml restart grpc-gateway

# 4. Check logs
docker logs ps-grpc-gateway -f
```

### Updating Protobuf Schema

```bash
# 1. Edit proto file
vim proto/telemetry.proto

# 2. Rebuild descriptor for RisingWave
protoc --descriptor_set_out=proto/telemetry.pb --include_imports proto/telemetry.proto

# 3. Rebuild Rust services that use proto
cd rust && cargo build --release -p ps-grpc-gateway

# 4. Restart affected services
docker compose -f docker-compose.dev.yml restart grpc-gateway risingwave

# 5. Reinitialize RisingWave schema
./scripts/init-risingwave.sh
```

### Updating RisingWave Schema

```bash
# 1. Edit SQL files
vim infra/risingwave/001_sources.sql

# 2. Drop and recreate (dev only!)
docker exec -it ps-risingwave psql -h localhost -p 4566 -d dev -c "DROP SOURCE IF EXISTS telemetry_frames CASCADE;"

# 3. Reinitialize
./scripts/init-risingwave.sh

# 4. Restart Redis bridge to reconnect
docker compose -f docker-compose.dev.yml restart redis-bridge
```

## Why This Approach?

### Before (Problems)
- Docker build cache persisted old binaries
- `--no-cache` was slow and didn't always work
- Had to rebuild entire images for small changes
- Unclear when changes were actually picked up

### After (Solutions)
- Volume mount binaries/source directly
- Rebuild only what changed (Rust binary or nothing for Node.js)
- Restart service to pick up changes
- Fast iteration cycle

## Best Practices

1. **Always check logs after restart** to verify new code is running
2. **Use `cargo build --release`** for Rust (debug builds work but are slower)
3. **Restart services in dependency order** if multiple services changed
4. **Use `./scripts/rebuild-services.sh`** as last resort, not first choice
5. **Keep `docker-compose.dev.override.yml`** in version control for team consistency
