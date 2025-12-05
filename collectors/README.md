# Purple Sector Telemetry Collectors

This directory contains all telemetry collectors for different racing simulators and transport mechanisms.

## Collector Types

### Kafka-Based (Production)

Collectors that publish to Kafka for guaranteed delivery, ordering, and scalability.

#### AC Collector (Kafka)
**File:** `ac-collector-kafka.js`  
**Command:** `npm run telemetry:ac-kafka`  
**Game:** Assetto Corsa  
**Method:** UDP telemetry packets  

**Features:**
- ✅ Guaranteed delivery (Kafka)
- ✅ Protobuf serialization
- ✅ Automatic handshake with AC
- ✅ Session-based partitioning
- ✅ Structured logging

**Configuration:**
```bash
TELEMETRY_UDP_PORT=9996
TELEMETRY_UDP_HOST=0.0.0.0
KAFKA_BROKERS=localhost:9092
```

**AC Setup:**
Edit `Documents/Assetto Corsa/cfg/telemetry.ini`:
```ini
[TELEMETRY]
ENABLED=1
UDP_PORT=9996
UDP_ADDRESS=127.0.0.1
```

---

#### ACC Collector (Kafka)
**File:** `acc-collector-kafka.js`  
**Command:** `npm run telemetry:acc-kafka`  
**Game:** Assetto Corsa Competizione  
**Method:** Broadcasting Protocol + Shared Memory (hybrid)  

**Features:**
- ✅ Guaranteed delivery (Kafka)
- ✅ Protobuf serialization
- ✅ Hybrid data collection (UDP + Shared Memory)
- ✅ Session-based partitioning
- ✅ Structured logging

**Configuration:**
```bash
ACC_UDP_PORT=9000
ACC_HOST=127.0.0.1
ACC_BROADCAST_PORT=9000
ACC_DISPLAY_NAME=PurpleSector
KAFKA_BROKERS=localhost:9092
```

**ACC Setup:**
Edit `Documents/Assetto Corsa Competizione/Config/broadcasting.json`:
```json
{
  "updListenerPort": 9000,
  "connectionPassword": "",
  "commandPassword": ""
}
```

**Requirements:**
- Windows OS (for Shared Memory access)
- ACC running on same machine

---

#### Demo Collector (Kafka)
**File:** `demo-collector-kafka.js`  
**Command:** `npm run telemetry:demo-kafka`  
**Purpose:** Testing the Kafka pipeline without a real game  
**Method:** Publishes demo telemetry data from file  

**Features:**
- ✅ Guaranteed delivery (Kafka)
- ✅ Protobuf serialization
- ✅ Realistic frame rate (60 Hz)
- ✅ Multiple laps support
- ✅ Loop playback
- ✅ Configurable userId

**Usage:**
```bash
# Basic usage (loops indefinitely)
npm run telemetry:demo-kafka

# Custom user ID
npm run telemetry:demo-kafka -- --userId=alice

# Single playback (no loop)
npm run telemetry:demo-kafka -- --no-loop

# Custom frame rate
npm run telemetry:demo-kafka -- --frameRate=30

# Combined options
npm run telemetry:demo-kafka -- --userId=bob --frameRate=60 --loop
```

**Configuration:**
```bash
KAFKA_BROKERS=localhost:9092
```

**Use Cases:**
- ✅ Test Kafka pipeline without game
- ✅ Test bridge and database consumer
- ✅ Verify frontend WebSocket connection
- ✅ Load testing with multiple demo collectors
- ✅ Development without game running

---

### WebSocket-Based (Legacy)

Collectors that connect directly to WebSocket server. Simpler but no delivery guarantees.

#### AC Collector (WebSocket)
**File:** `ac-collector-websocket.js`  
**Command:** `npm run telemetry`  
**Game:** Assetto Corsa  
**Method:** UDP telemetry packets  

**Features:**
- ⚠️ Best-effort delivery (WebSocket)
- ✅ Protobuf serialization
- ✅ Automatic reconnection
- ✅ Automatic handshake with AC

