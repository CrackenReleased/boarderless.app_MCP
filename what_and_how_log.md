# What and How Log

## 2026-07-02 19:55:00 — docs: Pin hosted OpenAI and Microsoft OAuth boundaries before first npm publication (v0.1.26)

- **Decision point:** The local npm package remains provider-neutral `stdio`; hosted ChatGPT Apps and Copilot Studio are separate future adapters and are not implied by npm publication.
- **OpenAI boundary:** Documented the missing HTTPS MCP resource server, OAuth 2.1 authorization-code/PKCE flow, protected-resource and authorization-server discovery, client registration, ChatGPT callback, scoped resource/audience validation, and submission/security validation.
- **Microsoft boundary:** Documented the missing Streamable HTTP endpoint, OAuth 2.0 DCR/discovery or manual registration, Copilot callback, token lifecycle/tenant controls, and Copilot publish validation.
- **Shared architectural boundary:** OAuth authenticates a user but cannot reach that user's localhost browser/CDP session. Both hosted paths need a separately reviewed, user-controlled remote-to-visible-canvas bridge, tool policy, rate limits, audit logs, and privacy controls.
- **Regression coverage:** `src/verify_package_contents.js` now requires these boundaries in every public documentation surface included in the npm tarball.
- **Sources:** OpenAI Apps SDK authentication guidance and Microsoft Copilot Studio MCP onboarding/creation guidance, reviewed 2026-07-02.

## 2026-07-02 17:55:00 — security: Define a least-publication npm boundary (v0.1.26)

- **Decision point:** npm now receives an explicit allowlist instead of inheriting almost the entire Git working tree through `.gitignore` fallback behavior.
- **Privacy boundary:** Public installation contains only the MCP entry point, board-file runtime, two runtime photo helpers, function manifest, required public documentation, README, license, changelog, and package metadata. Boards, desktop application sources, UI assets, workflows, and internal diagnostics stay local.
- **Brand boundary:** npm metadata identifies the publisher as Boarderless while retaining the existing public source repository and Boarderless homepage.
- **Regression coverage:** `src/verify_package_contents.js` runs `npm pack --dry-run --json`, requires every runtime file, rejects internal artifact classes, and caps both file count and unpacked size. The test failed against the original 106-file preview and passes against the 12-file allowlist.
- **Sibling scan:** Reviewed every local file category emitted by npm's preview and every filesystem/import dependency of `src/mcp-stdio-server.js`; the two lazy-loaded helper modules and `src/board-files.js` are included, with no other runtime-relative dependencies found.
- **Release continuity:** After first-publication approval, a versioned MCP production release is complete only when the identical version is pushed to GitHub, published to npm, verified through `npm view`, and recorded in handoff. The package regression pins this policy across README, operator runbook, and distribution documentation.

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
## 2026-07-02 12:58:00 — Ai Partner provider-connectivity alignment (v0.1.24)

- **What:** Updated the MCP product catalog, README, package metadata, and setup UI wording to reflect Boarderless Ai Partner support for Gemini, OpenAI, Anthropic Claude, Z.AI/GLM, local models, and custom OpenAI-compatible endpoints.
- **Why:** The MCP server and the in-app Ai Partner are separate agent surfaces. Campaign documentation must explain the expanded in-app provider choices without implying that cloud-model API keys pass through MCP.
- **Verification:** MCP test suite and Boarderless feature-map congruence run as release gates.
## 2026-07-02 13:40:00 — Canonical Style Remix MCP parity (v0.1.25)

- **What:** Added `remix_style` to the MCP mutation allowlist, function manifest, README, and feature catalog.
- **Why:** External agents must invoke the same palette catalog, scope rules, and atomic undo behavior as humans using Canvas or Play; reconstructing bulk style changes through repeated `mutate_object` calls would fragment undo and drift from the product.
- **Verification:** Boarderless live bridge regression applies a remix and proves one Undo restores the original style; MCP server tests cover tool discovery and non-blocking startup.
