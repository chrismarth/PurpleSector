-- RisingWave: Redis sinks for real-time telemetry streaming
--
-- This replaces the polling Redis bridge with push-based sinks that publish
-- directly to Redis Pub/Sub channels as data arrives in RisingWave.
--
-- Run after 002_materialized_views.sql:
--   psql -h localhost -p 4566 -d dev -f 003_redis_sinks.sql

-- Drop old sinks if they exist
DROP SINK IF EXISTS telemetry_redis_pubsub CASCADE;
DROP SINK IF EXISTS telemetry_redis_streams CASCADE;

-- First, create a view with the channel name as a column for Pub/Sub
-- Convert NULLs to 0 for numeric fields to avoid JSON parsing issues
-- For demo sessions, use the session owner's user_id for channels, not the telemetry user_id
DROP MATERIALIZED VIEW IF EXISTS telemetry_with_channel CASCADE;
CREATE MATERIALIZED VIEW telemetry_with_channel AS
SELECT
    ts.user_id,
    ts.session_id,
    ts.source,
    ts.source_rate_hz,
    EXTRACT(EPOCH FROM ts.ts) * 1000 AS timestamp,
    ts.speed,
    ts.throttle,
    ts.brake,
    ts.steering,
    ts.gear,
    ts.rpm,
    ts.normalized_position,
    ts.lap_number,
    ts.lap_time,
    COALESCE(ts.session_time, 0) AS session_time,
    COALESCE(ts.session_type, 0) AS session_type,
    COALESCE(ts.track_position, 0) AS track_position,
    COALESCE(ts.delta, 0) AS delta,
    -- Use session owner's user_id for channels (from active_sessions table)
    'telemetry:live:' || s.user_id || ':' || ts.session_id AS pubsub_channel,
    'telemetry:' || s.user_id || ':' || ts.session_id AS stream_key
FROM telemetry_samples ts
INNER JOIN active_sessions s ON ts.session_id = s.session_id;

-- ── Sink 1: Redis Pub/Sub for real-time WebSocket streaming ──────────
-- Publishes each telemetry sample to a Redis Pub/Sub channel immediately
-- Channel format: telemetry:live:{user_id}:{session_id}
-- This enables real-time streaming to WebSocket clients with zero polling delay

CREATE SINK telemetry_redis_pubsub 
FROM telemetry_with_channel
WITH (
  primary_key = 'user_id,session_id,timestamp',
  connector = 'redis',
  redis.url = 'redis://redis:6379/'
)
FORMAT PLAIN ENCODE TEMPLATE (
  force_append_only = 'true',
  redis_value_type = 'pubsub',
  channel_column = 'pubsub_channel',
  value_format = '\{"timestamp":{timestamp},"speed":{speed},"throttle":{throttle},"brake":{brake},"steering":{steering},"gear":{gear},"rpm":{rpm},"normalizedPosition":{normalized_position},"lapNumber":{lap_number},"lapTime":{lap_time},"sessionTime":{session_time},"sessionType":{session_type},"trackPosition":{track_position},"delta":{delta}\}'
);

-- ── Sink 2: Redis Streams for backfill/history ───────────────────────
-- Writes telemetry samples to Redis Streams for historical data and backfill
-- Stream key format: telemetry:{user_id}:{session_id}
-- This allows WebSocket clients to backfill recent data on connection

CREATE SINK telemetry_redis_streams
FROM telemetry_with_channel
WITH (
  primary_key = 'user_id,session_id,timestamp',
  connector = 'redis',
  redis.url = 'redis://redis:6379/'
)
FORMAT PLAIN ENCODE TEMPLATE (
  force_append_only = 'true',
  redis_value_type = 'stream',
  stream_column = 'stream_key',
  key_format = '{user_id}:{session_id}:{timestamp}',
  value_format = '\{"timestamp":{timestamp},"speed":{speed},"throttle":{throttle},"brake":{brake},"steering":{steering},"gear":{gear},"rpm":{rpm},"normalizedPosition":{normalized_position},"lapNumber":{lap_number},"lapTime":{lap_time},"sessionTime":{session_time},"sessionType":{session_type},"trackPosition":{track_position},"delta":{delta}\}'
);
