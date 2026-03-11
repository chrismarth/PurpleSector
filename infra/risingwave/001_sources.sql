-- RisingWave: Create source consuming TelemetryEnvelope from Redpanda
--
-- The gRPC gateway unnests batches and publishes individual frames.
-- Sessions are assigned in RisingWave, not at the collector level.
--
-- Run against RisingWave SQL endpoint (localhost:4566):
--   psql -h localhost -p 4566 -d dev -f 001_sources.sql

CREATE SOURCE IF NOT EXISTS telemetry_frames (
    user_id VARCHAR,
    source VARCHAR,
    source_rate_hz BIGINT,
    frame STRUCT<
        timestamp BIGINT,
        speed REAL,
        throttle REAL,
        brake REAL,
        steering REAL,
        gear INT,
        rpm INT,
        normalized_position REAL,
        lap_number INT,
        lap_time INT,
        session_time REAL,
        session_type INT,
        track_position INT,
        delta INT
    >,
    -- Generated column: extract event time from nested struct for watermark
    event_time TIMESTAMPTZ AS to_timestamp((frame).timestamp / 1000.0),
    -- Watermark: allow RisingWave to GC internal state older than 30 seconds.
    -- Without this, every streaming operator buffers ALL frames forever,
    -- making any DML on active_sessions take minutes to retract/re-join.
    WATERMARK FOR event_time AS event_time - INTERVAL '30 seconds'
) WITH (
    connector = 'kafka',
    topic = 'telemetry-batches',
    properties.bootstrap.server = 'redpanda:9092',
    scan.startup.mode = 'latest'
) FORMAT PLAIN ENCODE PROTOBUF (
    message = 'purplesector.TelemetryEnvelope',
    schema.location = 'file:///risingwave/proto/telemetry.pb'
);
