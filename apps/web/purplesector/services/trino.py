"""
Trino client for querying Apache Iceberg tables.

Port of apps/web/src/lib/trino.ts — uses the trino Python package (DBAPI2).
"""

import logging

from django.conf import settings
from trino.dbapi import connect
from trino.auth import BasicAuthentication

logger = logging.getLogger(__name__)


def _get_connection():
    return connect(
        host=settings.TRINO_HOST,
        port=settings.TRINO_PORT,
        user=settings.TRINO_USER,
        catalog=settings.TRINO_CATALOG,
        schema=settings.TRINO_SCHEMA,
        auth=BasicAuthentication(settings.TRINO_USER, ""),
    )


def execute_query(query: str, params=None) -> list[dict]:
    """Execute a Trino SQL query and return rows as list of dicts."""
    conn = _get_connection()
    try:
        cur = conn.cursor()
        cur.execute(query, params)
        columns = [desc[0] for desc in cur.description] if cur.description else []
        rows = cur.fetchall()
        return [dict(zip(columns, row)) for row in rows]
    finally:
        conn.close()


def get_lap_frames_from_iceberg(session_id: str, lap_number: int) -> list[dict]:
    """
    Fetch telemetry frames for a specific lap from Iceberg via Trino.

    Includes the deduplication CTE from the original trino.ts:
    for each unique (session_id, ts), keep only the row with MAX(lap_number)
    using ROW_NUMBER() OVER (PARTITION BY ts ORDER BY lap_number DESC).
    """
    query = """
        WITH deduped AS (
            SELECT *, ROW_NUMBER() OVER (
                PARTITION BY ts ORDER BY lap_number DESC
            ) AS rn
            FROM raw_samples
            WHERE session_id = ?
        )
        SELECT ts, speed, throttle, brake, steering, gear, rpm,
               normalized_position, lap_number, lap_time
        FROM deduped
        WHERE rn = 1 AND lap_number = ?
        ORDER BY ts ASC
    """
    conn = _get_connection()
    try:
        cur = conn.cursor()
        cur.execute(query, (session_id, lap_number))
        rows = cur.fetchall()
    finally:
        conn.close()

    return [
        {
            "timestamp": row[0],
            "speed": row[1],
            "throttle": row[2],
            "brake": row[3],
            "steering": row[4],
            "gear": row[5],
            "rpm": row[6],
            "normalizedPosition": row[7],
            "lapNumber": row[8],
            "lapTime": row[9],
        }
        for row in rows
    ]


def get_session_laps_from_iceberg(session_id: str) -> list[dict]:
    """
    Fetch per-lap summary stats from Iceberg.

    Deduplication CTE same as get_lap_frames_from_iceberg.
    """
    query = """
        WITH deduped AS (
            SELECT *, ROW_NUMBER() OVER (
                PARTITION BY ts ORDER BY lap_number DESC
            ) AS rn
            FROM raw_samples
            WHERE session_id = ?
        )
        SELECT
            lap_number,
            COUNT(*) AS frame_count,
            MIN(ts) AS first_ts,
            MAX(ts) AS last_ts,
            MAX(lap_time) AS max_lap_time
        FROM deduped
        WHERE rn = 1
        GROUP BY lap_number
        ORDER BY lap_number ASC
    """
    conn = _get_connection()
    try:
        cur = conn.cursor()
        cur.execute(query, (session_id,))
        columns = [desc[0] for desc in cur.description] if cur.description else []
        rows = cur.fetchall()
    finally:
        conn.close()

    return [dict(zip(columns, row)) for row in rows]
