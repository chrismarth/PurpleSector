import { Trino, BasicAuth } from 'trino-client';

const TRINO_HOST = process.env.TRINO_HOST || 'localhost';
const TRINO_PORT = parseInt(process.env.TRINO_PORT || '8083', 10);
const TRINO_USER = process.env.TRINO_USER || 'trino';
const TRINO_CATALOG = process.env.TRINO_CATALOG || 'iceberg';
const TRINO_SCHEMA = process.env.TRINO_SCHEMA || 'telemetry';

export interface TrinoQueryOptions {
  catalog?: string;
  schema?: string;
}

export async function executeTrinoQuery<T = any>(
  query: string,
  options: TrinoQueryOptions = {}
): Promise<T[]> {
  const trino = Trino.create({
    server: `http://${TRINO_HOST}:${TRINO_PORT}`,
    catalog: options.catalog || TRINO_CATALOG,
    schema: options.schema || TRINO_SCHEMA,
    auth: new BasicAuth(TRINO_USER),
  });

  const iter = await trino.query(query);
  const results: T[] = [];
  for await (const chunk of iter) {
    if (chunk.data) {
      results.push(...(chunk.data as T[]));
    }
  }
  return results;
}

export async function isTrinoAvailable(): Promise<boolean> {
  try {
    await executeTrinoQuery('SELECT 1');
    return true;
  } catch (error) {
    console.error('Trino not available:', error);
    return false;
  }
}

export async function getLapFramesFromIceberg(
  userId: string,
  sessionId: string,
  lapNumber: number
): Promise<any[]> {
  // Filter by session_id (globally unique CUID) + lap_number only.
  // user_id is NOT used because the raw telemetry user_id (e.g. '__demo__')
  // may differ from the authenticated userId stored in Prisma.
  // Deduplicate: the force_append_only Iceberg sink accumulates re-emitted
  // frames with wrong lap_numbers when RisingWave watermark GC drops lap-
  // boundary frames and triggers SUM() OVER() recomputation.  For each
  // unique (session_id, ts) the row with MAX lap_number is the original
  // (correct) emission — re-emissions always decrement lap_number.
  const query = `
    WITH deduped AS (
      SELECT *, ROW_NUMBER() OVER (
        PARTITION BY ts ORDER BY lap_number DESC
      ) AS rn
      FROM raw_samples
      WHERE session_id = '${sessionId}'
    )
    SELECT ts, speed, throttle, brake, steering, gear, rpm,
           normalized_position, lap_number, lap_time
    FROM deduped
    WHERE rn = 1 AND lap_number = ${lapNumber}
    ORDER BY ts ASC
  `;

  const rows = await executeTrinoQuery<any>(query);
  
  // Map Iceberg columns to TelemetryFrame format expected by the app
  return rows.map(row => ({
    timestamp: new Date(row[0]).getTime(),
    speed: row[1],
    throttle: row[2],
    brake: row[3],
    steering: row[4],
    gear: row[5],
    rpm: row[6],
    normalizedPosition: row[7],
    lapNumber: row[8],
    lapTime: row[9],
  }));
}

export async function getSessionLapsFromIceberg(
  userId: string,
  sessionId: string
): Promise<{ lapNumber: number; frameCount: number }[]> {
  const query = `
    WITH deduped AS (
      SELECT *, ROW_NUMBER() OVER (
        PARTITION BY ts ORDER BY lap_number DESC
      ) AS rn
      FROM raw_samples
      WHERE session_id = '${sessionId}'
    )
    SELECT lap_number, COUNT(*) as frame_count
    FROM deduped
    WHERE rn = 1
    GROUP BY lap_number
    ORDER BY lap_number ASC
  `;

  const rows = await executeTrinoQuery<any>(query);
  
  return rows.map(row => ({
    lapNumber: row[0],
    frameCount: row[1],
  }));
}

