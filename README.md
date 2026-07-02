# Boarderless Model Context Protocol (MCP) Server

> [!IMPORTANT]
> **Operating System & Browser Support**: This Model Context Protocol (MCP) server and launcher tool are designed and optimized **specifically for Windows and Google Chrome**. Chromium-based browsers (including Microsoft Edge, Brave Browser, and Opera) are also supported on Windows. Other platforms (such as macOS or Linux) are supported as fallbacks but are not the primary target.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

A Model Context Protocol (MCP) server for **Boarderless**, allowing Ai agents (like Claude Desktop, Cursor, and Claude Code) to inspect and edit the live browser-resident canvas directly. Boarderless remains Local First: the browser owns the working canvas, and this server connects an agent to that visible local session rather than inventing a hidden cloud copy.

Looking for the app-wide map—canvas tools, image editing, slides, Ai Partner, persistence, plan boundaries, and the exact MCP subset? Ai agents connecting to this repository should parse the [Boarderless Product & MCP Feature Catalog](docs/features_catalog.md) before proposing work.

Rather than scraping pixels or guessing layouts from DOM selectors, agents communicate with a clean, typed spatial ledger.

---

## ⚡ Quick Start (TL;DR)

**Step 1: Start the Interactive Configurator (Windows, Mac, or Linux)**
Run the installer to configure your environment and client settings:
*   **Windows (PowerShell)**:
    ```powershell
    Set-ExecutionPolicy Bypass -Scope Process -Force; .\src\setup.ps1
    ```
*   **Mac / Linux (Terminal)**:
    ```bash
    chmod +x ./src/setup.sh && ./src/setup.sh
    ```

**Step 2: Choose Option 1 (Standard Auto-Setup)**
The interactive installer will:
1. Explain permissions (browser connection, file access).
2. Install pure JavaScript dependencies automatically.
3. Register the MCP server in your Claude Desktop configuration.
4. Provide immediate copy-paste instructions for Cursor or Windsurf.

---

## Architecture Overview

```
+------------------+                   +--------------------+
|  Ai Agent Client |                   | Boarderless App    |
|  (Claude/Cursor) |                   | (Zustand + React)  |
+--------+---------+                   +---------+----------+
         |                                       ^
         | (Stdio JSON-RPC)                      | (window.boarderlessMcp)
         v                                       v
+------------------+  CDP / Puppeteer  +---------+----------+
|    MCP Server    +------------------>|  Chrome / Edge     |
| (Stdio Transport)|                   |  Debugging Port    |
+------------------+                   +--------------------+
```

1. **Boarderless Web App**: Exposes `window.boarderlessMcp` containing typed tool execution methods over Zustand state.
2. **MCP Server (`mcp-stdio-server.js`)**: Connects to the browser via Chrome DevTools Protocol (CDP), maps incoming stdio messages to the browser runtime, and checks authentication. If the remote debugging port (9222) is closed, the server automatically scans and launches Chrome or Edge in remote-debugging mode.
3. **Ai Agent**: Connects as a client to the MCP server's stdio transport.
4. **Workspace Board File**: After every successful canvas mutation, the MCP server asks the browser persistence layer for the canonical schema-v2 snapshot and atomically writes `<board-name>--<board-id>.bdrl.json` into the configured local workspace.

### One product, two different agent surfaces

- **Ai Partner** lives inside the Boarderless app. It interprets supported natural-language canvas requests through Gemini, OpenAI, Anthropic Claude, Z.AI/GLM, local models, or a custom OpenAI-compatible endpoint, and performs local per-image background removal.
- **Boarderless MCP** connects external agent clients to the running, human-visible canvas. It can inspect, measure, create supported text/shapes, mutate, delete, group, ungroup, reorder, undo, redo, export, and maintain durable `.bdrl.json` artifacts.
- MCP does not inherit the user's Google identity, grant itself Drive access, upload arbitrary local images into the canvas, or bypass plan restrictions. Those boundaries stay with the human and the app.

The complete app feature surface—including image editing, presentations, minimap, typography, exports, persistence, plan boundaries, Ai Partner, and MCP—is indexed in [docs/features_catalog.md](docs/features_catalog.md).

### Always-saved `.bdrl.json` workflow

Agents must treat the board file as part of the task artifact, not as an optional final export:

1. Call `get_board_workspace` before canvas work.
2. If it is not the user's current project directory, call `set_board_workspace` with that absolute directory (or set `BOARDERLESS_WORKSPACE_DIR` in MCP configuration).
3. Use the normal mutation tools. Every successful create, mutate, delete, group, reorder, undo, or redo automatically refreshes the canonical `.bdrl.json` file.
4. Before handoff, call `export_board_file` and report its returned path. This explicit final flush makes the artifact requirement visible even if an earlier autosave warning occurred.
5. To resume work, place a schema-v2 `.bdrl.json` file in the workspace and call `import_board_file` with its filename. The backend validates containment and schema, imports it through Boarderless persistence, switches the live canvas to it, and refreshes autosave.

