# Repository Guidelines

## Project Structure & Module Organization

Maki is a Tauri 2 desktop app. The React/TypeScript webview lives in `src/`: shared UI is in `components/`, feature code in `features/`, Zustand state in `store/`, translations in `i18n/`, and all backend calls in `ipc.ts`. Generated Rust-to-TypeScript models are kept in `src/bindings/`; do not edit them manually. The Rust application is under `src-tauri/`, with reusable database, import, cover, and watch-folder logic in the `src-tauri/core` crate. Tests sit beside the code as `*.test.ts` or Rust `#[cfg(test)]` modules. Packaging files are in `packaging/`, documentation in `docs/`, and static assets in `public/` and `src-tauri/icons/`.

## Build, Test, and Development Commands

- `pnpm install` installs JavaScript dependencies (Node 22+).
- `pnpm tauri dev` runs the complete desktop app; `pnpm dev` runs only Vite.
- `pnpm build` type-checks and builds the web frontend; `pnpm tauri build` produces release binaries.
- `pnpm test` runs Vitest once. `cd src-tauri && cargo test --workspace` runs Rust tests.
- `pnpm lint`, `pnpm typecheck`, and `pnpm format:check` match frontend CI checks.
- `cd src-tauri && cargo fmt --check && cargo clippy --workspace --all-targets -- -D warnings` validates Rust.
- `pnpm gen-types` regenerates bindings after changing shared Rust models.

## Coding Style & Naming Conventions

Use Prettier defaults for TypeScript, TSX, and CSS (two-space indentation) and `cargo fmt` for Rust. TypeScript is strict: avoid `any`, unused values, and bypassing typed wrappers in `src/ipc.ts`. Use `PascalCase` for React components, `camelCase` for functions and hooks, and descriptive lowercase Rust modules. Put every user-facing string in `src/i18n/en.json`; use design tokens from `src/styles.css` instead of inline magic values. Rust must remain Clippy-clean.

## Testing Guidelines

Add Vitest tests for pure frontend behavior such as sorting, progress math, and exports. Test database, import, and filesystem logic in Rust; `cargo test -p maki-core` avoids WebKit requirements. Name frontend tests `<module>.test.ts`. There is no coverage quota: prioritize regressions and failure-prone logic.

## Commit & Pull Request Guidelines

Follow the existing Conventional Commit style, optionally with a scope: `feat(reader): add bookmarks`, `fix(aur): bump pkgver`, or `docs: clarify setup`. Keep commits focused. Pull requests should explain the change and verification performed, link relevant issues, and include before/after screenshots for visible UI work. Run all applicable checks above before requesting review. Read `docs/ARCHITECTURE.md` before changing boundaries: Rust owns files and the database, while the webview owns rendering. Do not add network calls without explicit, user-initiated behavior.
