# MCP Connector Operator Runbook for Joel

This is the operator path for getting Boarderless MCP into connector ecosystems without overclaiming or spending money. Joel should only need to step in at decision gates. Agents can prepare files, checklists, copy, and validation output around those gates.

## Operating rules

- Do not perform the first npm publication, change package ownership, submit directory listings, buy services, create paid accounts, or start hosted infrastructure without Joel's explicit approval.
- After Joel approves the first public npm release, publishing the matching npm version is a required delivery step for every subsequent production MCP version pushed to GitHub. Do not declare the release complete while GitHub and npm versions differ.
- Treat Boarderless MCP today as a local stdio server that controls a human-visible authenticated Boarderless canvas tab.
- Keep OpenAI ChatGPT connectors and Microsoft Copilot Studio in the future-hosted-adapter bucket until an HTTPS/auth adapter exists and has been reviewed.
- Prefer evidence over copy. If a claim is not backed by a local command, a submitted listing, or a reviewed adapter design, do not say it is done.

## Phase A: local stdio distribution now

Goal: make the current local MCP server easy to install and verify for users running agent clients on their own machine.

What exists today:

- Node package shape: `@boarderless/mcp-server` with `src/mcp-stdio-server.js` as the stdio entry point.
- Local client examples for Claude Desktop, Cursor, Windsurf, Hermes/OpenClaw, and VS Code/GitHub Copilot.
- Runtime health check through `get_server_status`.
- Local-first boundary: the browser tab, Boarderless auth, and workspace file access stay on the user's machine.

What agents can do without Joel:

1. Keep README and docs examples aligned with current env vars.
2. Prepare stdio config snippets for local clients.
3. Run docs-safe validation commands in this MCP repo:

   ```bash
   npm test
   ```

4. If the Boarderless app repo is available and its dev server is already running, validate the MCP bridge from the app side:

   ```bash
   npm run verify:mcp
   ```

5. Record command output and exact repo paths in handoff notes.

What Joel must decide or provide:

- Whether the first npm package should be published and final approval of the `boarderless` organization ownership.
- Final public wording for the first release. After that approval, matching npm publication is part of the normal production release workflow unless Joel explicitly places a release on hold.
- Which local client examples matter most for first users.
- Any screenshots or videos that should represent the product publicly.

Phase A done means: local stdio install and client config instructions are accurate, `get_server_status` is the first-run diagnostic, and validation output is recorded. It does not mean OpenAI or Microsoft hosted connector support exists.

### Required GitHub ↔ npm production release gate

For every versioned production change to this MCP project after the first npm publication:

1. Use one identical version in `package.json`, the runtime server constant, GitHub release/commit wording, and npm.
2. Run `npm test`.
3. Run `npm publish --dry-run --access public` and inspect the complete tarball list.
4. Push the tested production commit to GitHub.
5. Publish that same version with `npm publish --access public`.
6. Verify delivery with `npm view @boarderless/mcp-server version`.
7. Record the Git commit, npm version, validation output, and public package URL in the handoff.

If npm publication fails, the GitHub change may remain pushed for diagnosis, but the production release must be reported as incomplete until the registries match. Never reuse an npm version; fix forward with the next patch version if a published tarball is wrong. Documentation-only commits that leave the package version unchanged do not trigger this gate.

## Phase B: registry and directory submissions later

Goal: submit the local stdio connector to MCP directories or registries only after package metadata and local install are verified.

Likely targets:

- MCP server lists and directories such as Smithery, glama.ai, and community MCP catalogs.
- Client-specific docs where local stdio servers are accepted.
- npm package discovery if Joel approves package publishing.

What agents can do without Joel:

1. Draft listing metadata from existing docs.
2. Build a submission checklist per target.
3. Verify package fields, binary name, license, tool surface, and README links.
4. Prepare issue/PR text or form answers for Joel to review.
5. Flag any target that requires an account, payment, token, or legal assertion.

What Joel must decide or provide:

- Approval to publish or submit.
- Account ownership and credentials. Agents should not create these for him.
- Final claims about support level, pricing, screenshots, trademarks, and contact email.
- Whether a registry submission is worth doing now or should wait for more usage evidence.

Phase B done means: an approved listing or package is actually submitted/published and the URL is recorded. Draft copy or unchecked forms do not count.

