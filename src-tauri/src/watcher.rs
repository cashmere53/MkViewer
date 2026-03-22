use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    sync::mpsc,
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
pub struct FilePayload {
    pub path: String,
    pub content: String,
    pub updated_at: i64,
}

#[derive(Clone, Serialize)]
pub struct FileMissingPayload {
    pub path: String,
    pub message: String,
    pub updated_at: i64,
}

pub struct WatchHandle {
    watcher: RecommendedWatcher,
    path: PathBuf,
}

impl WatchHandle {
    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn stop(mut self) -> Result<(), String> {
        self.watcher
            .unwatch(&self.path)
            .map_err(|e| format!("failed to stop watcher: {e}"))
    }
}

pub fn validate_file(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err("file not found".to_string());
    }

    let ext = path
        .extension()
        .and_then(|v| v.to_str())
        .map(|v| v.to_ascii_lowercase())
        .ok_or_else(|| "file extension is required".to_string())?;

    if !["md", "markdown", "txt"].contains(&ext.as_str()) {
        return Err("unsupported extension".to_string());
    }

    let meta = fs::metadata(path).map_err(|e| format!("failed to read metadata: {e}"))?;
    if meta.len() > 10 * 1024 * 1024 {
        return Err("file size exceeds 10MB".to_string());
    }

    Ok(())
}

pub fn read_markdown(path: &Path) -> Result<FilePayload, String> {
    validate_file(path)?;

    let bytes = fs::read(path).map_err(|e| format!("failed to read file: {e}"))?;
    let content = match String::from_utf8(bytes.clone()) {
        Ok(text) => text,
        Err(_) => {
            return Err("file is not valid UTF-8 (BOM is supported)".to_string());
        }
    };

    let content = strip_utf8_bom(content);

    Ok(FilePayload {
        path: path.to_string_lossy().to_string(),
        content,
        updated_at: current_millis(),
    })
}

pub fn start_watch(path: PathBuf, app: AppHandle, debounce_ms: u64) -> Result<WatchHandle, String> {
    let (tx, rx) = mpsc::channel();

    let mut watcher = RecommendedWatcher::new(
        move |event| {
            let _ = tx.send(event);
        },
        Config::default(),
    )
    .map_err(|e| format!("failed to create watcher: {e}"))?;

    watcher
        .watch(&path, RecursiveMode::NonRecursive)
        .map_err(|e| format!("failed to watch path: {e}"))?;

    let watched_path = path.clone();
    thread::spawn(move || {
        let mut last_emitted_at = 0_i64;

        while let Ok(event_result) = rx.recv() {
            let Ok(event) = event_result else {
                continue;
            };

            let is_target_event = matches!(
                event.kind,
                EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)
            );

            if !is_target_event {
                continue;
            }

            let now = current_millis();
            if now - last_emitted_at < debounce_ms as i64 {
                continue;
            }
            last_emitted_at = now;

            thread::sleep(Duration::from_millis(debounce_ms));

            if watched_path.exists() {
                match read_markdown(&watched_path) {
                    Ok(payload) => {
                        let _ = app.emit("file-changed", payload);
                    }
                    Err(err) => {
                        let _ = app.emit(
                            "file-missing",
                            FileMissingPayload {
                                path: watched_path.to_string_lossy().to_string(),
                                message: err,
                                updated_at: current_millis(),
                            },
                        );
                    }
                }
            } else {
                let _ = app.emit(
                    "file-missing",
                    FileMissingPayload {
                        path: watched_path.to_string_lossy().to_string(),
                        message: "file was moved or deleted".to_string(),
                        updated_at: current_millis(),
                    },
                );
            }
        }
    });

    Ok(WatchHandle { watcher, path })
}

fn strip_utf8_bom(input: String) -> String {
    input.strip_prefix('\u{feff}').unwrap_or(&input).to_string()
}

fn current_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}
