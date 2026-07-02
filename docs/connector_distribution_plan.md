# MCP Connector Distribution and Readiness Plan

This document tracks the safe first slice for getting `@boarderless/mcp-server` ready for MCP connector directories and client ecosystems. It is documentation-only: no registry submissions, paid services, package publishing, or live remote endpoint checks are part of this slice.

## Current connector shape

Boarderless MCP is currently a **local stdio MCP server**. It connects an agent client to a human-visible Boarderless canvas tab through Chrome DevTools Protocol (CDP) and writes canonical `.bdrl.json` board artifacts to a local workspace.

This shape is ready for local developer clients:

- Claude Desktop
- Cursor
- Windsurf
- Hermes / OpenClaw
- VS Code with GitHub Copilot MCP support
- Other stdio-compatible MCP hosts that can run a local Node command

It is **not yet** a hosted connector for OpenAI ChatGPT connectors or Microsoft Copilot Studio. Those ecosystems usually expect a remotely reachable HTTPS endpoint, OAuth or connector-specific auth, stable public URLs, and platform review metadata. Treat those as future adapter work, not as completed distribution.

## Readiness principles

Boarderless distribution should keep the production pillars intact:

- **Robust**: every listing and example should send users to `get_server_status` first and document known failure modes.
- **Responsive**: local stdio remains the primary fast path for canvas work; remote adapters should not slow the local flow.
- **Siloed**: the MCP server only controls the visible Boarderless browser session and the configured local workspace.
- **Secure**: remote connector adapters must not imply Drive access, hidden cloud canvas control, broad filesystem access, or unauthenticated write APIs.

## Local client config examples

### VS Code / GitHub Copilot MCP

Create `.vscode/mcp.json` in the workspace where you want Copilot to use Boarderless:

```json
{
  "servers": {
    "boarderless": {
      "type": "stdio",
      "command": "node",
      "args": ["E:\\boarderless.app_MCP\\src\\mcp-stdio-server.js"],
      "env": {
        "BOARDERLESS_MCP_APP_URL": "https://boarderless.app/canvas",
        "BOARDERLESS_MCP_BROWSER_URL": "http://127.0.0.1:9222",
        "BOARDERLESS_WORKSPACE_DIR": "E:\\your-project"
      }
    }
  }
}
```

Before asking Copilot to edit a board, open `https://boarderless.app/canvas`, sign in, and let the MCP server attach to a Chromium browser with remote debugging enabled. The first tool call should be `get_server_status`.

### npm-style command form for compatible stdio hosts

Use this only after the package version you want is published and installable in that host environment. Do not use it as proof that a registry submission happened.

```json
{
  "servers": {
    "boarderless": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@boarderless/mcp-server"],
      "env": {
        "BOARDERLESS_MCP_APP_URL": "https://boarderless.app/canvas",
        "BOARDERLESS_MCP_BROWSER_URL": "http://127.0.0.1:9222",
        "BOARDERLESS_WORKSPACE_DIR": "E:\\your-project"
      }
    }
  }
}
```

## Connector ecosystem status

| Ecosystem | Current status | Safe next step |
|---|---|---|
| Claude Desktop | Documented local stdio config in `README.md` | Keep config current and include `get_server_status` in onboarding |
| Cursor | Documented via generated `mcp-config.json` | Add a copied example if users ask for a standalone snippet |
| Windsurf | Documented via generated `mcp-config.json` | Add a copied example if users ask for a standalone snippet |
| Hermes / OpenClaw | Documented local gateway config in `README.md` | Keep OpenClaw JSON example aligned with current env vars |
| VS Code / GitHub Copilot | Ready as local stdio using `.vscode/mcp.json` | Test locally before adding screenshots or marketplace copy |
| Smithery, glama.ai, MCP lists | Not submitted | Prepare listing metadata and verify package install path first |
| OpenAI ChatGPT connectors / Apps SDK | Not ready as a hosted connector | Design an HTTPS/OAuth adapter that bridges to Boarderless without weakening local-first boundaries |
| Microsoft Copilot Studio | Not ready as a hosted action/server | Design a remotely reachable MCP action/server and auth model before claiming support |

## Registry submission checklist

Use this checklist before any external submission. Submitting is explicitly outside this slice.

1. Verify `package.json` metadata:
   - package name: `@boarderless/mcp-server`
   - binary name: `boarderless-mcp-server`
   - Node engine: `>=18`
   - license: `Apache-2.0`
2. Verify install and local launch from a clean machine or clean temp directory.
3. Confirm `functions.json` matches the public tool surface.
4. Confirm README examples cover Claude Desktop, Cursor/Windsurf, Hermes/OpenClaw, and VS Code/Copilot.
5. Include the local-first boundary in listing copy:
   - requires a visible authenticated Boarderless canvas tab
   - uses Chromium CDP on the user's machine
   - writes only inside the configured workspace
   - no Google Drive delegation through MCP
6. Include a troubleshooting section centered on `get_server_status`.
7. Add screenshots or short demo recordings only after the local examples have been tested.
8. For OpenAI or Microsoft, do not submit local stdio as if it were a hosted connector. Build and review a remote adapter first.

## Permanent npm release synchronization

Once the first public npm release is approved, npm is a production delivery target—not an optional directory listing. Every versioned MCP production release pushed to GitHub must publish the identical version of `@boarderless/mcp-server` to npm and verify it through the public registry. Documentation-only commits with no package-version change do not require republishing. A GitHub/npm version mismatch means the release is incomplete and must be fixed forward rather than described as shipped.

## Future hosted adapter requirements

A hosted adapter for OpenAI or Microsoft should be planned as a separate engineering slice with security review. Minimum open questions:

- Transport: Streamable HTTP or platform-specific connector protocol rather than stdio.
- Auth: OAuth or platform-approved auth that maps to a real Boarderless user session.
- Session bridge: how a remote connector reaches the user's human-visible canvas without creating an uncontrolled cloud copy.
- Tool policy: which tools are safe remotely, and which remain local-only.
- Workspace policy: whether `.bdrl.json` artifacts are downloaded, synced by the user, or stored through an approved Boarderless path.
- Rate limits and audit logging for remote mutation calls.
- Review copy that clearly states what is and is not supported.

Until those are resolved, public messaging should say: **local MCP clients are supported today; OpenAI and Microsoft hosted connector readiness is planned adapter work.**
