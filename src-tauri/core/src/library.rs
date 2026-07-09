use crate::models::{
    Annotation, Book, Bookmark, ImportResult, NewAnnotation, NewBookmark, WatchFolder,
};
use crate::{Error, Result};
use rusqlite::{Connection, Row, params};
use sha2::{Digest, Sha256};
use std::io::Read;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

pub const SUPPORTED_EXTENSIONS: &[&str] =
    &["epub", "mobi", "azw", "azw3", "fb2", "fbz", "cbz", "pdf"];

/// Format tag from a file name, normalizing aliases (azw → azw3, .fb2.zip → fbz).
pub fn detect_format(path: &Path) -> Option<&'static str> {
    let name = path.file_name()?.to_str()?.to_ascii_lowercase();
    if name.ends_with(".fb2.zip") {
        return Some("fbz");
    }
    match name.rsplit_once('.')?.1 {
        "epub" => Some("epub"),
        "mobi" => Some("mobi"),
        "azw" | "azw3" => Some("azw3"),
        "fb2" => Some("fb2"),
        "fbz" => Some("fbz"),
        "cbz" => Some("cbz"),
        "pdf" => Some("pdf"),
        _ => None,
    }
}

/// Streaming SHA-256 of a file, hex-encoded.
pub fn hash_file(path: &Path) -> Result<String> {
    let mut file = std::fs::File::open(path).map_err(|e| Error::io(path, e))?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 64 * 1024];
    loop {
        let n = file.read(&mut buf).map_err(|e| Error::io(path, e))?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    let digest = hasher.finalize();
    Ok(digest.iter().map(|b| format!("{b:02x}")).collect())
}

fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn book_from_row(row: &Row) -> rusqlite::Result<Book> {
    Ok(Book {
        id: row.get("id")?,
        path: row.get("path")?,
        content_hash: row.get("content_hash")?,
        format: row.get("format")?,
        title: row.get("title")?,
        author: row.get("author")?,
        language: row.get("language")?,
        description: row.get("description")?,
        cover_path: row.get("cover_path")?,
        file_size: row.get("file_size")?,
        added_at: row.get("added_at")?,
        last_opened_at: row.get("last_opened_at")?,
        progress: row.get("progress")?,
        location: row.get("location")?,
        finished: row.get("finished")?,
        missing: row.get("missing")?,
        metadata_extracted: row.get("metadata_extracted")?,
    })
}

const BOOK_COLUMNS: &str = "id, path, content_hash, format, title, author, language, \
    description, cover_path, file_size, added_at, last_opened_at, progress, location, \
    finished, missing, metadata_extracted";

/// All books, refreshing each book's `missing` flag by stat-ing its path.
// ponytail: stats every file on every list — fine into the thousands of books,
// move to a background refresh if libraries get huge.
pub fn list_books(conn: &Connection) -> Result<Vec<Book>> {
    let mut stmt = conn.prepare(&format!("SELECT {BOOK_COLUMNS} FROM books"))?;
    let mut books: Vec<Book> = stmt
        .query_map([], book_from_row)?
        .collect::<rusqlite::Result<_>>()?;
    for book in &mut books {
        let missing = !Path::new(&book.path).is_file();
        if missing != book.missing {
            conn.execute(
                "UPDATE books SET missing = ?1 WHERE id = ?2",
                params![missing, book.id],
            )?;
            book.missing = missing;
        }
    }
    Ok(books)
}

/// Turn a raw user query into a safe FTS5 MATCH expression: each whitespace
/// token is reduced to its alphanumerics and made a prefix term, AND-ed
/// together. Returns empty when nothing usable remains (caller treats that as
/// "no query"), which also avoids FTS5 syntax errors on punctuation.
fn build_fts_query(query: &str) -> String {
    query
        .split_whitespace()
        .map(|tok| {
            tok.chars()
                .filter(|c| c.is_alphanumeric())
                .collect::<String>()
        })
        .filter(|tok| !tok.is_empty())
        .map(|tok| format!("{tok}*"))
        .collect::<Vec<_>>()
        .join(" ")
}

