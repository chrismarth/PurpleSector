/**
 * RisingWave client for dual-writing control tables.
 *
 * RisingWave exposes a Postgres-compatible wire protocol on port 4566.
 * This module provides a thin wrapper around `pg.Pool` to manage:
 * - `active_sessions` table: Maps telemetry sources to session IDs
 * - `math_channel_rules` table: User-defined math channel expressions
 *
 * Env vars:
 *   RISINGWAVE_HOST  (default: localhost)
 *   RISINGWAVE_PORT  (default: 4566)
 *   RISINGWAVE_DB    (default: dev)
 *   RISINGWAVE_USER  (default: root)
 */

import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.RISINGWAVE_HOST || 'localhost',
      port: parseInt(process.env.RISINGWAVE_PORT || '4566', 10),
      database: process.env.RISINGWAVE_DB || 'dev',
      user: process.env.RISINGWAVE_USER || 'root',
      password: process.env.RISINGWAVE_PASSWORD || '',
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

/**
 * Check if RisingWave is configured and reachable.
 * Returns false if RISINGWAVE_HOST is not set, allowing
 * the app to function without the cloud pipeline.
 */
export async function isRisingWaveAvailable(): Promise<boolean> {
  if (!process.env.RISINGWAVE_HOST) {
    return false;
  }
  try {
    const client = await getPool().connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}

export interface MathChannelRule {
  userId: string;
  channelId: string;
  channelLabel: string;
  expression: string;
  inputs: string; // JSON string of MathChannelInput[]
}

/**
 * Upsert a math channel rule into RisingWave's control table.
 * Called on both CREATE and UPDATE of a math channel.
 */
export async function upsertMathChannelRule(rule: MathChannelRule): Promise<void> {
  if (!process.env.RISINGWAVE_HOST) return;

  try {
    const pg = getPool();
    // RisingWave supports INSERT ... ON CONFLICT for tables
    await pg.query(
      `INSERT INTO math_channel_rules (user_id, channel_id, channel_label, expression, inputs, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, channel_id)
       DO UPDATE SET
         channel_label = EXCLUDED.channel_label,
         expression    = EXCLUDED.expression,
         inputs        = EXCLUDED.inputs,
         updated_at    = NOW()`,
      [rule.userId, rule.channelId, rule.channelLabel, rule.expression, rule.inputs]
    );
    console.log(`[risingwave] Upserted math channel rule: ${rule.channelId}`);
  } catch (err) {
    // Log but don't fail the main request — RisingWave is secondary storage
    console.error('[risingwave] Failed to upsert math channel rule:', err);
  }
}

/**
 * Delete a math channel rule from RisingWave's control table.
 */
export async function deleteMathChannelRule(
  userId: string,
  channelId: string
): Promise<void> {
  if (!process.env.RISINGWAVE_HOST) return;

  try {
    const pg = getPool();
    await pg.query(
      `DELETE FROM math_channel_rules WHERE user_id = $1 AND channel_id = $2`,
      [userId, channelId]
    );
    console.log(`[risingwave] Deleted math channel rule: ${channelId}`);
  } catch (err) {
    console.error('[risingwave] Failed to delete math channel rule:', err);
  }
}

/**
 * Sync all math channels for a user — bulk upsert into RisingWave.
 * Useful for initial migration or repair.
 */
export async function syncAllMathChannelRules(
  rules: MathChannelRule[]
): Promise<void> {
  if (!process.env.RISINGWAVE_HOST || rules.length === 0) return;

  try {
    const pg = getPool();
    const client = await pg.connect();
    try {
      for (const rule of rules) {
        await client.query(
          `INSERT INTO math_channel_rules (user_id, channel_id, channel_label, expression, inputs, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (user_id, channel_id)
           DO UPDATE SET
             channel_label = EXCLUDED.channel_label,
             expression    = EXCLUDED.expression,
             inputs        = EXCLUDED.inputs,
             updated_at    = NOW()`,
          [rule.userId, rule.channelId, rule.channelLabel, rule.expression, rule.inputs]
        );
      }
      console.log(`[risingwave] Synced ${rules.length} math channel rules`);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[risingwave] Failed to sync math channel rules:', err);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Session Management
// ────────────────────────────────────────────────────────────────────────────

export interface ActiveSession {
  sessionId: string;
  userId: string;
  source: string;
  status: 'active' | 'paused' | 'archived';
}

/**
 * Register a session in RisingWave's active_sessions table.
 * This allows telemetry frames to be matched with the correct session.
 * Called when a session is created in the UI.
 */
export async function registerActiveSession(session: ActiveSession): Promise<void> {
  if (!process.env.RISINGWAVE_HOST) return;

  try {
    const t0 = Date.now();
    const pg = getPool();
    // DELETE + INSERT pattern.
    // With the 30-second watermark on telemetry_frames, RisingWave's internal
    // state is bounded to ~30s of frames.  The DELETE retraction and INSERT
    // re-join now only touch this small window instead of the full history,
    // completing in seconds rather than minutes.
    await pg.query(
      `DELETE FROM active_sessions WHERE user_id = $1 AND source = $2`,
      [session.userId, session.source]
    );
    const t1 = Date.now();
    console.log(`[risingwave] DELETE completed in ${t1 - t0}ms`);
    await pg.query(
      `INSERT INTO active_sessions (session_id, user_id, source, status, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [session.sessionId, session.userId, session.source, session.status]
    );
    const elapsed = Date.now() - t0;
    console.log(`[risingwave] Registered active session: ${session.sessionId} (source: ${session.source}) in ${elapsed}ms`);
  } catch (err) {
    // Log but don't fail the main request — RisingWave is secondary storage
    console.error('[risingwave] Failed to register active session:', err);
  }
}

/**
 * Update a session's status in RisingWave.
 * Called when a session is paused, resumed, or archived.
 */
export async function updateActiveSessionStatus(
  sessionId: string,
  status: 'active' | 'paused' | 'archived'
): Promise<void> {
  if (!process.env.RISINGWAVE_HOST) return;

  try {
    const pg = getPool();
    await pg.query(
      `UPDATE active_sessions SET status = $1 WHERE session_id = $2`,
      [status, sessionId]
    );
    console.log(`[risingwave] Updated session ${sessionId} status to: ${status}`);
  } catch (err) {
    console.error('[risingwave] Failed to update session status:', err);
  }
}

/**
 * Return the highest in-progress lap for a session from telemetry_samples.
 * This is the lap that is currently being driven and has no boundary crossing yet.
 * Must be called BEFORE updateActiveSessionStatus so the session is still in the join.
 */
export async function snapshotInProgressLap(
  sessionId: string
): Promise<{ lapNumber: number; lapTime: number | null } | null> {
  if (!process.env.RISINGWAVE_HOST) return null;

  try {
    const pg = getPool();
    const result = await pg.query<{ lap_number: number; lap_time: number | null }>(
      `SELECT lap_number, MAX(lap_time) / 1000.0 AS lap_time
       FROM telemetry_samples
       WHERE session_id = $1
       GROUP BY lap_number
       ORDER BY lap_number DESC
       LIMIT 1`,
      [sessionId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return { lapNumber: row.lap_number, lapTime: row.lap_time ?? null };
  } catch (err) {
    console.error('[risingwave] Failed to snapshot in-progress lap:', err);
    return null;
  }
}

/**
 * Read the current completed_laps materialized view for a session and return
 * them as plain objects.  Call this BEFORE changing the session status to
 * 'archived' — once the status changes the streaming join retracts all rows
 * and the MV (and the JDBC sink) will have nothing left for this session.
 */
export async function snapshotCompletedLaps(
  sessionId: string
): Promise<{ lapNumber: number; lapTime: number | null }[]> {
  if (!process.env.RISINGWAVE_HOST) return [];

  try {
    const pg = getPool();
    const result = await pg.query<{ lap_number: number; lap_time: number | null }>(
      `SELECT lap_number, lap_time FROM completed_laps WHERE session_id = $1 ORDER BY lap_number`,
      [sessionId]
    );
    return result.rows.map((r) => ({
      lapNumber: r.lap_number,
      lapTime: r.lap_time ?? null,
    }));
  } catch (err) {
    console.error('[risingwave] Failed to snapshot completed laps:', err);
    return [];
  }
}

/**
 * Remove a session from RisingWave's active_sessions table.
 * Called when a session is deleted from the UI.
 */
export async function deleteActiveSession(sessionId: string): Promise<void> {
  if (!process.env.RISINGWAVE_HOST) return;

  try {
    const pg = getPool();
    await pg.query(
      `DELETE FROM active_sessions WHERE session_id = $1`,
      [sessionId]
    );
    console.log(`[risingwave] Deleted active session: ${sessionId}`);
  } catch (err) {
    console.error('[risingwave] Failed to delete active session:', err);
  }
}
