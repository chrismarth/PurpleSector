-- RisingWave: Postgres sink for completed laps
--
-- Writes one row per completed lap into the app metadata Postgres DB.
-- Uses upsert keyed by (session_id, lap_number).

-- ── Laps (one row per lap, updated with max elapsed time) ─────────────
-- Use MAX(lap_time) GROUP BY (session_id, lap_number).
-- Each lap's telemetry has lap_time resetting to 0 at the start, so
-- MAX(lap_time) for each partition gives the correct elapsed duration.
-- This is stable under the 30-second watermark GC: the LAG(lap_time)
-- approach caused all laps to show the same time because, after GC
-- purged older frames, the LAG was recomputed incorrectly and the
-- upsert trigger overwrote the correct values.
--
-- NOTE: The sink to Postgres is created separately AFTER Django migrations
-- run (see start-dev.sh), because the laps table must exist first.
CREATE MATERIALIZED VIEW IF NOT EXISTS completed_laps AS
SELECT
    session_id,
    lap_number,
    MAX(lap_time) / 1000.0 AS lap_time
FROM telemetry_samples
WHERE lap_number > 0
GROUP BY session_id, lap_number;
