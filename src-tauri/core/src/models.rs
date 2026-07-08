use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// A book in the library. Files are referenced in place, never copied;
/// `missing` is set when the file can no longer be found at `path`.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Book {
    #[ts(type = "number")]
    pub id: i64,
    pub path: String,
    pub content_hash: String,
    /// One of: epub, mobi, azw3, fb2, fbz, cbz, pdf
    pub format: String,
    pub title: String,
    pub author: Option<String>,
    pub language: Option<String>,
    pub description: Option<String>,
    pub cover_path: Option<String>,
    #[ts(type = "number")]
    pub file_size: i64,
    #[ts(type = "number")]
    pub added_at: i64,
    #[ts(type = "number | null")]
    pub last_opened_at: Option<i64>,
    /// 0..1 fraction of the book read.
    pub progress: f64,
    /// Opaque reader location (CFI for foliate-js books).
    pub location: Option<String>,
    pub finished: bool,
    pub missing: bool,
    /// False until the webview has extracted title/author/cover via foliate-js.
    pub metadata_extracted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Annotation {
    #[ts(type = "number")]
    pub id: i64,
    #[ts(type = "number")]
    pub book_id: i64,
    pub cfi: String,
    /// The selected text at creation time.
    pub text: String,
    pub note: Option<String>,
    /// One of: yellow, green, blue, pink
    pub color: String,
    /// "highlight" or "underline"
    pub style: String,
    #[ts(type = "number")]
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct NewAnnotation {
    #[ts(type = "number")]
    pub book_id: i64,
    pub cfi: String,
    pub text: String,
    pub note: Option<String>,
    pub color: String,
    pub style: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct WatchFolder {
    #[ts(type = "number")]
    pub id: i64,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase", tag = "status")]
#[ts(export)]
pub enum ImportResult {
    Imported { book: Box<Book> },
    Duplicate { path: String },
    Unsupported { path: String },
    Failed { path: String, message: String },
}
