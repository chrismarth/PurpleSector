# Monitoring

This page summarizes how to monitor the Kafka pipeline, backend services, and overall telemetry health.

## PM2 Service Monitoring

PM2 is the primary tool for monitoring services in both dev and production:

```bash
npx pm2 status          # Quick status of all services
npx pm2 monit           # Live dashboard with CPU/memory
npx pm2 logs            # Combined logs from all services
npx pm2 logs nextjs-dev # Specific service logs
```

### Healthy State

All services should show `online` status:

| Service | Expected Status |
|---------|----------------|
| `nextjs-dev` | online |
| `kafka-bridge-dev` | online |
| `kafka-db-consumer-dev` | online |
| `demo-collector-dev` | online |

If a service shows `errored` or `stopped`, check its logs and restart it:

```bash
npx pm2 logs kafka-db-consumer-dev
npx pm2 restart kafka-db-consumer-dev
```

## Kafka Monitoring

### Kafka UI

If you run a Kafka UI, it is typically available at:

```text
http://localhost:8090
```

Use it to inspect:

- Topics (e.g., `telemetry`, `telemetry-user-*`).
- Message throughput and lag.
- Consumer groups.

### Kafka CLI

Common commands:

```bash
# Topic details
kafka-topics.sh --describe --topic telemetry

# List consumer groups
kafka-consumer-groups.sh --list

# Describe consumer group lag
kafka-consumer-groups.sh --describe --group telemetry-processors
```

## Application Metrics and Logs

### Bridge and Collectors

Both the Kafka–WebSocket bridge and collectors log useful statistics, for example:

```js
// Bridge stats
{
  clientsConnected: 5,
  messagesRelayed: 12000,
  bytesRelayed: 2400000,
  kafkaStats: {
    messagesReceived: 12000,
    sessionStats: {
      'session-1': { count: 6000, lastSeen: 1699123456789 }
    }
  }
}

// Collector stats
{
  framesCollected: 12000,
  framesPublished: 12000,
  errors: 0,
  producerStats: {
    messagesSent: 12000,
    bytesSent: 2400000,
    errors: 0
  }
}
```

### Next.js Server

Check the Next.js server logs for API errors:

```bash
npx pm2 logs nextjs-dev
```

Look for:
- API route compilation errors.
- Database connection issues.
- Authentication failures.
- OpenAI API errors (for the agent).

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

-- Telemetry frame count per session
SELECT "sessionId", COUNT(*) FROM "TelemetryFrame" GROUP BY "sessionId";

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
| No telemetry appearing | Collector not running or Kafka down | Check PM2 status, Docker |
| Events tree stuck on "Loading..." | API route error or DB issue | Check nextjs-dev logs |
| Agent not responding | Missing `OPENAI_API_KEY` or API quota | Check env vars and OpenAI dashboard |
| High memory usage | Large telemetry dataset in memory | Consider pagination or data pruning |

Combining PM2 status, service logs, Kafka metrics, DB queries, and frontend diagnostics gives a complete picture of system health.
