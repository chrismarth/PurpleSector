//! Demo telemetry source — replays pre-recorded JSON data at a configurable rate.
//!
//! Reads the PurpleSector demo telemetry JSON format:
//!
//! ```json
//! {
//!   "laps": [
//!     { "lapNumber": 1, "lapTime": 30000, "frames": [ { "throttle": 1, ... }, ... ] }
//!   ]
//! }
//! ```
//!
//! Frames are flattened across laps and emitted sequentially. When all frames
//! have been played, the source either loops back to the start or signals
//! `CaptureError::Stopped` depending on configuration.

use std::path::PathBuf;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use tracing::{debug, info};

use super::{CaptureError, TelemetrySource};
use crate::proto::purplesector::TelemetryFrame;

/// Configuration for the demo replay source.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DemoConfig {
    /// Path to the demo JSON file.
    pub file_path: PathBuf,
    /// Playback rate in Hz (default 60).
    pub rate_hz: u32,
    /// Whether to loop continuously (default true).
    pub loop_playback: bool,
}

impl Default for DemoConfig {
    fn default() -> Self {
        Self {
            file_path: PathBuf::from("collectors/demo-data/demo-telemetry.json"),
            rate_hz: 60,
            loop_playback: true,
        }
    }
}

/// Demo telemetry source that replays frames from a JSON file.
pub struct DemoSource {
    config: DemoConfig,
    frames: Vec<TelemetryFrame>,
    index: usize,
    frame_interval: Duration,
    last_emit: Option<Instant>,
    started: bool,
    loop_count: i32,
    max_lap_in_data: i32,
}

impl DemoSource {
    pub fn new(config: DemoConfig) -> Self {
        let frame_interval = Duration::from_micros(1_000_000 / config.rate_hz.max(1) as u64);
        Self {
            config,
            frames: Vec::new(),
            index: 0,
            frame_interval,
            last_emit: None,
            started: false,
            loop_count: 0,
            max_lap_in_data: 0,
        }
    }

    /// Load and parse the demo JSON file into a flat list of TelemetryFrames.
    fn load_frames(path: &PathBuf) -> Result<Vec<TelemetryFrame>, CaptureError> {
        let data = std::fs::read_to_string(path).map_err(|e| {
            CaptureError::Io(std::io::Error::new(
                e.kind(),
                format!("Failed to read demo file {}: {e}", path.display()),
            ))
        })?;

        let json: serde_json::Value = serde_json::from_str(&data).map_err(|e| {
            CaptureError::Io(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Failed to parse demo JSON: {e}"),
            ))
        })?;

        let mut frames = Vec::new();

        // Support both formats:
        // 1. { "laps": [ { "frames": [...] } ] }  (nested)
        // 2. [ { ... }, { ... } ]                   (flat array)
        if let Some(laps) = json.get("laps").and_then(|v| v.as_array()) {
            for lap in laps {
                if let Some(lap_frames) = lap.get("frames").and_then(|v| v.as_array()) {
                    for f in lap_frames {
                        frames.push(Self::parse_frame(f));
                    }
                }
            }
        } else if let Some(arr) = json.as_array() {
            for f in arr {
                frames.push(Self::parse_frame(f));
            }
        } else {
            return Err(CaptureError::Io(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Demo JSON must be { \"laps\": [...] } or a flat array of frames",
            )));
        }

        Ok(frames)
    }

    /// Parse a single JSON value into a TelemetryFrame.
    fn parse_frame(v: &serde_json::Value) -> TelemetryFrame {
        TelemetryFrame {
            timestamp: v["timestamp"].as_i64().unwrap_or(0),
            speed: v["speed"].as_f64().unwrap_or(0.0) as f32,
            throttle: v["throttle"].as_f64().unwrap_or(0.0) as f32,
            brake: v["brake"].as_f64().unwrap_or(0.0) as f32,
            steering: v["steering"].as_f64().unwrap_or(0.0) as f32,
            gear: v["gear"].as_i64().unwrap_or(0) as i32,
            rpm: v["rpm"].as_f64().unwrap_or(0.0) as i32,
            normalized_position: v["normalizedPosition"].as_f64().unwrap_or(0.0) as f32,
            lap_number: v["lapNumber"].as_i64().unwrap_or(0) as i32,
            lap_time: v["lapTime"].as_f64().unwrap_or(0.0) as i32,
            session_time: v["sessionTime"].as_f64().map(|x| x as f32),
            session_type: v["sessionType"].as_i64().map(|x| x as i32),
            track_position: v["trackPosition"].as_i64().map(|x| x as i32),
            delta: v["delta"].as_i64().map(|x| x as i32),
        }
    }

    fn now_ms() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64
    }
}

#[async_trait::async_trait]
impl TelemetrySource for DemoSource {
    async fn start(&mut self) -> Result<(), CaptureError> {
        info!("Loading demo data from {}", self.config.file_path.display());
        self.frames = Self::load_frames(&self.config.file_path)?;

        if self.frames.is_empty() {
            return Err(CaptureError::Io(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Demo file contains no frames",
            )));
        }

        // Find the maximum lap number in the data
        self.max_lap_in_data = self.frames.iter()
            .map(|f| f.lap_number)
            .max()
            .unwrap_or(0);

        self.index = 0;
        self.loop_count = 0;
        self.started = true;
        info!(
            "Demo source ready: {} frames, {}Hz, loop={}, max_lap={}",
            self.frames.len(),
            self.config.rate_hz,
            self.config.loop_playback,
            self.max_lap_in_data,
        );
        Ok(())
    }

    async fn next_sample(&mut self) -> Result<TelemetryFrame, CaptureError> {
        if !self.started || self.frames.is_empty() {
            return Err(CaptureError::Stopped);
        }

        // Pace the output to the configured rate
        if let Some(last) = self.last_emit {
            let elapsed = last.elapsed();
            if elapsed < self.frame_interval {
                tokio::time::sleep(self.frame_interval - elapsed).await;
            }
        }
        self.last_emit = Some(Instant::now());

        if self.index >= self.frames.len() {
            if self.config.loop_playback {
                self.loop_count += 1;
                debug!("Demo replay looping back to start (loop {})", self.loop_count);
                self.index = 0;
            } else {
                info!("Demo replay finished ({} frames)", self.frames.len());
                return Err(CaptureError::Stopped);
            }
        }

        // Clone the frame and stamp with current time
        let mut frame = self.frames[self.index].clone();
        frame.timestamp = Self::now_ms();
        
        // Don't modify lap numbers - each session should have laps 1-5
        // Session boundaries are handled by the demo replay creating new session IDs
        
        self.index += 1;

        if self.index % 600 == 0 {
            debug!(
                "Demo playback progress: frame {}/{}",
                self.index,
                self.frames.len()
            );
        }

        Ok(frame)
    }

    async fn stop(&mut self) -> Result<(), CaptureError> {
        self.started = false;
        info!("Demo source stopped at frame {}/{}", self.index, self.frames.len());
        Ok(())
    }

    fn name(&self) -> &str {
        "Demo Replay"
    }

    fn source_rate_hz(&self) -> u32 {
        self.config.rate_hz
    }
}
