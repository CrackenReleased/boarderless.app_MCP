# Boarderless Product & MCP Feature Catalog

This is the agent-readable companion to Boarderless's long-form public feature map. It explains what the app can do, what the MCP can operate, and where a human deliberately remains in control. Treat it as product truth—not permission to invent a feature because it would be convenient.

## The product in one honest sentence

Boarderless is a **Local First**, spatial creative canvas where individuals arrange text, shapes, images, slides, and exports on their own device; Pro users may additionally connect their own Google Drive for optional cross-device mirroring.

Local First is the selling point. It is not a frame-rate or hardware guarantee. Real-world responsiveness depends on the user's browser, device, display, and board complexity.

## Complete app capability map

### Canvas, viewport & navigation

- Boundless coordinate space without a fixed artboard.
- Mouse-wheel/trackpad zoom centered around the cursor.
- Grab-to-pan, single-finger touch pan, and two-finger pinch/pan.
- Zoom buttons and double-click/double-tap viewport reset.
- Transparent or colored canvas background.
- Minimap showing object positions, viewport location, short text/emoji previews, and selected-node highlights.

### Creation tools & object types

- Select, Grab, Marquee, Text, Draw, Rectangle, Triangle, Circle, Arrow, Shapes, Image/Gallery, and Layers tools.
- Shape objects: rectangles, ellipses, triangles, arrows, and freehand paths.
- Text objects with editable content and independent typography styling.
- Image objects imported by picker or clipboard, including PNG, JPEG, GIF, WebP, HEIC, and SVG intake paths.

### Selection, grouping & transformation

- Click/tap selection, Shift/Ctrl/Cmd additive selection, touch multi-select mode, marquee selection, select-all, and invert selection.
- Multi-object dragging that preserves relative spacing and commits one undo step.
- Logical Group/Ungroup behavior across shapes, text, and images.
- Group-aware selection, move, duplicate, reorder, and delete.
- Resize, rotate, arrow-key nudge, duplicate, delete, and unified z-order controls.
- Selected-object pulse on canvas and selected-node treatment in the minimap.

### Shape & text styling

- Shape stroke, fill, stroke width, opacity, edge feather, and supported corner-radius controls.
- Sticky styling defaults: the last deliberately chosen style becomes the starting point for the next compatible object.
- Text font family, size, alignment, regular/bold/italic combinations, underline, strikethrough, fill, outline, and separate fill/outline opacity.
- Emoji picker with focus-preserving insertion and system emoji font fallbacks.

### Image work

- Gallery strip and cross-board My Media library.
- Add an existing media item to another board; purge media across referencing boards.
- Rectangular crop and freehand lasso crop.
- Brightness, contrast, saturation, hue, and blur adjustments.
- Horizontal and vertical flip.
- Cookie-cutter masks: circle, rounded rectangle, triangle, hexagon, star, and heart.
- Local background removal from the in-app Ai Partner.
- Original-asset-aware persistence/export paths for supported image workflows.

### Layout, layers & board organization

- Auto-Wrap Border, Meme Grid, Equal 2×2, and removable layout overlays.
- Unified Layers panel across shape, text, and image objects.
- Multiple boards in one project, plan-dependent active-board limits, inline rename, soft archive, restore, and permanent delete.
- Board thumbnails and cross-board media browsing.

### Slides & presentation

- Slides panel for creating named viewport-based slides, reordering, renaming, deleting, and navigating them.
- Presentation mode for walking through saved slide views directly inside Boarderless.
- Slides remain part of the persisted board snapshot.

### Export

- Whole-canvas and selection PNG with transparent-background support.
- Static crop frame and aspect-ratio presets for framed selection output.
- Finished-size estimation and user-configurable export budget.
- Animated GIF for Personal and Pro.
- Local PDF for Pro.
- Editable vector SVG for Pro.
- Google Slides-compatible JSON payload for Pro. This is a structured handoff file, not direct creation inside a Google account.
- Custom filenames for Personal and Pro.

### History, help & sensory feedback

- Labeled undo/redo history: 3 recent steps on Free, up to 100 on Personal and Pro.
- Gesture coalescing so slider/drag gestures become one undo step.
- First-run onboarding plus replayable Help steps.
- Optional action sounds, touch feedback where supported, selection pulses, and explanatory UI motion.
- Responsive desktop and mobile control surfaces plus installable PWA metadata.

### Persistence & optional Drive sync

- Local First IndexedDB autosave with Saved/Saving/Unsaved status.
- Boot hydration restores board state, viewport, slides, and supported UI state.
- Canonical schema-v2 `.bdrl.json` board import/export portability.
- Pro may explicitly connect and enable Google Drive sync.
- Connected Pro sync mirrors board JSON and supported raw media into the user's own `My Drive/Boarderless/` folder.
- Friendly filenames, rename propagation, sync status, last-writer-wins reconciliation, soft archive, and Drive-aware permanent deletion.
- Drive access, Google identity, and browser permissions remain human-controlled.

