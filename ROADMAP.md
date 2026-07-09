# Roadmap

Shipped features live in [CHANGELOG.md](CHANGELOG.md). This file tracks what's
next. Nothing here is a promise; PRs welcome on any of it.

## v0.2.x

- **Dictionary lookup** on selection — offline via bundled WordNet or
  user-supplied StarDict dictionaries; online fallback to the Wiktionary API
  (user-initiated only). Shown in the selection popover.
- **Reading stats** — daily reading time, streaks, pages/hour, per-book time,
  with a calendar heatmap page.
- **Collections/shelves** — user-created shelves plus smart shelves (Unread,
  In Progress, Finished).
- **Metadata editing** — fix title/author/cover manually; fetch metadata and
  covers from the Open Library API by ISBN/title (explicit user action only,
  never automatic).
- **Text-to-speech** via `speech-dispatcher` (works with piper through spd
  configuration): play/pause, sentence highlighting following audio,
  adjustable rate.
- **OPDS catalog browser** — add a catalog URL, browse, download into the
  library.

## Later

- **Device sync** — progress/annotations sync between devices via a
  user-supplied WebDAV or Syncthing folder. File-based; no server of ours.
- **Comic mode** — two-page spreads and RTL manga mode for CBZ.
- **Sideloading helper** for Kobo/Kindle devices.
- **Plugin/theme system.**
- **Flatpak** packaging (manifest stub in `packaging/flatpak/`).

## Reader polish (deferred from 0.3)

- Per-book layout/typography overrides (currently global).
- Reading ruler / line-focus mode.
- "Respect publisher styles" toggle (vs Maki's overrides).
- Auto-page-advance in paginated mode (auto-scroll's paginated counterpart).
