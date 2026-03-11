#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod session_manager;

use std::{
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
};
use tauri::{
    menu::{MenuBuilder, SubmenuBuilder},
    Emitter,
    Manager,
    WindowEvent,
};
use tokio::sync::mpsc;
use tracing::{error, info};

use ps_telemetry_core::capture::{CaptureConfig, CaptureError, TelemetrySource};
use ps_telemetry_core::capture::ac::AcSource;
use ps_telemetry_core::capture::demo::{DemoConfig, DemoSource};

use crate::db::TelemetryDb;
use crate::session_manager::SessionManager;

/// Telemetry frame payload emitted as a Tauri event for the embedded UI.
/// Matches the JSON shape the existing WebSocket protocol uses.
#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct TelemetryEvent {
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
    #[serde(skip_serializing_if = "Option::is_none")]
    session_time: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    session_type: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    track_position: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    delta: Option<i32>,
}

/// Capture status exposed as a Tauri command.
#[derive(Clone, serde::Serialize)]
struct CaptureStatus {
    running: bool,
    source_name: String,
    frames_captured: u64,
}

/// Shared capture state accessible from Tauri commands.
struct CaptureState {
    status: Mutex<CaptureStatus>,
    shutdown_tx: Mutex<Option<mpsc::Sender<()>>>,
}

/// Shared database and session manager.
struct AppState {
    db: Arc<TelemetryDb>,
    session_manager: Arc<SessionManager>,
}

#[tauri::command]
fn get_capture_status(state: tauri::State<'_, CaptureState>) -> CaptureStatus {
    state.status.lock().unwrap().clone()
}

#[tauri::command]
fn start_session(app_state: tauri::State<'_, AppState>) -> Result<i64, String> {
    app_state.session_manager.start_session("default-user")
}

#[tauri::command]
fn end_session(app_state: tauri::State<'_, AppState>) -> Result<(), String> {
    app_state.session_manager.end_session()
}

#[tauri::command]
fn get_sessions(app_state: tauri::State<'_, AppState>) -> Result<Vec<db::SessionRecord>, String> {
    app_state.db.get_sessions("default-user")
        .map_err(|e| format!("Failed to get sessions: {}", e))
}

#[tauri::command]
fn get_laps(app_state: tauri::State<'_, AppState>, session_id: i64) -> Result<Vec<db::LapRecord>, String> {
    app_state.db.get_laps(session_id)
        .map_err(|e| format!("Failed to get laps: {}", e))
}

