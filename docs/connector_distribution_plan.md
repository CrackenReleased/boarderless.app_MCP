# MCP Connector Distribution and Readiness Plan

This document tracks the verified distribution state of `@boarderless/mcp-server` across local MCP clients, npm, connector directories, and future hosted ecosystems. npm publication of the local package does not authorize registry submissions, paid services, hosted infrastructure, or OpenAI/Microsoft platform claims.

## Current connector shape

Boarderless MCP is currently a **local stdio MCP server**. It connects an agent client to a human-visible Boarderless canvas tab through Chrome DevTools Protocol (CDP) and writes canonical `.bdrl.json` board artifacts to a local workspace.

This shape is ready for local developer clients:

- Claude Desktop
- Cursor
- Windsurf
- Hermes / OpenClaw
- VS Code with GitHub Copilot MCP support
- Other stdio-compatible MCP hosts that can run a local Node command

It is **not yet** a hosted connector for OpenAI ChatGPT Apps or Microsoft Copilot Studio. The npm package is a local `stdio` process and does not expose a remotely reachable Streamable HTTP endpoint, OAuth authorization server, or cloud-to-browser session relay. Treat those as future adapter work, not as completed distribution. Publishing this package to npm does not complete either hosted integration.

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
| OpenAI ChatGPT Apps / Apps SDK | **Outstanding:** no remote HTTPS MCP resource server, OAuth 2.1 authorization flow, or safe remote session bridge | Complete the OpenAI checklist below before connecting or submitting an app |
| Microsoft Copilot Studio | **Outstanding:** no Streamable HTTP MCP endpoint, OAuth 2.0/DCR configuration, or safe remote session bridge | Complete the Microsoft checklist below before adding it as a Copilot tool |

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

## Outstanding hosted OpenAI work — not included in v0.1.26

OpenAI's Apps SDK authentication guidance expects authenticated MCP servers that expose customer-specific data or write actions to implement OAuth 2.1. Boarderless therefore still needs all of the following before it can be described as a ChatGPT App or hosted ChatGPT connector:

1. Deploy a stable public **HTTPS MCP resource server** using a ChatGPT-supported remote transport; the local npm `stdio` server is not that endpoint.
2. Deploy or integrate an **OAuth 2.1 authorization server** with authorization and token endpoints, authorization-code flow, PKCE `S256`, refresh/revocation policy, and narrowly defined read/write scopes.
3. Publish protected-resource metadata at `/.well-known/oauth-protected-resource` and OAuth or OpenID discovery metadata from the authorization server.
4. Choose and implement a supported ChatGPT client-registration path: Client ID Metadata Documents (CIMD), Dynamic Client Registration (DCR), or a predefined OAuth client.
5. Allowlist the production ChatGPT callback shown in app management (`https://chatgpt.com/connector/oauth/{callback_id}`), then test initial authorization and reauthorization.
6. Preserve the OAuth `resource` value through authorization and token exchange; validate token issuer, audience/resource, expiry, and scopes on every MCP request; return a standards-compliant `WWW-Authenticate` challenge on `401`.
7. Design the missing **remote-to-visible-canvas session bridge**. OAuth proves who the user is; it does not by itself let a cloud-hosted MCP endpoint reach the user's local browser tab or CDP port.
8. Define remote-safe tool scopes, explicit confirmation for destructive/write actions, rate limits, audit logs, privacy/retention behavior, abuse controls, and app-submission metadata.
9. Complete end-to-end security, authorization, tool-policy, reconnect, and revocation tests before submitting through the Apps SDK flow.

Official reference: [OpenAI Apps SDK — Authenticate users](https://developers.openai.com/apps-sdk/build/auth).

## Outstanding Microsoft work — not included in v0.1.26

Copilot Studio currently accepts remote MCP servers through its onboarding wizard and supports **Streamable HTTP** (not local `stdio`; SSE support ended after August 2025). Boarderless therefore still needs all of the following:

1. Deploy a stable public **Streamable HTTP MCP endpoint** with a server URL Copilot Studio can reach.
2. Select and implement the authentication mode. For user-specific Boarderless canvas access, use OAuth 2.0 rather than a shared API key.
3. Register Boarderless with an identity provider and implement one supported Copilot OAuth path:
   - DCR with discovery (preferred when supported),
   - DCR with manually supplied authorization/token endpoints, or
   - manual client ID/client secret plus authorization and token endpoints.
4. Add the callback URL produced by Copilot Studio to the identity-provider app registration.
5. Define least-privilege scopes and validate access tokens, refresh behavior, expiry, revocation, issuer, audience, and tenant/user binding at the hosted MCP boundary.
6. Design the same missing **remote-to-visible-canvas session bridge**; a Copilot token cannot directly attach to a user's localhost CDP session.
7. Add rate limits, audit logs, secret rotation/monitoring, data-loss-prevention review, admin/tenant policy checks, privacy/retention rules, and explicit write-action controls.
8. Validate tool discovery and authorization in Copilot Studio, publish the agent after auth changes, and complete any connector review before claiming availability.

Official references: [Connect an existing MCP server to Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent) and [Create a new MCP server](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-create-new-server).

## Shared future hosted-adapter requirements

A hosted adapter for OpenAI or Microsoft should be planned as a separate engineering slice with security review. Minimum open questions:

- Transport: Streamable HTTP or platform-specific connector protocol rather than stdio.
- Auth: OAuth or platform-approved auth that maps to a real Boarderless user session.
- Session bridge: how a remote connector reaches the user's human-visible canvas without creating an uncontrolled cloud copy.
- Tool policy: which tools are safe remotely, and which remain local-only.
- Workspace policy: whether `.bdrl.json` artifacts are downloaded, synced by the user, or stored through an approved Boarderless path.
- Rate limits and audit logging for remote mutation calls.
- Review copy that clearly states what is and is not supported.

Until every relevant checklist item is implemented and verified, public messaging must say: **Boarderless MCP supports local stdio clients today. The npm package is not a hosted ChatGPT App or Microsoft Copilot Studio connector; both require a future remote transport, OAuth, and secure browser-session bridge.**
