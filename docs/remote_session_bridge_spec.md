# Browser-Mediated Remote Session Bridge Spec

Status: **Option A selected by Joel; design/spec only**. No code, hosting, deployment, accounts, secrets, spend, OpenAI submission, or Microsoft submission is authorized by this document.

Joel's product decision: **Boarderless will never host user data or server-side boards.** User data stays user-managed, user-owned, and user-controlled. Remote MCP readiness for OpenAI and Microsoft must therefore use **Option A: a browser-mediated visible-session bridge**.

## Local-first invariant

1. The browser remains the authority for the open Boarderless canvas.
2. Board contents are not copied into a Boarderless-hosted cloud board, database, queue, or durable server-side workspace.
3. The remote adapter may route requests and hold short-lived session metadata, but it must not persist board snapshots, prompts containing board contents, exports, images, or `.bdrl.json` payloads.
4. Chrome DevTools Protocol, browser debugging ports, localhost services, and arbitrary filesystem paths are never exposed as the public connector interface.
5. Local stdio MCP remains supported separately from any future hosted adapter.

## Option A architecture

```text
OpenAI / Microsoft MCP client
  -> HTTPS remote MCP adapter with OAuth token validation
  -> short-lived outbound bridge channel opened by the user's visible Boarderless tab
  -> window.boarderlessMcp in that same tab/canvas
  -> user-visible result, confirmation, denial, or disconnect
```

The Boarderless web app initiates the bridge outbound from the visible browser session after explicit user pairing. The hosted adapter does not dial into localhost, CDP, a hidden browser, or a server-side board.

## Pairing UX

1. User signs into Boarderless in the browser and opens the canvas they want to expose.
2. User starts a **Connect remote agent** action from the Boarderless UI.
3. UI explains what the remote client can do, which scopes are requested, expiry time, read-only/write status, and that Boarderless will not host board contents.
4. User completes OAuth with the remote platform and confirms pairing in the visible tab.
5. Browser opens an outbound bridge channel bound to a single tab, canvas, OAuth user, Boarderless app user, and remote MCP session.
6. UI shows persistent connected state: platform/client name, scopes, session expiry, recent activity metadata, and a **Disconnect** control.

## Binding rules

- **OAuth user binding:** the adapter accepts requests only when the OAuth subject/tenant/client/scopes match the Boarderless user who paired the browser session.
- **Visible tab binding:** each bridge grant is bound to one browser tab instance. If that tab closes, reloads across auth state, loses the bridge runtime, or changes user, the grant expires.
- **Visible canvas binding:** the grant is bound to the current canvas/board identity at pairing time. Switching boards requires an explicit rebind or a fresh confirmation.
- **No multi-tab guessing:** if multiple eligible tabs exist, the user chooses which tab/canvas to pair. The adapter never chooses silently.

## Disconnect, revoke, and expiry

- User can disconnect from the Boarderless UI at any time; the browser closes the outbound channel and the adapter rejects further calls.
- OAuth revocation, token expiry, scope downgrade, logout, tab close, browser offline, or app auth expiry must invalidate the bridge.
- Sessions are short-lived by default and require renewal for continued access.
- Reconnect must require user-visible confirmation; stale session IDs and replayed pairing codes are rejected.

## Rollout policy

1. **Read-only first:** initial remote rollout may expose only status, capability discovery, board summary/ledger reads, and bounds calculations.
2. **Writes disabled by default:** create/mutate/delete/group/reorder/undo/redo/export actions remain unavailable until security review and Joel approval.
3. **Write confirmation:** when writes are enabled, every high-impact or destructive action requires visible browser confirmation before execution. Lower-risk writes may later use a time-boxed per-session approval only if Joel and security review approve the exact scope and UI.
4. **Local-only tools stay local:** filesystem helpers, arbitrary workspace access, and any tool that relies on local paths remain excluded unless an approved user-mediated artifact flow exists.

## Audit metadata without board contents

The adapter may retain only operational metadata needed for security and support, such as:

