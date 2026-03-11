-- RisingWave: Iceberg sink definitions — output to Iceberg (archive)
--
-- Run after 005_iceberg_connection.sql:
--   psql -h localhost -p 4566 -d dev -f 006_iceberg_sinks.sql

-- Drop existing sink and MV for idempotent re-init
DROP SINK IF EXISTS archive_raw;
DROP MATERIALIZED VIEW IF EXISTS telemetry_frames_flattened;

-- ── Iceberg sink (raw archive) ──────────────────────────────────────
-- Appends session-enriched telemetry frames to Iceberg for archival querying.
-- Reads from telemetry_samples (which includes session_id and lap_number
-- from the session join and lap boundary detection in 002_materialized_views.sql).
-- Uses the iceberg_minio connection created in 005_iceberg_connection.sql
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_frames_flattened AS
SELECT
    user_id,
    session_id,
    source,
    source_rate_hz,
    ts,
    lap_number,
    speed,
    throttle,
    brake,
    steering,
    gear,
    rpm,
    normalized_position,
    lap_time,
    session_time,
    session_type,
    track_position,
    delta
FROM telemetry_samples;

CREATE SINK IF NOT EXISTS archive_raw
FROM telemetry_frames_flattened
WITH (
    connector = 'iceberg',
    type = 'append-only',
    force_append_only = 'true',
    connection = iceberg_minio,
    database.name = 'telemetry',
    table.name = 'raw_samples',
    create_table_if_not_exists = 'true'
);

