# Changelog

## v0.1.19 — 2026-06-30 — FEAT: Register missing canvas tools and align version globally (v0.1.19)

**Date:** 2026-06-30 17:18:00

- **Registered Canvas Tools**: Synced the offline/compatibility tool registries with the latest canvas capabilities by adding the 7 missing canvas tools to the static definitions (`functions.json`, `README.md`, `docs/features_catalog.md`, and the `ui/index.html` Ollama schema reference). The newly registered tools are:
  - `create_object`
  - `delete_objects`
  - `history_undo`
  - `history_redo`
  - `group_objects`
  - `ungroup_objects`
  - `reorder_object`
- **Global Version Alignment**: Bumped and aligned project version references to `v0.1.19` across `package.json`, `src/mcp-stdio-server.js`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, and `ui/index.html`.
- **Tauri Application Compile**: Successfully compiled the updated Tauri application executable into `setup.exe` and `Boarderless MCP.exe` in the project root directory.
- **Regression Verification**: Confirmed that all local regression test suites (`verify_shortcut.js` and `verify_nonblocking_auth.js`) pass successfully.