- timestamp, request ID, platform/client ID, OAuth subject hash, tenant hash where applicable;
- paired session ID hash, tab/canvas binding hash, scope set, tool name, decision (`allowed`, `denied`, `confirmed`, `revoked`, `expired`);
- latency, error code, policy gate, rate-limit bucket, and confirmation outcome.

Do **not** store board object payloads, board text, image data, exported files, `.bdrl.json` contents, prompts that embed board contents, screenshots, raw tokens, refresh tokens, CDP URLs, localhost URLs, or local filesystem paths.

## Failure modes

- OAuth token invalid, expired, wrong audience/resource, wrong issuer, missing scope, or revoked.
- OAuth user does not match the paired Boarderless app user.
- Pairing code expired, replayed, already used, or confirmed in a different tab/user context.
- Browser tab closed, navigated away, reloaded without bridge, offline, or logged out.
- Canvas identity changed after pairing.
- Multiple tabs/canvases compete for one grant.
- Bridge channel disconnects, backpressure exceeds limits, request times out, or duplicate request ID is detected.
- User denies write confirmation or disconnects during execution.
- Platform callback, DCR, discovery, protected-resource metadata, or token challenge behavior fails conformance.

Every failure should return a structured remote-safe error with remediation text and no board contents.

## Security gates

No remote connector claim or remote write capability is allowed until these gates pass with evidence:

1. Public HTTPS MCP/Streamable HTTP transport conformance.
2. OAuth authorization-code + PKCE, token validation, scope enforcement, discovery/metadata, expiry, and revocation.
3. Browser-mediated outbound bridge threat model and implementation review.
4. Pairing UX review showing visible consent, connected state, disconnect, expiry, and scope display.
5. Tab/canvas/user binding tests, replay protection, duplicate request handling, and reconnect rules.
6. Read-only rollout signoff before any write scopes are exposed.
7. Write confirmation policy signoff before mutation/export tools are enabled.
8. Audit/privacy review proving logs exclude board contents and local paths.
9. Rate limiting, abuse controls, incident response, and deletion/retention rules.
10. Platform-specific OpenAI/Microsoft validation before public availability claims.

## Test plan

- OAuth happy path and failures: wrong issuer, wrong audience/resource, expired token, revoked token, missing scope, wrong tenant/user.
- Pairing: success, expired code, replayed code, second tab attempt, logout during pairing, tab close during pairing.
- Binding: request reaches only the paired visible tab/canvas; board switch, user switch, reload, and multi-tab cases fail closed.
- Read-only tools: status/read/bounds work without writes or board-content persistence in logs.
- Writes: denied while rollout is read-only; later require visible confirmation and produce undoable app-side changes only after approval.
- Revocation: UI disconnect, OAuth revocation, token expiry, app logout, bridge drop, and browser close all terminate access.
- Privacy: audit logs contain only approved metadata and never board text, object payloads, images, exports, `.bdrl.json`, prompts with board contents, raw tokens, CDP URLs, or local paths.
- Platform readiness: OpenAI and Microsoft callback, discovery, challenge, token, scope, reconnect, and publish/connection tests pass before claims.

## Joel decision gates

Joel must explicitly approve before any step that would:

1. Move this spec from docs/design into implementation planning.
2. Start hosting, create accounts, create secrets/tokens, buy services, or deploy infrastructure.
3. Choose OAuth provider/registration model or platform submission path.
4. Enable any remote write/export scope or relax per-write confirmation.
5. Change privacy, retention, plan, pricing, or public platform-support wording.
6. Submit to OpenAI, Microsoft, a marketplace, registry, directory, or review queue.
7. Modify the invariant that Boarderless never hosts user data or server-side boards.

## Safe current wording

> Boarderless MCP supports local stdio clients today. For future OpenAI/Microsoft remote readiness, Joel selected Option A: a browser-mediated visible-session bridge. Boarderless will not host user data or server-side boards; OAuth identifies the user, and a separate user-approved outbound browser bridge must connect a hosted adapter to the user's visible canvas before remote support can be claimed.
