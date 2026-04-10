-- The lap preservation trigger is no longer needed.
-- The JDBC sink now runs in append-only mode (force_append_only='true'),
-- which means RisingWave retractions are dropped and never reach Postgres.
-- Drop the trigger and function if they exist from a previous install.

DROP TRIGGER IF EXISTS trg_preserve_lap_on_delete ON laps;
DROP FUNCTION IF EXISTS fn_preserve_lap_on_delete();
