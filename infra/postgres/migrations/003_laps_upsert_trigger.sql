-- Convert duplicate INSERT into UPDATE for the RisingWave JDBC append-only sink.
--
-- The laps table uses a UUID primary key so RisingWave's JDBC upsert mode
-- cannot be used (it requires the primary_key option to match the table PK).
-- Instead the sink runs in append-only mode and this BEFORE INSERT trigger
-- intercepts any row whose (session_id, lap_number) already exists, performs
-- an UPDATE of lap_time in place, and suppresses the original INSERT by
-- returning NULL.  New laps pass through unchanged.
--
-- Idempotent: safe to re-run on an already-initialized database.

CREATE OR REPLACE FUNCTION fn_laps_upsert_on_conflict()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE laps
  SET lap_time = NEW.lap_time
  WHERE session_id = NEW.session_id
    AND lap_number = NEW.lap_number;

  IF FOUND THEN
    RETURN NULL;  -- Row existed; UPDATE done, suppress the INSERT.
  END IF;

  RETURN NEW;  -- New lap; allow the INSERT.
END;
$$;

DROP TRIGGER IF EXISTS trg_laps_upsert_on_conflict ON laps;

CREATE TRIGGER trg_laps_upsert_on_conflict
BEFORE INSERT ON laps
FOR EACH ROW EXECUTE FUNCTION fn_laps_upsert_on_conflict();