### In-app Ai Partner

- The **Ai Partner** panel is an app feature distinct from MCP.
- It translates supported natural-language requests into structural canvas actions and lets the user inspect/apply them.
- It supports direct, user-authorized connections to Gemini, OpenAI, Anthropic Claude, Z.AI/GLM, local models, and custom OpenAI-compatible endpoints.
- Provider API keys are tab-session-only; structural board context goes directly to the provider selected by the user and is not relayed through the MCP server.
- It performs local per-image background removal.
- Its actions use the same visible canvas, persistence, and history stores as manual edits.

## Plan boundaries

| Capability | Free | Personal ($3/mo or $30/yr) | Pro ($5/mo or $50/yr) |
| --- | --- | --- | --- |
| Active locally persisted boards | 1 | 5 | Unlimited |
| Objects per board | 5 | Unlimited | Unlimited |
| Undo history | 3 | 100 | 100 |
| Export formats | PNG | PNG, animated GIF | PNG, GIF, PDF, Google Slides-compatible JSON, SVG |
| Custom export filename | No | Yes | Yes |
| Optional Google Drive sync | No | No | Yes, after explicit connection |
| MCP canvas access | Yes | Yes | Yes |

These are the complete published individual plans. Alternate promotional or organizational offers do not exist.

## Keyboard shortcuts

| Combination | Action |
| --- | --- |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z` | Redo |
| `Delete` / `Backspace` | Delete selection |
| `Ctrl/Cmd + A` | Select all |
| `Ctrl/Cmd + C` / `Ctrl/Cmd + V` | Copy/paste supported canvas content |
| `Shift`, `Ctrl`, or `Cmd` + click | Add/toggle selection |
| Arrow keys | Nudge selection; add Shift for larger step |
| `[` / `]` | Move through z-order; add Shift for bottom/top |
| `Esc` | Clear selection, close active panel, or exit presentation |
| Space + drag | Temporarily pan the viewport |

## Model Context Protocol interface

MCP connects an external agent to the same running, visible canvas through local stdio and Chromium's DevTools connection. It does not replace the app, bypass plan boundaries, inherit Google permissions, or create an invisible server-side canvas.

### Canvas and diagnostic tools

1. `get_server_status` — diagnose browser, tab, bridge, and authentication readiness.
2. `execute_mcp_command` — compatibility dispatcher for supported command aliases.
3. `get_board_state` — read the render-ordered board ledger.
4. `calculate_export_bounds` — measure active board bounds.
5. `mutate_object` — change supported position, geometry, text, and styling fields.
6. `remix_style` — apply the same canonical Style Remix palettes offered by Canvas and Play to a selection or explicitly to the whole board as one undoable action.
7. `create_object` — add text or supported shape objects.
8. `delete_objects` — remove known object IDs.
9. `history_undo` — undo through Boarderless history.
10. `history_redo` — redo through Boarderless history.
11. `group_objects` — create a logical group.
12. `ungroup_objects` — dissolve a logical group.
13. `reorder_object` — move an object through the z-order.
14. `export_board` — request PNG, PDF, or SVG output; app tier rules apply.

### Durable board-file tools

15. `get_board_workspace` — report the directory receiving board artifacts.
16. `set_board_workspace` — point artifacts at an explicit absolute project directory.
17. `export_board_file` — atomically flush the complete schema-v2 canvas to `.bdrl.json`.
18. `import_board_file` — validate, import, open, and re-save a workspace-contained `.bdrl.json` board.

Successful MCP create, mutate, Style Remix, delete, group, ungroup, reorder, undo, and redo calls refresh `<board-name>--<board-id>.bdrl.json` in the configured workspace. Agents should confirm the workspace before composing and explicitly call `export_board_file` before handoff.

### Human-controlled boundaries

- The human signs in and grants Google Drive access.
- The human chooses local files for upload; MCP does not expose arbitrary file upload into image nodes.
- The human grants browser permissions.
- Ai Partner background removal is an in-app image action, not an MCP filesystem operation.
- The published npm MCP is a local `stdio` connector. It is not a hosted ChatGPT App or Microsoft Copilot Studio connector.
- OpenAI hosted readiness still requires HTTPS MCP transport, OAuth 2.1 discovery/PKCE/client registration and scoped-token validation; Microsoft hosted readiness still requires Streamable HTTP plus OAuth 2.0/DCR or manual client registration.
- Both hosted paths additionally require a secure, user-controlled bridge from the remote service to the correct human-visible Boarderless canvas. OAuth authenticates the user but does not provide access to localhost CDP.
- MCP can create supported text/shapes, but its current `create_object` schema does not create image nodes.

### Repository-specific helper tools

- `graduation_rename_photos` — sequentially rename photos in an explicitly supplied local directory.
- `graduation_standardize_images` — convert progressive JPEG/HEIC inputs into baseline RGB JPEGs in an explicitly supplied directory.

These helpers are local filesystem utilities shipped beside the Boarderless MCP server. They are not general Boarderless canvas features.
