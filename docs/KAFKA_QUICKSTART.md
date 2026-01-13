# Kafka Telemetry Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose installed (for Kafka)
- ACC or AC game installed (for live telemetry)

## 5-Minute Setup

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Start Kafka

```bash
# Start Kafka cluster with Docker
docker-compose -f docker-compose.kafka.yml up -d

# Wait for Kafka to be ready (30 seconds)
sleep 30

# Verify Kafka is running
docker ps
```

You should see:
- `purple-sector-zookeeper`
- `purple-sector-kafka`
- `purple-sector-kafka-ui`

### Step 3: Setup Kafka Topics

```bash
npm run kafka:setup
```

Expected output:
```
[INFO] Starting Kafka setup
[INFO] Kafka cluster healthy { brokers: 1, controller: 1 }
[INFO] Creating topics { topics: [ 'telemetry', 'commands' ] }
[INFO] Topics created successfully
[INFO] Kafka setup complete
```

### Step 4: Start the Bridge

```bash
npm run kafka:bridge
```

Expected output:
```
[INFO] Initializing Kafka-WebSocket Bridge
[INFO] Protobuf initialized
[INFO] Demo data loaded { totalFrames: 9071 }
[INFO] Kafka initialization deferred to per-user consumers
[INFO] WebSocket server listening { port: 8080, host: '0.0.0.0' }
[INFO] Bridge initialized successfully
```

### Step 5: Start the Database Consumer

**In a new terminal:**

```bash
npm run kafka:db-consumer
```

Expected output:
```
[INFO] Initializing Kafka Database Consumer
[INFO] Connected to database
[INFO] Connecting to Kafka { brokers: [ 'localhost:9092' ] }
[INFO] Subscribed to user topics pattern
[INFO] Kafka consumer started
[INFO] Database consumer initialized successfully
```

### Step 6: Start the Collector

**Option A: Demo Collector (No Game Required)**

**In a new terminal:**

```bash
npm run telemetry:demo-kafka
```

Expected output:
```
[INFO] Initializing Demo Collector { userId: 'demo-user', frameRate: 60, loop: true }
[INFO] Loaded demo data { laps: 3, totalFrames: 9071 }
[INFO] Kafka producer initialized { userId: 'demo-user', sessionId: 'demo-session-...' }
[INFO] Demo collector initialized successfully
[INFO] Starting demo playback
[INFO] Lap completed { lapNumber: 1, lapsCompleted: 1 }
```

**Option B: ACC Collector (Requires ACC Running)**

**In a new terminal:**

```bash
npm run telemetry:acc-kafka
```

Expected output:
```
[INFO] Initializing ACC Collector
[INFO] Shared Memory initialized
[INFO] Kafka producer initialized { sessionId: 'acc-session-...' }
[INFO] UDP server listening { port: 9000, host: '0.0.0.0' }
[INFO] ACC Collector initialized successfully
[INFO] Registration request sent to ACC
```

### Step 7: Start the Frontend

**In a new terminal:**

```bash
npm run dev
```

Open browser: http://localhost:3000

### Step 8: View Telemetry!

**If using Demo Collector:**
- Telemetry should already be flowing
- Open http://localhost:3000
- Watch demo telemetry in real-time

**If using ACC Collector:**
1. Launch Assetto Corsa Competizione
2. Start a session (Practice, Race, etc.)
3. Drive!
4. Watch telemetry flow in real-time on the dashboard

## Monitoring

### Kafka UI

Open http://localhost:8090 to view:
- Topics and partitions
- Message throughput
- Consumer lag
- Broker health

### Application Logs

```bash
# Bridge logs
npm run kafka:bridge

# Collector logs
npm run telemetry:acc-kafka

# All logs with timestamps
LOG_LEVEL=debug npm run kafka:bridge
```

### Statistics

The bridge and collector log statistics every 100 messages:

```json
{
  "collected": 6000,
  "published": 6000,
  "errors": 0,
  "producerStats": {
    "messagesSent": 6000,
    "bytesSent": 1200000
  }
}
```

## Troubleshooting

### Kafka Not Starting

```bash
# Check if ports are in use
lsof -i :9092
lsof -i :2181

# Stop and restart
docker-compose -f docker-compose.kafka.yml down
docker-compose -f docker-compose.kafka.yml up -d
```

### Topics Not Created

```bash
# Manually create topics
docker exec -it purple-sector-kafka kafka-topics \
  --create --topic telemetry \
  --bootstrap-server localhost:9092 \
  --partitions 10 \
  --replication-factor 1
```

### Collector Not Connecting to ACC

1. Check ACC broadcasting.json:
   ```
   Documents/Assetto Corsa Competizione/Config/broadcasting.json
   ```

2. Ensure it contains:
   ```json
   {
     "updListenerPort": 9000,
     "connectionPassword": "",
     "commandPassword": ""
   }
   ```

3. Restart ACC

### No Telemetry Flowing

```bash
# Check consumer lag
docker exec -it purple-sector-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group telemetry-processors-bridge \
  --describe

# Check topic messages
docker exec -it purple-sector-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic telemetry \
  --from-beginning \
  --max-messages 10
```

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs

# Restart
pm2 restart all

# Stop
pm2 stop all
```

### Using Systemd

Create service files in `/etc/systemd/system/`:

**kafka-bridge.service:**
```ini
[Unit]
Description=Purple Sector Kafka-WebSocket Bridge
After=network.target kafka.service

[Service]
Type=simple
User=purplesector
WorkingDirectory=/opt/purple-sector
ExecStart=/usr/bin/node services/kafka-websocket-bridge.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=LOG_LEVEL=info

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable kafka-bridge
sudo systemctl start kafka-bridge
sudo systemctl status kafka-bridge
```

## Architecture Overview

```
┌─────────────┐
│   ACC/AC    │
│   (Game)    │
└──────┬──────┘
       │ Shared Memory / UDP
       ▼
┌─────────────┐
│  Collector  │
│  (Producer) │
└──────┬──────┘
       │ Kafka (Protobuf)
       ▼
┌─────────────┐
│   Kafka     │
│  (Broker)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Bridge    │
│  (Consumer) │
└──────┬──────┘
       │ WebSocket (Protobuf)
       ▼
┌─────────────┐
│  Frontend   │
│  (React)    │
└─────────────┘
```

## Key Features

✅ **Guaranteed Delivery** - No telemetry loss  
✅ **Ordering** - Frames arrive in sequence  
✅ **Scalability** - Support 1000s of sessions  
✅ **Durability** - Survives restarts  
✅ **Performance** - 5-15ms latency  
✅ **Protobuf** - Efficient binary encoding  

## Next Steps

1. **Configure ACC** - Set up broadcasting.json
2. **Test Demo Mode** - Verify WebSocket connection
3. **Drive Live** - Collect real telemetry
4. **Analyze Laps** - Use the analysis dashboard
5. **Scale Up** - Add more collectors/consumers

## Support

- Documentation: `docs/KAFKA_ARCHITECTURE.md`
- Issues: GitHub Issues
- Logs: `logs/` directory

Happy racing! 🏁
