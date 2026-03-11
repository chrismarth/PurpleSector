# Standalone App Database Architecture

## Overview

The Purple Sector standalone (Tauri desktop) app uses a **separate SQLite database** for telemetry data persistence, distinct from the cloud pipeline's Iceberg storage and the metadata Prisma database.

## Architecture

### Data Flow

```
Sim Game (AC/ACC)
    │ UDP / Shared Memory
    ▼
ps-telemetry-core (Rust capture)
    │
    ├─→ Tauri Events ──→ Next.js UI (live display)
    │
    └─→ SessionManager ──→ SQLite (telemetry.db)
                            ├── sessions
                            ├── laps
                            └── telemetry_frames
                                  ↑
                            Tauri Commands
                                  ↓
                            Next.js API Abstraction
                                  ↓
                            React Components
```

### Database Location

- **Path:** `~/.local/share/purple-sector-desktop/telemetry.db` (Linux)
- **Path:** `~/Library/Application Support/purple-sector-desktop/telemetry.db` (macOS)
- **Path:** `%APPDATA%\purple-sector-desktop\telemetry.db` (Windows)

## Database Schema

### `sessions` Table

Stores telemetry capture sessions.

```sql
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    event_id INTEGER,
    status TEXT NOT NULL DEFAULT 'active',
    started INTEGER,
    ended INTEGER,
    track TEXT,
    car TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

### `laps` Table

Stores individual laps within sessions.

```sql
CREATE TABLE laps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    lap_number INTEGER NOT NULL,
    lap_time INTEGER,
    is_valid INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_laps_session ON laps(session_id);
```

### `telemetry_frames` Table

Stores raw telemetry frames (60Hz data).

```sql
CREATE TABLE telemetry_frames (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    lap_id INTEGER,
    timestamp INTEGER NOT NULL,
    speed REAL NOT NULL,
    throttle REAL NOT NULL,
    brake REAL NOT NULL,
    steering REAL NOT NULL,
    gear INTEGER NOT NULL,
    rpm INTEGER NOT NULL,
    normalized_position REAL NOT NULL,
    lap_number INTEGER NOT NULL,
    lap_time INTEGER NOT NULL,
    session_time REAL,
    session_type INTEGER,
    track_position INTEGER,
    delta INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (lap_id) REFERENCES laps(id) ON DELETE SET NULL
);

CREATE INDEX idx_frames_session ON telemetry_frames(session_id);
CREATE INDEX idx_frames_lap ON telemetry_frames(lap_id);
```

## Rust Implementation

### Core Modules

1. **`db.rs`** - SQLite database interface
   - `TelemetryDb::new()` - Initialize database
   - `create_session()`, `update_session()`, `end_session()`
   - `create_lap()`, `update_lap_time()`
   - `insert_frame()`
   - Query methods: `get_sessions()`, `get_laps()`, `get_lap_frames()`

2. **`session_manager.rs`** - Session and lap management
   - `start_session()` - Create new session
   - `end_session()` - Complete session
   - `process_frame()` - Handle incoming telemetry, detect lap boundaries
   - Automatic lap detection via `normalized_position` wrapping

### Tauri Commands

Exposed to Next.js via Tauri's IPC:

```rust
#[tauri::command]
fn start_session(app_state: tauri::State<'_, AppState>) -> Result<i64, String>

#[tauri::command]
fn end_session(app_state: tauri::State<'_, AppState>) -> Result<(), String>

#[tauri::command]
fn get_sessions(app_state: tauri::State<'_, AppState>) -> Result<Vec<SessionRecord>, String>

#[tauri::command]
fn get_laps(app_state: tauri::State<'_, AppState>, session_id: i64) -> Result<Vec<LapRecord>, String>

#[tauri::command]
fn get_lap_frames(app_state: tauri::State<'_, AppState>, lap_id: i64) -> Result<Vec<TelemetryFrameRecord>, String>
```

## Next.js Integration

### API Abstraction Layer

**`apps/web/src/lib/session-api.ts`** provides a unified interface that works in both cloud and desktop modes:

```typescript
import { SessionAPI } from '@/lib/session-api';

// Works in both cloud and desktop
const sessions = await SessionAPI.getSessions();
const laps = await SessionAPI.getLaps(sessionId);
const frames = await SessionAPI.getLapFrames(lapId);
```

### Environment Detection

```typescript
import { isTauriApp } from '@/lib/tauri-api';

if (isTauriApp()) {
  // Desktop mode - use Tauri commands
} else {
  // Cloud mode - use Next.js API routes
}
```

## Lap Detection Algorithm

Laps are automatically detected by monitoring `normalized_position`:

1. **Lap Start:** `normalized_position` wraps from ~1.0 → ~0.0
2. **Threshold:** `last_position > 0.9 && current_position < 0.1`
3. **Lap Completion:** Save frames, update lap time, start new lap

## Data Persistence Flow

1. **Capture Thread** receives telemetry frame from `TelemetrySource`
2. **Emit Tauri Event** → Next.js UI for live display
3. **SessionManager.process_frame()** → Detect lap boundaries
4. **TelemetryDb.insert_frame()** → Persist to SQLite
5. **On Lap Completion** → Update lap time in `laps` table

## Comparison: Cloud vs Standalone

| Feature | Cloud Pipeline | Standalone App |
|---------|---------------|----------------|
| **Telemetry Storage** | Iceberg (MinIO) | SQLite |
| **Metadata DB** | Prisma (Postgres) | Prisma (SQLite) |
| **Telemetry Persistence** | RisingWave → Redis | Rust → SQLite |
| **Math Channels** | RisingWave MVs + Python UDF | Client-side (mathjs) |
| **Session Management** | Next.js API routes | Tauri commands |
| **Lap Detection** | RisingWave SQL | Rust (SessionManager) |
| **Query Interface** | Redis Streams → WebSocket | Tauri commands |

## Usage Example

### Starting a Session

```typescript
// Frontend code (works in both modes)
import { SessionAPI } from '@/lib/session-api';

const session = await SessionAPI.createSession({
  name: 'Practice Session',
  source: 'ac',
});

// Telemetry automatically persists as it's captured
```

### Querying Laps

```typescript
const laps = await SessionAPI.getLaps(session.id);

for (const lap of laps) {
  const frames = await SessionAPI.getLapFrames(lap.id);
  console.log(`Lap ${lap.lapNumber}: ${lap.lapTime}ms, ${frames.length} frames`);
}
```

### Ending a Session

```typescript
await SessionAPI.endSession(session.id);
```

## Performance Considerations

- **Frame Rate:** 60 Hz (60 frames/second)
- **Storage:** ~200 bytes/frame → ~12 KB/second → ~720 KB/minute
- **10-minute session:** ~7.2 MB
- **100 laps:** ~720 MB (assuming 1-minute laps)
- **Indexes:** Optimized for session and lap queries

## Future Enhancements

- [ ] Periodic vacuum/cleanup of old sessions
- [ ] Export sessions to cloud for backup
- [ ] Compression for archived sessions
- [ ] Incremental sync with cloud storage
- [ ] Math channel caching in SQLite
