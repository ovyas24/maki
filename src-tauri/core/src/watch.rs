use crate::Result;
use crate::library::{detect_format, import_file};
use crate::models::{Book, ImportResult};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::{Duration, Instant};

/// How long a file must be quiet before we import it (files being copied in
/// fire a stream of modify events until the copy finishes).
const SETTLE: Duration = Duration::from_millis(1500);

/// Keeps the notify watcher alive; dropping it stops watching.
pub struct WatchHandle {
    _watcher: RecommendedWatcher,
}

/// Watch folders for new/changed book files. Runs its own thread with its own
/// DB connection; calls `on_import` with each batch of newly imported books.
pub fn start(
    db_path: PathBuf,
    folders: Vec<PathBuf>,
    on_import: impl Fn(Vec<Book>) + Send + 'static,
) -> Result<WatchHandle> {
    let (tx, rx) = mpsc::channel::<PathBuf>();
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        if let Ok(event) = res
            && matches!(
                event.kind,
                notify::EventKind::Create(_) | notify::EventKind::Modify(_)
            )
        {
            for path in event.paths {
                if detect_format(&path).is_some() {
                    let _ = tx.send(path);
                }
            }
        }
    })?;
    for folder in &folders {
        if let Err(e) = watcher.watch(folder, RecursiveMode::Recursive) {
            eprintln!("shiori: cannot watch {}: {e}", folder.display());
        }
    }

    std::thread::spawn(move || debounce_loop(&db_path, &rx, on_import));
    Ok(WatchHandle { _watcher: watcher })
}

/// Collect event paths and import each once it has been quiet for `SETTLE`.
fn debounce_loop(db_path: &Path, rx: &mpsc::Receiver<PathBuf>, on_import: impl Fn(Vec<Book>)) {
    let Ok(conn) = crate::db::open(db_path) else {
        eprintln!("shiori: watcher could not open database");
        return;
    };
    let mut pending: HashMap<PathBuf, Instant> = HashMap::new();
    loop {
        let timeout = if pending.is_empty() {
            Duration::from_secs(3600)
        } else {
            SETTLE / 2
        };
        match rx.recv_timeout(timeout) {
            Ok(path) => {
                pending.insert(path, Instant::now());
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {}
            Err(mpsc::RecvTimeoutError::Disconnected) => return,
        }
        let settled: Vec<PathBuf> = pending
            .iter()
            .filter(|(_, t)| t.elapsed() >= SETTLE)
            .map(|(p, _)| p.clone())
            .collect();
        let mut imported = Vec::new();
        for path in settled {
            pending.remove(&path);
            if let ImportResult::Imported { book } = import_file(&conn, &path) {
                imported.push(*book);
            }
        }
        if !imported.is_empty() {
            on_import(imported);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::sync::mpsc::channel;

    #[test]
    fn watcher_imports_new_files_once_settled() {
        let dir = tempfile::tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        drop(crate::db::open(&db_path).unwrap()); // create schema
        let watch_dir = dir.path().join("books");
        std::fs::create_dir(&watch_dir).unwrap();

        let (tx, rx) = channel();
        let _handle = start(db_path.clone(), vec![watch_dir.clone()], move |books| {
            let _ = tx.send(books);
        })
        .unwrap();

        std::fs::File::create(watch_dir.join("new.epub"))
            .unwrap()
            .write_all(b"book bytes")
            .unwrap();

        let books = rx
            .recv_timeout(Duration::from_secs(10))
            .expect("watcher should import the new file");
        assert_eq!(books.len(), 1);
        assert_eq!(books[0].title, "new");

        let conn = crate::db::open(&db_path).unwrap();
        assert_eq!(crate::library::list_books(&conn).unwrap().len(), 1);
    }
}
