# Boarderless Model Context Protocol (MCP) Server

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

A Model Context Protocol (MCP) server for **Boarderless**, allowing AI agents (like Claude Desktop, Cursor, and Claude Code) to inspect and edit the live browser-resident canvas directly.

Rather than scraping pixels or guessing layouts from DOM selectors, agents communicate with a clean, typed spatial ledger.

---

## ⚡ Quick Start (TL;DR)

**Step 1: Launch your browser in Debugging Mode**
*   **Windows**: Double-click `launch-chrome-debugging.bat`
*   **Mac / Linux**: Run `./launch-chrome-debugging.sh`

**Step 2: Run the Installer (Configures Claude Desktop automatically)**
*   **Windows (PowerShell)**:
    ```powershell
    Set-ExecutionPolicy Bypass -Scope Process -Force; .\setup.ps1
    ```
*   **Mac / Linux (Terminal)**:
    ```bash
    chmod +x ./setup.sh && ./setup.sh
    ```

**Step 3: Connect Cursor / Windsurf (Optional)**
Add a new MCP server in settings:
*   **Type**: `stdio`
*   **Name**: `boarderless`
*   **Command**: `node "E:\boarderless.app_MCP\mcp-stdio-server.js"` (Use your absolute path)
*   **Env variables**:
    *   `BOARDERLESS_MCP_APP_URL` = `https://boarderless.app/canvas`
    *   `BOARDERLESS_MCP_BROWSER_URL` = `http://127.0.0.1:9222`

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
2. **MCP Server (`mcp-stdio-server.js`)**: Connects to the browser via Chrome DevTools Protocol (CDP), maps incoming stdio messages to the browser runtime, and checks authentication.
3. **AI Agent**: Connects as a client to the MCP server's stdio transport.

---

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Chromium-based Browser** (Google Chrome or Microsoft Edge)
3. **Boarderless Web App**: Running locally (typically at `http://127.0.0.1:5174/canvas`) or via production web portal.

---

## Getting Started

### 1. Launch Browser with Remote Debugging Enabled

To allow the MCP server to attach to your browser tab, you must start Chrome or Edge with debugging port `9222` active. We provide pre-built launchers for convenience:

* **Windows**: Double-click `./launch-chrome-debugging.bat` (or run it via cmd/PowerShell).
* **macOS/Linux**: Run `chmod +x ./launch-chrome-debugging.sh && ./launch-chrome-debugging.sh`.

Alternatively, launch manual instances:
**Windows (PowerShell)**:
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\boarderless-mcp-profile" https://boarderless.app/canvas
```

**macOS (Terminal)**:
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="/tmp/boarderless-mcp-profile" https://boarderless.app/canvas
```

*Note: Make sure to sign in/authenticate Google OAuth on the canvas page.*

### 2. Install & Setup (Seamless Installers)

We provide pre-built install scripts that automatically check for Node.js (offering to install it if missing), install all package dependencies, write the Claude Desktop configuration, and offer to launch debugging:

* **Windows**: Open PowerShell in this folder and run:
  ```powershell
  Set-ExecutionPolicy Bypass -Scope Process -Force; .\setup.ps1
  ```
* **macOS & Linux (Ubuntu)**: Open Terminal in this folder and run:
  ```bash
  chmod +x ./setup.sh && ./setup.sh
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

## Gating & CLI Authentication

To respect user plan limits and session validity, the MCP server checks the tab's authentication status before running. 
- If the browser session is unauthenticated, the CLI will output clear directions:
  `[Boarderless Auth Required] Please complete Google OAuth sign-in in your browser window.`
- The MCP server will pause and poll in the background, automatically proceeding once verification succeeds.

---

## Tool API Specifications

### 1. `get_board_state`
Returns the canvas state as a structured, render-ordered JSON ledger (`boarderless.boardSnapshot.v1`).

- **Input**: None (`{}`)
- **Output**:
  ```json
  {
    "schema": "boarderless.boardSnapshot.v1",
    "generatedAt": "2026-05-25T18:40:00.000Z",
    "objectCount": 3,
    "objects": [
      {
        "id": "rect-1",
        "objectKind": "shape",
        "objectType": "rect",
        "x": 20,
        "y": 20,
        "rawWidth": 80,
        "rawHeight": 50,
        "boundsLeft": 18,
        "boundsTop": 18,
        "boundsRight": 102,
        "boundsBottom": 72,
        "fill": "#ff0000",
        "stroke": "#ff0000",
        "strokeWidth": 4,
        "opacity": 1,
        "rotation": 0
      }
    ]
  }
  ```

### 2. `mutate_object`
Modifies spatial coordinates or visual style properties of a canvas object. Mutated actions are pushed to the undo stack.

- **Input Schema**:
  - `id` (string, required): Object ID.
  - Mutable Fields: `x`, `y`, `width`, `height`, `rotation`, `opacity`, `fill`, `stroke`, `strokeWidth`, `text`, `fontSize`, `fontFamily`, `align`, `cornerRadius`, `edgeFeather`, `points`, `scaleX`, `scaleY`.

- **Example Call**:
  ```json
  {
    "id": "rect-1",
    "x": 140,
    "y": 130,
    "fill": "#22c55e"
  }
  ```

### 3. `calculate_export_bounds`
Calculates the collective mathematical boundary coordinates of all active objects on the canvas. Used by agents to calculate exact crops for export.

- **Input**: None (`{}`)
- **Output**:
  ```json
  {
    "schema": "boarderless.exportBounds.v1",
    "empty": false,
    "objectCount": 1,
    "bounds": {
      "x": 138,
      "y": 128,
      "width": 84,
      "height": 54,
      "left": 138,
      "top": 128,
      "right": 222,
      "bottom": 182
    }
  }
  ```

---

## Connecting to AI Clients

### Claude Desktop Configuration
Add the server entry to your `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS). Running `npm run setup` will do this automatically!

```json
{
  "mcpServers": {
    "boarderless": {
      "command": "node",
      "args": ["E:\\boarderless.app_MCP\\mcp-stdio-server.js"],
      "env": {
        "BOARDERLESS_MCP_APP_URL": "https://boarderless.app/canvas",
        "BOARDERLESS_MCP_BROWSER_URL": "http://127.0.0.1:9222"
      }
    }
  }
}
```

---

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
