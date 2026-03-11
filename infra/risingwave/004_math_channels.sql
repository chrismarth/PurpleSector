-- RisingWave: Dynamic math channel support
--
-- Prerequisites:
--   1. Run 001_sources.sql and 002_materialized_views.sql first
--   2. Start the Python UDF server: python infra/risingwave/udf/math_channel_udf.py
--   3. Then run this file:
--        psql -h localhost -p 4566 -d dev -f 004_math_channels.sql
--
-- The web API dual-writes math channel definitions to both the Prisma
-- MathChannel table (app metadata) and this RisingWave table (stream
-- processing). See apps/web/src/lib/risingwave.ts for the bridge.

-- ── Control table for user-defined math channels ─────────────────────
CREATE TABLE IF NOT EXISTS math_channel_rules (
    user_id VARCHAR,
    channel_id VARCHAR,
    channel_label VARCHAR,
    expression VARCHAR,    -- mathjs-compatible expression string
    inputs VARCHAR,        -- JSON array of {channelId, alias} pairs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, channel_id)
);

-- ── Register the Python UDF ──────────────────────────────────────────
-- The UDF server must be running on port 8815 before executing this.
-- In docker-compose, the UDF server hostname is 'math-channel-udf'.
-- For local dev, use 'localhost'.
CREATE FUNCTION IF NOT EXISTS eval_math_channel(VARCHAR, VARCHAR, FLOAT8[])
    RETURNS FLOAT8
    LANGUAGE python
    AS eval_math_channel
    USING LINK 'http://math-channel-udf:8815';

-- ── Dynamic math channel evaluation MV ───────────────────────────────
-- Joins each telemetry sample row with every math channel rule for that
-- user, then evaluates the expression via the Python UDF.
--
-- The ARRAY must match the CHANNEL_ORDER in math_channel_udf.py:
--   [speed, throttle, brake, steering, gear, rpm,
--    normalized_position, lap_number, lap_time]
CREATE MATERIALIZED VIEW IF NOT EXISTS computed_math_channels AS
SELECT
    s.user_id,
    s.session_id,
    s.ts,
    s.lap_number,
    r.channel_id,
    r.channel_label,
    eval_math_channel(
        r.expression,
        r.inputs,
        ARRAY[
            s.speed::FLOAT8,
            s.throttle::FLOAT8,
            s.brake::FLOAT8,
            s.steering::FLOAT8,
            s.gear::FLOAT8,
            s.rpm::FLOAT8,
            s.normalized_position::FLOAT8,
            s.lap_number::FLOAT8,
            s.lap_time::FLOAT8
        ]
    ) AS value
FROM telemetry_samples s
JOIN math_channel_rules r ON s.user_id = r.user_id;
