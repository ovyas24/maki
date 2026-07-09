# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-07-09

### Added

- Live page-layout controls in the reader: column count (auto / single /
  double) and adjustable line width, applied instantly while reading.
- Auto-scroll for continuous mode, with a play/pause control and adjustable
  speed; pauses on manual navigation.
- In-book full-text search with results grouped by chapter, jump-to-match, and
  automatic match highlighting (`f` / Ctrl+F).
- Bookmarks: quick-bookmark the current page (toggle button or `b`), listed at
  the top of the Contents panel to jump back to.
- Night reading overlay: adjustable brightness (dim) and warmth.
- Chapter navigation (`[` / `]`) and jump to book start/end (Home / End).

### Fixed

- The page-turn effect no longer plays a phantom animation at the first page
  (Previous) or the last page (Next).
- The page-turn shadow is now locked to foliate's page slide (matching its
  300ms easeOutQuad and one-page-width travel), fixing the misaligned sweep.

## [0.2.0] - 2026-07-08

### Added

- Animated launch screen on cold start (Maki ribbon mark), fading into the
  library once loaded.
- Reader page-turn animation with a "paper slide" — a soft leading-edge shadow
  sweeps across in the turn direction over the page motion; toggleable in the
  typography panel.
- Crossfade transitions when switching app theme and navigating between the
  library, reader, and settings (via the View Transitions API where the
  engine supports it).
- Staggered entrance animation for library grid covers.
- Full-text search (SQLite FTS5) across book titles, authors, and annotation
  text — the library search box now finds books by what you highlighted, not
  just their metadata.

### Changed

- All motion respects `prefers-reduced-motion`: animations collapse to instant
  when the system requests reduced motion.

## [0.1.1] - 2026-07-08

### Changed

- Project renamed to **Maki** (the `shiori` name was already taken by another
  ebook reader). New identifier `dev.maki.Maki`; data now lives under
  `~/.config/maki`, `~/.local/share/maki`, `~/.cache/maki`.

### Fixed

- Release workflow derives the version from the git tag and syncs it into all
  manifests before building, so bundle artifacts carry the tagged version.
- AUR packaging: disable makepkg LTO to fix a rusqlite link failure; stop
  tracking a nested Cargo `target/` directory that bloated the source tarball.

## [0.1.0] - 2026-07-08

### Added

- Library with grid and list views, cover thumbnails (cached as WebP), instant
  fuzzy search, and sorting by recently opened / recently added / title /
  author / progress.
- "Continue Reading" hero row with progress rings for the 4 most recent books.
- Import via file picker, drag-and-drop, and auto-importing watch folders.
  Books are referenced in place (path + content hash) — never copied. Missing
  files are flagged, not dropped.
- Reader for EPUB, MOBI, AZW3, FB2, CBZ (foliate-js) and PDF (pdf.js), with
  paginated and continuous-scroll modes, click zones, keyboard and wheel page
  turns, and a table of contents sidebar with current-chapter highlighting.
- Typography controls: three bundled fonts (Literata, Inter, JetBrains Mono),
  size, line height, margins, justification, hyphenation.
- Five reader themes (Light, Sepia, Gray, Dark, true-black OLED), independent
  of app chrome theme; app chrome in light/dark/system with a configurable
  accent color.
- Reading progress persisted per book (CFI, debounced), percentage, page
  numbers, and a time-left-in-chapter estimate calibrated to measured reading
  speed.
- Annotations: 4 highlight colors, underline, notes, copy; sidebar with
  jump-to-annotation; Markdown export.
- Distraction-free fullscreen (F11), keyboard shortcut overlay (?), remembered
  window size/position, i18n scaffolding (English, Japanese stub).
- Zero telemetry, zero network requests.

[Unreleased]: https://github.com/ovyas24/maki/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/ovyas24/maki/releases/tag/v0.3.0
[0.2.0]: https://github.com/ovyas24/maki/releases/tag/v0.2.0
[0.1.1]: https://github.com/ovyas24/maki/releases/tag/v0.1.1
[0.1.0]: https://github.com/ovyas24/maki/releases/tag/v0.1.0
