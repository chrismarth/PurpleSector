# Iceberg Integration - Lap Telemetry Storage

## Overview

Successfully migrated lap telemetry data storage from PostgreSQL to Apache Iceberg, with Trino as the query engine. This creates a clean separation of concerns:

- **PostgreSQL**: Stores lap metadata (lap number, lap time, analysis results, comments, tags)
- **Iceberg**: Stores raw telemetry data (speed, throttle, brake, steering, etc.)
- **Trino**: Query engine for retrieving telemetry data from Iceberg
- **LakeKeeper**: REST catalog for Iceberg metadata management

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Data Flow                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Telemetry Capture                                              │
│       ↓                                                          │
│  gRPC Gateway → Redpanda → RisingWave → Iceberg (via LakeKeeper)│
│                                         ↓                        │
│                                    MinIO (S3)                    │
│                                                                  │
│  Lap Metadata                                                   │
│       ↓                                                          │
│  Web API → PostgreSQL (Prisma)                                  │
│                                                                  │
│  Lap Retrieval                                                  │
│       ↓                                                          │
│  Web API → Trino → LakeKeeper → Iceberg → MinIO                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Trino Client Integration

**Package**: `trino-client` (installed in `apps/web`)

**Utility**: `apps/web/src/lib/trino.ts`
- `executeTrinoQuery()` - Execute SQL queries against Trino
- `isTrinoAvailable()` - Check Trino connectivity
- `getLapFramesFromIceberg()` - Fetch telemetry frames for a specific lap
- `getSessionLapsFromIceberg()` - Get lap summary for a session

**Configuration** (Environment Variables):
```bash
TRINO_HOST=localhost
TRINO_PORT=8083
TRINO_USER=trino
TRINO_CATALOG=iceberg
TRINO_SCHEMA=telemetry
```

### 2. API Endpoints

#### GET `/api/laps/[id]/frames`
Fetches telemetry frames for a lap from Iceberg via Trino.

**Response**:
```json
{
  "frames": [
    {
      "timestamp": 1234567890,
      "speed": 120.5,
      "throttle": 0.85,
      "brake": 0.0,
      "steering": -0.15,
      "gear": 4,
      "rpm": 7500,
      "normalizedPosition": 0.25,
      "lapNumber": 1,
      "lapTime": 45.2
    }
  ]
}
```

**Error Handling**:
- 401: Unauthorized
- 404: Lap not found or no telemetry data
- 503: Trino unavailable

#### POST `/api/laps`
Creates lap metadata only - telemetry data flows through the pipeline.

**Changes**:
- Removed `telemetryData` field from database write
- Still accepts `telemetryData` in request body for lap time calculation
- Telemetry data is sent to Redpanda separately and flows to Iceberg

### 3. Updated API Endpoints

All endpoints that previously parsed `lap.telemetryData` now fetch from Iceberg:

**`/api/laps/[id]/analyze`**
- Fetches telemetry via `getLapFramesFromIceberg()`
- Fetches reference lap telemetry from Iceberg
- Returns 404 if no telemetry data available

**`/api/chat`**
- Fetches current lap telemetry from Iceberg
- Fetches fastest lap telemetry for comparison
- Returns 404 if no telemetry data available

### 4. Frontend Updates

**`apps/web/src/app/lap/[id]/page.tsx`**
- Fetches lap metadata from `/api/laps/[id]`
- Fetches telemetry frames from `/api/laps/[id]/frames`
- Handles missing telemetry gracefully (shows warning, empty array)

**Comparison Lap Loading**:
- Also uses frames endpoint for comparison lap data
- Consistent error handling across all lap data fetching

### 5. Database Schema Changes

**Before**:
```prisma
model Lap {
  id              String   @id @default(cuid())
  userId          String
  sessionId       String
  lapNumber       Int
  lapTime         Float?
  telemetryData   String   // ← Removed
  analyzed        Boolean  @default(false)
  suggestions     String?
  driverComments  String?
  tags            String?
  plotConfigs     String?
  createdAt       DateTime @default(now())
  ...
}
```

**After**:
```prisma
model Lap {
  id              String   @id @default(cuid())
  userId          String
  sessionId       String
  lapNumber       Int
  lapTime         Float?
  // telemetryData removed - now stored in Iceberg
  analyzed        Boolean  @default(false)
  suggestions     String?
  driverComments  String?
  tags            String?
  plotConfigs     String?
  createdAt       DateTime @default(now())
  ...
}
```

## Data Mapping

### Iceberg Schema → TelemetryFrame

The Trino utility maps Iceberg columns to the application's `TelemetryFrame` interface:

**Iceberg Columns** (snake_case):
- `ts` (TIMESTAMP)
- `speed` (REAL)
- `throttle` (REAL)
- `brake` (REAL)
- `steering` (REAL)
- `gear` (INTEGER)
- `rpm` (INTEGER)
- `normalized_position` (REAL)
- `lap_number` (BIGINT)
- `lap_time` (REAL)
- `session_id` (VARCHAR)

