# Monitoring

This page summarizes how to monitor the current telemetry pipeline, backend services, and overall telemetry health.

## PM2 Service Monitoring

PM2 is the primary tool for monitoring services in both dev and production:

```bash
npx pm2 status          # Quick status of all services
npx pm2 monit           # Live dashboard with CPU/memory
npx pm2 logs            # Combined logs from all services
npx pm2 logs nextjs-dev # Specific service logs
```

### Healthy State

Core services should show `online` status when they are running under PM2:

| Service | Expected Status |
|---------|----------------|
| `nextjs-dev` | online |
| `demo-replay` | online |

If a service shows `errored` or `stopped`, check its logs and restart it:

```bash
npx pm2 logs nextjs-dev
npx pm2 restart nextjs-dev
```

## Redpanda Monitoring

### Redpanda Console

If you run a Kafka UI, it is typically available at:

```text
http://localhost:8090
```

Use it to inspect:

- Topics (for example `telemetry-batches`).
- Message throughput and lag.
- Consumer groups.

### Docker / Broker Checks

Common commands:

```bash
# Check infrastructure containers
docker ps

# Inspect Redpanda container logs
docker logs ps-redpanda --tail 100

# Inspect RisingWave container logs
docker logs ps-risingwave --tail 100
```

## Application Metrics and Logs

### Next.js Server

Check the Next.js server logs for API errors:

```bash
npx pm2 logs nextjs-dev
```

Look for:
- API route compilation errors.
- Database connection issues.
- Authentication failures.
- Trino query errors.
- OpenAI API errors (for the agent).

### RisingWave / Redis / Trino

The telemetry pipeline depends on several infrastructure services. Useful checks include:

```bash
# Redis
redis-cli PING

# Trino
curl http://localhost:8083/v1/info

# LakeKeeper
curl "http://localhost:8181/catalog/v1/config?warehouse=purplesector-iceberg"
```

## Database Monitoring

Use Prisma Studio or direct queries to inspect persisted data:

```bash
# Prisma Studio (visual browser-based tool)
npm run db:studio
```

### Health Checks

```bash
# Scan for common issues (orphaned records, invalid references)
npm run db:check
```

### Direct Queries (PostgreSQL)

If using PostgreSQL in production:

```sql
-- Recent sessions
SELECT * FROM "Session" ORDER BY "createdAt" DESC LIMIT 10;

-- Fastest laps
SELECT * FROM "Lap" ORDER BY "lapTime" ASC LIMIT 10;

-- Agent conversations
SELECT * FROM "AgentConversation" ORDER BY "updatedAt" DESC LIMIT 10;
```

## Frontend Diagnostics

- Open the browser DevTools (F12) and check:
  - **Console** — JavaScript errors, failed API calls.
  - **Network** — WebSocket connection status, API response times.
  - **Application → Cookies** — Verify the `ps_user` cookie is set.

## Common Warning Signs

| Symptom | Likely Cause | Action |
|---------|-------------|--------|
| Service shows `errored` in PM2 | Crash loop | Check logs, restart |
| No telemetry appearing | Replay/collector not running or infrastructure unavailable | Check PM2 status, Docker, RisingWave logs |
| Events tree stuck on "Loading..." | API route error or DB issue | Check nextjs-dev logs |
| Agent not responding | Missing `OPENAI_API_KEY` or API quota | Check env vars and OpenAI dashboard |
| High memory usage | Large telemetry dataset in memory | Consider pagination or data pruning |

Combining PM2 status, service logs, Redpanda/RisingWave checks, DB queries, and frontend diagnostics gives a complete picture of system health.