Board file reads and writes are restricted to the configured workspace. Filenames cannot contain directories or traversal segments. Writes use a same-directory temporary file followed by an atomic rename so interrupted writes do not leave half-valid JSON.

---

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Supported OS & Browser**: Windows 10/11 with a Chromium-based browser—Google Chrome, Brave Browser, Opera, or Microsoft Edge—uses the primary tested path. macOS and Linux use community fallback paths.
3. **Boarderless Web App**: Access via production at `https://boarderless.app/canvas` (default) or your local dev server if running one.

*Note: This Model Context Protocol server is optimized specifically for Windows. Google Chrome, Brave Browser, Opera, and Microsoft Edge are all fully supported. macOS and Linux are supported as community fallbacks.*

---

## Getting Started

### 1. Launch Browser with Remote Debugging Enabled

To allow the MCP server to attach to your browser tab, you must start Chrome or Edge with debugging port `9222` active.
*The MCP server will automatically try to find and launch Chrome/Edge on port 9222 if it is not already running.*

If you want to launch it manually, we provide pre-built launchers:
* **Windows**: Double-click `./launch-chrome-debugging.bat` (or run it via cmd/PowerShell).
* **macOS/Linux**: Run `chmod +x ./launch-chrome-debugging.sh && ./launch-chrome-debugging.sh`.

Alternatively, launch manual instances:
**Windows (PowerShell)**:
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:LOCALAPPDATA\boarderless-mcp-profile" https://boarderless.app/canvas
```

**macOS (Terminal)**:
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="$HOME/Library/Application Support/boarderless-mcp-profile" https://boarderless.app/canvas
```

*Note: Make sure to sign in/authenticate Google OAuth on the canvas page.*

### 2. Install & Setup (Seamless Installers)

We provide pre-built install scripts that automatically check for Node.js (offering to install it if missing), install all package dependencies, write the Claude Desktop configuration, and offer to launch debugging:

* **Windows**: Open PowerShell in this folder and run:
  ```powershell
  Set-ExecutionPolicy Bypass -Scope Process -Force; .\src\setup.ps1
  ```
* **macOS & Linux (Ubuntu)**: Open Terminal in this folder and run:
  ```bash
  chmod +x ./src/setup.sh && ./src/setup.sh
  ```

*Alternatively, perform manual installation:*
1. Run `npm install`.
2. Run `npm run setup`.

### 3. Run the Example

Verify your connection by running the test client, which queries the canvas state and moves the first element:
```bash
npm run example
```

---

## Diagnosing Issues — `get_server_status`

**Always call `get_server_status` first** before attempting canvas operations.

It returns a structured JSON report with four health checks and actionable resolution steps for every failure:

```json
{
  "status": "ok",
  "ready": true,
  "summary": "All systems operational. Ready to control Boarderless.",
  "checks": [
    { "check": "browser_port",    "passed": true,  "detail": "Chromium DevTools listening on http://127.0.0.1:9222" },
    { "check": "canvas_tab",      "passed": true,  "detail": "Active canvas tab: https://boarderless.app/canvas" },
    { "check": "mcp_bridge",      "passed": true,  "detail": "window.boarderlessMcp bridge is mounted and ready" },
    { "check": "authentication",  "passed": true,  "detail": "User is authenticated — canvas tools are available" }
  ],
  "runtime": {
    "platform": "win32",
    "node_version": "v22.3.0",
    "server_version": "0.1.23",
    "app_url": "https://boarderless.app/canvas",
    "browser_url": "http://127.0.0.1:9222",
    "started_at": "2026-06-16T19:07:00.000Z",
    "tool_calls": 1,
    "tool_errors": {}
  },
  "next_steps": ["Call get_board_state to inspect the current canvas."]
}
```

When something fails, each check includes a `resolution` field with exact fix steps:
```json
{ "check": "authentication", "passed": false,
  "resolution": "Sign in with Google at https://boarderless.app/canvas. Canvas tools require an active Boarderless session." }
```

---

## Structured Error Responses

Every tool returns a structured JSON error object — never a raw exception string. Agents can parse `error_code` to decide next steps programmatically.

