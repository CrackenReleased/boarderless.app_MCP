# MCPB Desktop Extension — Build & Directory Submission Guide

Status: final submission bundle `dist/boarderless-mcp-0.1.27.mcpb` built and fully verified 2026-07-05 (sha1 `bef282da226d893b18d87b32fdec4830658a4f7c`).

> **2026-07-04 rebuild note:** commit f67b51f accidentally committed a truncated
> `src/mcp-stdio-server.js` (43,445 bytes, ended mid-expression at line 996). The
> file was reconstructed from d60a117 (complete, 46,765 bytes) with the
> pathToFileURL fix re-applied, verified with `node --check` + stdio smoke test,
> and the bundle repacked with the 512×512 icon. Commit the fixed source. The
> published npm 0.1.27 contains the pre-fix (complete but without pathToFileURL)
> file — publish 0.1.28 to re-sync npm with the repo per the release gate.
Submission form: <https://clau.de/desktop-extention-submission>
Requirements reference: <https://claude.com/docs/connectors/building/submission> and <https://claude.com/docs/connectors/building/review-criteria>

## What was prepared (v0.1.27)

1. `manifest.json` (MCPB manifest_version 0.3) at repo root — declares all 19 tools (the `execute_mcp_command` catch-all dispatcher was removed 2026-07-05 per Anthropic review criteria), `tools_generated: true`, `privacy_policies: ["https://boarderless.app/privacy"]`, and `user_config` for workspace folder, canvas URL, and debugging address (mapped to `BOARDERLESS_WORKSPACE_DIR`, `BOARDERLESS_MCP_APP_URL`, `BOARDERLESS_MCP_BROWSER_URL`).
2. Tool annotations — every tool now ships `title` plus `readOnlyHint`/`destructiveHint`, in both `functions.json` and the live `tools/list` response (`TOOL_ANNOTATIONS` map in `src/mcp-stdio-server.js`, applied to static tools and merged onto dynamic canvas tools by name). Read-only: `get_server_status`, `get_board_state`, `calculate_export_bounds`, `get_board_workspace`. Everything else is marked destructive (canvas mutation, history, filesystem, or export side effects).
3. README gained a required "Privacy Policy" section linking <https://boarderless.app/privacy>.
4. Version bumped 0.1.26 → 0.1.27 in `package.json` and `SERVER_VERSION`. Per the operator runbook release gate, this version must also be published to npm before the release is declared complete.
5. `icon.png` (512×512, from `src-tauri/icons/icon.png`, swapped in 2026-07-04).

## Verification performed

- `manifest.json` passes `npx @anthropic-ai/mcpb validate`.
- `node --check` passes on the modified server.
- stdio smoke test: `initialize` returns `boarderless-mcp-bridge v0.1.27`; `tools/list` returns all static tools each with `title` + annotation. (Canvas tools appear when the browser bridge is live and receive the same annotation merge.)
- Bundle (final 2026-07-05 build): 21.6 MB packed, sha1 `bef282da226d893b18d87b32fdec4830658a4f7c`.

## Rebuilding the bundle

The bundle is built from a staged production install so dev dependencies (Tauri CLI, etc.) and repo extras (remote-adapter, ui, exe files, sample boards) stay out:

```bash
mkdir stage && cd stage
# copy: manifest.json icon.png package.json package-lock.json functions.json LICENSE README.md
#       src/mcp-stdio-server.js src/board-files.js helpers/*.js docs/features_catalog.md
npm install --omit=dev
npx @anthropic-ai/mcpb pack . boarderless-mcp-<version>.mcpb
```

`.mcpbignore` at the repo root approximates the same exclusions if packing from the root instead.

## Before submitting — Joel's checklist

- [ ] Install `dist/boarderless-mcp-0.1.27.mcpb` in Claude Desktop (Settings → Extensions → Install from file) and run every tool once against a real canvas. The form requires confirming you self-tested each tool.
- [ ] Create a **reviewer test account** on boarderless.app (Google account — the only supported sign-in) with a pre-populated board. Reviewers must reach a working canvas without guesswork.
- [ ] Decide the support channel to list (GitHub issues is currently declared).
- [ ] Publish v0.1.27 to npm (runbook release gate) and push the commit to GitHub.
- [ ] Optional: swap in a 512×512 icon and add promotional screenshots.

## Reviewer instructions (paste into the form's test-setup field, then edit)

> Boarderless MCP is a local desktop extension that controls a human-visible canvas at https://boarderless.app/canvas.
>
> 1. Install the .mcpb in Claude Desktop. In the extension settings, set "Board workspace folder" to any writable folder (defaults to Documents).
> 2. Launch Google Chrome or Microsoft Edge with remote debugging: `chrome --remote-debugging-port=9222 --user-data-dir=%LOCALAPPDATA%\boarderless-mcp-profile https://boarderless.app/canvas` (the server will attempt to auto-launch a Chromium browser on port 9222 if none is running).
> 3. Sign in on the canvas page with Google using the test account: [TEST ACCOUNT EMAIL / CREDENTIALS HERE].
> 4. In Claude, run the `get_server_status` tool first. It reports browser, authentication, and canvas-bridge state with step-by-step resolutions for any failing check.
> 5. Read-only tools to try: `get_board_state`, `calculate_export_bounds`, `get_board_workspace`.
> 6. Write tools (all annotated destructive): `create_object` (e.g. a text note), `mutate_object`, `group_objects`, `history_undo`, `export_board` (PNG), `export_board_file` (writes a .bdrl.json into the configured workspace folder).
> 7. The two `graduation_*` tools are local file helpers and need only a folder of photos; they never touch the browser.
>
> Windows + Chromium is the primary supported path; macOS/Linux are community fallbacks.

## Submission form cheat sheet

- **Name**: Boarderless Canvas
- **Tagline**: Give Claude a live spatial canvas — inspect, create, arrange, and export on your own visible Boarderless board.
- **Description**: use `long_description` from `manifest.json`.
- **Auth type**: none inside MCP (user signs into their own boarderless.app session in their own browser).
- **Transport**: local stdio (MCPB desktop extension).
- **Read/write**: both; all write tools annotated `destructiveHint`.
- **Data handling**: local-first; no server-side board storage; policy at https://boarderless.app/privacy.
- **Health data**: none. **Category**: design / creativity / productivity.
- **Docs link**: https://github.com/CrackenReleased/boarderless.app_MCP#readme
- **Support**: https://github.com/CrackenReleased/boarderless.app_MCP/issues
