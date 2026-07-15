# Anthropic Connectors Directory — Submission Answers (Boarderless, v0.1.27)

Form: Desktop extension submission — https://clau.de/desktop-extention-submission
Bundle to upload: `dist/boarderless-mcp-0.1.27.mcpb` (sha1 bef282da226d893b18d87b32fdec4830658a4f7c — final 2026-07-05 build: reconstructed server source, 512×512 icon, execute_mcp_command removed)
Every field below is ready to paste. Fields only Joel can supply are marked **[JOEL]**.

---

## Server basics

- **Server / connector name:** Boarderless Canvas
- **Type:** Desktop extension (MCP Bundle / MCPB), local stdio server
- **Tagline (≤10 words):** Give Claude a live spatial canvas to design on.
- **Short description:**
  Boarderless is a local-first, infinite spatial canvas. This extension connects
  Claude to your own signed-in, visible Boarderless canvas so it can inspect,
  create, arrange, group, undo, and export objects — and keep durable local
  `.bdrl.json` board files. The browser owns the canvas; nothing is copied to a
  hidden cloud board.
- **Use cases:**
  1. Ask Claude to lay out photos, notes, or shapes on an infinite canvas.
  2. Have Claude restyle, group, and reorder existing objects, with full undo.
  3. Export the board to PNG/PDF/SVG or a portable `.bdrl.json` for handoff.

## Connection details

- **Auth type:** None at the MCP layer. The user signs into their own
  boarderless.app session in their own browser; the local server attaches to that
  visible tab via Chrome DevTools Protocol on `127.0.0.1:9222`. No credentials,
  tokens, or OAuth are handled by the connector.
- **Transport:** Local stdio (MCPB desktop extension).
- **Read/write:** Both. All write tools carry `destructiveHint`; read-only tools
  carry `readOnlyHint`.
- **Connection requirements:** Windows 10/11 (primary; macOS/Linux community
  fallback), Node 18+, a Chromium browser (Chrome/Edge/Brave/Opera) reachable on
  remote-debugging port 9222 (the server can auto-launch a visible window), and a signed-in
  session at https://boarderless.app/canvas.

## Data & compliance

- **Data handling:** Local-first. The server sends no telemetry and stores no
  server-side data. Board snapshots and exports are written only to the local
  workspace folder the user configures. It never inherits the user's Google
  identity or Drive access.
- **Third-party connections:** None initiated by the connector; it talks only to
  the user's local browser and the Boarderless canvas page the user is signed into.
- **Health data:** None.
- **Category:** Design / Creativity / Productivity.
- **Privacy policy URL:** https://boarderless.app/privacy

## Tools (19) — all annotated

Read-only (`readOnlyHint`): get_server_status, get_board_state,
calculate_export_bounds, get_board_workspace.

Write (`destructiveHint`): create_object, mutate_object, remix_style,
delete_objects, group_objects, ungroup_objects, reorder_object, history_undo,
history_redo, set_board_workspace, export_board, export_board_file,
import_board_file, graduation_rename_photos, graduation_standardize_images.

Note: the former `execute_mcp_command` compatibility dispatcher was removed
2026-07-05 before submission — catch-all dispatcher tools are an explicit
rejection reason in Anthropic's review criteria, and it duplicated the
individual tools.

Confirmation: every tool has a human-readable `title` and the applicable
annotation (verified in `tools/list`). Self-test evidence:
`docs/e2e_attestation.md` (19/19 confirmed via MCP tools/call on a live
signed-in canvas, 2026-07-05; export_board requires a focused canvas tab).

## Documentation & support

- **Documentation:** https://github.com/CrackenReleased/boarderless.app_MCP#readme
- **Privacy policy:** https://boarderless.app/privacy
- **Support channel:** https://github.com/CrackenReleased/boarderless.app_MCP/issues
- **Source:** https://github.com/CrackenReleased/boarderless.app_MCP (Apache-2.0)

## Test account & reviewer instructions (paste into the test-setup field)

> Boarderless Canvas is a local desktop extension that drives a human-visible
> canvas at https://boarderless.app/canvas.
>
> 1. Install the provided .mcpb in Claude Desktop (Settings → Extensions →
>    Install from file). In the extension settings, set "Board workspace folder"
>    to any writable folder (defaults to Documents).
> 2. Launch Chrome or Edge with remote debugging and open the canvas:
>    `chrome --remote-debugging-port=9222 --user-data-dir=%LOCALAPPDATA%\boarderless-mcp-profile https://boarderless.app/canvas`
>    (If no debug browser is running, the server auto-launches one on port 9222.)
> 3. Sign in on the canvas page with the reviewer test account:
>    **[JOEL: create a dedicated Google test account with a pre-populated board
>    and paste email + password here. Google sign-in is the only supported
>    authentication path — a test account is required.]**
> 4. Keep that canvas tab visible/focused. In Claude, run `get_server_status`
>    first — it reports browser, auth, and bridge state with step-by-step fixes.
> 5. Read-only to try: `get_board_state`, `calculate_export_bounds`,
>    `get_board_workspace`.
> 6. Write tools: `create_object` (a text note), `mutate_object`, `group_objects`
>    / `ungroup_objects`, `reorder_object`, `history_undo` / `history_redo`,
>    `export_board` (PNG — keep the tab focused), `export_board_file` (writes a
>    .bdrl.json into the workspace folder), `delete_objects`.
> 7. `graduation_rename_photos` / `graduation_standardize_images` are local photo
>    batch helpers — point them at any folder of images; no browser needed.
>
> Primary tested surface: Windows + Chrome. macOS/Linux are community fallbacks.

## Launch readiness

- **GA date:** Immediately upon approval.
- **Surfaces tested:** Claude Desktop (local MCPB). **[JOEL: confirm you installed
  the .mcpb and ran the tools once before submitting.]**

## Branding

- **Logo:** icon.png in the repo root (512×512, swapped in 2026-07-04).
- **Favicon / domain:** boarderless.app (verify domain ownership if prompted).
- **Screenshots:** Not required for a non-MCP-Apps desktop extension. (Only MCP
  Apps require carousel screenshots.)

## Pre-submission checklist (Joel)

- [ ] Install `dist/boarderless-mcp-0.1.27.mcpb` in Claude Desktop; run each tool
      once against a real canvas (satisfies the self-test confirmation).
- [ ] Create the reviewer Google test account (with a pre-populated board) and fill step 3.
- [ ] Pick a GA date.
- [ ] Submit at https://clau.de/desktop-extention-submission and attach the .mcpb.
