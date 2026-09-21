# Boarderless VS Code Extension (MCP Integration)

Provides programmatic, zero-configuration integration for the **Boarderless Model Context Protocol (MCP)** server within Visual Studio Code. This allows native VS Code Ai features (like GitHub Copilot Chat) to read and modify your local, human-visible Boarderless canvas.

## Features

- **Programmatic MCP Registration**: Automatically exposes the Boarderless MCP tools to native VS Code LM/Copilot clients. No manual `.vscode/mcp.json` editing required.
- **Easy Browser Launching**: Provides a VS Code command to quickly open Google Chrome/Edge on the required remote-debugging port.
- **Settings Integration**: Allows custom configuration of the canvas URL, debugging port, and workspace paths directly from VS Code Settings.

## Prerequisites

1.  **Google Chrome / Chromium Browser**: Set up with remote debugging active on port `9222`.
    *   *Tip: Use the command palette command `Boarderless: Launch Debug Browser` to launch this automatically.*
2.  **Authenticated Session**: Ensure you are signed in on `https://boarderless.app/canvas`.

## Extension Settings

This extension contributes the following settings:

*   `boarderless.mcp.appUrl`: The URL of the Boarderless canvas page (default: `https://boarderless.app/canvas`).
*   `boarderless.mcp.browserUrl`: The Chrome remote-debugging address (default: `http://127.0.0.1:9222`).
*   `boarderless.mcp.workspaceDir`: The absolute directory where canonical `.bdrl.json` snapshots are saved. Defaults to your active workspace folder.

## Commands

*   `Boarderless: Launch Debug Browser` (`boarderless.launchDebugBrowser`): Launches Chrome with remote debugging on port `9222` pointed directly to the canvas.

## License

Apache-2.0
