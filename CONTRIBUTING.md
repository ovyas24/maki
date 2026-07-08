# Contributing to Shiori

Thanks for helping! Issues and PRs are welcome.

## Development setup

System dependencies (Arch):

```sh
sudo pacman -S --needed webkit2gtk-4.1 gtk3 base-devel rust nodejs pnpm
```

(Debian/Ubuntu: `libwebkit2gtk-4.1-dev build-essential libssl-dev librsvg2-dev`,
plus rustup and Node 22+ with pnpm.)

Run the app:

```sh
pnpm install
pnpm tauri dev
```

## Checks

Everything CI runs, locally:

```sh
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test
cd src-tauri
cargo fmt --check && cargo clippy --workspace --all-targets -- -D warnings && cargo test --workspace
```

`cargo test -p shiori-core` works without webkit installed if you only touch
the core crate.

## Ground rules

- **Architecture:** read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first.
  Rust owns files/DB; the webview owns rendering. All IPC goes through
  `src/ipc.ts`; regenerate bindings with `pnpm gen-types` when you change Rust
  models.
- **No `any`** in TypeScript. Clippy-clean Rust.
- **All user-facing strings** go through i18n (`src/i18n/en.json`).
- **No network calls.** Any future network feature must be explicitly
  user-initiated — this is a core promise of the app.
- **Design:** motion 150–250 ms ease-out, tokens from `src/styles.css`, no
  inline magic values. When in doubt, do what Apple Books does.
- **Commits:** conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`,
  `chore:`).
- **Tests:** test what breaks — import/DB logic in Rust, pure frontend logic
  (sorting, progress math, exports) in Vitest. Don't chase coverage.
