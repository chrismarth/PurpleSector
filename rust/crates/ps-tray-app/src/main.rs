//! PurpleSector System Tray App
//!
//! Captures sim telemetry data via UDP/SharedMemory, batches it, and streams
//! to the cloud pipeline via gRPC. Uses a local WAL for resilience during
//! network disconnects.
//!
//! Features:
//! - System tray icon with right-click menu (Start/Stop, Settings, Stats, Quit)
//! - egui settings window (sim type, gRPC endpoint, credentials)
//! - Live stats display (samples/sec, batches sent, WAL depth)
//! - Persistent config file (TOML)
//!
//! This is the cloud-connected companion to the self-contained Tauri desktop app.

// Hide console window on Windows release builds
#![cfg_attr(
    all(target_os = "windows", not(debug_assertions)),
    windows_subsystem = "windows"
)]

mod config;
mod gui;
mod pipeline;
mod stats;

use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

use anyhow::Result;
use tokio::sync::mpsc;
use tracing::info;
use tray_icon::menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem};
use tray_icon::TrayIconBuilder;

use config::AppConfig;
use gui::GuiState;
use pipeline::PipelineCommand;
use stats::PipelineStats;

fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "ps_tray_app=info,ps_telemetry_core=info".into()),
        )
        .init();

    info!("PurpleSector Tray App starting...");

    // Load config
    let config = Arc::new(Mutex::new(AppConfig::load()));
    let stats = PipelineStats::new();
    let running = Arc::new(AtomicBool::new(false));
    let (cmd_tx, cmd_rx) = mpsc::channel::<PipelineCommand>(32);

    // Build the tray menu
    let menu = Menu::new();
    let item_start = MenuItem::new("Start Capture", true, None);
    let item_stop = MenuItem::new("Stop Capture", true, None);
    let item_open = MenuItem::new("Open Dashboard", true, None);
    let item_quit = MenuItem::new("Quit", true, None);
    menu.append_items(&[
        &item_start,
        &item_stop,
        &PredefinedMenuItem::separator(),
        &item_open,
        &PredefinedMenuItem::separator(),
        &item_quit,
    ])?;

    let start_id = item_start.id().clone();
    let stop_id = item_stop.id().clone();
    let open_id = item_open.id().clone();
    let quit_id = item_quit.id().clone();

    // Create tray icon (using a generated purple square as placeholder)
    let icon = create_default_icon();
    let _tray_icon = TrayIconBuilder::new()
        .with_menu(Box::new(menu))
        .with_tooltip("PurpleSector — Telemetry Capture")
        .with_icon(icon)
        .build()?;

    // Spawn the tokio runtime for the pipeline manager on a background thread
    let config_clone = config.clone();
    let stats_clone = stats.clone();
    let running_clone = running.clone();
    let _rt_handle = std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
        rt.block_on(pipeline::run_pipeline_manager(
            config_clone,
            stats_clone,
            running_clone,
            cmd_rx,
        ));
    });

    // Build GUI state
    let gui_state = GuiState {
        config: config.clone(),
        stats: stats.clone(),
        pipeline_running: running.clone(),
        command_tx: cmd_tx.clone(),
    };

    // Process tray menu events on a background thread
    let cmd_tx_menu = cmd_tx.clone();
    let gui_state_menu = gui_state.clone();
    std::thread::spawn(move || {
        loop {
            if let Ok(event) = MenuEvent::receiver().recv() {
                if event.id == start_id {
                    let _ = cmd_tx_menu.blocking_send(PipelineCommand::Start);
                } else if event.id == stop_id {
                    let _ = cmd_tx_menu.blocking_send(PipelineCommand::Stop);
                } else if event.id == open_id {
                    let state = gui_state_menu.clone();
                    std::thread::spawn(move || {
                        gui::open_window(state);
                    });
                } else if event.id == quit_id {
                    let _ = cmd_tx_menu.blocking_send(PipelineCommand::Quit);
                    // Give pipeline a moment to shut down, then exit
                    std::thread::sleep(std::time::Duration::from_millis(500));
                    std::process::exit(0);
                }
            }
        }
    });

    // Open the dashboard window immediately on first launch
    gui::open_window(gui_state);

    // If the GUI window is closed, keep running in the tray.
    // The quit menu item or Ctrl+C will actually exit.
    info!("GUI window closed, running in tray...");

    // Wait for pipeline manager thread
    // (It will exit when PipelineCommand::Quit is received)
    // Park the main thread — the app runs via tray menu and GUI threads.
    loop {
        std::thread::park();
    }
}

/// Create a simple 32x32 purple icon as a placeholder.
fn create_default_icon() -> tray_icon::Icon {
    let size = 32u32;
    let mut rgba = Vec::with_capacity((size * size * 4) as usize);
    for y in 0..size {
        for x in 0..size {
            // Simple purple circle
            let cx = (x as f32) - (size as f32 / 2.0);
            let cy = (y as f32) - (size as f32 / 2.0);
            let r = (size as f32 / 2.0) - 2.0;
            if cx * cx + cy * cy <= r * r {
                rgba.extend_from_slice(&[139, 92, 246, 255]); // Purple (#8B5CF6)
            } else {
                rgba.extend_from_slice(&[0, 0, 0, 0]); // Transparent
            }
        }
    }
    tray_icon::Icon::from_rgba(rgba, size, size).expect("Failed to create icon")
}
