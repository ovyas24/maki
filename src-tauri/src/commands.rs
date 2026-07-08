use maki_core::Connection;
use maki_core::models::{Annotation, Book, ImportResult, NewAnnotation, WatchFolder};
use maki_core::watch::WatchHandle;
use maki_core::{covers, library};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

pub struct AppState {
    pub conn: Mutex<Connection>,
    pub db_path: PathBuf,
    pub cache_dir: PathBuf,
    pub config_dir: PathBuf,
    pub watcher: Mutex<Option<WatchHandle>>,
}

type CmdResult<T> = Result<T, String>;

fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}

#[tauri::command]
pub async fn list_books(state: State<'_, AppState>) -> CmdResult<Vec<Book>> {
    let conn = state.conn.lock().unwrap();
    library::list_books(&conn).map_err(err)
}

#[tauri::command]
pub async fn import_files(
    state: State<'_, AppState>,
    paths: Vec<String>,
) -> CmdResult<Vec<ImportResult>> {
    let conn = state.conn.lock().unwrap();
    let mut results = Vec::new();
    for p in &paths {
        let path = Path::new(p);
        if path.is_dir() {
            results.extend(library::import_dir(&conn, path));
        } else {
            results.push(library::import_file(&conn, path));
        }
    }
    Ok(results)
}

