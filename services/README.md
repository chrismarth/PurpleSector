# Purple Sector Services

This directory contains the backend services for Purple Sector telemetry collection and streaming.

## Architecture

### Kafka-Based (Recommended for Production)

In the monorepo layout, shared infrastructure now lives under `packages/`,
and this `services/` directory contains only runtime services.

```
collectors/                    → Collector apps (AC/ACC Kafka & WebSocket, demo, embedded)
  ac-kafka/
  acc-kafka/
  demo-kafka/
  ac-websocket/
  acc-websocket/
  acc-hybrid-websocket/
  embedded/

packages/
  @purplesector/config         → Centralized configuration (env-driven)
  @purplesector/logger         → Winston-based structured logger
  @purplesector/kafka          → KafkaProducer, KafkaAdmin, KafkaConsumer helpers

services/
  kafka-websocket-bridge.js    → Kafka consumer + WebSocket server
  kafka-database-consumer.js   → Kafka → DB consumer

scripts/
  setup-kafka.js               → Kafka topic setup utility
```

### Legacy (WebSocket-Only)

```
websocket-server.js → Direct WebSocket relay
ac-telemetry-collector.js → AC collector (WebSocket)
acc-telemetry-collector.js → ACC collector (WebSocket)
acc-telemetry-collector-hybrid.js → ACC hybrid collector (WebSocket)
```

## Services

### 1. Kafka-WebSocket Bridge

**File:** `kafka-websocket-bridge.js`

Bridges Kafka telemetry stream to WebSocket clients.

**Features:**
- Consumes from Kafka `telemetry` topic
- Broadcasts to WebSocket clients
- Demo mode playback
- Protobuf serialization
- Client connection management

**Usage:**
```bash
npm run kafka:bridge
```

**Configuration:**
- `KAFKA_BROKERS` - Kafka broker addresses
- `WS_PORT` - WebSocket server port
- `KAFKA_CONSUMER_GROUP` - Consumer group ID

### 2. AC Collector (Kafka)

**File:** `collectors/ac-collector-kafka.js`

Collects telemetry from Assetto Corsa and publishes to Kafka.

**Features:**
- UDP telemetry parsing
- Kafka producer with guaranteed delivery
- Protobuf serialization
- Automatic handshake with AC
- Automatic reconnection

**Usage:**
```bash
npm run telemetry:ac-kafka
```

**Configuration:**
- `TELEMETRY_UDP_PORT` - UDP port for AC telemetry
- `TELEMETRY_UDP_HOST` - UDP host address
- `KAFKA_BROKERS` - Kafka broker addresses

**Requirements:**
- AC running and configured to send UDP telemetry
- AC telemetry.ini configured

### 3. ACC Collector (Kafka)

**File:** `collectors/acc-collector-kafka.js`

Collects telemetry from Assetto Corsa Competizione and publishes to Kafka.

**Features:**
- Hybrid data collection (Broadcasting + Shared Memory)
- Kafka producer with guaranteed delivery
- Protobuf serialization
- Session-based partitioning
- Automatic reconnection

**Usage:**
```bash
npm run telemetry:acc-kafka
```

**Configuration:**
- `ACC_UDP_PORT` - UDP port for Broadcasting
- `ACC_HOST` - ACC host address
- `KAFKA_BROKERS` - Kafka broker addresses

**Requirements:**
- Windows OS (for Shared Memory)
- ACC running on same machine
- ACC broadcasting.json configured

### 4. Database Consumer

**File:** `kafka-database-consumer.js`

Consumes telemetry from all user topics and persists to TimescaleDB.

**Features:**
- Pattern-based topic subscription (all user topics)
- Batch inserts for performance
- Automatic session creation
- Lap detection and persistence
- Error handling and retry

**Usage:**
```bash
npm run kafka:db-consumer
```

**Configuration:**
- `KAFKA_BROKERS` - Kafka broker addresses
- `DATABASE_URL` - PostgreSQL/TimescaleDB connection string

**What it does:**
- Subscribes to `telemetry-user-*` (all user topics)
- Creates sessions automatically
- Detects lap completions
- Batch inserts telemetry frames (100 frames per batch)
- Persists laps with timing data

**Performance:**
- Batch size: 100 frames
- Flush interval: 5 seconds
- Memory: ~1 GB
- Throughput: 10,000+ frames/sec

### 5. Kafka Setup Utility

**File:** `scripts/setup-kafka.js`

Ensures Kafka topics exist with proper configuration.

**Usage:**
```bash
npm run kafka:setup
```

**What it does:**
- Creates `telemetry` topic (10 partitions)
- Creates `commands` topic (3 partitions)
- Configures compression (LZ4)
- Sets retention policies
- Validates cluster health

## Shared Libraries

### kafka-producer.js

Kafka producer wrapper with:
- Idempotent writes (no duplicates)
- Automatic batching
- Protobuf serialization
- Retry logic
- Statistics tracking

**Example:**
```javascript
const KafkaProducer = require('./lib/kafka-producer');

const producer = new KafkaProducer({
  sessionId: 'session-123',
  userId: 'user-456',
});

await producer.connect();
await producer.publishFrame(telemetryFrame);
await producer.disconnect();
```

### kafka-consumer.js

Kafka consumer wrapper with:
- Consumer group management
- Protobuf deserialization
- Offset management
- Heartbeat handling
- Statistics tracking

**Example:**
```javascript
const KafkaConsumer = require('./lib/kafka-consumer');

const consumer = new KafkaConsumer({
  groupId: 'my-consumer-group',
  topics: ['telemetry'],
});

await consumer.connect();
await consumer.start(async (message) => {
  const { frame, sessionId } = message;
  // Process frame
});
```

### kafka-admin.js

Kafka admin utilities:
- Topic creation
- Topic validation
- Cluster health checks
- Metadata queries

