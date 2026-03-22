use crate::watcher::{self, FilePayload, WatchHandle};
use rfd::FileDialog;
use std::{fs, path::PathBuf, sync::Mutex};
use tauri::{AppHandle, State};

#[derive(Default)]
pub struct AppState {
    watch: Mutex<Option<WatchHandle>>,
    debounce_ms: Mutex<u64>,
}

impl AppState {
    fn get_debounce(&self) -> u64 {
        *self.debounce_ms.lock().unwrap_or_else(|p| p.into_inner())
    }
}

#[derive(serde::Serialize)]
pub struct CssPayload {
    pub path: String,
    pub content: String,
}

#[tauri::command]
pub fn open_and_watch(
    path: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<FilePayload, String> {
    let path = PathBuf::from(path);
    let payload = watcher::read_markdown(&path)?;
    reset_watcher(path, app, state)?;
    Ok(payload)
}

#[tauri::command]
pub fn open_file_dialog_and_watch(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<FilePayload, String> {
    let selected = FileDialog::new()
        .add_filter("Markdown", &["md", "markdown", "txt"])
        .pick_file()
        .ok_or_else(|| "file selection was canceled".to_string())?;

    let payload = watcher::read_markdown(&selected)?;
    reset_watcher(selected, app, state)?;
    Ok(payload)
}

#[tauri::command]
pub fn read_file(path: String) -> Result<FilePayload, String> {
    watcher::read_markdown(&PathBuf::from(path))
}

/// Update the debounce interval and restart the watcher for the current file.
#[tauri::command]
pub fn set_debounce(ms: u64, app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    *state
        .debounce_ms
        .lock()
        .map_err(|_| "failed to lock debounce state")? = ms;

    let mut guard = state
        .watch
        .lock()
        .map_err(|_| "failed to lock watcher state")?;

    if let Some(existing) = guard.take() {
        let path = existing.path().to_owned();
        let _ = existing.stop();
        let next = watcher::start_watch(path, app, ms)?;
        *guard = Some(next);
    }

    Ok(())
}

/// Open a native file dialog for CSS files and return the content.
#[tauri::command]
pub fn open_css_dialog_and_read() -> Result<CssPayload, String> {
    let selected = FileDialog::new()
        .add_filter("CSS", &["css"])
        .pick_file()
        .ok_or_else(|| "file selection was canceled".to_string())?;

    let content = fs::read_to_string(&selected)
        .map_err(|e| format!("failed to read CSS file: {e}"))?;

    Ok(CssPayload {
        path: selected.to_string_lossy().to_string(),
        content,
    })
}

fn reset_watcher(
    path: PathBuf,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let debounce_ms = state.get_debounce();

    let mut guard = state
        .watch
        .lock()
        .map_err(|_| "failed to lock watcher state".to_string())?;

    if let Some(existing) = guard.take() {
        let _ = existing.stop();
    }

    let next = watcher::start_watch(path, app, debounce_ms)?;
    *guard = Some(next);
    Ok(())
}
