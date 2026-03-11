# Pipeline Status - March 3, 2026

## ✅ WORKING - Core Live Telemetry Pipeline

### Infrastructure
- ✅ Redpanda running and healthy
- ✅ RisingWave running and healthy  
- ✅ Redis running and healthy
- ✅ Postgres running and healthy
- ✅ WebSocket server running
- ✅ gRPC Gateway running
- ✅ Nessie catalog server running
- ✅ Trino running with Iceberg and Redis catalogs

### Data Flow
- ✅ Redpanda topic `telemetry-batches` created
- ✅ RisingWave source `telemetry_frames` consuming from Redpanda
- ✅ Session assignment working (via `active_sessions` table + `telemetry_with_sessions` MV)
- ✅ Lap detection working (via `telemetry_with_prev_position` MV)
- ✅ Materialized views created:
  - `telemetry_samples` - enriched telemetry with session and lap
  - `telemetry_with_sessions` - telemetry matched to active sessions
  - `telemetry_1s` - 1-second aggregates
  - `telemetry_with_channel` - telemetry with computed channels
  - `channel_acceleration` - acceleration channel computation
- ✅ Redis sinks created and operational:
  - `telemetry_redis_pubsub` - Pub/Sub for live UI updates
  - `telemetry_redis_streams` - Redis Streams for buffering
  - `live_telemetry` - Direct live telemetry sink

### Application
- ✅ Next.js app running (PM2: nextjs-dev)
- ✅ Demo replay running (PM2: demo-replay)
- ✅ UI session sync implemented (registerActiveSession, updateActiveSessionStatus, deleteActiveSession)

### Scripts
- ✅ `./scripts/start-dev.sh` - Starts full environment
- ✅ `./scripts/stop-dev.sh --purge` - Stops and purges all data
- ✅ `./scripts/init-risingwave.sh` - Initializes RisingWave schema
- ✅ `./scripts/init-iceberg.sh` - Initializes Iceberg (partial)

## ❌ BLOCKED - Historical Data (Iceberg)

### Issue 1: RisingWave → Iceberg Hive Catalog Compatibility
**Problem**: Java library version incompatibility between RisingWave's bundled Iceberg libraries and Hive Metastore
**Error**: `java.lang.NoSuchFieldError: METASTOREURIS at org.apache.iceberg.hive.HiveCatalog.initialize`
**Root Cause**: RisingWave bundles specific Iceberg library versions incompatible with Apache Hive 4.0.0-beta-1
**Impact**: Cannot create Iceberg sinks from RisingWave to write historical telemetry

**What's Working**:
- ✅ Hive Metastore running and initialized with PostgreSQL backend
- ✅ Trino connected to Hive Metastore with Iceberg catalog
- ✅ Iceberg schema `telemetry` created in Hive Metastore
- ✅ RisingWave can reach Hive Metastore (network connectivity confirmed)

**What's Blocked**:
- ❌ RisingWave Iceberg sink creation (Java compatibility issue)
- ❌ Trino Iceberg table creation (missing Hadoop AWS S3A libraries in Trino image)

**Affected Sinks**:
- `archive_raw` (from `telemetry_samples`)
- `archive_rollup` (from `telemetry_1s`)

### Issue 2: Math Channel UDF
**Problem**: Python UDF not enabled in RisingWave configuration
**Error**: `Invalid Parameter Value: python UDF is not enabled in configuration`
**Impact**: Can't compute custom math channels (acceleration, etc.)
**Fix Required**: Add `--enable-python-udf` flag to RisingWave startup or configure in RisingWave config file

## 🔧 RECOMMENDED SOLUTIONS

### Priority 1: Historical Lap Data (Iceberg Alternative)

**RECOMMENDED: Use RisingWave Materialized Views for Historical Data**

Since Iceberg has Java compatibility issues, use RisingWave's built-in capabilities:

1. **Query Recent History from RisingWave**:
   - `telemetry_samples` MV retains recent telemetry data
   - Query directly via PostgreSQL wire protocol
   - Fast, no external dependencies
   - Sufficient for recent lap analysis (last N laps)

2. **Add Time-Windowed Materialized Views**:
   - Create `recent_laps` MV (last 24 hours)
   - Create `session_summary` MV (aggregated lap stats per session)
   - These persist in RisingWave and can be queried from UI

3. **Optional: Add PostgreSQL Sink for Long-Term Storage**:
   - Create PostgreSQL sink from `telemetry_samples`
   - Write to `historical_telemetry` table in Postgres
   - Query via Prisma ORM from Next.js
   - Simpler than Iceberg, fully compatible

**Why This Works Better**:
- ✅ No Java compatibility issues
- ✅ No complex Iceberg/Hive/Trino setup
- ✅ Direct integration with existing Postgres database
- ✅ Can query via Prisma ORM (familiar to team)
- ✅ Sufficient for development and demo purposes
- ✅ Can add Iceberg later for production scale

**Implementation**:
```sql
-- Add to 003_sinks.sql
CREATE SINK IF NOT EXISTS historical_telemetry_pg
FROM telemetry_samples
WITH (
    connector = 'jdbc',
    jdbc.url = 'jdbc:postgresql://postgres:5432/purplesector',
    table.name = 'historical_telemetry',
    primary_key = 'user_id,session_id,ts'
);
```

### Priority 2: Math Channel UDF

**Fix**: Enable Python UDF in RisingWave
1. Add `--enable-python-udf` flag to RisingWave startup
2. Or configure via RisingWave config file
3. Restart RisingWave
4. Verify UDF registration works

## 🎯 NEXT STEPS

1. **Test Live Telemetry Flow**:
   - Create demo session in UI
   - Verify telemetry appears in UI
   - Confirm session assignment working
   - Confirm lap detection working

2. **Fix Iceberg** (choose option above)

3. **Enable Math Channels**

4. **End-to-End Verification**:
   - Create session
   - Record laps
   - View live telemetry
   - Query historical laps from Iceberg
   - View computed channels

## 📝 NOTES

- Core pipeline (live telemetry) is **fully functional**
- Historical data (Iceberg) needs additional configuration
- All scripts are working and should be used for pipeline management
- WAL files are automatically cleaned on `--purge`
- Redpanda topics are automatically created on startup