| `error_code` | Meaning | Resolution |
|---|---|---|
| `BROWSER_CONNECT_FAILED` | No Chromium browser running on the debug port | Launch Chrome with `--remote-debugging-port=9222` |
| `AUTH_REQUIRED` | Canvas session not authenticated | Sign in at `boarderless.app/canvas` |
| `BRIDGE_NOT_READY` | `window.boarderlessMcp` not mounted | Navigate to `/canvas` and refresh |
| `BRIDGE_MISSING` | Bridge removed mid-session | Refresh the browser tab |
| `EXPORT_FN_MISSING` | Export function not bound on page | Ensure a board is open and you're on `/canvas` |
| `EXPORT_RUNTIME_ERROR` | Export threw a runtime exception | Check plan tier — SVG/PDF require Pro |
| `WORKSPACE_PATH_INVALID` | Workspace configuration was not an absolute path | Pass the agent's absolute project directory to `set_board_workspace` |
| `BOARD_FILE_EXPORT_FAILED` | Canonical snapshot could not be written | Confirm workspace permissions and refresh the canvas persistence bridge |
| `BOARD_FILE_IMPORT_FAILED` | Workspace board file failed containment, schema, or browser import | Use a schema-v2 `.bdrl.json` basename inside the configured workspace |
| `PATH_NOT_FOUND` | Filesystem path argument doesn't exist | Use an absolute path to an existing directory |
| `MISSING_ARGUMENT` | Required tool argument was omitted | Check the tool's input schema |
| `TOOL_UNEXPECTED_ERROR` | Unhandled error in the tool silo | Check server stderr; open a GitHub issue |

Error shape:
```json
{
  "status": "error",
  "error_code": "AUTH_REQUIRED",
  "message": "You must be signed in to Boarderless to use canvas tools.",
  "resolution": "1. Open https://boarderless.app/canvas ...\n2. Sign in...",
  "server": "boarderless-mcp-bridge",
  "version": "0.1.23",
  "timestamp": "2026-06-16T19:07:00.000Z"
}
```

---

## Environment Variables (Full Reference)

All configuration uses environment variables — no hardcoded paths, no user-specific assumptions.

| Variable | Default | Description |
|---|---|---|
| `BOARDERLESS_MCP_APP_URL` | `https://boarderless.app/canvas` | Canvas URL to connect to. Set to `http://127.0.0.1:5174/canvas` for local dev. |
| `BOARDERLESS_MCP_BROWSER_URL` | `http://127.0.0.1:9222` | Chrome DevTools URL. Change if you use a different debug port. |
| `BOARDERLESS_MCP_BROWSER_EXE` | *(auto-detected)* | Full path to browser executable. Set if auto-detection misses your browser. |
| `BOARDERLESS_MCP_PROFILE_DIR` | *(OS-standard, see below)* | Override the persistent browser profile directory. |
| `BOARDERLESS_MCP_HEADLESS` | `false` | Set to `"true"` for headless browser mode (CI/testing). |
| `BOARDERLESS_WORKSPACE_DIR` | MCP process working directory | Absolute directory where canonical `.bdrl.json` files are always saved. Agents can change it at runtime with `set_board_workspace`. |

**Default profile directories** (resolved from OS env vars, never hardcoded):
- **Windows**: `%LOCALAPPDATA%\boarderless-mcp-profile`
- **macOS**: `~/Library/Application Support/boarderless-mcp-profile`
- **Linux**: `~/.boarderless-mcp-profile`

---

## Tool API Specifications

