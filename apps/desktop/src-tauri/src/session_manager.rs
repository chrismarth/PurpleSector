use crate::db::TelemetryDb;
use ps_telemetry_core::proto::TelemetryFrame;
use std::sync::{Arc, Mutex};
use tracing::{error, info, warn};

/// Manages active telemetry session and lap detection for the standalone app.
pub struct SessionManager {
    db: Arc<TelemetryDb>,
    state: Mutex<SessionState>,
}

struct SessionState {
    active_session_id: Option<i64>,
    current_lap_id: Option<i64>,
    current_lap_number: i32,
    last_normalized_position: f32,
    frames_in_current_lap: Vec<TelemetryFrame>,
}

impl SessionManager {
    pub fn new(db: Arc<TelemetryDb>) -> Self {
        Self {
            db,
            state: Mutex::new(SessionState {
                active_session_id: None,
                current_lap_id: None,
                current_lap_number: 0,
                last_normalized_position: 0.0,
                frames_in_current_lap: Vec::new(),
            }),
        }
    }

    /// Start a new session.
    pub fn start_session(&self, user_id: &str) -> Result<i64, String> {
        let session_id = self.db.create_session(user_id, None)
            .map_err(|e| format!("Failed to create session: {}", e))?;

        let mut state = self.state.lock().unwrap();
        state.active_session_id = Some(session_id);
        state.current_lap_number = 0;
        state.current_lap_id = None;
        state.last_normalized_position = 0.0;
        state.frames_in_current_lap.clear();

        info!("Started session {}", session_id);
        Ok(session_id)
    }

    /// End the active session.
    pub fn end_session(&self) -> Result<(), String> {
        let mut state = self.state.lock().unwrap();
        
        if let Some(session_id) = state.active_session_id {
            // Save any remaining frames from the current lap
            if !state.frames_in_current_lap.is_empty() {
                self.save_current_lap(&mut state)?;
            }

            self.db.end_session(session_id)
                .map_err(|e| format!("Failed to end session: {}", e))?;

            info!("Ended session {}", session_id);
            state.active_session_id = None;
            state.current_lap_id = None;
            state.current_lap_number = 0;
            state.frames_in_current_lap.clear();
        }

        Ok(())
    }

    /// Process a telemetry frame. Detects lap boundaries and persists data.
    pub fn process_frame(&self, frame: &TelemetryFrame) -> Result<(), String> {
        let mut state = self.state.lock().unwrap();

        let session_id = match state.active_session_id {
            Some(id) => id,
            None => {
                warn!("Received frame but no active session");
                return Ok(());
            }
        };

        // Detect lap boundary: normalized_position wraps from ~1.0 to ~0.0
        let lap_completed = state.last_normalized_position > 0.9 
            && frame.normalized_position < 0.1
            && state.current_lap_number > 0;

        if lap_completed {
            // Save the completed lap
            self.save_current_lap(&mut state)?;

            // Start new lap
            state.current_lap_number += 1;
            state.frames_in_current_lap.clear();
            
            let lap_id = self.db.create_lap(session_id, state.current_lap_number)
                .map_err(|e| format!("Failed to create lap: {}", e))?;
            
            state.current_lap_id = Some(lap_id);
            info!("Started lap {} (id={})", state.current_lap_number, lap_id);
        } else if state.current_lap_number == 0 {
            // First frame — start lap 1
            state.current_lap_number = 1;
            let lap_id = self.db.create_lap(session_id, 1)
                .map_err(|e| format!("Failed to create lap: {}", e))?;
            state.current_lap_id = Some(lap_id);
            info!("Started lap 1 (id={})", lap_id);
        }

        // Store frame in memory for lap completion
        state.frames_in_current_lap.push(frame.clone());
        state.last_normalized_position = frame.normalized_position;

        // Persist frame to DB
        self.db.insert_frame(
            session_id,
            state.current_lap_id,
            frame.timestamp,
            frame.speed,
            frame.throttle,
            frame.brake,
            frame.steering,
            frame.gear,
            frame.rpm,
            frame.normalized_position,
            frame.lap_number,
            frame.lap_time,
            frame.session_time,
            frame.session_type,
            frame.track_position,
            frame.delta,
        ).map_err(|e| format!("Failed to insert frame: {}", e))?;

        Ok(())
    }

    /// Save the current lap (update lap time).
    fn save_current_lap(&self, state: &mut SessionState) -> Result<(), String> {
        if let Some(lap_id) = state.current_lap_id {
            if let Some(last_frame) = state.frames_in_current_lap.last() {
                let lap_time = last_frame.lap_time;
                let is_valid = true; // TODO: Add invalidation logic (off-track, etc.)

                self.db.update_lap_time(lap_id, lap_time, is_valid)
                    .map_err(|e| format!("Failed to update lap time: {}", e))?;

                info!("Completed lap {} with time {}ms", state.current_lap_number, lap_time);
            }
        }
        Ok(())
    }

    /// Get the active session ID.
    pub fn active_session_id(&self) -> Option<i64> {
        self.state.lock().unwrap().active_session_id
    }
}
