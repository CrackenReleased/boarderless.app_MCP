# What and How Log

## 2026-06-30 17:18:34 — feat: Register missing canvas tools and align version to v0.1.19 (v0.1.19)

- **Context**: The Boarderless MCP server requires alignment between its dynamic runtime tool discovery and the static catalogs used by offline Ai models (like Ollama and Hermes) and the Tauri desktop dashboard reference.
- **What changed**:
  1. **Registered 7 Canvas Tools**: Added `create_object`, `delete_objects`, `history_undo`, `history_redo`, `group_objects`, `ungroup_objects`, and `reorder_object` to the compatibility registry in `functions.json`, the repository documentation in `README.md`, `docs/features_catalog.md`, and the inline tool schemas in `ui/index.html`.
  2. **Aligned version globally to v0.1.19**: Updated `package.json`, `src/mcp-stdio-server.js`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, and `ui/index.html`.
  3. **Compiled Tauri binaries**: Executed the Tauri release build and successfully updated `setup.exe` and `Boarderless MCP.exe` in the root folder with the new build.
  4. **Ran Tests**: Verified functionality using `npm test`, executing all local validation gates.
- **Why**: Ensures that offline LLM harnesses connecting to the MCP bridge have complete schema specifications for all spatial mutations, matching the web canvas.