### `get_server_status` *(always call this first)*
Returns a full diagnostic report. Input: none. See [Diagnosing Issues](#diagnosing-issues--get_server_status) above.

---

### `get_board_state`
Returns the canvas as a structured, render-ordered JSON ledger.

- **Input**: None (`{}`)
- **Output**:
  ```json
  {
    "schema": "boarderless.boardSnapshot.v1",
    "generatedAt": "2026-06-16T19:00:00.000Z",
    "objectCount": 3,
    "objects": [
      {
        "id": "rect-1",
        "objectKind": "shape",
        "objectType": "rect",
        "x": 20, "y": 20,
        "rawWidth": 80, "rawHeight": 50,
        "fill": "#ff0000", "stroke": "#ff0000",
        "strokeWidth": 4, "opacity": 1, "rotation": 0
      }
    ]
  }
  ```

---

### `mutate_object`
Modifies coordinates or style properties of a canvas object. Writes to the undo stack.

- **Required**: `id` (string)
- **Optional mutable fields**: `x`, `y`, `width`, `height`, `rotation`, `opacity`, `fill`, `stroke`, `strokeWidth`, `text`, `fontSize`, `fontFamily`, `align`, `cornerRadius`, `edgeFeather`, `points`, `scaleX`, `scaleY`

---

### `remix_style`
Applies one canonical Boarderless palette to selected shape/text Objects—or explicitly to the whole board—as one undoable history step. Images remain unchanged.

- **Required**: `paletteId` — `"boarderless"` | `"midnight"` | `"sunroom"` | `"editorial"` | `"earthbound"`
- **Optional**: `scope` — `"selection"` (default) | `"board"`; `ids` — explicit selection-scope Object IDs

---

### `calculate_export_bounds`
Returns the collective bounding box of all active objects.

- **Input**: None (`{}`)
- **Output**: `{ bounds: { x, y, width, height, left, top, right, bottom } }`

---

### `create_object`
Create a new object (text or shape: rect, ellipse, triangle, arrow) on the canvas.

- **Required**: `type` — `"text"` | `"rect"` | `"ellipse"` | `"triangle"` | `"arrow"`
- **Optional**: `x` (number), `y` (number), `width` (number), `height` (number), `text` (string), `fill` (string), `stroke` (string), `strokeWidth` (number)

---

### `delete_objects`
Delete one or more objects by their IDs from the canvas.

- **Required**: `ids` (array of strings)

---

### `history_undo`
Undo the last action on the canvas.

- **Input**: None (`{}`)

---

### `history_redo`
Redo the next action in the history queue on the canvas.

- **Input**: None (`{}`)

---

### `group_objects`
Group multiple canvas objects under a unique `groupId`.

- **Required**: `ids` (array of strings)

---

### `ungroup_objects`
Ungroup objects belonging to a specific `groupId`.

- **Required**: `groupId` (string)

---

### `reorder_object`
Reorder z-index layering of an object (bring to front, send to back, forward, backward).

- **Required**: `id` (string), `action` — `"front"` | `"back"` | `"forward"` | `"backward"`

---

### `get_board_workspace`
Returns the active filesystem directory, autosave state, and filename pattern. Agents should call this before their first canvas mutation.

---

### `set_board_workspace`
Sets the absolute project directory used for board artifacts. The directory is created when necessary.

- **Required**: `directory` (absolute path)

---

### `export_board_file`
Flushes the browser's current board and atomically writes its complete schema-v2 snapshot, including JSON-safe image assets.

- **Optional**: `filename` — a single filename ending in `.bdrl.json`; omitting it uses the stable autosave name.

---

### `import_board_file`
Reads, validates, imports, and opens a board from the configured workspace.

- **Required**: `filename` — a single `.bdrl.json` filename in the workspace

---

### `export_board`
Exports the current canvas to PNG, PDF, or SVG.

- **Required**: `format` — `"png"` | `"pdf"` | `"svg"`
- **Optional**: `mode` — `"canvas"` (default) | `"selection"`, `filename` — output name override
- **Note**: SVG and PDF require a Pro plan. The error response will indicate this clearly.

---

### `graduation_rename_photos`
Renames photo files in a local directory to sequential format. **No browser required.**

- **Required**: `seniorsDir` (absolute path), `mode` (`"sequential"` | `"gap_fill"`)

---

### `graduation_standardize_images`
Converts progressive JPEGs and HEIC files to baseline RGB JPEGs. **No browser required.**

- **Required**: `seniorsDir` (absolute path)

---

## Connecting to AI Clients

### Claude Desktop
Add to `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS).

```json
{
  "mcpServers": {
    "boarderless": {
      "command": "node",
      "args": ["/absolute/path/to/boarderless.app_MCP/src/mcp-stdio-server.js"],
      "env": {
        "BOARDERLESS_MCP_APP_URL": "https://boarderless.app/canvas",
        "BOARDERLESS_MCP_BROWSER_URL": "http://127.0.0.1:9222",
        "BOARDERLESS_WORKSPACE_DIR": "C:\\absolute\\path\\to\\your\\project"
      }
    }
  }
}
```

Running `npm run setup` will write this automatically.

### Hermes / OpenClaw (Local AI Gateway)
Add to your `openclaw.json` under `mcp.servers`:

```json
"mcp": {
  "servers": {
    "boarderless": {
      "command": "node",
      "args": ["/absolute/path/to/boarderless.app_MCP/src/mcp-stdio-server.js"],
      "env": {
        "BOARDERLESS_MCP_APP_URL": "https://boarderless.app/canvas",
        "BOARDERLESS_MCP_BROWSER_URL": "http://127.0.0.1:9222",
        "BOARDERLESS_WORKSPACE_DIR": "/absolute/path/to/your/project"
      }
    }
  }
}
```

### Cursor / Windsurf
See the `mcp-config.json` file generated by `npm run setup` for the exact config block to paste.

---

## Contributing

This MCP server is open source under the Apache 2.0 license. Contributions are welcome!

- **Bug reports**: Open an issue describing the `error_code` you received and your `get_server_status` output.
- **New tools**: Tools should be added as siloed handlers in `mcp-stdio-server.js` with structured `makeError` / `makeSuccess` responses. Every new tool must have a corresponding regression test.
- **Platform support**: If your browser or OS isn't detected, open a PR adding its path to `getBrowserCandidates()` — all paths must use OS env vars, never hardcoded usernames.

---

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
