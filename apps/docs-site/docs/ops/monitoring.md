# Monitoring

This page summarizes how to monitor the Kafka pipeline, backend services, and overall telemetry health.

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

Both the Kafka–WebSocket bridge and collectors expose useful statistics via logs, for example:

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

With PM2 you can monitor services and logs:

```bash
pm2 status
pm2 logs
pm2 logs kafka-bridge
pm2 logs acc-collector
pm2 monit
```

## Database Monitoring

Use Prisma Studio or `psql` to inspect persisted telemetry:

```bash
# Prisma Studio
npm run db:studio

# Or psql
psql $DATABASE_URL
```

Example queries:

```sql
-- Recent sessions
SELECT * FROM "Session" ORDER BY "startTime" DESC LIMIT 10;

-- Telemetry frame count
SELECT COUNT(*) FROM "TelemetryFrame";

-- Fastest laps
SELECT * FROM "Lap" ORDER BY "lapTime" ASC LIMIT 10;
```

## Frontend and WebSocket

- Use the browser dev tools console and network tab to:
  - Confirm WebSocket connection success.
  - Watch for CORS or connection errors.
- In logs, look for messages indicating successful connection to the telemetry server.

Combining Kafka metrics, service logs, DB queries, and frontend diagnostics gives a complete picture of telemetry health across the system.