/// Full-text search across book metadata and annotation text. Returns book ids
/// ordered by relevance: title/author matches first (by bm25), then books that
/// only matched via an annotation. Empty query → empty result.
pub fn search(conn: &Connection, query: &str) -> Result<Vec<i64>> {
    let match_expr = build_fts_query(query);
    if match_expr.is_empty() {
        return Ok(Vec::new());
    }
    let mut ids = Vec::new();
    let mut seen = std::collections::HashSet::new();

    let mut meta = conn
        .prepare("SELECT rowid FROM books_fts WHERE books_fts MATCH ?1 ORDER BY bm25(books_fts)")?;
    let mut push = |id: i64, ids: &mut Vec<i64>| {
        if seen.insert(id) {
            ids.push(id);
        }
    };
    for row in meta.query_map([&match_expr], |r| r.get::<_, i64>(0))? {
        push(row?, &mut ids);
    }

    let mut anns = conn.prepare(
        "SELECT a.book_id FROM annotations_fts
         JOIN annotations a ON a.id = annotations_fts.rowid
         WHERE annotations_fts MATCH ?1 ORDER BY bm25(annotations_fts)",
    )?;
    for row in anns.query_map([&match_expr], |r| r.get::<_, i64>(0))? {
        push(row?, &mut ids);
    }
    Ok(ids)
}

pub fn get_book(conn: &Connection, id: i64) -> Result<Book> {
    conn.query_row(
        &format!("SELECT {BOOK_COLUMNS} FROM books WHERE id = ?1"),
        [id],
        book_from_row,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => Error::BookNotFound(id),
        e => e.into(),
    })
}

/// Register one file in the library. Does not copy the file, does not parse it —
/// metadata extraction happens later in the webview via foliate-js.
pub fn import_file(conn: &Connection, path: &Path) -> ImportResult {
    let display = path.display().to_string();
    let Some(format) = detect_format(path) else {
        return ImportResult::Unsupported { path: display };
    };
    match try_import(conn, path, format) {
        Ok(Some(book)) => ImportResult::Imported {
            book: Box::new(book),
        },
        Ok(None) => ImportResult::Duplicate { path: display },
        Err(e) => ImportResult::Failed {
            path: display,
            message: e.to_string(),
        },
    }
}

fn try_import(conn: &Connection, path: &Path, format: &str) -> Result<Option<Book>> {
    let canonical = path.canonicalize().map_err(|e| Error::io(path, e))?;
    let path_str = canonical.display().to_string();
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM books WHERE path = ?1)",
        [&path_str],
        |r| r.get(0),
    )?;
    if exists {
        return Ok(None);
    }
    let hash = hash_file(&canonical)?;
    let same_content: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM books WHERE content_hash = ?1)",
        [&hash],
        |r| r.get(0),
    )?;
    if same_content {
        return Ok(None);
    }
    let size = canonical
        .metadata()
        .map_err(|e| Error::io(&canonical, e))?
        .len() as i64;
    // Placeholder title from the file name until the webview extracts real metadata.
    let title = canonical
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| path_str.clone());
    conn.execute(
        "INSERT INTO books (path, content_hash, format, title, file_size, added_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![path_str, hash, format, title, size, now()],
    )?;
    get_book(conn, conn.last_insert_rowid()).map(Some)
}

/// Import every supported file under a directory (used for watch folders).
pub fn import_dir(conn: &Connection, dir: &Path) -> Vec<ImportResult> {
    let mut results = Vec::new();
    let mut stack = vec![dir.to_path_buf()];
    while let Some(d) = stack.pop() {
        let Ok(entries) = std::fs::read_dir(&d) else {
            continue;
        };
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                stack.push(p);
            } else if detect_format(&p).is_some() {
                let r = import_file(conn, &p);
                if matches!(
                    r,
                    ImportResult::Imported { .. } | ImportResult::Failed { .. }
                ) {
                    results.push(r);
                }
            }
        }
    }
    results
}

pub fn set_metadata(
    conn: &Connection,
    id: i64,
    title: &str,
    author: Option<&str>,
    language: Option<&str>,
    description: Option<&str>,
) -> Result<()> {
    conn.execute(
        "UPDATE books SET title = ?1, author = ?2, language = ?3, description = ?4,
         metadata_extracted = 1 WHERE id = ?5",
        params![title, author, language, description, id],
    )?;
    Ok(())
}

pub fn set_cover_path(conn: &Connection, id: i64, cover_path: &str) -> Result<()> {
    conn.execute(
        "UPDATE books SET cover_path = ?1 WHERE id = ?2",
        params![cover_path, id],
    )?;
    Ok(())
}

pub fn save_progress(conn: &Connection, id: i64, location: &str, progress: f64) -> Result<()> {
    conn.execute(
        "UPDATE books SET location = ?1, progress = ?2,
         finished = CASE WHEN ?2 >= 0.995 THEN 1 ELSE finished END
         WHERE id = ?3",
        params![location, progress.clamp(0.0, 1.0), id],
    )?;
    Ok(())
}

