# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/ovyas24/maki/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ovyas24/maki/releases/tag/v0.1.0
