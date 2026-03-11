# Deployment

This page describes common deployment patterns for Purple Sector services: PM2, systemd, and Docker.

> These examples focus on the current backend services (Next.js, Redis WebSocket server, collectors/demo replay, and the supporting Redpanda/RisingWave/Redis/Iceberg stack).

## PM2 Deployment

PM2 is convenient for running Node services in the background on a single host.

### Install PM2

```bash
npm install -g pm2
```

### Start Services

Use the provided PM2 ecosystem file to run app services:

```bash
pm2 start ecosystem.config.js
```

Typical services include:

- `nextjs` — The Next.js production server.
- `redis-ws-server` — Redis → WebSocket relay for live telemetry.
- Collectors or replay processes when you run them outside Docker/PM2.

### Monitor and Logs

```bash
pm2 monit          # Live dashboard
pm2 logs           # All logs
pm2 logs nextjs
pm2 logs redis-ws-server
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

1. Create service files under `/etc/systemd/system/`, e.g. `nextjs.service` or `redis-ws-server.service`.
2. Enable and start services:

   ```bash
   sudo systemctl enable nextjs
   sudo systemctl start nextjs
   sudo systemctl status nextjs
   ```

Systemd will manage restarts and startup on boot; PM2 can still be used inside a systemd unit if desired.

## Docker Deployment

You can containerize the services into a Docker image, for example:

```bash
# Build image
docker build -t purple-sector-services .

# Run Redis WebSocket server
docker run -d \
  --name redis-ws-server \
  -p 8080:8080 \
  -e REDIS_URL=redis://redis:6379 \
  purple-sector-services \
  node services/redis-websocket-server.js
```

You can orchestrate all services with `docker-compose.dev.yml` or Kubernetes.

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

- **Telemetry / Query**
  - `TRINO_HOST`
  - `TRINO_PORT`
  - `RISINGWAVE_HOST`
- **WebSocket Server**
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
