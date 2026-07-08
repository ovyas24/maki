use crate::{Error, Result};
use image::imageops::FilterType;
use std::path::{Path, PathBuf};

/// Thumbnails are bounded to this box (2x a ~240px-wide grid cell).
const MAX_W: u32 = 480;
const MAX_H: u32 = 720;

/// Decode a cover image (any common format), downscale it, and cache it as
/// `<cache_dir>/covers/<book_id>.webp`. Returns the cached path.
pub fn cache_cover(cache_dir: &Path, book_id: i64, bytes: &[u8]) -> Result<PathBuf> {
    let dir = cache_dir.join("covers");
    std::fs::create_dir_all(&dir).map_err(|e| Error::io(&dir, e))?;
    let img = image::load_from_memory(bytes)?;
    let img = if img.width() > MAX_W || img.height() > MAX_H {
        img.resize(MAX_W, MAX_H, FilterType::CatmullRom)
    } else {
        img
    };
    let path = dir.join(format!("{book_id}.webp"));
    // ponytail: the image crate only writes lossless WebP; at thumbnail size
    // that's ~50KB per cover. Swap in the `webp` crate for lossy if cache size
    // ever matters.
    img.to_rgb8()
        .save_with_format(&path, image::ImageFormat::WebP)?;
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn caches_and_downscales() {
        let dir = tempfile::tempdir().unwrap();
        // 1000x2000 solid-color source, PNG-encoded
        let src = image::DynamicImage::ImageRgb8(image::RgbImage::from_pixel(
            1000,
            2000,
            image::Rgb([180, 120, 40]),
        ));
        let mut bytes = Vec::new();
        src.write_to(
            &mut std::io::Cursor::new(&mut bytes),
            image::ImageFormat::Png,
        )
        .unwrap();

        let path = cache_cover(dir.path(), 7, &bytes).unwrap();
        assert!(path.ends_with("covers/7.webp"));
        let out = image::open(&path).unwrap();
        assert!(out.width() <= MAX_W && out.height() <= MAX_H);
        // aspect ratio preserved (1:2)
        assert_eq!(out.height(), out.width() * 2);

        // garbage input errors instead of panicking
        assert!(cache_cover(dir.path(), 8, b"not an image").is_err());
    }
}