#[tauri::command]
fn get_lap_frames(app_state: tauri::State<'_, AppState>, lap_id: i64) -> Result<Vec<db::TelemetryFrameRecord>, String> {
    app_state.db.get_lap_frames(lap_id)
        .map_err(|e| format!("Failed to get lap frames: {}", e))
}

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "purple_sector_desktop=info,ps_telemetry_core=info".into()),
        )
        .init();

    // Derive the project root from the Cargo manifest directory.
    // CARGO_MANIFEST_DIR = <repo>/apps/desktop/src-tauri
    let mut project_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    // Pop src-tauri, desktop, apps -> repo root
    project_root.pop();
    project_root.pop();
    project_root.pop();

    info!("Project root: {}", project_root.display());

    // Start an embedded Next.js server for the web UI.
    let next_server_child: Option<Child> = Command::new("node")
        .current_dir(&project_root)
        .arg("node_modules/next/dist/bin/next")
        .arg("start")
        .arg("apps/web")
        .arg("-p")
        .arg("3000")
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .map(|child| {
            info!(
                "Started embedded Next.js server (pid={}) on http://127.0.0.1:3000",
                child.id()
            );
            child
        })
        .ok();

    let next_server_child = Arc::new(Mutex::new(next_server_child));
    let next_server_for_events = Arc::clone(&next_server_child);

    // Capture state shared between the async capture task and Tauri commands
    let (shutdown_tx, shutdown_rx) = mpsc::channel::<()>(1);
    let capture_state = CaptureState {
        status: Mutex::new(CaptureStatus {
            running: false,
            source_name: "Assetto Corsa".into(),
            frames_captured: 0,
        }),
        shutdown_tx: Mutex::new(Some(shutdown_tx)),
    };
    let capture_state = Arc::new(capture_state);
    let capture_state_for_setup = Arc::clone(&capture_state);

    // Initialize telemetry database
    let app_data_dir = tauri::api::path::app_data_dir(&tauri::Config::default())
        .expect("Failed to get app data directory");
    std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");
    let db_path = app_data_dir.join("telemetry.db");
    let db = Arc::new(TelemetryDb::new(db_path).expect("Failed to initialize telemetry database"));
    let session_manager = Arc::new(SessionManager::new(Arc::clone(&db)));
    
    let app_state = AppState {
        db,
        session_manager,
    };

    tauri::Builder::default()
        .manage(capture_state)
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            get_capture_status,
            start_session,
            end_session,
            get_sessions,
            get_laps,
            get_lap_frames
        ])
        .setup(move |app| {
            // Create a "File" submenu with an "Exit" item inside it
            let file_menu = SubmenuBuilder::new(app, "File")
                .text("file-exit", "Exit")
                .build()?;

            let menu = MenuBuilder::new(app)
                .items(&[&file_menu])
                .build()?;

            app.set_menu(menu)?;

            app.on_menu_event(|app_handle, event| {
                match event.id().0.as_str() {
                    "file-exit" => {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.close();
                        }
                    }
                    _ => {}
                }
            });

            // Spawn native telemetry capture on a background tokio runtime.
            // Replaces the old `embedded-telemetry-server.js` Node process.
            // Captured frames are emitted as Tauri events so the embedded
            // Next.js UI can receive them (same data shape as the WS protocol).
            let app_handle = app.handle().clone();
            let state = capture_state_for_setup;
            let session_mgr = app.state::<AppState>().session_manager.clone();

            std::thread::Builder::new()
                .name("telemetry-capture".into())
                .spawn(move || {
                    let rt = tokio::runtime::Builder::new_multi_thread()
                        .enable_all()
                        .worker_threads(1)
                        .build()
                        .expect("Failed to build tokio runtime for capture");

                    rt.block_on(async move {
                        run_capture(app_handle, state, session_mgr, shutdown_rx).await;
                    });
                })
                .expect("Failed to spawn capture thread");

            Ok(())
        })
        .on_window_event(move |_window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                // Kill embedded Next.js server
                {
                    let mut child_opt = next_server_for_events.lock().unwrap();
                    if let Some(child) = child_opt.as_mut() {
                        info!("Killing embedded Next.js server (pid={})", child.id());
                        let _ = child.kill();
                    }
                    *child_opt = None;
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Run the telemetry capture loop. Emits frames as Tauri events and persists to database.
async fn run_capture(
    app_handle: tauri::AppHandle,
    state: Arc<CaptureState>,
    session_manager: Arc<SessionManager>,
    mut shutdown_rx: mpsc::Receiver<()>,
) {
    // Select source based on TELEMETRY_SOURCE env var: "demo" or "ac" (default)
    let source_type = std::env::var("TELEMETRY_SOURCE").unwrap_or_else(|_| "ac".into());
    let mut source: Box<dyn TelemetrySource> = match source_type.as_str() {
        "demo" => {
            let demo_config = DemoConfig {
                loop_playback: true,
                ..Default::default()
            };
            Box::new(DemoSource::new(demo_config))
        }
        _ => {
            let config = CaptureConfig::default();
            Box::new(AcSource::new(config))
        }
    };

    match source.start().await {
        Ok(()) => {
            info!("Capture started: {}", source.name());
            {
                let mut status = state.status.lock().unwrap();
                status.running = true;
                status.source_name = source.name().to_string();
            }
        }
        Err(e) => {
            error!("Failed to start capture: {e}");
            return;
        }
    }

    let mut frames: u64 = 0;

    loop {
        tokio::select! {
            result = source.next_sample() => {
                match result {
                    Ok(sample) => {
                        frames += 1;

                        let event = TelemetryEvent {
                            timestamp: sample.timestamp,
                            speed: sample.speed,
                            throttle: sample.throttle,
                            brake: sample.brake,
                            steering: sample.steering,
                            gear: sample.gear,
                            rpm: sample.rpm,
                            normalized_position: sample.normalized_position,
                            lap_number: sample.lap_number,
                            lap_time: sample.lap_time,
                            session_time: sample.session_time,
                            session_type: sample.session_type,
                            track_position: sample.track_position,
                            delta: sample.delta,
                        };

                        // Emit to all windows — the embedded Next.js UI listens for this
                        let _ = app_handle.emit("telemetry", &event);

                        // Persist frame to database if session is active
                        if let Err(e) = session_manager.process_frame(&sample) {
                            error!("Failed to persist frame: {}", e);
                        }

                        // Update frame count periodically
                        if frames % 600 == 0 {
                            let mut status = state.status.lock().unwrap();
                            status.frames_captured = frames;
                        }
                    }
                    Err(CaptureError::Stopped) => {
                        info!("Capture source stopped");
                        break;
                    }
                    Err(e) => {
                        error!("Capture error: {e}");
                        break;
                    }
                }
            }
            _ = shutdown_rx.recv() => {
                info!("Capture shutdown requested");
                break;
            }
        }
    }

    let _ = source.stop().await;
    drop(source);
    {
        let mut status = state.status.lock().unwrap();
        status.running = false;
        status.frames_captured = frames;
    }
    info!("Capture stopped after {frames} frames");
}
