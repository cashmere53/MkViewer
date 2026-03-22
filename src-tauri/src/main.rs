#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cli;
mod commands;
mod watcher;

use commands::AppState;
use serde::Serialize;
use tauri::Emitter;

#[derive(Clone, Serialize)]
struct CliOpenPayload {
    path: String,
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .setup(|app| {
            if let Some(path) = cli::initial_file_from_args() {
                let payload = CliOpenPayload {
                    path: path.to_string_lossy().to_string(),
                };
                let _ = app.emit("cli-open-file", payload);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_and_watch,
            commands::open_file_dialog_and_watch,
            commands::read_file,
            commands::set_debounce,
            commands::open_css_dialog_and_read
        ])
        .run(tauri::generate_context!())
        .expect("error while running mkviewer");
}
