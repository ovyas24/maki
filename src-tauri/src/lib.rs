mod commands;

use commands::AppState;
use std::sync::Mutex;
use tauri::Manager;

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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_books,
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