**Application Format** (camelCase):
```typescript
{
  timestamp: number,        // Unix timestamp in milliseconds
  speed: number,
  throttle: number,
  brake: number,
  steering: number,
  gear: number,
  rpm: number,
  normalizedPosition: number,
  lapNumber: number,
  lapTime: number
}
```

## Query Examples

### Fetch Lap Frames
```sql
SELECT 
  ts,
  speed,
  throttle,
  brake,
  steering,
  gear,
  rpm,
  normalized_position,
  lap_number,
  lap_time
FROM iceberg.telemetry.raw_samples
WHERE session_id = 'session456'
  AND lap_number = 1
ORDER BY ts ASC
```

### Get Session Lap Summary
```sql
SELECT 
  lap_number,
  COUNT(*) as frame_count
FROM iceberg.telemetry.raw_samples
WHERE session_id = 'session456'
GROUP BY lap_number
ORDER BY lap_number ASC
```

## Benefits

### 1. Scalability
- Telemetry data no longer bloats PostgreSQL
- Iceberg handles large-scale time-series data efficiently
- Columnar storage optimized for analytical queries

### 2. Performance
- PostgreSQL focused on transactional metadata
- Trino optimized for analytical queries on telemetry
- Separation of concerns improves both systems

### 3. Cost Efficiency
- S3-compatible storage (MinIO) is cheaper than PostgreSQL storage
- Iceberg's compression reduces storage costs
- Can archive old data to cold storage

### 4. Data Lake Architecture
- Foundation for advanced analytics
- Easy integration with data science tools
- Historical data readily available for ML training

## Migration Notes

### Existing Laps
Existing laps in the database still have `telemetryData` in PostgreSQL. Options:

1. **Leave as-is**: Old laps continue to work (would need fallback logic)
2. **Backfill**: Migrate existing telemetry to Iceberg (recommended for production)
3. **Archive**: Mark old laps as archived, only new laps use Iceberg

### Backward Compatibility
The current implementation does NOT support fallback to PostgreSQL. All laps must have telemetry data in Iceberg to be viewable.

For a production migration, consider:
```typescript
// Hybrid approach (not implemented)
async function getLapFrames(lapId: string) {
  // Try Iceberg first
  const icebergFrames = await getLapFramesFromIceberg(...);
  if (icebergFrames.length > 0) {
    return icebergFrames;
  }
  
  // Fallback to PostgreSQL for old laps
  const lap = await prisma.lap.findUnique({ where: { id: lapId } });
  if (lap?.telemetryData) {
    return JSON.parse(lap.telemetryData);
  }
  
  throw new Error('No telemetry data found');
}
```

## Testing

### Verify Trino Connectivity
```bash
docker exec ps-trino trino --execute "SELECT 1;"
```

### Check Iceberg Tables
```bash
docker exec ps-trino trino --execute "SHOW TABLES IN iceberg.telemetry;"
```

### Query Sample Data
```bash
docker exec ps-trino trino --execute "
  SELECT COUNT(*) as total_frames 
  FROM iceberg.telemetry.raw_samples;
"
```

### Test API Endpoint
```bash
# Assuming a lap exists with ID 'lap123'
curl http://localhost:3000/api/laps/lap123/frames
```

## Troubleshooting

### "Telemetry data storage unavailable"
- Check Trino is running: `docker ps | grep trino`
- Check Trino logs: `docker logs ps-trino`
- Verify Trino connectivity: `curl http://localhost:8083/v1/info`

### "No telemetry data found for this lap"
- Verify data exists in Iceberg: `SELECT * FROM iceberg.telemetry.raw_samples WHERE lap_number = X`
- Check RisingWave sinks are running
- Verify telemetry data flowed through the pipeline

### TypeScript Errors
- Ensure `trino-client` is installed: `cd apps/web && npm install`
- Regenerate Prisma client: `cd packages/db-prisma && npx prisma generate`
- Check type mappings in `apps/web/src/lib/trino.ts`

## Next Steps

1. **Test End-to-End**: Run demo telemetry through the pipeline and verify retrieval
2. **Performance Tuning**: Optimize Trino queries, add indexes if needed
3. **Monitoring**: Add metrics for Trino query performance
4. **Backfill**: Migrate existing laps from PostgreSQL to Iceberg
5. **Cleanup**: Remove `telemetryData` column from database after migration

## Related Documentation

- `LAKEKEEPER_SUCCESS.md` - LakeKeeper REST catalog setup
- `docs/CLOUD_PIPELINE.md` - Overall cloud architecture
- `infra/risingwave/003_sinks.sql` - Iceberg sink definitions
- `infra/trino/catalog/iceberg.properties` - Trino Iceberg configuration
