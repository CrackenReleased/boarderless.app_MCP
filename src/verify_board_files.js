import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  autosaveFilename,
  readBoardSnapshot,
  resolveBoardFilePath,
  writeBoardSnapshot,
} from "./board-files.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const workspace = fs.mkdtempSync(path.join(root, ".board-files-test-"));

const snapshot = {
  id: "board-regression-1",
  schemaVersion: 2,
  name: "Always Saved Board",
  createdAt: 1,
  lastSaved: 2,
  shapes: [],
  text: [],
  gallery: [],
  galleryAssets: [],
  galleryAssetOrder: [],
  backgroundColor: null,
  slides: [],
};

try {
  const first = writeBoardSnapshot(snapshot, { workspaceDir: workspace, cleanupAutosave: true });
  assert.equal(first.filename, autosaveFilename(snapshot));
  assert.ok(fs.existsSync(first.path), "autosave file should exist");
  assert.deepEqual(readBoardSnapshot(workspace, first.filename).snapshot, snapshot);

  const renamed = { ...snapshot, name: "Renamed Board", lastSaved: 3 };
  const second = writeBoardSnapshot(renamed, { workspaceDir: workspace, cleanupAutosave: true });
  assert.ok(fs.existsSync(second.path), "renamed autosave should exist");
  assert.equal(fs.existsSync(first.path), false, "old autosave name for the same board id should be removed");
  writeBoardSnapshot({ ...renamed, lastSaved: 4 }, { workspaceDir: workspace, cleanupAutosave: true });
  assert.equal(readBoardSnapshot(workspace, second.filename).snapshot.lastSaved, 4, "repeated autosave must atomically replace the same file");

  const explicit = writeBoardSnapshot(renamed, { workspaceDir: workspace, filename: "handoff.bdrl.json" });
  assert.ok(fs.existsSync(explicit.path), "explicit export should exist");
  assert.throws(() => resolveBoardFilePath(workspace, "../escape.bdrl.json"), /single file name|escapes/);
  assert.throws(() => resolveBoardFilePath(workspace, "not-json.txt"), /must end with/);
  assert.throws(() => writeBoardSnapshot({ ...snapshot, schemaVersion: 1 }, { workspaceDir: workspace }), /schemaVersion 2/);

  const serverSource = fs.readFileSync(path.join(here, "mcp-stdio-server.js"), "utf8");
  for (const required of [
    "get_board_workspace",
    "set_board_workspace",
    "export_board_file",
    "import_board_file",
    "MUTATING_CANVAS_TOOLS",
    "autosaveCurrentBoard",
  ]) {
    assert.ok(serverSource.includes(required), `server must retain ${required}`);
  }

  console.log("[✓] Board workspace autosave/import/export regression checks passed.");
} finally {
  fs.rmSync(workspace, { recursive: true, force: true });
}