/// Raw file bytes for the webview to hand to foliate-js / pdf.js.
#[tauri::command]
pub async fn read_book_bytes(
    state: State<'_, AppState>,
    id: i64,
) -> CmdResult<tauri::ipc::Response> {
    let path = {
        let conn = state.conn.lock().unwrap();
        library::get_book(&conn, id).map_err(err)?.path
    };
    let bytes = std::fs::read(&path).map_err(|e| format!("cannot read {path}: {e}"))?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
pub async fn set_book_metadata(
    state: State<'_, AppState>,
    id: i64,
    title: String,
    author: Option<String>,
    language: Option<String>,
    description: Option<String>,
) -> CmdResult<()> {
    let conn = state.conn.lock().unwrap();
    library::set_metadata(
        &conn,
        id,
        &title,
        author.as_deref(),
        language.as_deref(),
        description.as_deref(),
    )
    .map_err(err)
}

/// Cache a cover image (bytes come from foliate-js's `book.getCover()`) and
/// record its path. Returns the cached cover path.
#[tauri::command]
pub async fn save_cover(state: State<'_, AppState>, id: i64, bytes: Vec<u8>) -> CmdResult<String> {
    let path = covers::cache_cover(&state.cache_dir, id, &bytes).map_err(err)?;
    let path = path.display().to_string();
    let conn = state.conn.lock().unwrap();
    library::set_cover_path(&conn, id, &path).map_err(err)?;
    Ok(path)
}

#[tauri::command]
pub async fn save_progress(
    state: State<'_, AppState>,
    id: i64,
    location: String,
    progress: f64,
) -> CmdResult<()> {
    let conn = state.conn.lock().unwrap();
    library::save_progress(&conn, id, &location, progress).map_err(err)
}

#[tauri::command]
pub async fn mark_opened(state: State<'_, AppState>, id: i64) -> CmdResult<()> {
    let conn = state.conn.lock().unwrap();
    library::mark_opened(&conn, id).map_err(err)
}

#[tauri::command]
pub async fn set_finished(state: State<'_, AppState>, id: i64, finished: bool) -> CmdResult<()> {
    let conn = state.conn.lock().unwrap();
    library::set_finished(&conn, id, finished).map_err(err)
}

#[tauri::command]
pub async fn remove_book(state: State<'_, AppState>, id: i64, delete_file: bool) -> CmdResult<()> {
    let conn = state.conn.lock().unwrap();
    library::remove_book(&conn, id, delete_file).map_err(err)
}

#[tauri::command]
pub async fn list_annotations(
    state: State<'_, AppState>,
    book_id: i64,
) -> CmdResult<Vec<Annotation>> {
    let conn = state.conn.lock().unwrap();
    library::list_annotations(&conn, book_id).map_err(err)
}

#[tauri::command]
pub async fn add_annotation(
    state: State<'_, AppState>,
    annotation: NewAnnotation,
) -> CmdResult<Annotation> {
    let conn = state.conn.lock().unwrap();
    library::add_annotation(&conn, &annotation).map_err(err)
}

#[tauri::command]
pub async fn update_annotation(
    state: State<'_, AppState>,
    id: i64,
    note: Option<String>,
    color: String,
    style: String,
) -> CmdResult<()> {
    let conn = state.conn.lock().unwrap();
    library::update_annotation(&conn, id, note.as_deref(), &color, &style).map_err(err)
}

#[tauri::command]
pub async fn delete_annotation(state: State<'_, AppState>, id: i64) -> CmdResult<()> {
    let conn = state.conn.lock().unwrap();
    library::delete_annotation(&conn, id).map_err(err)
}

#[tauri::command]
pub async fn list_watch_folders(state: State<'_, AppState>) -> CmdResult<Vec<WatchFolder>> {
    let conn = state.conn.lock().unwrap();
    library::list_watch_folders(&conn).map_err(err)
}

#[tauri::command]
pub async fn add_watch_folder(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> CmdResult<Vec<WatchFolder>> {
    let folders = {
        let conn = state.conn.lock().unwrap();
        library::add_watch_folder(&conn, Path::new(&path)).map_err(err)?
    };
    rescan_and_watch(&app);
    Ok(folders)
}

#[tauri::command]
pub async fn remove_watch_folder(
    app: AppHandle,
    state: State<'_, AppState>,
    id: i64,
) -> CmdResult<Vec<WatchFolder>> {
    let folders = {
        let conn = state.conn.lock().unwrap();
        library::remove_watch_folder(&conn, id).map_err(err)?
    };
    rescan_and_watch(&app);
    Ok(folders)
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> CmdResult<serde_json::Value> {
    let path = state.config_dir.join("settings.json");
    match std::fs::read_to_string(&path) {
        Ok(text) => serde_json::from_str(&text).map_err(err),
        Err(_) => Ok(serde_json::json!({})),
    }
}

#[tauri::command]
pub async fn save_settings(
    state: State<'_, AppState>,
    settings: serde_json::Value,
) -> CmdResult<()> {
    std::fs::create_dir_all(&state.config_dir).map_err(err)?;
    let path = state.config_dir.join("settings.json");
    std::fs::write(&path, serde_json::to_string_pretty(&settings).map_err(err)?).map_err(err)
}

/// Write a text file to a user-chosen destination (annotation export; the
/// path always comes from a native save dialog).
#[tauri::command]
pub async fn save_text_file(path: String, contents: String) -> CmdResult<()> {
    std::fs::write(&path, contents).map_err(err)
}

/// Scan all watch folders for files added while the app was closed, then
/// (re)start the live watcher. Emits `library-updated` when anything lands.
pub fn rescan_and_watch(app: &AppHandle) {
    let state = app.state::<AppState>();
    let folders: Vec<PathBuf> = {
        let conn = state.conn.lock().unwrap();
        match library::list_watch_folders(&conn) {
            Ok(list) => list.into_iter().map(|f| PathBuf::from(f.path)).collect(),
            Err(e) => {
                eprintln!("maki: cannot list watch folders: {e}");
                return;
            }
        }
    };

    // Initial scan in the background so startup stays fast.
    let scan_app = app.clone();
    let scan_folders = folders.clone();
    std::thread::spawn(move || {
        let state = scan_app.state::<AppState>();
        let imported: Vec<Book> = {
            let conn = state.conn.lock().unwrap();
            scan_folders
                .iter()
                .flat_map(|f| library::import_dir(&conn, f))
                .filter_map(|r| match r {
                    ImportResult::Imported { book } => Some(*book),
                    _ => None,
                })
                .collect()
        };
        if !imported.is_empty() {
            let _ = scan_app.emit("library-updated", &imported);
        }
    });

    let event_app = app.clone();
    let handle = if folders.is_empty() {
        None
    } else {
        maki_core::watch::start(state.db_path.clone(), folders, move |books| {
            let _ = event_app.emit("library-updated", &books);
        })
        .map_err(|e| eprintln!("maki: watcher failed to start: {e}"))
        .ok()
    };
    *state.watcher.lock().unwrap() = handle;
}
