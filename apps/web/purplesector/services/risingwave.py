"""
RisingWave client for dual-writing control tables.

Port of apps/web/src/lib/risingwave.ts — uses psycopg2 to connect to
RisingWave's Postgres-compatible wire protocol (port 4566).

All writes are best-effort: catch + log, don't fail the main request.
If RISINGWAVE_HOST is not set, all functions silently no-op.
"""

import logging

import psycopg2
from django.conf import settings

logger = logging.getLogger(__name__)

_conn = None


def _get_connection():
    """Get a psycopg2 connection to RisingWave. Returns None if not configured."""
    if not settings.RISINGWAVE_HOST:
        logger.warning("[risingwave] RISINGWAVE_HOST not set, skipping")
        return None

    global _conn
    # Check if existing connection is still usable
    if _conn is not None:
        try:
            _conn.cursor().execute("SELECT 1")
        except Exception:
            logger.info("[risingwave] Stale connection, reconnecting")
            try:
                _conn.close()
            except Exception:
                pass
            _conn = None

    if _conn is None:
        try:
            _conn = psycopg2.connect(
                host=settings.RISINGWAVE_HOST,
                port=settings.RISINGWAVE_PORT,
                dbname=settings.RISINGWAVE_DB,
                user=settings.RISINGWAVE_USER,
            )
            _conn.autocommit = True
            logger.info("[risingwave] Connected to %s:%s", settings.RISINGWAVE_HOST, settings.RISINGWAVE_PORT)
        except Exception as e:
            logger.error("[risingwave] Failed to connect: %s", e)
            return None
    return _conn


def is_available() -> bool:
    conn = _get_connection()
    return conn is not None


def register_active_session(
    user_id: str, session_id: str, source: str, status: str = "active",
):
    """Insert/update an active session in RisingWave's active_sessions table.

    This is what enables the telemetry pipeline to route frames to the session.
    """
    conn = _get_connection()
    if conn is None:
        return
    try:
        with conn.cursor() as cur:
            # RisingWave tables with a PK do automatic upsert on INSERT
            cur.execute(
                """INSERT INTO active_sessions (session_id, user_id, source, status, created_at)
                   VALUES (%s, %s, %s, %s, NOW())""",
                (session_id, user_id, source, status),
            )
        logger.info("[risingwave] Registered active session: %s (source=%s)", session_id, source)
    except Exception as e:
        logger.error("[risingwave] Failed to register active session: %s", e)


def update_active_session_status(session_id: str, status: str):
    conn = _get_connection()
    if conn is None:
        return
    try:
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE active_sessions SET status = %s
                   WHERE session_id = %s""",
                (status, session_id),
            )
        logger.info("[risingwave] Updated session %s status to %s", session_id, status)
    except Exception as e:
        logger.error("[risingwave] Failed to update session status: %s", e)


def upsert_math_channel_rule(channel):
    """Dual-write a MathChannel to RisingWave's math_channel_rules table."""
    conn = _get_connection()
    if conn is None:
        return
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO math_channel_rules
                       (user_id, channel_id, channel_label, expression, inputs, updated_at)
                   VALUES (%s, %s, %s, %s, %s, NOW())
                   ON CONFLICT (user_id, channel_id)
                   DO UPDATE SET
                       channel_label = EXCLUDED.channel_label,
                       expression    = EXCLUDED.expression,
                       inputs        = EXCLUDED.inputs,
                       updated_at    = NOW()""",
                (
                    str(channel.user_id),
                    str(channel.id),
                    channel.label,
                    channel.expression,
                    channel.inputs,
                ),
            )
        logger.info("[risingwave] Upserted math channel rule: %s", channel.id)
    except Exception as e:
        logger.error("[risingwave] Failed to upsert math channel rule: %s", e)


def delete_math_channel_rule(user_id: str, channel_id: str):
    conn = _get_connection()
    if conn is None:
        return
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM math_channel_rules WHERE user_id = %s AND channel_id = %s",
                (user_id, channel_id),
            )
        logger.info("[risingwave] Deleted math channel rule: %s", channel_id)
    except Exception as e:
        logger.error("[risingwave] Failed to delete math channel rule: %s", e)
