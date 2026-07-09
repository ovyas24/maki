mod commands;

use commands::AppState;
use std::sync::Mutex;
use tauri::{Manager, PhysicalPosition, WebviewWindow};

/// `tauri-plugin-window-state` restores a saved position as long as it
/// intersects *any* monitor at all — even barely, e.g. a window dragged
/// mostly off the left edge via our custom draggable titlebar (there's no
/// OS-level snapping back on-screen when `decorations: false`). Left
/// unchecked, that persists across launches: the back button and sidebars
/// render partly off-screen forever. Clamp the restored position back onto
/// whichever monitor it overlaps most, once, right after setup.
fn keep_window_on_screen(window: &WebviewWindow) {
    let (Ok(pos), Ok(size)) = (window.outer_position(), window.outer_size()) else {
        return;
    };
    let Ok(monitors) = window.available_monitors() else {
        return;
    };
    let Some(best) = monitors.iter().max_by_key(|m| overlap_area(m, pos, size)) else {
        return;
    };

    let visible = overlap_area(best, pos, size) as f64;
    let total = f64::from(size.width) * f64::from(size.height);
    if total <= 0.0 || visible / total >= 0.9 {
        return; // already mostly on-screen
    }

    let mpos = best.position();
    let msize = best.size();
    let max_x = mpos.x + msize.width as i32 - size.width as i32;
    let max_y = mpos.y + msize.height as i32 - size.height as i32;
    let nx = pos.x.clamp(mpos.x, max_x.max(mpos.x));
    let ny = pos.y.clamp(mpos.y, max_y.max(mpos.y));
    let _ = window.set_position(PhysicalPosition::new(nx, ny));
}

fn overlap_area(
    monitor: &tauri::Monitor,
    pos: PhysicalPosition<i32>,
    size: tauri::PhysicalSize<u32>,
) -> i64 {
    let mpos = monitor.position();
    let msize = monitor.size();
    let ox = (pos.x + size.width as i32).min(mpos.x + msize.width as i32) - pos.x.max(mpos.x);
    let oy = (pos.y + size.height as i32).min(mpos.y + msize.height as i32) - pos.y.max(mpos.y);
    i64::from(ox.max(0)) * i64::from(oy.max(0))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            let db_path = maki_core::data_dir().join("library.db");
            let conn = maki_core::db::open(&db_path)?;
            app.manage(AppState {
                conn: Mutex::new(conn),
                db_path,
                cache_dir: maki_core::cache_dir(),
                config_dir: maki_core::config_dir(),
                watcher: Mutex::new(None),
            });
            commands::rescan_and_watch(app.handle());
            if let Some(window) = app.get_webview_window("main") {
                keep_window_on_screen(&window);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_books,
            commands::search,
            commands::import_files,
            commands::read_book_bytes,
            commands::set_book_metadata,
            commands::save_cover,
            commands::save_progress,
            commands::mark_opened,
            commands::set_finished,
            commands::remove_book,
            commands::list_annotations,
            commands::add_annotation,
            commands::update_annotation,
            commands::delete_annotation,
            commands::list_bookmarks,
            commands::add_bookmark,
            commands::delete_bookmark,
            commands::list_watch_folders,
            commands::add_watch_folder,
            commands::remove_watch_folder,
            commands::get_settings,
            commands::save_settings,
            commands::save_text_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running maki");
}
