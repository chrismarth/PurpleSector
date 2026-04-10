-- RisingWave: Materialized views with session assignment and lap detection
--
-- Simplified approach: Use a RisingWave table for active sessions that the web app
-- can update directly via SQL. This avoids the complexity of Postgres CDC.
--
-- Run after 001_sources.sql:
--   psql -h localhost -p 4566 -d dev -f 002_materialized_views.sql

-- ── Step 1: Create active sessions table in RisingWave ───────────────
-- The web app will INSERT/UPDATE/DELETE rows here when sessions are created/modified
CREATE TABLE IF NOT EXISTS active_sessions (
    session_id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    source VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Step 2: Extract and enrich frames with session assignment ────────
-- Join telemetry frames with active sessions based on user_id + source
-- Special handling for demo sessions: match any demo telemetry to any active demo session
-- Temporal filter: Only join frames whose timestamp >= session created_at.
-- Since created_at is static (set once at insert), this does NOT cause re-emission
-- like the ticker-based approach did. It simply prevents old accumulated frames
-- from joining when a new session is created.

-- Drop materialized views so definition changes apply on re-init.
-- Order matters due to dependencies.
DROP MATERIALIZED VIEW IF EXISTS telemetry_samples CASCADE;
DROP MATERIALIZED VIEW IF EXISTS telemetry_with_prev_position CASCADE;
DROP MATERIALIZED VIEW IF EXISTS telemetry_with_sessions CASCADE;

CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_with_sessions AS
SELECT
    s.user_id,
    s.session_id,
    tf.source,
    tf.source_rate_hz,
    tf.event_time AS ts,
    (tf.frame).speed,
    (tf.frame).throttle,
    (tf.frame).brake,
    (tf.frame).steering,
    (tf.frame).gear,
    (tf.frame).rpm,
    (tf.frame).normalized_position,
    CASE
        WHEN tf.source = 'demo' THEN 0
        ELSE (tf.frame).lap_number
    END AS source_lap_number,
    (tf.frame).lap_time,
    (tf.frame).session_time,
    (tf.frame).session_type,
    (tf.frame).track_position,
    (tf.frame).delta
FROM telemetry_frames tf
INNER JOIN active_sessions s 
    ON tf.source = s.source 
    AND s.status = 'active'
    AND (
        -- For demo sessions, match any demo telemetry to any active demo session
        (tf.source = 'demo') 
        OR 
        -- For real sessions, match by user_id
        (tf.user_id = s.user_id)
    )
WHERE
    -- Only process frames that arrived after the session was created
    -- This prevents the burst of old data when a new session is registered
    tf.event_time >= s.created_at - INTERVAL '5 seconds';

-- ── Step 3: Add previous position for lap boundary detection ─────────
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_with_prev_position AS
SELECT
    user_id,
    session_id,
    source,
    source_rate_hz,
    ts,
    speed,
    throttle,
    brake,
    steering,
    gear,
    rpm,
    normalized_position,
    LAG(normalized_position) OVER w AS prev_position,
    source_lap_number,
    lap_time,
    session_time,
    session_type,
    track_position,
    delta
FROM telemetry_with_sessions
WINDOW w AS (PARTITION BY user_id, session_id ORDER BY ts);

-- ── Step 4: Detect lap boundaries and assign lap numbers ─────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_samples AS
SELECT
    user_id,
    session_id,
    source,
    source_rate_hz,
    ts,
    speed,
    throttle,
    brake,
    steering,
    gear,
    rpm,
    normalized_position,
    source_lap_number,
    lap_time,
    session_time,
    session_type,
    track_position,
    delta,
    -- Detect lap boundary: position wraps from >0.9 to <0.1
    CASE
        WHEN prev_position > 0.9 AND normalized_position < 0.1 THEN 1
        ELSE 0
    END AS lap_boundary,
    -- Compute monotonic lap number within a session from position wraps.
    1 + SUM(
        CASE
            WHEN prev_position > 0.9 AND normalized_position < 0.1 THEN 1
            ELSE 0
        END
    ) OVER (PARTITION BY user_id, session_id ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS lap_number
FROM telemetry_with_prev_position;