pub fn mark_opened(conn: &Connection, id: i64) -> Result<()> {
    conn.execute(
        "UPDATE books SET last_opened_at = ?1 WHERE id = ?2",
        params![now(), id],
    )?;
    Ok(())
}

pub fn set_finished(conn: &Connection, id: i64, finished: bool) -> Result<()> {
    conn.execute(
        "UPDATE books SET finished = ?1 WHERE id = ?2",
        params![finished, id],
    )?;
    Ok(())
}

/// Remove a book (and its annotations via cascade). Optionally deletes the
/// underlying file; the cached cover is always deleted.
pub fn remove_book(conn: &Connection, id: i64, delete_file: bool) -> Result<()> {
    let book = get_book(conn, id)?;
    conn.execute("DELETE FROM books WHERE id = ?1", [id])?;
    if let Some(cover) = &book.cover_path {
        let _ = std::fs::remove_file(cover);
    }
    if delete_file {
        std::fs::remove_file(&book.path).map_err(|e| Error::io(&book.path, e))?;
    }
    Ok(())
}

pub fn list_annotations(conn: &Connection, book_id: i64) -> Result<Vec<Annotation>> {
    let mut stmt = conn.prepare(
        "SELECT id, book_id, cfi, text, note, color, style, created_at
         FROM annotations WHERE book_id = ?1 ORDER BY created_at",
    )?;
    let rows = stmt.query_map([book_id], |row| {
        Ok(Annotation {
            id: row.get(0)?,
            book_id: row.get(1)?,
            cfi: row.get(2)?,
            text: row.get(3)?,
            note: row.get(4)?,
            color: row.get(5)?,
            style: row.get(6)?,
            created_at: row.get(7)?,
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

pub fn add_annotation(conn: &Connection, ann: &NewAnnotation) -> Result<Annotation> {
    conn.execute(
        "INSERT INTO annotations (book_id, cfi, text, note, color, style, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            ann.book_id,
            ann.cfi,
            ann.text,
            ann.note,
            ann.color,
            ann.style,
            now()
        ],
    )?;
    let id = conn.last_insert_rowid();
    let list = list_annotations(conn, ann.book_id)?;
    Ok(list
        .into_iter()
        .find(|a| a.id == id)
        .expect("just inserted"))
}

pub fn update_annotation(
    conn: &Connection,
    id: i64,
    note: Option<&str>,
    color: &str,
    style: &str,
) -> Result<()> {
    conn.execute(
        "UPDATE annotations SET note = ?1, color = ?2, style = ?3 WHERE id = ?4",
        params![note, color, style, id],
    )?;
    Ok(())
}

pub fn delete_annotation(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM annotations WHERE id = ?1", [id])?;
    Ok(())
}

pub fn list_bookmarks(conn: &Connection, book_id: i64) -> Result<Vec<Bookmark>> {
    let mut stmt = conn.prepare(
        "SELECT id, book_id, cfi, label, created_at
         FROM bookmarks WHERE book_id = ?1 ORDER BY created_at",
    )?;
    let rows = stmt.query_map([book_id], |row| {
        Ok(Bookmark {
            id: row.get(0)?,
            book_id: row.get(1)?,
            cfi: row.get(2)?,
            label: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

pub fn add_bookmark(conn: &Connection, bm: &NewBookmark) -> Result<Bookmark> {
    conn.execute(
        "INSERT INTO bookmarks (book_id, cfi, label, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![bm.book_id, bm.cfi, bm.label, now()],
    )?;
    let id = conn.last_insert_rowid();
    let list = list_bookmarks(conn, bm.book_id)?;
    Ok(list.into_iter().find(|b| b.id == id).expect("just inserted"))
}

pub fn delete_bookmark(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM bookmarks WHERE id = ?1", [id])?;
    Ok(())
}

pub fn list_watch_folders(conn: &Connection) -> Result<Vec<WatchFolder>> {
    let mut stmt = conn.prepare("SELECT id, path FROM watch_folders ORDER BY path")?;
    let rows = stmt.query_map([], |row| {
        Ok(WatchFolder {
            id: row.get(0)?,
            path: row.get(1)?,
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

pub fn add_watch_folder(conn: &Connection, path: &Path) -> Result<Vec<WatchFolder>> {
    let canonical = path.canonicalize().map_err(|e| Error::io(path, e))?;
    conn.execute(
        "INSERT OR IGNORE INTO watch_folders (path) VALUES (?1)",
        [canonical.display().to_string()],
    )?;
    list_watch_folders(conn)
}

pub fn remove_watch_folder(conn: &Connection, id: i64) -> Result<Vec<WatchFolder>> {
    conn.execute("DELETE FROM watch_folders WHERE id = ?1", [id])?;
    list_watch_folders(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use std::io::Write;

    fn temp_book(dir: &tempfile::TempDir, name: &str, contents: &[u8]) -> std::path::PathBuf {
        let path = dir.path().join(name);
        std::fs::File::create(&path)
            .unwrap()
            .write_all(contents)
            .unwrap();
        path
    }

    #[test]
    fn detects_formats() {
        assert_eq!(detect_format(Path::new("a/b.epub")), Some("epub"));
        assert_eq!(detect_format(Path::new("b.AZW3")), Some("azw3"));
        assert_eq!(detect_format(Path::new("c.fb2.zip")), Some("fbz"));
        assert_eq!(detect_format(Path::new("d.txt")), None);
        assert_eq!(detect_format(Path::new("noext")), None);
    }

    #[test]
    fn hashes_are_stable_and_content_addressed() {
        let dir = tempfile::tempdir().unwrap();
        let a = temp_book(&dir, "a.epub", b"hello world");
        let b = temp_book(&dir, "b.epub", b"hello world");
        assert_eq!(hash_file(&a).unwrap(), hash_file(&b).unwrap());
        assert_eq!(
            hash_file(&a).unwrap(),
            // sha256 of "hello world"
            "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        );
    }

    #[test]
    fn import_dedupes_by_path_and_content() {
        let conn = open_in_memory().unwrap();
        let dir = tempfile::tempdir().unwrap();
        let a = temp_book(&dir, "book.epub", b"contents");

        let r = import_file(&conn, &a);
        let ImportResult::Imported { book } = &r else {
            panic!("expected import, got {r:?}");
        };
        assert_eq!(book.format, "epub");
        assert_eq!(book.title, "book");
        assert!(!book.metadata_extracted);

        // same path → duplicate
        assert!(matches!(
            import_file(&conn, &a),
            ImportResult::Duplicate { .. }
        ));
        // same content, different path → duplicate
        let b = temp_book(&dir, "copy.epub", b"contents");
        assert!(matches!(
            import_file(&conn, &b),
            ImportResult::Duplicate { .. }
        ));
        // unsupported extension
        let t = temp_book(&dir, "notes.txt", b"x");
        assert!(matches!(
            import_file(&conn, &t),
            ImportResult::Unsupported { .. }
        ));

        assert_eq!(list_books(&conn).unwrap().len(), 1);
    }

    #[test]
    fn progress_and_metadata_roundtrip() {
        let conn = open_in_memory().unwrap();
        let dir = tempfile::tempdir().unwrap();
        let a = temp_book(&dir, "book.epub", b"contents");
        let ImportResult::Imported { book } = import_file(&conn, &a) else {
            panic!()
        };

        set_metadata(
            &conn,
            book.id,
            "Real Title",
            Some("An Author"),
            Some("en"),
            None,
        )
        .unwrap();
        save_progress(&conn, book.id, "epubcfi(/6/4!/4/2)", 0.42).unwrap();
        let b = get_book(&conn, book.id).unwrap();
        assert_eq!(b.title, "Real Title");
        assert_eq!(b.author.as_deref(), Some("An Author"));
        assert!(b.metadata_extracted);
        assert!((b.progress - 0.42).abs() < 1e-9);
        assert!(!b.finished);

        // reaching the end marks finished
        save_progress(&conn, book.id, "epubcfi(/6/99!/4/2)", 1.0).unwrap();
        assert!(get_book(&conn, book.id).unwrap().finished);
    }

    #[test]
    fn missing_files_are_flagged_not_dropped() {
        let conn = open_in_memory().unwrap();
        let dir = tempfile::tempdir().unwrap();
        let a = temp_book(&dir, "book.epub", b"contents");
        let ImportResult::Imported { book } = import_file(&conn, &a) else {
            panic!()
        };
        std::fs::remove_file(&a).unwrap();
        let books = list_books(&conn).unwrap();
        assert_eq!(books.len(), 1);
        assert!(books[0].missing);
        assert_eq!(books[0].id, book.id);
    }

    #[test]
    fn annotations_crud_and_cascade() {
        let conn = open_in_memory().unwrap();
        let dir = tempfile::tempdir().unwrap();
        let a = temp_book(&dir, "book.epub", b"contents");
        let ImportResult::Imported { book } = import_file(&conn, &a) else {
            panic!()
        };
        let ann = add_annotation(
            &conn,
            &NewAnnotation {
                book_id: book.id,
                cfi: "epubcfi(/6/4!/4/2,/1:0,/1:5)".into(),
                text: "hello".into(),
                note: None,
                color: "yellow".into(),
                style: "highlight".into(),
            },
        )
        .unwrap();
        update_annotation(&conn, ann.id, Some("a note"), "blue", "underline").unwrap();
        let list = list_annotations(&conn, book.id).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].note.as_deref(), Some("a note"));
        assert_eq!(list[0].color, "blue");

        // deleting the book cascades to annotations
        remove_book(&conn, book.id, false).unwrap();
        assert!(a.exists(), "default keeps the file on disk");
        let orphans: i64 = conn
            .query_row("SELECT COUNT(*) FROM annotations", [], |r| r.get(0))
            .unwrap();
        assert_eq!(orphans, 0);
    }

    #[test]
    fn bookmarks_crud_and_cascade() {
        let conn = open_in_memory().unwrap();
        let dir = tempfile::tempdir().unwrap();
        let a = temp_book(&dir, "book.epub", b"contents");
        let ImportResult::Imported { book } = import_file(&conn, &a) else {
            panic!()
        };
        let bm = add_bookmark(
            &conn,
            &NewBookmark {
                book_id: book.id,
                cfi: "epubcfi(/6/4!/4/2)".into(),
                label: "Chapter 1".into(),
            },
        )
        .unwrap();
        assert_eq!(list_bookmarks(&conn, book.id).unwrap().len(), 1);
        assert_eq!(list_bookmarks(&conn, book.id).unwrap()[0].label, "Chapter 1");

        delete_bookmark(&conn, bm.id).unwrap();
        assert!(list_bookmarks(&conn, book.id).unwrap().is_empty());

        // deleting the book cascades to its bookmarks
        add_bookmark(
            &conn,
            &NewBookmark {
                book_id: book.id,
                cfi: "epubcfi(/6/8!/4/2)".into(),
                label: String::new(),
            },
        )
        .unwrap();
        remove_book(&conn, book.id, false).unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM bookmarks", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn import_dir_walks_recursively() {
        let conn = open_in_memory().unwrap();
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir(dir.path().join("nested")).unwrap();
        temp_book(&dir, "a.epub", b"one");
        temp_book(&dir, "nested/b.pdf", b"two");
        temp_book(&dir, "ignore.txt", b"three");
        let results = import_dir(&conn, dir.path());
        assert_eq!(results.len(), 2);
        assert_eq!(list_books(&conn).unwrap().len(), 2);
    }

    #[test]
    fn fts_search_matches_metadata_and_annotations() {
        let conn = open_in_memory().unwrap();
        let dir = tempfile::tempdir().unwrap();

        let mk = |name: &str, bytes: &[u8]| {
            let ImportResult::Imported { book } = import_file(&conn, &temp_book(&dir, name, bytes))
            else {
                panic!("import failed")
            };
            book
        };
        let moby = mk("moby.epub", b"a");
        let dune = mk("dune.epub", b"b");
        set_metadata(
            &conn,
            moby.id,
            "Moby-Dick",
            Some("Herman Melville"),
            None,
            None,
        )
        .unwrap();
        set_metadata(&conn, dune.id, "Dune", Some("Frank Herbert"), None, None).unwrap();

        // an annotation on Dune mentioning "whale" — a term only in Moby's story
        add_annotation(
            &conn,
            &NewAnnotation {
                book_id: dune.id,
                cfi: "epubcfi(/6/4!/4/2)".into(),
                text: "reminds me of a whale".into(),
                note: None,
                color: "yellow".into(),
                style: "highlight".into(),
            },
        )
        .unwrap();

        // title match, prefix
        assert_eq!(search(&conn, "mob").unwrap(), vec![moby.id]);
        // author match
        assert_eq!(search(&conn, "herbert").unwrap(), vec![dune.id]);
        // annotation-only match
        assert_eq!(search(&conn, "whale").unwrap(), vec![dune.id]);
        // no match / punctuation-only is safe
        assert!(search(&conn, "zzz").unwrap().is_empty());
        assert!(search(&conn, "!!!").unwrap().is_empty());

        // metadata match ranks before annotation-only match for the same term
        set_metadata(&conn, moby.id, "The Whale", Some("Melville"), None, None).unwrap();
        let hits = search(&conn, "whale").unwrap();
        assert_eq!(hits, vec![moby.id, dune.id]);

        // deleting a book removes it from the index (trigger keeps FTS in sync)
        remove_book(&conn, moby.id, false).unwrap();
        assert_eq!(search(&conn, "whale").unwrap(), vec![dune.id]);
    }
}
