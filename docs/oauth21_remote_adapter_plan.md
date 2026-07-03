# OAuth 2.1 Remote Adapter Plan for Boarderless MCP

Status: **design plan only**. This document does not claim that a remote adapter, OAuth server, Streamable HTTP endpoint, OpenAI connector, or Microsoft Copilot Studio connector exists today. Joel has selected **Option A: browser-mediated visible-session bridge** for any future remote readiness; see [remote_session_bridge_spec.md](remote_session_bridge_spec.md).

Boarderless MCP today remains a **local stdio/CDP connector**. It runs on the user's machine, attaches to a human-visible authenticated Boarderless browser tab through Chrome DevTools Protocol, and writes `.bdrl.json` board artifacts to the configured local workspace. That local path stays supported. The remote adapter described here is future work for OpenAI/Microsoft readiness.

## Goals

1. Prepare a reviewed architecture for a future hosted MCP adapter using Streamable HTTP and OAuth 2.1-style authorization-code + PKCE.
2. Preserve the Boarderless local-first boundary: remote agents must never get direct access to localhost CDP, arbitrary local files, Google Drive, or a hidden cloud canvas.
3. Support platform review for OpenAI ChatGPT Apps/connectors and Microsoft Copilot Studio without overclaiming availability.
4. Give Joel clear decision gates before any implementation, hosting, spending, publication, or platform submission.
5. Enforce Joel's hard product decision that Boarderless will not host user data or server-side boards.

## Non-goals

- No code is implemented by this plan.
- No npm package version is changed by this plan.
- No hosted infrastructure, accounts, secrets, domains, databases, queues, or paid services are created by this plan.
- No OpenAI or Microsoft submission is made by this plan.
- No claim is made that OAuth alone connects a hosted agent to a user's visible browser session.
- No hosted board, server-side user-data store, or hidden cloud canvas is introduced by this plan.

## Current vs future surfaces

| Surface | Status | Transport | Auth/session boundary |
|---|---|---|---|
| Local Boarderless MCP | Supported today | MCP over stdio from a local Node process | User is signed into the visible Boarderless tab; local process attaches through CDP on the user's machine |
| Future remote adapter | Planned only | Public HTTPS MCP endpoint using Streamable HTTP or platform-approved remote MCP transport | OAuth identifies the Boarderless user, then Joel's selected Option A browser-mediated bridge routes requests to the correct human-visible canvas |

## Target architecture

```text
+---------------------------+        +-----------------------------+
| OpenAI / Microsoft MCP    |        | OAuth Authorization Server  |
| client / connector host   |        | or IdP integration          |
+-------------+-------------+        +--------------+--------------+
              | HTTPS Streamable HTTP MCP           |
              | Bearer token + resource/scope       |
              v                                    |
+-------------+-------------------------------------v--------------+
| Boarderless Remote MCP Adapter                                  |
| - MCP resource server                                            |
| - token issuer/audience/scope validation                         |
| - remote-safe tool policy                                        |
| - rate limits, audit logs, abuse controls                        |
| - session routing to approved canvas bridge                      |
+-------------+----------------------------------------------------+
              |
              | Option A browser-mediated outbound session bridge
              | (selected by Joel; not implemented)
              v
+-------------+----------------------------------------------------+
| User-controlled Boarderless browser session                       |
| - human-visible canvas                                            |
| - Boarderless app auth                                            |
| - no public CDP exposure                                          |
| - workspace/artifact behavior governed by approved policy         |
+------------------------------------------------------------------+
```

Critical boundary: the hosted adapter must not expose `127.0.0.1:9222`, Chrome DevTools, or arbitrary filesystem paths to the internet. CDP remains a local implementation detail of the existing stdio connector. Boarderless will not solve remote readiness by hosting user data, server-side boards, or hidden cloud canvases.

## Architecture phases

### Phase 0: Design and standards lock

Deliverables:

- This design plan and linked readiness checklists.
- A platform requirements matrix for OpenAI and Microsoft, with official docs linked and dated during implementation planning.
- Threat model draft covering auth, session routing, write actions, workspace artifacts, logs, and abuse.
- Decision record for whether Boarderless wants hosted connector support at all.