## Phase C: hosted OpenAI and Microsoft adapters later

Goal: design and build a remote connector adapter only if Joel decides Boarderless should support hosted connector ecosystems.

This is not the current MCP server. It likely needs:

- HTTPS transport or a platform-specific connector protocol.
- OAuth or platform-approved auth mapped to a real Boarderless user.
- A session model for reaching the user's visible canvas without creating a hidden cloud board.
- Tool policy for which actions are safe remotely.
- Workspace and `.bdrl.json` artifact policy.
- Rate limits, logging, abuse controls, and security review.
- Platform-specific review copy for OpenAI and Microsoft.

### OpenAI completion gate

Do not claim ChatGPT App/connector readiness until the production system has: a public HTTPS MCP resource server; OAuth 2.1 authorization-code + PKCE; protected-resource and authorization-server discovery metadata; CIMD, DCR, or predefined client registration; the registered ChatGPT callback; resource/audience/scope validation; `401` bearer challenges; secure remote-to-visible-canvas session routing; remote tool policy; and completed security/submission testing.

### Microsoft completion gate

Do not claim Copilot Studio readiness until the production system has: a public Streamable HTTP MCP endpoint; OAuth 2.0 using DCR/discovery, DCR with explicit endpoints, or manual client registration; the Copilot-provided callback registered at the identity provider; scoped access/refresh/revocation validation; secure remote-to-visible-canvas session routing; tenant/admin, DLP, secret-rotation, and audit controls; and completed Copilot connection/publish testing.

For both platforms, OAuth is necessary authorization infrastructure but does not solve the remote session bridge. The local npm package connects to a browser on the same computer through CDP; a hosted service needs a separately reviewed, user-controlled way to reach the correct visible canvas without exposing localhost, browser debugging, or arbitrary workspace access.

What agents can do without Joel:

1. Draft an adapter design doc with risks and trade-offs.
2. Compare OpenAI and Microsoft connector requirements from public docs.
3. Identify which current tools are safe candidates for remote use.
4. Create a cost and maintenance estimate before any infrastructure is started.

What Joel must decide or provide:

- Whether hosted connector support is a product priority.
- Budget for hosting, auth, review, monitoring, and maintenance.
- Security posture for remote mutation of a user's canvas.
- Product wording for what remote agents may and may not do.

Phase C done means: a reviewed hosted adapter is live, authenticated, tested, and accepted by the relevant platform. Until then, say this is planned adapter work.

## Claims we must not make yet

Do not claim any of the following until there is direct evidence:

- "Boarderless is available in ChatGPT connectors."
- "Boarderless is available in Microsoft Copilot Studio."
- "The OpenAI/Microsoft connector is ready."
- "Installing the npm package enables ChatGPT Apps or Copilot Studio."
- "OAuth alone connects a hosted agent to the user's local Boarderless canvas."
- "MCP can access Google Drive for the user."
- "MCP can control a hidden cloud canvas without the user's browser session."
- "Registry submission is complete" unless the public URL exists.
- "npm install works everywhere" unless the exact package version was published and tested from a clean environment.

Safe current wording:

> Boarderless MCP supports local stdio clients today. The npm package is not a hosted ChatGPT App or Microsoft Copilot Studio connector. Both require a future remote transport, OAuth implementation, and secure browser-session bridge before we can claim support.

## Joel action gates

Agents should stop and ask Joel before any of these actions:

1. The first npm publication, changing package ownership, or intentionally withholding npm from a versioned production release. Routine matching-version publications after first-release approval are required delivery work.
2. Submitting to a registry, directory, marketplace, or platform review.
3. Creating accounts, tokens, paid services, or hosted infrastructure.
4. Claiming OpenAI or Microsoft support publicly.
5. Changing product pricing, plan boundaries, privacy wording, or security claims.

## Validation checklist before handoff

From this MCP repo:

```bash
npm test
```

From the Boarderless app repo, only when the app dev server is already running and the repo has the script:

```bash
npm run verify:mcp
```

For docs-only changes in this repo:

```bash
git diff --check
```

Handoff should include:

- Files changed.
- Commands run and whether they passed.
- Any commands intentionally not run and why.
- Any Joel decision gates reached.
