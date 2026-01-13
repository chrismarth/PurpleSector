# Development Environment Setup

## Overview

Purple Sector provides a complete development environment that runs the entire Kafka telemetry pipeline with demo data - **no game required!**

This is perfect for:
- 🚀 **Quick development** - Start everything with one command
- 🧪 **Testing** - Verify changes without running the game
- 🐛 **Debugging** - Isolate issues in the pipeline
- 📊 **Demonstrations** - Show the system without game setup
- 💻 **Cross-platform** - Works on Linux, macOS, Windows (with WSL)

---

## Quick Start

### **One-Command Startup**

```bash
npm run dev:start
```

This single command:
1. ✅ Starts Kafka cluster (Docker)
2. ✅ Creates Kafka topics
3. ✅ Starts Kafka-WebSocket bridge
4. ✅ Starts database consumer
5. ✅ Starts demo collector (publishes demo data)
6. ✅ Starts Next.js frontend

**Wait ~30 seconds, then open:** http://localhost:3000

You should see telemetry streaming in real-time! 🎉

### **Stop Everything**

```bash
# Stop services, keep Kafka running
npm run dev:stop

# Stop services AND Kafka
npm run dev:stop-all
```

---

## Prerequisites

### **1. Docker**

Kafka runs in Docker containers.

**Install:**
- **Linux:** https://docs.docker.com/engine/install/
- **macOS:** https://docs.docker.com/desktop/install/mac-install/
- **Windows:** https://docs.docker.com/desktop/install/windows-install/

**Verify:**
```bash
docker --version
docker-compose --version
```

### **2. Node.js**

Version 18 or higher required.

**Verify:**
```bash
node --version  # Should be v18.x or higher
npm --version
```

### **3. PostgreSQL/TimescaleDB**

For database persistence.

**Option A: Docker (Recommended for Dev)**
```bash
docker run -d \
  --name purplesector-db \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  timescale/timescaledb:latest-pg14
```

**Option B: Local Installation**
- Install PostgreSQL 14+
- Install TimescaleDB extension

**Verify:**
```bash
psql --version
```

### **4. PM2**

Process manager for running services.

**Install:**
```bash
npm install -g pm2
```

**Verify:**
```bash
pm2 --version
```

---

## Initial Setup

### **1. Clone and Install**

```bash
git clone <your-repo-url>
cd PurpleSector
npm install
```

### **2. Configure Environment**

```bash
cp .env.example .env
```

Edit `.env`:
```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/purplesector"

# Kafka
KAFKA_BROKERS=localhost:9092

# WebSocket
WS_PORT=8080
WS_HOST=0.0.0.0

# Logging
LOG_LEVEL=info
LOG_FORMAT=pretty
```

### **3. Setup Database**

```bash
npm run db:push
```

This creates all required tables.

### **4. Generate Demo Data**

```bash
npm run generate-demo
```

This creates `public/demo-telemetry.json` with sample telemetry data.

---

## Starting the Dev Environment

### **Automated Startup (Recommended)**

```bash
npm run dev:start
```

**What it does:**
1. Checks if Docker is running
2. Starts Kafka cluster (if not already running)
3. Waits for Kafka to be ready (30 seconds)
4. Creates Kafka topics
5. Checks database connection
6. Starts all services with PM2:
   - `kafka-bridge-dev` - WebSocket bridge
   - `kafka-db-consumer-dev` - Database persistence
   - `demo-collector-dev` - Demo data publisher
   - `nextjs-dev` - Frontend application

**Output:**
```
🚀 Starting Purple Sector Development Environment

✓ Kafka is already running
✓ Kafka topics created
✓ Database is ready
⏳ Starting services with PM2...

✅ Development environment started successfully!

📊 Service Status:
┌────────────────────────┬────┬─────────┬──────┬──────┐
│ Name                   │ id │ status  │ cpu  │ mem  │
├────────────────────────┼────┼─────────┼──────┼──────┤
│ kafka-bridge-dev       │ 0  │ online  │ 0%   │ 45mb │
│ kafka-db-consumer-dev  │ 1  │ online  │ 0%   │ 38mb │
│ demo-collector-dev     │ 2  │ online  │ 0%   │ 32mb │
│ nextjs-dev             │ 3  │ online  │ 0%   │ 89mb │
└────────────────────────┴────┴─────────┴──────┴──────┘

🌐 Access Points:
  Frontend:    http://localhost:3000
  Kafka UI:    http://localhost:8090
  WebSocket:   ws://localhost:8080

🎉 Happy coding!
```

