# Kafka-Based Telemetry Architecture

## Overview

Purple Sector now uses Apache Kafka as the transport mechanism for telemetry data, providing:

- **Guaranteed delivery** - No telemetry data loss
- **Ordering guarantees** - Frames arrive in correct sequence per session
- **Scalability** - Support for thousands of simultaneous sessions
- **Durability** - Telemetry persisted in Kafka for replay
- **Performance** - High throughput with low latency
- **Protobuf serialization** - Efficient binary encoding

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Game Clients                              │
│  ACC Session 1  │  ACC Session 2  │  AC Session 3  │  ...   │
└────────┬─────────┴────────┬────────┴────────┬───────────────┘
         │                  │                 │
         ▼                  ▼                 ▼
  ┌──────────┐       ┌──────────┐     ┌──────────┐
  │Collector │       │Collector │     │Collector │
  │Producer 1│       │Producer 2│     │Producer 3│
  └─────┬────┘       └─────┬────┘     └─────┬────┘
        │                  │                 │
        │    Kafka (Protobuf, LZ4 compressed)│
        └──────────────────┼─────────────────┘
                           │
                           ▼
                   ┌───────────────┐
                   │ Kafka Cluster │
                   │  Topics:      │
                   │  telemetry-   │
                   │  user-alice   │
                   │  user-bob     │
                   │  user-...     │
                   └───────┬───────┘
                           │
                           ├──────────────────────┐
                           │                      │
                           ▼                      ▼
                   ┌───────────────┐      ┌──────────────┐
                   │ Kafka-WS      │      │ Database     │
                   │ Bridge        │      │ Consumer     │
                   │ (Per-User     │      │ (All Users)  │
                   │  Consumers)   │      │              │
                   └───────┬───────┘      └──────┬───────┘
                           │                      │
                           │ WebSocket            │ Prisma
                           │ (Protobuf)           │
                           ▼                      ▼
                   ┌───────────────┐      ┌──────────────┐
                   │ Frontend      │      │ TimescaleDB  │
                   │ Clients       │      │ (PostgreSQL) │
                   └───────────────┘      └──────────────┘
```

## Components

### 1. Collectors (Producers)

**Location:** `services/collectors/`

Collectors read telemetry from games and publish to Kafka.

**Features:**
- Kafka producer with idempotent writes
- Protobuf serialization
- Automatic reconnection
- Batching and compression (LZ4)
- Session-based partitioning
- Graceful shutdown

**Example: ACC Collector**
```bash
npm run telemetry:acc-kafka
```

### 2. Kafka Cluster

**Topics:**
- `telemetry` - Main telemetry stream (10 partitions)
- `commands` - Control commands (3 partitions)

**Configuration:**
- Compression: LZ4
- Retention: 1 hour (telemetry), 24 hours (commands)
- Replication: 1 (dev), 3 (production)
- Min in-sync replicas: 1 (dev), 2 (production)

### 3. Kafka-WebSocket Bridge

**Location:** `services/kafka-websocket-bridge.js`

Bridges Kafka telemetry stream to WebSocket clients.

**Features:**
- Kafka consumer with consumer group
- WebSocket server
- Demo mode playback
- Protobuf serialization
- Client connection management
- Graceful shutdown

**Example:**
```bash
npm run kafka:bridge
```

### 4. Database Consumer (Future)

Consumes telemetry from Kafka and persists to TimescaleDB.

**Features:**
- Batch inserts for performance
- Exactly-once semantics
- Ordered writes per session
- Automatic compression

## Setup

### Prerequisites

1. **Kafka Installation**

**Option A: Docker (Recommended for Development)**
```bash
# docker-compose.yml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1

# Start Kafka
docker-compose up -d
```

**Option B: Native Installation**
```bash
# Download Kafka
wget https://downloads.apache.org/kafka/3.6.0/kafka_2.13-3.6.0.tgz
tar -xzf kafka_2.13-3.6.0.tgz
cd kafka_2.13-3.6.0

# Start Zookeeper
bin/zookeeper-server-start.sh config/zookeeper.properties &

# Start Kafka
bin/kafka-server-start.sh config/server.properties &
```

2. **Install Dependencies**
```bash
npm install
```

3. **Setup Kafka Topics**
```bash
npm run kafka:setup
```

### Configuration

Create `.env` file:

```bash
# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=purple-sector
KAFKA_TOPIC_TELEMETRY=telemetry
KAFKA_TOPIC_COMMANDS=commands
KAFKA_CONSUMER_GROUP=telemetry-processors

# WebSocket Configuration
WS_PORT=8080
WS_HOST=0.0.0.0

# ACC Configuration
ACC_UDP_PORT=9000
ACC_HOST=127.0.0.1
ACC_BROADCAST_PORT=9000
ACC_DISPLAY_NAME=PurpleSector
ACC_PASSWORD=

# Logging
LOG_LEVEL=info
LOG_FORMAT=simple
SERVICE_NAME=purple-sector

# Protobuf
PROTOBUF_ENABLED=true
```

## Running the System

### Development (Single Machine)

**Terminal 1: Start Kafka**
```bash
docker-compose up
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

**Terminal 5: Start Frontend**
```bash
npm run dev
```

### Production

Use a process manager like PM2:

```bash
# Install PM2
npm install -g pm2

# Start services
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'kafka-bridge',
      script: 'services/kafka-websocket-bridge.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      },
    },
    {
      name: 'acc-collector',
      script: 'services/collectors/acc-collector-kafka.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      },
    },
  ],
};
```

