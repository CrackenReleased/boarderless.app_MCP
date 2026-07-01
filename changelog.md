# Changelog

## v0.1.22 — 2026-07-02 — POLICY: Remove quantified performance claim (v0.1.22)

**Date:** 2026-07-02 01:20:00

- Replaced the quantified frame-rate claim in the canonical tactile-fluidity board with honest Local First language.
- The Boarderless repository's commercial-policy regression guard now scans MCP documentation and board assets to prevent recurrence.
- Aligned MCP server, desktop, UI, and package versions to v0.1.22.

## v0.1.21 — 2026-06-30 — FEAT: Always-save canonical board files in agent workspaces (v0.1.21)

**Date:** 2026-06-30 21:38:00

- Added workspace-contained, atomic `.bdrl.json` autosaves after every successful canvas mutation tool.
- Added `get_board_workspace`, `set_board_workspace`, `export_board_file`, and `import_board_file` backend tools.
- Added schema/path validation, stable board identity filenames, stale-name cleanup, and explicit autosave failure metadata.
- Documented the required agent import/export/handoff workflow and synchronized all static tool catalogs.
- Added executable board-file regression coverage and aligned MCP/Tauri/UI versions to v0.1.21.

## v0.1.20 — 2026-06-30 — CONTENT: Add canonical Boarderless showcase boards (v0.1.20)

**Date:** 2026-06-30 20:27:00

- Added five schema-v2 canonical Boarderless board packages: Infinite Canvas, Lossless Studio, Mom's Scrapbook, Nerds MCP, and Tactile Fluidity.
- Validated every package as parseable JSON with unique object IDs and required shape/text synchronization metadata.
- Corrected the stale package-lock version and aligned all MCP/Tauri/UI version surfaces to v0.1.20.

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
