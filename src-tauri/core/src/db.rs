use crate::Result;
use rusqlite::Connection;
use std::path::Path;

/// Migrations run in order; `PRAGMA user_version` records how many have run.
/// Never edit an entry after release — append a new one.
const MIGRATIONS: &[&str] = &[
    // 1: initial schema
    "CREATE TABLE books (
        id INTEGER PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        content_hash TEXT NOT NULL,
        format TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        language TEXT,
        description TEXT,
        cover_path TEXT,
        file_size INTEGER NOT NULL,
        added_at INTEGER NOT NULL,
        last_opened_at INTEGER,
        progress REAL NOT NULL DEFAULT 0,
        location TEXT,
        finished INTEGER NOT NULL DEFAULT 0,
        missing INTEGER NOT NULL DEFAULT 0,
        metadata_extracted INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX books_last_opened ON books (last_opened_at DESC);
    CREATE INDEX books_hash ON books (content_hash);
    CREATE TABLE annotations (
        id INTEGER PRIMARY KEY,
        book_id INTEGER NOT NULL REFERENCES books (id) ON DELETE CASCADE,
        cfi TEXT NOT NULL,
        text TEXT NOT NULL,
        note TEXT,
        color TEXT NOT NULL,
        style TEXT NOT NULL DEFAULT 'highlight',
        created_at INTEGER NOT NULL
    );
    CREATE INDEX annotations_book ON annotations (book_id);
    CREATE TABLE watch_folders (
        id INTEGER PRIMARY KEY,
        path TEXT NOT NULL UNIQUE
    );",
];

/// Open (creating if needed) the library database and run pending migrations.
pub fn open(path: &Path) -> Result<Connection> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| crate::Error::io(parent, e))?;
    }
    let conn = Connection::open(path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrate(&conn)?;
    Ok(conn)
}

/// In-memory database for tests.
pub fn open_in_memory() -> Result<Connection> {
    let conn = Connection::open_in_memory()?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrate(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> Result<()> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    for (i, sql) in MIGRATIONS.iter().enumerate().skip(version as usize) {
        conn.execute_batch(sql)?;
        conn.pragma_update(None, "user_version", (i + 1) as i64)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_run_once_and_are_idempotent() {
        let conn = open_in_memory().unwrap();
        let v: i64 = conn
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .unwrap();
        assert_eq!(v as usize, MIGRATIONS.len());
        migrate(&conn).unwrap(); // second run is a no-op
        conn.execute("INSERT INTO watch_folders (path) VALUES ('/tmp/x')", [])
            .unwrap();
    }
}
