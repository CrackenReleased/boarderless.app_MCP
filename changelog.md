# Changelog

## v0.2.541 — 2026-07-13 — RELEASE: Match the Boarderless production version

**Date:** 2026-07-13 21:53:00

- Aligned the public npm package, runtime server, MCP manifest, remote adapter, desktop configuration, UI label, README examples, and all project lockfiles with Boarderless production v0.2.541.
- Preserved the existing local-stdio package surface; this release synchronizes delivery/version identity and includes the already-committed v0.1.28 runtime fixes that had not reached npm.
- Upgraded `@modelcontextprotocol/sdk` to 1.29.x, clearing the high-severity ReDoS and DNS-rebinding advisories before publication; the remaining audit findings are moderate Jimp/file-parser advisories requiring a separate breaking API migration.
- Verified tests, package allowlist contents, dry-run publication, GitHub delivery, and the public npm registry version before declaring the release complete.

## v0.1.28 — 2026-07-08 — DEPLOY: Version alignment for npm & repository sync

**Date:** 2026-07-08 18:02:00

- Bumped package and server versions to `0.1.28` across `package.json`, `manifest.json`, `src/mcp-stdio-server.js`, `remote-adapter/package.json`, `remote-adapter/src/server.ts`, and Tauri workspace configuration files.
- Re-synchronized the public npm package registry to align with repository changes.

## v0.1.27 — 2026-07-05 — FEAT: Implement Blender Render & Remove Dispatcher

**Date:** 2026-07-05 15:30:00

- Implemented `render_board_in_blender` tool allowing agents to create 3D renders of the canvas using Blender.
- Removed `execute_mcp_command` catch-all compatibility dispatcher tool per Anthropic directory review guidelines.
- Swapped in 512×512 `icon.png` per Anthropic recommendations.
- Reconstructed server logic with pathToFileURL ESM dynamic import fix on Windows.
- Added tool attestation and submission verification documentation.

## v0.1.26 — 2026-07-03 — DEPLOY: Publish VS Code Extension & Implement Remote Adapter Bridge

**Date:** 2026-07-03 17:48:00

- Scaffolded the dedicated `boarderless-vscode` extension project workspace, integrating programmatic MCP server registration.
- Successfully published `boarderless.boarderless-vscode` v0.1.26 to the official VS Code Extension Marketplace.
- Added detailed token renewal (July 2, 2027 expiration) and update synchronization runbooks to `docs/connector_operator_runbook.md`.
- Scaffolded `remote-adapter` server subproject implementing SSE transport and WebSocket bridge to forward hosted MCP tool calls, and created Dockerfile/fly.toml configurations.

- Reduced the npm package preview from 106 files / 3.88 MB unpacked to 12 intentional files / approximately 131 KB unpacked.
- Excluded all canonical `.bdrl.json` boards, Tauri desktop sources and icons, UI assets, workflows, test/debug scripts, and unrelated development utilities from publication.
- Added package metadata for the Boarderless organization, public access, repository, homepage, and issue tracker.
- Added an executable regression guard that fails if internal artifacts re-enter the npm tarball.
- Aligned public status examples and the runtime server version to v0.1.26.
- Established npm as a mandatory synchronized delivery target for every future versioned production MCP release after the first publication is approved; documentation-only commits are exempt.
- Added explicit OpenAI and Microsoft hosted-connector gap checklists: remote transport, OAuth discovery/client registration/callbacks, scoped token validation, and the separate secure remote-to-visible-canvas session bridge are not part of the local npm package.
- Restored deterministic GitHub Actions builds by tracking `package-lock.json`, upgrading checkout/setup-node to their Node 24 action runtimes, and pinning the workflow/lockfile contract with regression assertions.
- Granted the release workflow least-privilege `contents: write` access so Tauri can create the versioned draft release with `GITHUB_TOKEN`.

## v0.1.23 — 2026-07-02 — DOCS: Align the complete app and MCP capability maps

**Date:** 2026-07-02 02:24:00

- Replaced the stale abbreviated RAG catalog with a complete, human-readable map of the shipped Boarderless product.
- Corrected plan limits, export formats, Local First/Drive boundaries, and the distinction between Ai Partner and external MCP agents.
- Documented the complete MCP canvas, history, grouping, export, and durable `.bdrl.json` tool surfaces without implying unsupported image upload or inherited Google access.
- Aligned package, server, desktop, Cargo, README examples, and UI versions to v0.1.23.

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
# v0.1.24 — 2026-07-02 — Align Ai Partner provider documentation

- Documented Gemini, OpenAI, Anthropic Claude, Z.AI/GLM, local-model, and custom OpenAI-compatible Ai Partner connectivity.
- Clarified that Ai Partner provider traffic is direct from the browser and remains separate from the MCP server transport.
- Standardized touched references to “Ai.”
# v0.1.25 — 2026-07-02 — Add canonical `remix_style`

- Exposed Boarderless Style Remix through MCP with the same palette IDs and selection-first scope as Canvas, Play, and Ai Partner.
- Treats an entire remix as one undoable mutation and refreshes the configured `.bdrl.json` artifact after success.
- Updated the canonical function manifest and product catalog.
