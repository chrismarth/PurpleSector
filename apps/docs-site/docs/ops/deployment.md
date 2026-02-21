# Deployment

This page describes common deployment patterns for Purple Sector services: PM2, systemd, and Docker.

> These examples focus on the backend services (Kafka–WebSocket bridge, collectors, DB consumer). Deploying the Next.js app can follow your usual Node hosting or containerization strategy.

## PM2 Deployment

PM2 is convenient for running Node services in the background on a single host.

### Install PM2

```bash
npm install -g pm2
```

### Start Services

Use the provided `ecosystem.config.js` to run bridge and collectors:

```bash
pm2 start ecosystem.config.js
```

Typical services include:

- `kafka-bridge` — Kafka→WebSocket bridge.
- `kafka-db-consumer` — Kafka→DB consumer.
- Collectors such as `acc-collector` or demo collectors.
- `nextjs` — The Next.js production server.

### Monitor and Logs

```bash
pm2 monit          # Live dashboard
pm2 logs           # All logs
pm2 logs kafka-bridge
pm2 logs acc-collector
```

### Restart and Lifecycle

```bash
pm2 restart all
pm2 stop all
pm2 delete all
```

## Systemd Deployment

For production environments, you can use systemd service units to run core processes.

Example systemd steps (high level):

1. Create service files under `/etc/systemd/system/`, e.g. `kafka-bridge.service`.
2. Enable and start services:

   ```bash
   sudo systemctl enable kafka-bridge
   sudo systemctl start kafka-bridge
   sudo systemctl status kafka-bridge
   ```

Systemd will manage restarts and startup on boot; PM2 can still be used inside a systemd unit if desired.

## Docker Deployment

You can containerize the services into a Docker image, for example:

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

You can define additional containers for collectors and the DB consumer, or orchestrate them with Docker Compose or Kubernetes.

## Next.js Production Build

For the web app:

```bash
# Build
npm run build

# Start production server
npm run start
```

In production, use PostgreSQL instead of SQLite:

```env
DATABASE_URL="postgresql://user:password@host:5432/purplesector"
```

## Environment Configuration

Regardless of deployment method, key environment variables include:

- **Kafka**
  - `KAFKA_BROKERS`
  - `KAFKA_CLIENT_ID`
  - `KAFKA_TOPIC_TELEMETRY`
- **WebSocket Bridge**
  - `WS_PORT`
  - `WS_HOST`
- **Database**
  - `DATABASE_URL`
- **Authentication**
  - In production, replace the stub auth with a proper authentication provider.
- **AI Agent**
  - `OPENAI_API_KEY`
- **Logging**
  - `LOG_LEVEL`
  - `LOG_FORMAT`

Refer to `.env.example` and the `@purplesector/config` package for full configuration options.
