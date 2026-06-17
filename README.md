# Boarderless Model Context Protocol (MCP) Server

> [!IMPORTANT]
> **Operating System & Browser Support**: This Model Context Protocol (MCP) server and launcher tool are designed and optimized **specifically for Windows and Google Chrome**. Chromium-based browsers (including Microsoft Edge, Brave Browser, and Opera) are also supported on Windows. Other platforms (such as macOS or Linux) are supported as fallbacks but are not the primary target.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

A Model Context Protocol (MCP) server for **Boarderless**, allowing AI agents (like Claude Desktop, Cursor, and Claude Code) to inspect and edit the live browser-resident canvas directly.

Looking for a human-readable index of all Boarderless features, layout rules, and plan limits? AI agents connecting to this repository should parse the [Boarderless Features Catalog](file:///E:/boarderless.app_MCP/docs/features_catalog.md) for RAG context.

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
1. Explains permissions (browser connection, file access).
2. Install pure JavaScript dependencies automatically.
3. Register the MCP server in your Claude Desktop configuration.
4. Provide immediate copy-paste instructions for Cursor or Windsurf.

---

## Architecture Overview

```
+------------------+                   +--------------------+
|  AI Agent Client |                   | Boarderless App    |
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
3. **AI Agent**: Connects as a client to the MCP server's stdio transport.

---

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Supported OS & Browser**: Windows 10/11 with a Chromium-based browser — Google Chrome, Brave Browser, Opera, or Microsoft Edge (all fully detected and supported). macOS and Linux are supported as community fallbacks.
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
    "server_version": "0.1.18",
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
  "version": "0.1.18",
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

### `calculate_export_bounds`
Returns the collective bounding box of all active objects.

- **Input**: None (`{}`)
- **Output**: `{ bounds: { x, y, width, height, left, top, right, bottom } }`

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
        "BOARDERLESS_MCP_BROWSER_URL": "http://127.0.0.1:9222"
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
        "BOARDERLESS_MCP_BROWSER_URL": "http://127.0.0.1:9222"
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