---

#### ACC Collector (WebSocket)
**File:** `acc-collector-websocket.js`  
**Command:** `npm run telemetry:acc`  
**Game:** Assetto Corsa Competizione  
**Method:** Broadcasting Protocol only  

**Features:**
- ⚠️ Best-effort delivery (WebSocket)
- ✅ Protobuf serialization
- ✅ Automatic reconnection

---

#### ACC Collector Hybrid (WebSocket)
**File:** `acc-collector-hybrid-websocket.js`  
**Command:** `npm run telemetry:acc-hybrid`  
**Game:** Assetto Corsa Competizione  
**Method:** Broadcasting Protocol + Shared Memory (hybrid)  

**Features:**
- ⚠️ Best-effort delivery (WebSocket)
- ✅ Protobuf serialization
- ✅ Hybrid data collection (UDP + Shared Memory)
- ✅ Automatic reconnection

**Requirements:**
- Windows OS (for Shared Memory access)
- ACC running on same machine

---

## Quick Comparison

| Collector | Game/Source | Transport | Delivery | Ordering | Scalability |
|-----------|-------------|-----------|----------|----------|-------------|
| **ac-collector-kafka.js** | AC | Kafka | ✅ Guaranteed | ✅ Yes | ✅ High |
| **acc-collector-kafka.js** | ACC | Kafka | ✅ Guaranteed | ✅ Yes | ✅ High |
| **demo-collector-kafka.js** | Demo File | Kafka | ✅ Guaranteed | ✅ Yes | ✅ High |
| **ac-collector-websocket.js** | AC | WebSocket | ⚠️ Best-effort | ❌ No | ⚠️ Limited |
| **acc-collector-websocket.js** | ACC | WebSocket | ⚠️ Best-effort | ❌ No | ⚠️ Limited |
| **acc-collector-hybrid-websocket.js** | ACC | WebSocket | ⚠️ Best-effort | ❌ No | ⚠️ Limited |

---

## Architecture

### Kafka-Based Architecture (Recommended)

```
┌─────────────┐
│   AC/ACC    │
│   (Game)    │
└──────┬──────┘
       │ UDP / Shared Memory
       ▼
┌─────────────┐
│  Collector  │
│  (Kafka)    │
└──────┬──────┘
       │ Kafka (Protobuf)
       ▼
┌─────────────┐
│   Kafka     │
│  (Broker)   │
└──────┬──────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌─────────────┐   ┌─────────────┐
│   Bridge    │   │  Database   │
│ (Consumer)  │   │  Consumer   │
└──────┬──────┘   └─────────────┘
       │
       ▼
┌─────────────┐
│  Frontend   │
└─────────────┘
```

**Benefits:**
- ✅ No data loss
- ✅ Frames arrive in order
- ✅ Support 1000s of sessions
- ✅ Survives restarts
- ✅ Multiple consumers

---

### WebSocket-Based Architecture (Legacy)

```
┌─────────────┐
│   AC/ACC    │
│   (Game)    │
└──────┬──────┘
       │ UDP / Shared Memory
       ▼
┌─────────────┐
│  Collector  │
│ (WebSocket) │
└──────┬──────┘
       │ WebSocket (Protobuf)
       ▼
┌─────────────┐
│ WebSocket   │
│   Server    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Frontend   │
└─────────────┘
```

**Limitations:**
- ⚠️ Possible data loss
- ⚠️ No ordering guarantee
- ⚠️ Single consumer only
- ⚠️ No replay capability

---

## Development

### Running Locally

**Kafka-Based:**
```bash
# Terminal 1: Start Kafka
docker-compose -f docker-compose.kafka.yml up -d

# Terminal 2: Setup topics
npm run kafka:setup

# Terminal 3: Start bridge
npm run kafka:bridge

# Terminal 4: Start collector
npm run telemetry:ac-kafka
# or
npm run telemetry:acc-kafka
```