## Data Flow

### Telemetry Publishing

1. **Collector reads telemetry** from game (Shared Memory/UDP)
2. **Serializes to Protobuf** (efficient binary format)
3. **Publishes to Kafka** with session ID as key
4. **Kafka partitions** by session ID (ordering guarantee)
5. **Kafka replicates** to multiple brokers (durability)
6. **Acknowledges** to collector (guaranteed delivery)

### Telemetry Consumption

1. **Bridge subscribes** to telemetry topic
2. **Kafka delivers** messages in order per partition
3. **Bridge deserializes** Protobuf messages
4. **Broadcasts** to WebSocket clients
5. **Clients render** telemetry in real-time

## Message Format

### Protobuf Schema

```protobuf
message TelemetryFrame {
  int64 timestamp = 1;
  int32 lapTime = 2;
  float throttle = 3;
  float brake = 4;
  float steering = 5;
  float speed = 6;
  int32 gear = 7;
  int32 rpm = 8;
  float normalizedPosition = 9;
  int32 lapNumber = 10;
}

message TelemetryMessage {
  TelemetryFrame telemetry = 1;
}
```

### Kafka Message

```javascript
{
  key: "session-abc123",           // Session ID for partitioning
  value: <Protobuf Buffer>,        // Serialized TelemetryFrame
  timestamp: "1699123456789",      // Message timestamp
  headers: {
    sessionId: "session-abc123",
    userId: "user-456",
    encoding: "protobuf"
  }
}
```

## Ordering Guarantees

### Per-Session Ordering

Kafka guarantees ordering **within a partition**. By using session ID as the message key, all frames from the same session go to the same partition, ensuring:

✅ Frame 1 → Frame 2 → Frame 3 → ... (in order)  
✅ No out-of-order delivery  
✅ No frame loss  

### Multi-Session Parallelism

Different sessions can be processed in parallel across partitions:

```
Partition 0: Session A frames (ordered)
Partition 1: Session B frames (ordered)
Partition 2: Session C frames (ordered)
...
```

## Performance

### Throughput

| Scenario | Messages/Second | Bandwidth |
|----------|----------------|-----------|
| Single session (60 Hz) | 60 | ~12 KB/s |
| 10 sessions | 600 | ~120 KB/s |
| 100 sessions | 6,000 | ~1.2 MB/s |
| 1000 sessions | 60,000 | ~12 MB/s |

**Kafka can handle:** 1M+ messages/second

### Latency

- **Producer → Kafka:** 1-5ms
- **Kafka → Consumer:** 1-5ms
- **End-to-end:** 5-15ms (p99)

### Resource Usage

**Kafka Broker:**
- Memory: 2-4 GB
- CPU: 2-4 cores
- Disk: 100 GB (with 1-hour retention)

**Collector:**
- Memory: 50-100 MB
- CPU: < 5%

**Bridge:**
- Memory: 100-200 MB
- CPU: < 10%

## Monitoring

### Kafka Metrics

```bash
# Consumer lag
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group telemetry-processors --describe

# Topic details
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --topic telemetry
```

### Application Logs

```bash
# Bridge logs
pm2 logs kafka-bridge

# Collector logs
pm2 logs acc-collector
```

### Statistics

Both collector and bridge expose statistics:

```javascript
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

// Bridge stats
{
  clientsConnected: 5,
  messagesRelayed: 12000,
  bytesRelayed: 2400000,
  kafkaStats: {
    messagesReceived: 12000,
    sessionStats: {
      'session-1': { count: 6000, lastSeen: 1699123456789 },
      'session-2': { count: 6000, lastSeen: 1699123456790 }
    }
  }
}
```

## Troubleshooting

### Kafka Not Starting

```bash
# Check if ports are in use
lsof -i :9092
lsof -i :2181

# Check Kafka logs
tail -f kafka/logs/server.log
```

### Collector Not Publishing

```bash
# Check Kafka connection
npm run kafka:setup

# Check collector logs
LOG_LEVEL=debug npm run telemetry:acc-kafka
```

### Bridge Not Consuming

```bash
# Check consumer group
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group telemetry-processors --describe

# Reset consumer offset (if needed)
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group telemetry-processors --reset-offsets \
  --to-latest --topic telemetry --execute
```

## Migration from WebSocket-Only

### Old Architecture
```
Collector → WebSocket Server → Frontend
```

### New Architecture
```
Collector → Kafka → Bridge → Frontend
```

### Benefits

1. **Guaranteed Delivery** - Kafka persists messages
2. **Ordering** - Per-session ordering guaranteed
3. **Scalability** - Add more collectors/consumers
4. **Durability** - Survive restarts without data loss
5. **Replay** - Reprocess historical data
6. **Multi-Consumer** - Multiple services can consume same data

### Backward Compatibility

The old WebSocket server (`services/websocket-server.js`) still works for demo mode and testing. The new Kafka-based system is recommended for production.

## Next Steps

1. **Database Consumer** - Persist telemetry to TimescaleDB
2. **Analytics Pipeline** - Real-time lap analysis
3. **ML Pipeline** - Driving insights and recommendations
4. **Multi-Region** - Deploy Kafka across regions
5. **Monitoring Dashboard** - Grafana + Prometheus

## References

- [KafkaJS Documentation](https://kafka.js.org/)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Protocol Buffers](https://developers.google.com/protocol-buffers)
