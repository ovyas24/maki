use std::path::PathBuf;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("database error: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("io error on {path}: {source}")]
    Io {
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("unsupported format: {0}")]
    UnsupportedFormat(String),
    #[error("book not found: id {0}")]
    BookNotFound(i64),
    #[error("image error: {0}")]
    Image(#[from] image::ImageError),
    #[error("watch error: {0}")]
    Watch(#[from] notify::Error),
}

impl Error {
    pub fn io(path: impl Into<PathBuf>, source: std::io::Error) -> Self {
        Error::Io {
            path: path.into(),
            source,
        }
    }
}

pub type Result<T> = std::result::Result<T, Error>;
