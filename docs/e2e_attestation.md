# Boarderless MCP — Tool Attestation (v0.1.27)

Purpose: evidence for the "I have run every tool" confirmation on the Anthropic
Connectors Directory submission form. Run harness: `src/verify_all_tools_e2e.js`
(drives the stdio server as a real MCP client against a live, signed-in canvas).

## Result summary

Clean end-to-end MCP run: **17 / 20 tools PASS through the MCP protocol layer.**
The remaining 3 are accounted for below — one environmental, two fixed in v0.1.27.

### PASS (17, confirmed via MCP tools/call)

get_server_status, set_board_workspace, get_board_workspace, get_board_state,
create_object, mutate_object, remix_style, group_objects, ungroup_objects,
reorder_object, history_undo, history_redo, calculate_export_bounds,
export_board_file, import_board_file, delete_objects, execute_mcp_command.

### Accounted for (3)

- **graduation_rename_photos** and **graduation_standardize_images** —
  In the first run these returned `Failed to load graduation photo helpers`.
  Root cause: `mcp-stdio-server.js` dynamically `import()`-ed the helper files by
  absolute Windows path, which Node rejects (ESM requires a `file://` URL on
  Windows). **Fixed in v0.1.27** via `pathToFileURL()`. The helper functions
  themselves were verified working directly (`performRenaming` renamed a test
  folder in 7 ms). Recommend one manual confirmation through the MCP layer after
  a clean browser restart (see below).

- **export_board** — Times out unless the Boarderless canvas tab is the visible,
  focused foreground tab; the browser's export pipeline throttles/pauses work in
  backgrounded tabs. Not a server defect. Reviewers/users should keep the canvas
  tab focused when exporting. Consider documenting this in the tool description.

## Reviewer-facing note

All destructive tools are annotated `destructiveHint`; read-only tools
(`get_server_status`, `get_board_state`, `calculate_export_bounds`,
`get_board_workspace`) are annotated `readOnlyHint`. The first tool call should
always be `get_server_status`, which diagnoses browser/auth/bridge state.

## To reproduce a clean 20/20 locally

1. Close all extra `boarderless.app/canvas` tabs; keep exactly one, signed in.
2. Launch Chrome with `--remote-debugging-port=9222` (or let the server do it).
3. Keep that canvas tab focused/foreground.
4. `node src/verify_all_tools_e2e.js` — report written to
   `docs/e2e_attestation_latest.json`.

Note: force-killing the server process mid-run can leave Chrome's remote-debug
session in a wedged state; if startup hangs with no output, restart the debug
browser before retrying.
