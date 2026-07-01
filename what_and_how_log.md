# What and How Log

## 2026-07-02 02:24:00 — docs: Make MCP documentation congruent with the complete app (v0.1.23)

- **Decision point:** The MCP catalog now explains both the full application and the narrower external-agent control surface, preventing agents from confusing an app feature with an MCP permission.
- **Product truth:** Corrected Local First, optional Drive sync, plan limits, SVG and Slides-compatible JSON export, Ai Partner, image editing, presentation, grouping, minimap, and durable board-file descriptions.
- **Boundaries:** Explicitly states that MCP does not inherit Google identity, upload arbitrary image nodes, bypass plan rules, or perform the Ai Partner's local background-removal action.
- **Regression coverage:** Boarderless `verify:feature-map` checks required product capabilities and every canonical MCP tool across the public page, README, and RAG catalog.

## 2026-07-02 01:20:00 — policy: Keep MCP assets honest about Local First (v0.1.22)

- **Decision point:** The MCP board asset now presents Local First interaction rather than turning the capture machine's frame rate into a universal product promise.
- **Regression coverage:** `E:\boarderless\scripts\verify-commercial-policy.mjs` scans the MCP repository and rejects quantified frame-rate and hardware-performance promises.
- **Versioning:** Aligned the package, server, desktop, Cargo, README examples, and UI to v0.1.22.

## 2026-06-30 21:38:00 — feat: Always-save canonical board files in agent workspaces (v0.1.21)

- **Decision point**: The MCP server now owns durable workspace artifact policy, while the browser persistence layer remains the canonical serializer/importer for IndexedDB and image Blob fidelity.
- **Automatic save**: Successful create, mutate, delete, group, ungroup, reorder, undo, and redo calls request a fresh schema-v2 snapshot and atomically replace `<board-name>--<board-id>.bdrl.json` in the configured workspace.
- **Backend tools**: Added workspace inspection/configuration plus explicit board-file import/export. Filenames are basename-only, `.bdrl.json`-only, and path-contained.
- **Failure semantics**: A completed canvas mutation is never retried blindly if filesystem persistence fails; the tool result includes an `autosave_failed` record directing the agent to perform an explicit final export.
- **Regression coverage**: `src/verify_board_files.js` verifies validation, containment, atomic output, stable identity cleanup, explicit exports, and server integration anchors.
- **Documentation**: README, feature catalog, functions registry, and desktop tool reference now teach agents to confirm the workspace before work and report the final board-file path at handoff.

## 2026-06-30 20:27:00 — content: Add canonical Boarderless showcase boards (v0.1.20)

- **Context**: The reusable campaign boards created through the live Boarderless MCP surface needed canonical, importable packages alongside the MCP project.
- **What changed**: Added `Infinite_Canvas.bdrl.json`, `Lossless_Studio.bdrl.json`, `Moms_Scrapbook.bdrl.json`, `Nerds_MCP.bdrl.json`, and `Tactile_Fluidity.bdrl.json`; aligned package, lockfile, server, Tauri, and dashboard versions to v0.1.20.
- **Validation**: Parsed all five files, asserted schema version 2, checked required `shapes` and `text` collections, unique object IDs, and synchronization metadata, then ran the MCP regression suite.
- **Why**: Keeps demonstrable Boarderless/MCP artifacts portable and versioned without coupling them to the web application repository.

## 2026-06-30 17:18:34 — feat: Register missing canvas tools and align version to v0.1.19 (v0.1.19)

- **Context**: The Boarderless MCP server requires alignment between its dynamic runtime tool discovery and the static catalogs used by offline Ai models (like Ollama and Hermes) and the Tauri desktop dashboard reference.
- **What changed**:
  1. **Registered 7 Canvas Tools**: Added `create_object`, `delete_objects`, `history_undo`, `history_redo`, `group_objects`, `ungroup_objects`, and `reorder_object` to the compatibility registry in `functions.json`, the repository documentation in `README.md`, `docs/features_catalog.md`, and the inline tool schemas in `ui/index.html`.
  2. **Aligned version globally to v0.1.19**: Updated `package.json`, `src/mcp-stdio-server.js`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, and `ui/index.html`.
  3. **Compiled Tauri binaries**: Executed the Tauri release build and successfully updated `setup.exe` and `Boarderless MCP.exe` in the root folder with the new build.
  4. **Ran Tests**: Verified functionality using `npm test`, executing all local validation gates.
- **Why**: Ensures that offline LLM harnesses connecting to the MCP bridge have complete schema specifications for all spatial mutations, matching the web canvas.
