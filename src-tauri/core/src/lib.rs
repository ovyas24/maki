//! shiori-core: everything that doesn't need a webview.
//! Owns the SQLite library database, file import/hashing, cover caching,
//! and watch-folder scanning. The Tauri app crate is a thin command layer
//! over this so all logic is testable without webkit.

pub mod covers;
pub mod db;
pub mod error;
pub mod library;
pub mod models;
pub mod watch;

pub use error::{Error, Result};

use std::path::PathBuf;

fn xdg_dir(var: &str, fallback: &str) -> PathBuf {
    std::env::var_os(var)
        .map(PathBuf::from)
        .filter(|p| p.is_absolute())
        .unwrap_or_else(|| {
            let home = std::env::var_os("HOME")
                .map(PathBuf::from)
                .unwrap_or_default();
            home.join(fallback)
        })
        .join("shiori")
}

/// `$XDG_DATA_HOME/shiori` — the library database lives here.
pub fn data_dir() -> PathBuf {
    xdg_dir("XDG_DATA_HOME", ".local/share")
}

/// `$XDG_CONFIG_HOME/shiori` — settings.json lives here.
pub fn config_dir() -> PathBuf {
    xdg_dir("XDG_CONFIG_HOME", ".config")
}

/// `$XDG_CACHE_HOME/shiori` — cover thumbnails live here.
pub fn cache_dir() -> PathBuf {
    xdg_dir("XDG_CACHE_HOME", ".cache")
}