Exit gate:

- Joel explicitly approves moving from docs/design into implementation planning.

### Phase 1: Identity and OAuth contract

Future deliverables:

- OAuth 2.1-compatible authorization-code flow with PKCE `S256` for user authorization.
- Authorization server choice: Boarderless-owned auth service, existing IdP, or platform-supported registration mode.
- Narrow scopes, such as read canvas state, propose/write canvas changes, export board, and manage session connection. Exact names are TBD.
- Token validation contract: issuer, audience/resource, expiry, scopes, tenant/user binding where applicable, refresh behavior, revocation behavior, and `401` bearer challenge behavior.
- Client registration decision:
  - OpenAI: Client ID Metadata Document, Dynamic Client Registration, or predefined client.
  - Microsoft: DCR with discovery, DCR with explicit endpoints, or manual app registration, depending on the supported Copilot path at implementation time.

Exit gate:

- Security review confirms the OAuth model maps tokens to real Boarderless users without granting broad app, Drive, browser, or filesystem access.

### Phase 2: Remote MCP transport shell

Future deliverables:

- Public HTTPS MCP resource server endpoint using Streamable HTTP or a platform-approved equivalent.
- Protected-resource metadata and auth discovery metadata where required by the platform.
- Standards-compliant auth failures, including `WWW-Authenticate` challenges for missing/invalid tokens.
- Health and readiness endpoints that do not leak user data, tokens, session IDs, browser URLs, or workspace paths.

Exit gate:

- The remote endpoint passes protocol conformance tests without enabling any real canvas mutations yet.

### Phase 3: Option A remote-to-visible-canvas session bridge

This is the main architecture dependency. OAuth proves who the user is; it does not make a cloud connector able to reach the user's visible canvas.

Joel selected **Option A: browser-mediated visible-session bridge**. The Boarderless app must establish an outbound, user-approved session channel from the visible browser tab to the adapter. Local companion relays are not the selected path for this readiness slice, and cloud board sessions are out of bounds because Boarderless will not host user data or server-side boards. The normative bridge spec is [remote_session_bridge_spec.md](remote_session_bridge_spec.md).

Required properties for any bridge:

- User-visible pairing and disconnect controls.
- Binding between OAuth user, Boarderless app user, browser/session instance, and MCP connection.
- No inbound access to localhost from the public internet.
- No public exposure of CDP or browser debugging ports.
- Expiring session grants, replay protection, reconnect rules, and revocation.
- Clear behavior when the browser tab closes, auth expires, the canvas changes, or multiple tabs are open.

Exit gate:

- Joel and security review approve the browser-mediated bridge implementation plan before any remote bridge code or remote write tools are enabled.

### Phase 4: Remote-safe tool policy

Future deliverables:

- Tool allowlist for remote use. Start with read-only status and board inspection before enabling mutations.
- Scope mapping for each tool category:
  - status/diagnostics,
  - read board state,
  - calculate bounds,
  - create/mutate/delete/group/reorder/undo/redo,
  - export board/artifacts,
  - local helper tools that should remain local-only.
- Confirmation policy for destructive or high-impact writes.
- Plan-tier and product-boundary checks for export and Pro-only operations.
- Workspace/artifact policy for `.bdrl.json` in a remote context: user download, user-approved local sync, or no remote artifact write. This must not silently become arbitrary server-side filesystem access or server-side board storage.

Exit gate:

- A reviewer can explain exactly which tools are remotely callable, which scopes they require, what the user sees, and how to revoke access.

### Phase 5: Security, privacy, and operations controls

Future deliverables:

- Rate limits per user, client, tenant, IP, session, and tool family.
- Audit logs for authorization, session pairing, tool calls, writes, exports, revocation, and policy denials.
- Privacy and retention rules for prompts, tool payloads, board snapshots, exports, logs, and error traces.
- Secret management, rotation, incident response, and least-privilege deployment roles.
- Abuse controls for automated write loops, export scraping, replayed requests, and suspicious pairing attempts.
- Tenant/admin policy hooks for Microsoft environments where required.
- Data-loss-prevention review before any enterprise or Copilot Studio claim.

