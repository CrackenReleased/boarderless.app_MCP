import fs from "node:fs";
import path from "node:path";

export const BOARD_FILE_SUFFIX = ".bdrl.json";

export function resolveWorkspaceDirectory(input = process.env.BOARDERLESS_WORKSPACE_DIR || process.cwd()) {
  const resolved = path.resolve(String(input || process.cwd()));
  fs.mkdirSync(resolved, { recursive: true });
  if (!fs.statSync(resolved).isDirectory()) throw new Error(`Workspace is not a directory: ${resolved}`);
  return resolved;
}

export function sanitizeBoardFilePart(value, fallback = "Untitled Board") {
  const safe = String(value || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "")
    .slice(0, 100);
  return safe || fallback;
}

function safeBoardId(value) {
  return sanitizeBoardFilePart(value, "board").replace(/\s+/g, "-");
}

export function autosaveFilename(snapshot) {
  return `${sanitizeBoardFilePart(snapshot?.name)}--${safeBoardId(snapshot?.id)}${BOARD_FILE_SUFFIX}`;
}

export function validateBoardSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error("Board snapshot must be a JSON object.");
  }
  if (snapshot.schemaVersion !== 2) throw new Error("Board snapshot must use schemaVersion 2.");
  if (typeof snapshot.id !== "string" || !snapshot.id.trim()) throw new Error("Board snapshot is missing id.");
  if (typeof snapshot.name !== "string") throw new Error("Board snapshot is missing name.");
  for (const collection of ["shapes", "text", "gallery", "galleryAssets", "galleryAssetOrder"]) {
    if (!Array.isArray(snapshot[collection])) throw new Error(`Board snapshot is missing ${collection}.`);
  }
  if (!Number.isFinite(snapshot.lastSaved)) throw new Error("Board snapshot is missing lastSaved.");
  return snapshot;
}

export function resolveBoardFilePath(workspaceDir, filename) {
  const workspace = resolveWorkspaceDirectory(workspaceDir);
  const requested = String(filename || "");
  if (!requested || path.basename(requested) !== requested) {
    throw new Error("Board filenames must be a single file name inside the configured workspace.");
  }
  if (!requested.toLowerCase().endsWith(BOARD_FILE_SUFFIX)) {
    throw new Error(`Board filename must end with ${BOARD_FILE_SUFFIX}.`);
  }
  const resolved = path.resolve(workspace, requested);
  const relative = path.relative(workspace, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Board file escapes the configured workspace.");
  return resolved;
}

export function writeBoardSnapshot(snapshot, { workspaceDir, filename, cleanupAutosave = false } = {}) {
  validateBoardSnapshot(snapshot);
  const workspace = resolveWorkspaceDirectory(workspaceDir);
  const finalName = filename || autosaveFilename(snapshot);
  const destination = resolveBoardFilePath(workspace, finalName);
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
  const json = `${JSON.stringify(snapshot, null, 2)}\n`;
  fs.writeFileSync(temporary, json, { encoding: "utf8", flag: "wx" });
  fs.renameSync(temporary, destination);

  if (cleanupAutosave) {
    const identitySuffix = `--${safeBoardId(snapshot.id)}${BOARD_FILE_SUFFIX}`.toLowerCase();
    for (const entry of fs.readdirSync(workspace, { withFileTypes: true })) {
      if (!entry.isFile() || entry.name === finalName || !entry.name.toLowerCase().endsWith(identitySuffix)) continue;
      fs.unlinkSync(resolveBoardFilePath(workspace, entry.name));
    }
  }

  return { path: destination, filename: finalName, bytes: Buffer.byteLength(json), snapshot };
}

export function readBoardSnapshot(workspaceDir, filename) {
  const filePath = resolveBoardFilePath(workspaceDir, filename);
  const snapshot = JSON.parse(fs.readFileSync(filePath, "utf8"));
  validateBoardSnapshot(snapshot);
  return { path: filePath, filename: path.basename(filePath), snapshot };
}
