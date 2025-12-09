# Running the Stack

This page describes how to start the full Purple Sector stack: Kafka, services, collectors, and the web app.

## One-Command Dev Environment

For day-to-day development, the easiest way to run everything is:

```bash
npm run dev:start
```

This will:

1. Start the Kafka cluster via Docker.
2. Ensure Kafka topics exist.
3. Start the Kafka–WebSocket bridge.
4. Start the Kafka→DB consumer.
5. Start the demo collector (publishes telemetry).
6. Start the Next.js frontend.

After startup, open:

```text
http://localhost:3000
```

See **Developer Guide → Development Environment** for a deeper explanation of this script.

## Manual Startup (Services)

If you prefer more control or are debugging a specific component, you can run services individually.

### 1. Start Kafka

```bash
docker-compose -f docker-compose.kafka.yml up -d
```

Wait ~30 seconds for Kafka to be fully ready.

### 2. Setup Topics

```bash
npm run kafka:setup
```

This ensures topics like `telemetry` and `commands` exist with the desired partitioning and configuration.

### 3. Start the Kafka–WebSocket Bridge

```bash
npm run kafka:bridge
```

The bridge consumes telemetry from Kafka and exposes it over WebSockets to the frontend.

### 4. Start the Database Consumer

```bash
npm run kafka:db-consumer
```

This service subscribes to telemetry topics, performs batch inserts into the database, and persists sessions and laps.

### 5. Start a Collector

For demo/testing, use the demo collector:

```bash
npm run telemetry:demo-kafka
```

For real gameplay telemetry, use collectors such as:

- Assetto Corsa (Kafka):

  ```bash
  npm run telemetry:ac-kafka
  ```

- Assetto Corsa Competizione (Kafka):

  ```bash
  npm run telemetry:acc-kafka
  ```

### 6. Start the Frontend

```bash
npm run dev
```

The app will be available at:

```text
http://localhost:3000
```

## Quick Pipeline Test

To verify the Kafka pipeline end-to-end with the demo collector (no game needed):

1. Start Kafka:

   ```bash
   docker-compose -f docker-compose.kafka.yml up -d
   ```

2. Setup topics:

   ```bash
   npm run kafka:setup
   ```

3. Start the bridge:

   ```bash
   npm run kafka:bridge
   ```

4. Start the DB consumer:

   ```bash
   npm run kafka:db-consumer
   ```

5. Start the demo collector:

   ```bash
   npm run telemetry:demo-kafka
   ```

6. Start the frontend:

   ```bash
   npm run dev
   ```

7. Open `http://localhost:3000` and confirm that telemetry is streaming and laps are being recorded.

For scripted and CI-friendly tests, see the original `docs/TESTING_KAFKA_PIPELINE.md` content (which can be migrated into a dedicated testing page if desired).