Exit gate:

- Security review signs off on the operational controls, not just the OAuth handshake.

### Phase 6: Platform readiness and submission package

Future deliverables:

- OpenAI validation package:
  - public HTTPS MCP resource server,
  - OAuth 2.1 authorization-code + PKCE,
  - protected-resource and authorization-server metadata,
  - selected client-registration path,
  - ChatGPT callback allowlisted,
  - resource/audience/scope validation,
  - `401` bearer challenges,
  - reviewed session bridge,
  - remote tool policy,
  - revocation/reconnect/security tests.
- Microsoft validation package:
  - public Streamable HTTP MCP endpoint,
  - OAuth setup through the supported Copilot path,
  - Copilot callback registered,
  - scoped token validation, refresh, expiry, and revocation,
  - tenant/admin, DLP, secret-rotation, and audit controls,
  - reviewed session bridge,
  - tool discovery and connection/publish tests.
- Public copy that says exactly what is supported and avoids implying Google Drive delegation, hidden canvas control, or local-file access.

Exit gate:

- Joel approves final wording and submission. Agents do not submit without approval.

## Security gates

These gates block implementation, enablement, or public claims until satisfied:

1. **Transport gate**: no hosted connector claim until a public HTTPS remote MCP transport exists and passes conformance tests.
2. **OAuth gate**: no user-specific remote access until authorization-code + PKCE, token validation, discovery/metadata, client registration, revocation, and `401` challenge behavior are reviewed.
3. **Session bridge gate**: no remote canvas control until the Option A browser-mediated bridge is designed, reviewed, user-controlled, expiring, and revocable.
4. **CDP boundary gate**: never expose Chrome DevTools Protocol, browser debugging ports, or localhost tunnels as the public connector interface.
5. **Tool policy gate**: no remote write tools until scopes, confirmation rules, audit fields, rate limits, and rollback/undo expectations are documented and tested.
6. **Workspace gate**: no arbitrary remote filesystem access. `.bdrl.json` artifact handling needs an approved policy.
7. **Privacy gate**: no production beta until logging, retention, redaction, user deletion, and incident response rules are approved.
8. **Platform gate**: no OpenAI/Microsoft availability claims until each platform's onboarding, callback, auth, discovery, testing, and review requirements pass with evidence.

## Joel decision gates

Joel must decide or approve:

1. Whether hosted OpenAI/Microsoft connector support is a product priority.
2. Budget and ownership for hosting, auth, monitoring, security review, and maintenance.
3. Which identity provider or OAuth server model Boarderless will use.
4. Final implementation details for the selected browser-mediated bridge.
5. Which tools are allowed remotely and which stay local-only.
6. Whether remote writes require explicit user confirmation for every call, per session, or by scope.
7. How `.bdrl.json` artifacts work for remote users.
8. Public wording for privacy, security, platform support, pricing, and plan boundaries.
9. Any platform submission, marketplace listing, paid service, account creation, token creation, or public support claim.

## Claims allowed before implementation

Safe wording:

> Boarderless MCP supports local stdio clients today. A remote OAuth 2.1/Streamable HTTP adapter for OpenAI and Microsoft readiness is planned, but it has not been implemented or submitted. Joel selected Option A: a browser-mediated visible-session bridge. Boarderless will not host user data or server-side boards; OAuth will identify and authorize users, while a separate reviewed outbound browser bridge is still required to connect a hosted adapter to the user's visible Boarderless canvas.

Unsafe wording until all gates pass:

- "Boarderless is available in ChatGPT connectors."
- "Boarderless is available in Microsoft Copilot Studio."
- "The npm package enables ChatGPT Apps or Copilot Studio."
- "OAuth makes the hosted connector ready."
- "The hosted connector can control a user's local browser."
- "Boarderless MCP can access Google Drive for the user."
- "Remote agents can use local workspace files."

## Docs-only verification for this plan

For documentation-only changes to this repository, use:

```bash
git diff --check
```

Do not run deployment, publication, registry submission, paid service, or hosted infrastructure commands as part of this docs-only plan.
