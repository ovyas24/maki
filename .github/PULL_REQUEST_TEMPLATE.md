## What

<!-- What does this PR change, and why? Link related issues. -->

## How to test

<!-- Steps a reviewer can follow to verify the change. -->

## Checklist

- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass
- [ ] `cargo fmt --check && cargo clippy --workspace --all-targets -- -D warnings && cargo test --workspace` pass (in `src-tauri/`)
- [ ] User-facing strings go through i18n (`src/i18n/en.json`)
- [ ] Conventional commit messages (`feat:`, `fix:`, `docs:`, …)