**Example:**
```javascript
const KafkaAdmin = require('./lib/kafka-admin');

const admin = new KafkaAdmin();
await admin.connect();
await admin.ensureTopics();
const health = await admin.healthCheck();
await admin.disconnect();
```

### logger.js

Winston-based structured logger:
- JSON or simple format
- Multiple transports (console, file)
- Log levels (error, warn, info, debug)
- Child loggers with context

**Example:**
```javascript
const logger = require('@purplesector/logger');

logger.info('Service started', { port: 8080 });
logger.error('Connection failed', { error: err.message });

// Child logger with context
const childLogger = logger.child({ component: 'producer' });
childLogger.debug('Publishing frame', { sessionId: '123' });
```

## Configuration

### Centralized Config

**File:** `config/index.js`

All service configuration in one place with environment variable support.

**Sections:**
- Kafka (brokers, topics, producer/consumer settings)
- WebSocket (port, host, ping interval)
- ACC (UDP port, broadcast settings)
- AC (shared memory interval)
- Logging (level, format, file)
- Service (name, environment, shutdown timeout)

**Example:**
```javascript
const config = require('@purplesector/config');

console.log(config.kafka.brokers); // ['localhost:9092']
console.log(config.websocket.port); // 8080
console.log(config.logging.level); // 'info'
```

### Environment Variables

Create `.env` file (see `.env.example`):

```bash
# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=purple-sector
KAFKA_TOPIC_TELEMETRY=telemetry

# WebSocket
WS_PORT=8080
WS_HOST=0.0.0.0

# ACC
ACC_UDP_PORT=9000
ACC_HOST=127.0.0.1

# Logging
LOG_LEVEL=info
LOG_FORMAT=simple
```

## Development

### Running Locally

**Terminal 1: Start Kafka**
```bash
docker-compose -f docker-compose.kafka.yml up
```

**Terminal 2: Setup Topics**
```bash
npm run kafka:setup
```

**Terminal 3: Start Bridge**
```bash
npm run kafka:bridge
```

**Terminal 4: Start Collector**
```bash
npm run telemetry:acc-kafka
```

### Debugging

Enable debug logging:
```bash
LOG_LEVEL=debug npm run kafka:bridge
```

View Kafka messages:
```bash
docker exec -it purple-sector-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic telemetry \
  --from-beginning
```

Check consumer lag:
```bash
docker exec -it purple-sector-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group telemetry-processors-bridge \
  --describe
```

## Production

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Start services
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs kafka-bridge
pm2 logs acc-collector

# Restart
pm2 restart all
```

### Systemd Deployment

Create service files in `/etc/systemd/system/`:

```bash
sudo systemctl enable kafka-bridge
sudo systemctl start kafka-bridge
sudo systemctl status kafka-bridge
```

### Docker Deployment

```bash
# Build image
docker build -t purple-sector-services .

# Run bridge
docker run -d \
  --name kafka-bridge \
  -p 8080:8080 \
  -e KAFKA_BROKERS=kafka:9092 \
  purple-sector-services \
  node services/kafka-websocket-bridge.js
```

## Monitoring

### Application Metrics

Both bridge and collector expose statistics:

```javascript
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

### Kafka Monitoring

Use Kafka UI: http://localhost:8090

Or CLI tools:
```bash
# Topic details
kafka-topics.sh --describe --topic telemetry

# Consumer groups
kafka-consumer-groups.sh --list

# Consumer lag
kafka-consumer-groups.sh --describe --group telemetry-processors
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
# Start Kafka
docker-compose -f docker-compose.kafka.yml up -d

# Run tests
npm run test:integration
```

### Manual Testing

```bash
# Test protobuf encoding/decoding
npm run test:protobuf

# Test WebSocket connection
npm run test:ws-protobuf
```

## Troubleshooting

### Kafka Connection Failed

```bash
# Check Kafka is running
docker ps | grep kafka

# Check Kafka logs
docker logs purple-sector-kafka

# Test connection
telnet localhost 9092
```

### Collector Not Publishing

```bash
# Check ACC is running
tasklist | findstr ac2

# Check broadcasting.json
cat "Documents/Assetto Corsa Competizione/Config/broadcasting.json"

# Check collector logs
LOG_LEVEL=debug npm run telemetry:acc-kafka
```

### Bridge Not Consuming

```bash
# Check consumer group
kafka-consumer-groups.sh --describe --group telemetry-processors-bridge

# Reset offsets (if needed)
kafka-consumer-groups.sh --reset-offsets --to-latest --topic telemetry --execute
```

## Migration Guide

### From WebSocket-Only to Kafka

1. **Install Kafka:**
   ```bash
   docker-compose -f docker-compose.kafka.yml up -d
   ```

2. **Setup topics:**
   ```bash
   npm run kafka:setup
   ```

3. **Update collectors:**
   - Replace `npm run telemetry:acc` with `npm run telemetry:acc-kafka`

4. **Update server:**
   - Replace `npm run ws-server` with `npm run kafka:bridge`

5. **Frontend:** No changes needed (WebSocket protocol unchanged)

### Benefits

- ✅ Guaranteed delivery (no data loss)
- ✅ Ordering per session
- ✅ Scalability (1000s of sessions)
- ✅ Durability (survives restarts)
- ✅ Multi-consumer support

## Documentation

- [Kafka Architecture](../docs/KAFKA_ARCHITECTURE.md) - Detailed architecture guide
- [Quick Start](../docs/KAFKA_QUICKSTART.md) - 5-minute setup guide
- [API Reference](../docs/API.md) - API documentation

## Support

- GitHub Issues: Report bugs and request features
- Logs: Check `logs/` directory
- Monitoring: Use Kafka UI at http://localhost:8090
