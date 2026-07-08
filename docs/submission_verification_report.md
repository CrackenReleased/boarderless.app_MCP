# Submission Verification Report — boarderless-mcp-0.1.27.mcpb

Date: 2026-07-05
Artifact: `dist/boarderless-mcp-0.1.27.mcpb`
SHA1: `bef282da226d893b18d87b32fdec4830658a4f7c` (21.6 MB packed)
Criteria audited against: <https://claude.com/docs/connectors/building/review-criteria>
and <https://claude.com/docs/connectors/building/submission> (fetched 2026-07-04/05).

## Every published review criterion, checked

| Criterion | Result | Evidence |
|---|---|---|
| No catch-all read/write tool | **PASS** | `execute_mcp_command` (freeform command dispatcher) removed from server, functions.json, manifest.json, and docs on 2026-07-05. 19 purpose-built tools remain. |
| Read and write operations in separate tools | PASS | 4 read-only tools, 15 write tools; no tool mixes safe and unsafe operations behind a parameter. |
| Every tool has `title` + `readOnlyHint`/`destructiveHint` | PASS | Verified in functions.json, manifest.json, AND the live `tools/list` response from the unpacked final bundle (19/19 annotated). |
| Tool names ≤ 64 chars | PASS | Longest is `graduation_standardize_images` (29). |
| Descriptions narrow, accurate, match behavior | PASS | Reviewed all 19; each states what it does and when to call it. Behavior verified per-tool (below). |
| Custom query tools reference API docs | N/A | No freeform endpoint/query tools remain after dispatcher removal. |
| No prompt-injection patterns in descriptions | PASS | Scanned all descriptions: no instructions to Claude, no external-instruction pulls, no hidden/encoded text, no product promotion. |
| Tools return successful responses with valid params | **PASS — 19/19** | Live e2e via MCP `tools/call` against a signed-in canvas, 2026-07-05 (`e2e-run.log`, `docs/e2e_attestation.md`). 18/19 in one automated pass; `export_board` passed on immediate retest with the canvas tab focused (documented requirement). |
| Actionable error messages | PASS | Error paths return coded errors with `resolution` strings (e.g. `MISSING_ARGUMENT`, `WORKSPACE_PATH_INVALID`); verified in source. |
| No conversation/memory data collection | PASS | Server touches only the local browser (CDP 127.0.0.1:9222) and the configured workspace folder. No telemetry. |
| API ownership | PASS | Connects only to boarderless.app (submitter's own domain) via the user's own browser session. |
| Not an unsupported use case | PASS | No financial transfers; no AI image/video/audio generation (canvas/design tooling is explicitly allowed; graduation tools do local file renaming/format conversion, not AI generation). |
| Privacy policy (local connector) | PASS | README "Privacy Policy" section (line ~452); `privacy_policies: ["https://boarderless.app/privacy"]` in manifest (manifest_version 0.3 ≥ 0.2); URL live (HTTP 200). |
| Manifest validates | PASS | `npx @anthropic-ai/mcpb validate` — schema passes; icon 512×512 (recommended size). |
| Open-source requirement (MCPB) | PASS | Apache-2.0, public repo: github.com/CrackenReleased/boarderless.app_MCP. |
| Public documentation by publish date | PASS | GitHub README is public. |
| OAuth for authenticated services | N/A | No auth at the MCP layer; the user signs into their own browser session. Declared as "Auth type: none" in the submission answers. |
| Test credentials: fully populated account | **OPEN — Joel** | Google sign-in is the only auth path. A dedicated test account with a pre-populated board must be created and pasted into the form. |

## Artifact integrity checks

1. `manifest.json` — schema valid, 19 tools declared, matches live tool surface exactly.
2. Bundle unpacked fresh and the server was booted **from the unpacked bundle** on Windows: `initialize` OK (`boarderless-mcp-bridge v0.1.27`), `tools/list` = 19 annotated tools, `get_server_status` = "All systems operational" with the browser bridge live.
3. `functions.json`, `manifest.json`, live `tools/list`, and `docs/features_catalog.md` are mutually consistent (19 tools, same names).
4. No stale `execute_mcp_command`/Free Mode references anywhere in the bundle or repo docs.
5. Staged production install: dev dependencies, remote-adapter, ui, .exe files excluded.

## Fixes made during verification (would each have been a rejection)

- **Truncated server source** committed in f67b51f (file ended mid-expression; server could not start). Reconstructed from d60a117 + pathToFileURL fix. The previously staged bundle was dead on arrival.
- **Catch-all dispatcher tool** `execute_mcp_command` removed (explicit rejection reason).
- **Reviewer instructions referenced a "Free Mode / Continue without Google" path that does not exist** on the live site; replaced with the test-account path.
- Icon upgraded 256×256 → 512×512 (recommended).
- e2e harness reordered so `export_board` runs before `delete_objects`.

## Remaining human steps (cannot be automated)

1. Commit and push the working tree (fixed server, manifest, functions.json, harness, docs, icon, bundle).
2. Publish v0.1.28 to npm to re-sync (published 0.1.27 predates the fix and still contains the dispatcher and the pre-pathToFileURL import).
3. Create the reviewer Google test account with a pre-populated board; paste credentials into the form.
4. Install the .mcpb in Claude Desktop once via Settings → Extensions (personal self-test attestation on the form).
5. Submit at <https://clau.de/desktop-extention-submission>.