**WebSocket-Based:**
```bash
# Terminal 1: Start WebSocket server
npm run ws-server

# Terminal 2: Start collector
npm run telemetry
# or
npm run telemetry:acc
# or
npm run telemetry:acc-hybrid
```

---

### Debugging

Enable debug logging:
```bash
LOG_LEVEL=debug npm run telemetry:ac-kafka
```

View Kafka messages:
```bash
docker exec -it purple-sector-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic telemetry \
  --from-beginning
```

---

## Production Deployment

### PM2 (Recommended)

```bash
# Start all services
pm2 start ecosystem.config.js

# Start specific collector
pm2 start ecosystem.config.js --only ac-collector
pm2 start ecosystem.config.js --only acc-collector

# Monitor
pm2 monit

# Logs
pm2 logs ac-collector
pm2 logs acc-collector
```

---

### Systemd

Create service file `/etc/systemd/system/ac-collector.service`:

```ini
[Unit]
Description=Purple Sector AC Telemetry Collector
After=network.target kafka.service

[Service]
Type=simple
User=purplesector
WorkingDirectory=/opt/purple-sector
ExecStart=/usr/bin/node services/collectors/ac-collector-kafka.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=LOG_LEVEL=info

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable ac-collector
sudo systemctl start ac-collector
sudo systemctl status ac-collector
```

---

## Troubleshooting

### AC Collector Not Receiving Data

1. **Check AC telemetry.ini:**
   ```
   Documents/Assetto Corsa/cfg/telemetry.ini
   ```

2. **Verify UDP port:**
   ```bash
   lsof -i :9996
   ```

3. **Test UDP reception:**
   ```bash
   nc -ul 9996
   ```

4. **Check collector logs:**
   ```bash
   LOG_LEVEL=debug npm run telemetry:ac-kafka
   ```

---

### ACC Collector Not Connecting

1. **Check broadcasting.json:**
   ```
   Documents/Assetto Corsa Competizione/Config/broadcasting.json
   ```

2. **Verify ACC is running:**
   ```bash
   tasklist | findstr ac2
   ```

3. **Check UDP port:**
   ```bash
   netstat -an | findstr 9000
   ```

4. **Check Shared Memory (Windows only):**
   - Collector must run on same machine as ACC
   - Requires Windows OS

---

### Kafka Connection Failed

1. **Check Kafka is running:**
   ```bash
   docker ps | grep kafka
   ```

2. **Test Kafka connection:**
   ```bash
   telnet localhost 9092
   ```

3. **Check topics exist:**
   ```bash
   npm run kafka:setup
   ```

---

## Migration Guide

### From WebSocket to Kafka

1. **Install Kafka:**
   ```bash
   docker-compose -f docker-compose.kafka.yml up -d
   ```

2. **Setup topics:**
   ```bash
   npm run kafka:setup
   ```

3. **Update collector:**
   ```bash
   # Old
   npm run telemetry

   # New
   npm run telemetry:ac-kafka
   ```

4. **Update server:**
   ```bash
   # Old
   npm run ws-server

   # New
   npm run kafka:bridge
   ```

5. **Frontend:** No changes needed!

---

## Performance

### Telemetry Rates

| Game | Frequency | Bandwidth (Protobuf) |
|------|-----------|---------------------|
| AC | 60 Hz | ~12 KB/s |
| ACC | 60 Hz | ~12 KB/s |

### Resource Usage

| Collector | Memory | CPU |
|-----------|--------|-----|
| AC (Kafka) | 50-100 MB | < 5% |
| ACC (Kafka) | 100-200 MB | < 10% |
| AC (WebSocket) | 30-50 MB | < 3% |
| ACC (WebSocket) | 50-100 MB | < 5% |

---

## Support

- **Documentation:** [../docs/KAFKA_ARCHITECTURE.md](../docs/KAFKA_ARCHITECTURE.md)
- **Quick Start:** [../docs/KAFKA_QUICKSTART.md](../docs/KAFKA_QUICKSTART.md)
- **Issues:** GitHub Issues
- **Logs:** `logs/` directory
