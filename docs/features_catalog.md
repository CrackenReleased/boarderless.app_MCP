# Boarderless Feature Catalog (RAG Index)

This file contains the complete feature catalog for **Boarderless**, serving as a RAG (Retrieval-Augmented Generation) capability index. AI agents can query this file to understand the tools, limitations, export formats, styling options, keyboard shortcuts, and capabilities supported by the application.

---

## 🚀 Core Product Capabilities

### 1. Canvas & Viewport Gestures
- **Infinite Zoom & Pan:** Trackpad pinch, mouse wheel, or mobile pinch actions. Single-finger pan on touchscreens.
- **Stage Centering & Reset:** Quick viewport adjustments to center elements or reset alignment.
- **Dynamic Grid Snap:** Multi-tempo alignment lines that breathing groups share.

### 2. Element Selection & Transformations
- **Multi-select Marquee:** Drag a marquee bounding box to group multiple objects.
- **Z-Order Stack Adjustment:** Move objects forward, backward, or send to top/bottom layer.
- **Scale & Rotate Outlines:** Manipulate coordinates, bounding dimensions, and rotation angles.

### 3. Styling & Options
- **Typography Engine:** Modify font families (e.g. OpenDyslexic, Outfit), font size, line decoration, swatches, alignment, and outer FX stroke borders.
- **Shape Customizations:** Adjust corners (border-radius), stroke width, opacity levels, and edge feathering.
- **Image Editing:** Hosts crop tools, color grade adjustments, vertical/horizontal flips, and custom image vector clip masks.

### 4. File Management & Persistence
- **Autosave Engine:** Debounced local storage commits via IndexedDB with Saved/Saving header indicators.
- **Multi-board Support:** Group different canvas workspaces into tabs. Cap limits map to subscription plan tiers.
- **Archiving & G Drive Sync:** Soft archiving, permanent local/cloud wipes, and Pro-tier Google Drive JSON syncing with friendly human-readable names (`{boardName}.bdrl.json`).

---

## ⌨️ Keyboard Shortcuts Reference

| Combination | Action | Scope |
|-------------|--------|-------|
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo last mutation | Local stack |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> / <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | Redo next mutation | Local stack |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Delete selected elements | Canvas |
| <kbd>Ctrl</kbd> + <kbd>A</kbd> | Select all elements on current board | Canvas |
| <kbd>Ctrl</kbd> + <kbd>C</kbd> / <kbd>Ctrl</kbd> + <kbd>V</kbd> | Copy and paste elements | Canvas |
| <kbd>Esc</kbd> | Deselect all | Canvas |
| <kbd>Space</kbd> + Drag | Drag stage to pan | Viewport |

---

## 💳 Plan Tier Boundaries & Features

| Capability | Free | Personal ($3/mo) | Pro ($5/mo) |
| --- | --- | --- | --- |
| **Max Cached Boards** | 1 board | 5 boards | Unlimited |
| **Max Objects / Board** | 5 objects | Unlimited | Unlimited |
| **Undo Buffer Limit** | 3 slots | 100 slots | Unlimited |
| **Export Formats** | PNG | PNG, animated GIF | PNG, GIF, PDF, Google Slides |
| **Cloud Sync** | No | No | Google Drive Mirror |
| **Agentic MCP Access** | Yes | Yes | Yes |

---

## 🤖 Model Context Protocol (MCP) Interface

AI agents can connect directly to the running canvas using the following Stdio Model Context Protocol tools:

### Available Tools:
1. `get_server_status`: Diagnoses port availability, OAuth status, and canvas connection.
2. `execute_mcp_command`: Compatibility wrapper to dispatch commands by name.
3. `get_board_state`: Reads a JSON snapshot of coordinates, types (text, shape, image), and visual styles.
4. `mutate_object`: Programmatically shifts, resizes, rotates, or changes colors/text on any shape or typography element.
5. `calculate_export_bounds`: Computes bounds for selected/total nodes to format clean outputs.
6. `create_object`: Spawns a new text block or shape (rect, ellipse, triangle, arrow) on the canvas stage.
7. `delete_objects`: Removes one or more objects by their IDs from the canvas.
8. `history_undo`: Undoes the last canvas mutation.
9. `history_redo`: Redoes the next canvas mutation in the history timeline.
10. `group_objects`: Combines multiple objects under a unique groupId.
11. `ungroup_objects`: Dissolves grouping for a specified groupId.
12. `reorder_object`: Shifts the z-index layer stack position of an object.
13. `export_board`: Requests file creation in PNG, SVG, or PDF formats.
14. `graduation_rename_photos`: Formats local folders sequentially.
15. `graduation_standardize_images`: Batch converts progressive JPEGs and HEIC files to standard RGB JPEGs.
