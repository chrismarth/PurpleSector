use rusqlite::{Connection, Result as SqliteResult};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tracing::{error, info};

/// Telemetry database for the standalone desktop app.
/// Stores sessions, laps, and telemetry frames in SQLite.
pub struct TelemetryDb {
    conn: Arc<Mutex<Connection>>,
}

impl TelemetryDb {
    /// Initialize the telemetry database at the given path.
    /// Creates tables if they don't exist.
    pub fn new(db_path: PathBuf) -> SqliteResult<Self> {
        let conn = Connection::open(&db_path)?;
        
        info!("Opened telemetry database at {}", db_path.display());
        
        // Create schema
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS sessions (
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

            CREATE TABLE IF NOT EXISTS laps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                lap_number INTEGER NOT NULL,
                lap_time INTEGER,
                is_valid INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_laps_session ON laps(session_id);

            CREATE TABLE IF NOT EXISTS telemetry_frames (
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

            CREATE INDEX IF NOT EXISTS idx_frames_session ON telemetry_frames(session_id);
            CREATE INDEX IF NOT EXISTS idx_frames_lap ON telemetry_frames(lap_id);
            "#,
        )?;

        info!("Telemetry database schema initialized");

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    /// Create a new session.
    pub fn create_session(&self, user_id: &str, event_id: Option<i64>) -> SqliteResult<i64> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();
        
        conn.execute(
            "INSERT INTO sessions (user_id, event_id, status, created_at, updated_at) VALUES (?1, ?2, 'active', ?3, ?3)",
            rusqlite::params![user_id, event_id, now],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Update session metadata (track, car, timestamps).
    pub fn update_session(
        &self,
        session_id: i64,
        track: Option<&str>,
        car: Option<&str>,
        started: Option<i64>,
        ended: Option<i64>,
    ) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE sessions SET track = COALESCE(?1, track), car = COALESCE(?2, car), 
             started = COALESCE(?3, started), ended = COALESCE(?4, ended), updated_at = ?5 
             WHERE id = ?6",
            rusqlite::params![track, car, started, ended, now, session_id],
        )?;

        Ok(())
    }

    /// End a session (set status to 'completed' and ended timestamp).
    pub fn end_session(&self, session_id: i64) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE sessions SET status = 'completed', ended = ?1, updated_at = ?1 WHERE id = ?2",
            rusqlite::params![now, session_id],
        )?;

        Ok(())
    }

    /// Create a new lap.
    pub fn create_lap(&self, session_id: i64, lap_number: i32) -> SqliteResult<i64> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO laps (session_id, lap_number, created_at) VALUES (?1, ?2, ?3)",
            rusqlite::params![session_id, lap_number, now],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Update lap time when lap is completed.
    pub fn update_lap_time(&self, lap_id: i64, lap_time: i32, is_valid: bool) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "UPDATE laps SET lap_time = ?1, is_valid = ?2 WHERE id = ?3",
            rusqlite::params![lap_time, is_valid as i32, lap_id],
        )?;

        Ok(())
    }

    /// Insert a telemetry frame.
    pub fn insert_frame(
        &self,
        session_id: i64,
        lap_id: Option<i64>,
        timestamp: i64,
        speed: f32,
        throttle: f32,
        brake: f32,
        steering: f32,
        gear: i32,
        rpm: i32,
        normalized_position: f32,
        lap_number: i32,
        lap_time: i32,
        session_time: Option<f32>,
        session_type: Option<i32>,
        track_position: Option<i32>,
        delta: Option<i32>,
    ) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "INSERT INTO telemetry_frames (
                session_id, lap_id, timestamp, speed, throttle, brake, steering, gear, rpm,
                normalized_position, lap_number, lap_time, session_time, session_type,
                track_position, delta
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
            rusqlite::params![
                session_id,
                lap_id,
                timestamp,
                speed,
                throttle,
                brake,
                steering,
                gear,
                rpm,
                normalized_position,
                lap_number,
                lap_time,
                session_time,
                session_type,
                track_position,
                delta,
            ],
        )?;

        Ok(())
    }

    /// Get all sessions for a user.
    pub fn get_sessions(&self, user_id: &str) -> SqliteResult<Vec<SessionRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, user_id, event_id, status, started, ended, track, car, created_at, updated_at 
             FROM sessions WHERE user_id = ?1 ORDER BY created_at DESC"
        )?;

        let sessions = stmt.query_map([user_id], |row| {
            Ok(SessionRecord {
                id: row.get(0)?,
                user_id: row.get(1)?,
                event_id: row.get(2)?,
                status: row.get(3)?,
                started: row.get(4)?,
                ended: row.get(5)?,
                track: row.get(6)?,
                car: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(sessions)
    }

    /// Get laps for a session.
    pub fn get_laps(&self, session_id: i64) -> SqliteResult<Vec<LapRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, session_id, lap_number, lap_time, is_valid, created_at 
             FROM laps WHERE session_id = ?1 ORDER BY lap_number ASC"
        )?;

        let laps = stmt.query_map([session_id], |row| {
            Ok(LapRecord {
                id: row.get(0)?,
                session_id: row.get(1)?,
                lap_number: row.get(2)?,
                lap_time: row.get(3)?,
                is_valid: row.get::<_, i32>(4)? != 0,
                created_at: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(laps)
    }

    /// Get telemetry frames for a lap.
    pub fn get_lap_frames(&self, lap_id: i64) -> SqliteResult<Vec<TelemetryFrameRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT timestamp, speed, throttle, brake, steering, gear, rpm, 
             normalized_position, lap_number, lap_time, session_time, session_type, 
             track_position, delta 
             FROM telemetry_frames WHERE lap_id = ?1 ORDER BY timestamp ASC"
        )?;

        let frames = stmt.query_map([lap_id], |row| {
            Ok(TelemetryFrameRecord {
                timestamp: row.get(0)?,
                speed: row.get(1)?,
                throttle: row.get(2)?,
                brake: row.get(3)?,
                steering: row.get(4)?,
                gear: row.get(5)?,
                rpm: row.get(6)?,
                normalized_position: row.get(7)?,
                lap_number: row.get(8)?,
                lap_time: row.get(9)?,
                session_time: row.get(10)?,
                session_type: row.get(11)?,
                track_position: row.get(12)?,
                delta: row.get(13)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(frames)
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct SessionRecord {
    pub id: i64,
    pub user_id: String,
    pub event_id: Option<i64>,
    pub status: String,
    pub started: Option<i64>,
    pub ended: Option<i64>,
    pub track: Option<String>,
    pub car: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct LapRecord {
    pub id: i64,
    pub session_id: i64,
    pub lap_number: i32,
    pub lap_time: Option<i32>,
    pub is_valid: bool,
    pub created_at: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TelemetryFrameRecord {
    pub timestamp: i64,
    pub speed: f32,
    pub throttle: f32,
    pub brake: f32,
    pub steering: f32,
    pub gear: i32,
    pub rpm: i32,
    pub normalized_position: f32,
    pub lap_number: i32,
    pub lap_time: i32,
    pub session_time: Option<f32>,
    pub session_type: Option<i32>,
    pub track_position: Option<i32>,
    pub delta: Option<i32>,
}