### **Manual Startup (Alternative)**

If you prefer to start services individually:

```bash
# Terminal 1: Kafka
docker-compose -f docker-compose.kafka.yml up -d

# Terminal 2: Setup
npm run kafka:setup

# Terminal 3: Bridge
npm run kafka:bridge

# Terminal 4: Database Consumer
npm run kafka:db-consumer

# Terminal 5: Demo Collector
npm run telemetry:demo-kafka

# Terminal 6: Frontend
npm run dev
```

---

## Managing Services

### **View All Services**

```bash
pm2 status
```

### **View Logs**

```bash
# All logs
pm2 logs

# Specific service
pm2 logs kafka-bridge-dev
pm2 logs demo-collector-dev
pm2 logs kafka-db-consumer-dev
pm2 logs nextjs-dev

# Follow logs (tail -f style)
pm2 logs --lines 100
```

### **Monitor Services**

```bash
pm2 monit
```

Interactive dashboard showing:
- CPU usage
- Memory usage
- Logs in real-time

### **Restart Services**

```bash
# Restart all
pm2 restart all

# Restart specific service
pm2 restart kafka-bridge-dev
pm2 restart demo-collector-dev
```

### **Stop Services**

```bash
# Stop all services, keep Kafka running
npm run dev:stop

# Stop all services AND Kafka
npm run dev:stop-all

# Or manually with PM2
pm2 stop all
pm2 delete all
```

---

## Accessing the Application

### **Frontend**

```
http://localhost:3000
```

You should see:
- Real-time telemetry streaming
- Demo data playing in a loop
- Charts updating at 60 Hz

### **Kafka UI**

```
http://localhost:8090
```

View:
- Topics: `telemetry-user-demo-user`
- Messages flowing
- Consumer groups
- Partition distribution

### **Database**

```bash
# Open Prisma Studio
npm run db:studio

# Or use psql
psql $DATABASE_URL
```

Query telemetry:
```sql
-- View sessions
SELECT * FROM "Session" ORDER BY "startTime" DESC LIMIT 10;

-- View frames
SELECT COUNT(*) FROM "TelemetryFrame";

-- View laps
SELECT * FROM "Lap" ORDER BY "lapTime" ASC LIMIT 10;
```

---

## Customizing the Dev Environment

### **Change Demo User ID**

Edit `ecosystem.dev.config.js`:

```javascript
{
  name: 'demo-collector-dev',
  script: 'services/collectors/demo-collector-kafka.js',
  args: '--userId=alice --loop', // Change userId here
  // ...
}
```

Restart:
```bash
pm2 restart demo-collector-dev
```

### **Change Frame Rate**

```javascript
args: '--userId=demo-user --frameRate=30 --loop', // 30 Hz instead of 60 Hz
```

### **Disable Loop (Single Playback)**

```javascript
args: '--userId=demo-user --no-loop',
```

### **Run Multiple Demo Collectors**

Add to `ecosystem.dev.config.js`:

```javascript
{
  name: 'demo-collector-alice',
  script: 'services/collectors/demo-collector-kafka.js',
  args: '--userId=alice --loop',
  // ... same config as demo-collector-dev
},
{
  name: 'demo-collector-bob',
  script: 'services/collectors/demo-collector-kafka.js',
  args: '--userId=bob --loop',
  // ... same config as demo-collector-dev
},
```

Restart PM2:
```bash
pm2 delete all
pm2 start ecosystem.dev.config.js
```

---

## Troubleshooting

### **"Docker is not running"**

**Solution:**
```bash
# Start Docker Desktop (macOS/Windows)
# Or start Docker daemon (Linux)
sudo systemctl start docker
```

### **"Kafka topics not created"**

**Solution:**
```bash
# Manually create topics
npm run kafka:setup

# Or restart Kafka
docker-compose -f docker-compose.kafka.yml down
docker-compose -f docker-compose.kafka.yml up -d
sleep 30
npm run kafka:setup
```

### **"Database connection failed"**

**Solution:**
```bash
# Check if PostgreSQL is running
docker ps | grep timescale

# Or start database
docker run -d \
  --name purplesector-db \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  timescale/timescaledb:latest-pg14

# Push schema
npm run db:push
```

