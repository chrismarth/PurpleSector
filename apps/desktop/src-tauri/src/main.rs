#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
};
use tauri::{
    menu::{MenuBuilder, SubmenuBuilder},
    Manager,
    WindowEvent,
};

fn main() {
    // Derive the project root from the Cargo manifest directory.
    // CARGO_MANIFEST_DIR = <repo>/apps/desktop/src-tauri
    let mut project_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    // Pop src-tauri, desktop, apps -> repo root
    project_root.pop();
    project_root.pop();
    project_root.pop();

    println!("Project root for embedded processes: {}", project_root.display());

    // Start the embedded telemetry server (WebSocket + demo playback, no Kafka)
    let telemetry_server_child: Option<Child> = Command::new("node")
        .current_dir(&project_root)
        .arg("services/embedded-telemetry-server.js")
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .map(|child| {
            println!(
                "Started embedded telemetry server (pid={}) in {}",
                child.id(),
                project_root.display()
            );
            child
        })
        .ok();

    // Start an embedded Next.js server for the web UI.
    // This uses the production build and runs:
    //   node node_modules/next/dist/bin/next start apps/web -p 3000
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
            println!(
                "Started embedded Next.js server (pid={}) on http://127.0.0.1:3000 with cwd {}",
                child.id(),
                project_root.display()
            );
            child
        })
        .ok();

    let telemetry_server_child = Arc::new(Mutex::new(telemetry_server_child));
    let next_server_child = Arc::new(Mutex::new(next_server_child));

    let telemetry_server_for_events = Arc::clone(&telemetry_server_child);
    let next_server_for_events = Arc::clone(&next_server_child);

    tauri::Builder::default()
        .setup(|app| {
            // Create a "File" submenu with an "Exit" item inside it
            let file_menu = SubmenuBuilder::new(app, "File")
                .text("file-exit", "Exit")
                .build()?;

            // Attach the File submenu as the application menu
            let menu = MenuBuilder::new(app)
                .items(&[&file_menu])
                .build()?;

            app.set_menu(menu)?;

            // Handle menu events
            app.on_menu_event(|app_handle, event| {
                match event.id().0.as_str() {
                    "file-exit" => {
                        // Close the main window; this will trigger the existing
                        // on_window_event handler and cleanly shut down child processes.
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.close();
                        }
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .on_window_event(move |_window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                // Kill embedded processes when the main window is closed
                {
                    let mut child_opt = telemetry_server_for_events.lock().unwrap();
                    if let Some(child) = child_opt.as_mut() {
                        println!("Killing embedded telemetry server (pid={})", child.id());
                        let _ = child.kill();
                    }
                    *child_opt = None;
                }

                {
                    let mut child_opt = next_server_for_events.lock().unwrap();
                    if let Some(child) = child_opt.as_mut() {
                        println!("Killing embedded Next.js server (pid={})", child.id());
                        let _ = child.kill();
                    }
                    *child_opt = None;
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
