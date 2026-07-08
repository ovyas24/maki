# Release checklist — cutting v0.1.0

## 0. Prerequisites (one-time)

- [ ] Create the GitHub repo (`gh repo create ovyas24/shiori --public`) and
      push `main`.
- [ ] Take the hero screenshot: library grid in dark mode with ~10 books and
      the Continue Reading row → `docs/screenshots/hero.png` (see the HTML
      comment in README.md). Commit it.
- [ ] AUR account at <https://aur.archlinux.org> with your SSH public key
      added (Account → SSH Public Key).

## 1. Verify

- [ ] `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
- [ ] In `src-tauri/`: `cargo fmt --check && cargo clippy --workspace
      --all-targets -- -D warnings && cargo test --workspace`
- [ ] `pnpm tauri build` succeeds; run the binary, import a few books
      (EPUB, MOBI, CBZ, PDF), read, highlight, export annotations.
- [ ] Cold start < 1 s, EPUB open < 500 ms (feel, not lab numbers).
- [ ] CI is green on `main`.

## 2. Tag and release

- [ ] Update `CHANGELOG.md` (move Unreleased → the version, date it).
- [ ] Version is consistent: `package.json`, `src-tauri/tauri.conf.json`,
      `src-tauri/Cargo.toml` all say `0.1.0`.
- [ ] `git tag v0.1.0 && git push origin v0.1.0`
- [ ] The release workflow builds deb/rpm/AppImage + tarball and drafts a
      GitHub Release with the changelog excerpt. Review the draft, download
      and smoke-test the AppImage, then **publish**.

## 3. Publish to the AUR

```sh
git clone ssh://aur@aur.archlinux.org/shiori.git aur-shiori
cd aur-shiori
cp /path/to/shiori/packaging/aur/PKGBUILD .
updpkgsums                          # real sha256 of the release tarball
makepkg --printsrcinfo > .SRCINFO
makepkg -si                         # full test build + install
namcap PKGBUILD shiori-0.1.0-1-x86_64.pkg.tar.zst
git add PKGBUILD .SRCINFO
git commit -m "v0.1.0"
git push                            # this publishes the package
```

- [ ] Check <https://aur.archlinux.org/packages/shiori> renders correctly and
      `yay -S shiori` works on a clean system/container.

## 4. Announce

Post after the AUR package is installable. Lead with the screenshot.

- [ ] **r/archlinux** — flair "Share", title like:
      *"Shiori — a new ebook reader for Linux (Tauri, EPUB/MOBI/PDF), now in
      the AUR"*. Mention: no Electron, zero network calls, books referenced
      in place. Link repo + AUR.
- [ ] **r/linux** — same post, slightly less Arch-specific; note deb/rpm/
      AppImage on the releases page.
- [ ] **Hacker News — Show HN template:**

  > **Title:** Show HN: Shiori – A fast, beautiful ebook reader for Linux
  >
  > **URL:** https://github.com/ovyas24/shiori
  >
  > **First comment:**
  > I built Shiori because Linux never quite got an Apple Books-style
  > reader: real covers, careful typography, and a library that doesn't
  > take over your files.
  >
  > It's Tauri 2 (Rust + system WebKitGTK, no Electron) with foliate-js
  > doing the rendering — EPUB, MOBI/AZW3, FB2, CBZ, and PDF. Books are
  > referenced in place with a content hash, never copied into an opaque
  > library folder. Highlights/notes export to Markdown. Zero network
  > requests — no telemetry, nothing phones home.
  >
  > Arch: `yay -S shiori` · deb/rpm/AppImage on the releases page.
  > Roadmap: dictionaries, reading stats, shelves, TTS, OPDS.
  > Happy to answer anything about Tauri vs Electron for this kind of app.

- [ ] Watch the issue tracker for format-specific rendering bugs the first
      week; foliate-js edge cases surface fast once real libraries hit it.