### **"PM2 command not found"**

**Solution:**
```bash
npm install -g pm2
```

### **Services not starting**

**Check logs:**
```bash
pm2 logs

# Or check individual log files
tail -f logs/dev-kafka-bridge-error.log
tail -f logs/dev-demo-collector-error.log
```

**Common issues:**
- Port 8080 already in use → Change `WS_PORT` in `.env`
- Port 3000 already in use → Change `PORT` in `.env`
- Kafka not ready → Wait longer, or restart Kafka

### **No telemetry in frontend**

**Check:**
1. Is demo collector running?
   ```bash
   pm2 logs demo-collector-dev
   ```
   Should see: "Playback progress"

2. Is bridge consuming?
   ```bash
   pm2 logs kafka-bridge-dev
   ```
   Should see: "Creating Kafka consumer for user"

3. Is frontend connected?
   - Open browser console
   - Should see: "Connected to Purple Sector telemetry server"

4. Check Kafka UI:
   - http://localhost:8090
   - Topic `telemetry-user-demo-user` should have messages

---

## Development Workflow

### **Typical Development Session**

```bash
# 1. Start environment
npm run dev:start

# 2. Make code changes
# Edit files in src/, services/, etc.

# 3. Restart affected service
pm2 restart kafka-bridge-dev  # If you changed bridge code
pm2 restart nextjs-dev         # If you changed frontend code

# 4. View logs
pm2 logs kafka-bridge-dev

# 5. Stop when done
npm run dev:stop
```

### **Testing Changes**

```bash
# Start environment
npm run dev:start

# Make changes to bridge
vim services/kafka-websocket-bridge.js

# Restart bridge
pm2 restart kafka-bridge-dev

# Watch logs
pm2 logs kafka-bridge-dev --lines 50

# Verify in frontend
# Open http://localhost:3000
```

### **Debugging**

```bash
# Enable debug logging
# Edit ecosystem.dev.config.js:
env: {
  LOG_LEVEL: 'debug',  // Change from 'info' to 'debug'
}

# Restart services
pm2 restart all

# View detailed logs
pm2 logs
```

---

## Switching to Real Game

When you're ready to test with a real game:

### **Option 1: Replace Demo Collector**

```bash
# Stop demo collector
pm2 stop demo-collector-dev

# Start ACC collector (in separate terminal)
npm run telemetry:acc-kafka
```

### **Option 2: Use Production Config**

```bash
# Stop dev environment
npm run dev:stop

# Start production config (with game collectors)
pm2 start ecosystem.config.js
```

---

## Performance

### **Resource Usage (Typical)**

| Service | CPU | Memory | Notes |
|---------|-----|--------|-------|
| Kafka | 5-10% | 512 MB | Docker container |
| Bridge | 2-5% | 150 MB | Per-user consumers |
| DB Consumer | 5-10% | 300 MB | Batch inserts |
| Demo Collector | 1-2% | 50 MB | 60 Hz playback |
| Next.js | 10-20% | 200 MB | Dev mode (hot reload) |
| **Total** | **25-50%** | **~1.2 GB** | |

### **Optimizing for Development**

**Reduce frame rate:**
```javascript
args: '--frameRate=30 --loop', // 30 Hz instead of 60 Hz
```

**Disable database consumer:**
```bash
pm2 stop kafka-db-consumer-dev
```

**Use production Next.js:**
```bash
npm run build
pm2 stop nextjs-dev
pm2 start npm --name "nextjs-prod" -- start
```

---

## Summary

### **Quick Commands**

```bash
# Start everything
npm run dev:start

# View status
pm2 status

# View logs
pm2 logs

# Monitor
pm2 monit

# Restart all
pm2 restart all

# Stop everything
npm run dev:stop

# Stop including Kafka
npm run dev:stop-all
```

### **Access Points**

- **Frontend:** http://localhost:3000
- **Kafka UI:** http://localhost:8090
- **Database:** http://localhost:5555 (Prisma Studio)

### **Key Features**

✅ **One-command startup** - `npm run dev:start`  
✅ **No game required** - Demo collector provides data  
✅ **Full pipeline** - Kafka, bridge, DB consumer, frontend  
✅ **Easy monitoring** - PM2 logs and status  
✅ **Quick iteration** - Restart individual services  
✅ **Cross-platform** - Works on Linux, macOS, Windows  

**Happy developing!** 🚀
