#!/usr/bin/env node

/**
 * Boarderless MCP Server — mcp-stdio-server.js
 *
 * Model Context Protocol server that bridges AI agents to the live
 * Boarderless canvas via Chrome DevTools Protocol (CDP / Puppeteer).
 *
 * Cross-platform: works on Windows, macOS, and Linux.
 * No hardcoded user paths — all paths are resolved at runtime from
 * environment variables or OS-standard directories.
 *
 * TOOL SILOING: Every tool is wrapped in its own error boundary so that
 * a failure in one tool never crashes or corrupts another. All errors are
 * returned as structured JSON objects that agents and users can act on.
 *
 * @see https://github.com/CrackenReleased/boarderless.app_MCP
 * @license Apache-2.0
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import puppeteer from "puppeteer-core";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import net from "net";
import fs from "fs";
import os from "os";
import {
  readBoardSnapshot,
  resolveWorkspaceDirectory,
  writeBoardSnapshot,
} from "./board-files.js";
import { assertVisibleBoarderlessPage } from "./visible-browser-policy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVER_NAME    = "boarderless-mcp-bridge";
const SERVER_VERSION = "0.2.543";
const DEFAULT_APP_URL    = "https://boarderless.app/canvas";
const DEFAULT_BROWSER_URL = "http://127.0.0.1:9222";

/** Resolved at runtime — never hardcoded. */
const BROWSER_URL = process.env.BOARDERLESS_MCP_BROWSER_URL || DEFAULT_BROWSER_URL;
let _workspaceDir = resolveWorkspaceDirectory();

const MUTATING_CANVAS_TOOLS = new Set([
  "mutate_object",
  "remix_style",
  "create_object",
  "delete_objects",
  "history_undo",
  "history_redo",
  "group_objects",
  "ungroup_objects",
  "reorder_object",
]);

/**
 * Directory-required MCP tool annotations (title + readOnlyHint/destructiveHint).
 * Applied to static tools below and merged onto dynamic canvas tools by name so
 * every tool in tools/list carries the safety metadata Anthropic's Connectors
 * Directory review requires. Keep in sync with functions.json.
 */
const TOOL_ANNOTATIONS = {
  get_server_status:             { title: "Get Server Status",            annotations: { readOnlyHint: true } },
  get_board_state:               { title: "Get Board State",              annotations: { readOnlyHint: true } },
  calculate_export_bounds:       { title: "Calculate Export Bounds",      annotations: { readOnlyHint: true } },
  get_board_workspace:           { title: "Get Board Workspace",          annotations: { readOnlyHint: true } },
  mutate_object:                 { title: "Mutate Canvas Object",         annotations: { readOnlyHint: false, destructiveHint: true } },
  remix_style:                   { title: "Remix Object Style",           annotations: { readOnlyHint: false, destructiveHint: true } },
  create_object:                 { title: "Create Canvas Object",         annotations: { readOnlyHint: false, destructiveHint: true } },
  delete_objects:                { title: "Delete Canvas Objects",        annotations: { readOnlyHint: false, destructiveHint: true } },
  history_undo:                  { title: "Undo Last Action",             annotations: { readOnlyHint: false, destructiveHint: true } },
  history_redo:                  { title: "Redo Last Action",             annotations: { readOnlyHint: false, destructiveHint: true } },
  group_objects:                 { title: "Group Canvas Objects",         annotations: { readOnlyHint: false, destructiveHint: true } },
  ungroup_objects:               { title: "Ungroup Canvas Objects",       annotations: { readOnlyHint: false, destructiveHint: true } },
  reorder_object:                { title: "Reorder Canvas Object",        annotations: { readOnlyHint: false, destructiveHint: true } },
  set_board_workspace:           { title: "Set Board Workspace",          annotations: { readOnlyHint: false, destructiveHint: true } },
  export_board_file:             { title: "Export Board File (.bdrl.json)", annotations: { readOnlyHint: false, destructiveHint: true } },
  import_board_file:             { title: "Import Board File (.bdrl.json)", annotations: { readOnlyHint: false, destructiveHint: true } },
  export_board:                  { title: "Export Board (PNG/PDF/SVG)",   annotations: { readOnlyHint: false, destructiveHint: true } },
  graduation_rename_photos:      { title: "Rename Photos in Folder",      annotations: { readOnlyHint: false, destructiveHint: true } },
  graduation_standardize_images: { title: "Standardize Images in Folder", annotations: { readOnlyHint: false, destructiveHint: true } },
  render_board_in_blender:       { title: "Render Board in Blender",      annotations: { readOnlyHint: false, destructiveHint: false } },
};

/** Merge title + safety annotations onto a tool definition by name. */
function withToolAnnotations(tool) {
  const meta = TOOL_ANNOTATIONS[tool.name];
  if (!meta) return tool;
  return {
    ...tool,
    title: tool.title || meta.title,
    annotations: { ...(meta.annotations), ...(tool.annotations || {}) },
  };
}

async function exportCurrentBoardSnapshot(page) {
  const result = await page.evaluate(async () => {
    if (typeof window.reactPersistence?.exportCurrent !== "function") {
      return { ok: false, error: "The canvas persistence export bridge is unavailable. Refresh Boarderless and retry." };
    }
    const snapshot = await window.reactPersistence.exportCurrent();
    return snapshot ? { ok: true, snapshot } : { ok: false, error: "No active board is available to export." };
  });
  if (!result.ok) throw new Error(result.error);
  return result.snapshot;
}

async function autosaveCurrentBoard(page) {
  const snapshot = await exportCurrentBoardSnapshot(page);
  return writeBoardSnapshot(snapshot, { workspaceDir: _workspaceDir, cleanupAutosave: true });
}

// ─── Structured error helpers ─────────────────────────────────────────────────

/**
 * Build a transparent, agent-readable error response.
 *
 * Every error contains:
 *   - error_code    — machine-readable short string (e.g. "AUTH_REQUIRED")
 *   - message       — human-readable description
 *   - resolution    — step-by-step user fix
 *   - context       — optional extra debug fields
 */
function makeError(code, message, resolution, context = {}) {
  const payload = {
    status:     "error",
    error_code: code,
    message,
    resolution,
    server:     SERVER_NAME,
    version:    SERVER_VERSION,
    timestamp:  new Date().toISOString(),
    ...context,
  };
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    isError: true,
  };
}

function makeSuccess(data) {
  const payload = {
    status:    "ok",
    server:    SERVER_NAME,
    version:   SERVER_VERSION,
    timestamp: new Date().toISOString(),
    ...data,
  };
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

// ─── Server status tracker ────────────────────────────────────────────────────

const _status = {
  startedAt:         new Date().toISOString(),
  platform:          os.platform(),
  nodeVersion:       process.version,
  browserConnected:  false,
  browserUrl:        BROWSER_URL,
  appUrl:            null,
  authenticated:     false,
  mcpBridgeReady:    false,
  lastError:         null,
  toolCallCount:     0,
  toolErrors:        {},     // { toolName: count }
};

function recordToolError(toolName) {
  _status.lastError = new Date().toISOString();
  _status.toolErrors[toolName] = (_status.toolErrors[toolName] || 0) + 1;
}

// ─── Graduation helpers (lazy-loaded) ─────────────────────────────────────────

let _performRenaming = null;
let _standardize     = null;

async function getGraduationHelpers() {
  if (_performRenaming) return { performRenaming: _performRenaming, standardize: _standardize };
  try {
    const helperDir  = path.join(__dirname, "..", "helpers");
    const renameFile = path.join(helperDir, "rename_photos.js");
    const stdFile    = path.join(helperDir, "standardize_images.js");

    if (!fs.existsSync(renameFile) || !fs.existsSync(stdFile)) {
      throw new Error(`Helper files not found in ${helperDir}. Run 'npm install' inside the boarderless.app_MCP directory.`);
    }

    // Windows requires file:// URLs for dynamic import of absolute paths.
    const renameModule = await import(pathToFileURL(renameFile).href);
    const stdModule    = await import(pathToFileURL(stdFile).href);
    _performRenaming = renameModule.performRenaming;
    _standardize     = stdModule.standardize;
    return { performRenaming: _performRenaming, standardize: _standardize };
  } catch (e) {
    throw new Error(`Failed to load graduation photo helpers: ${e.message}`);
  }
}

// ─── Port check ───────────────────────────────────────────────────────────────

function isPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.setTimeout(300);
    client.once("connect", () => { client.destroy(); resolve(true); });
    client.once("timeout", () => { client.destroy(); resolve(false); });
    client.once("error",   () => { client.destroy(); resolve(false); });
    client.connect(port, host);
  });
}

// ─── Browser discovery ────────────────────────────────────────────────────────

/**
 * Returns a list of candidate browser executable paths for the current OS.
 * Uses only OS-level environment variables — no hardcoded usernames.
 */
function getBrowserCandidates() {
  const platform = os.platform();
  const localApp = process.env.LOCALAPPDATA || "";   // Windows only
  const progFiles  = process.env.ProgramFiles  || "C:\\Program Files";
  const progFiles86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

  if (platform === "win32") {
    return [
      path.join(progFiles,   "Google", "Chrome", "Application", "chrome.exe"),
      path.join(progFiles86, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(localApp,    "Google", "Chrome", "Application", "chrome.exe"),
      path.join(progFiles86, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(progFiles,   "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(progFiles,   "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
      path.join(progFiles86, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
      path.join(localApp,    "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
      path.join(localApp,    "Programs", "Opera", "opera.exe"),
      path.join(localApp,    "Programs", "Opera GX", "opera.exe"),
    ];
  }

  if (platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      "/Applications/Opera.app/Contents/MacOS/Opera",
      "/Applications/Opera GX.app/Contents/MacOS/Opera GX",
    ];
  }

  // Linux
  return [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/brave-browser",
    "/opt/brave.com/brave/brave-browser",
    "/snap/bin/chromium",
  ];
}

function findBrowser() {
  // Explicit override from env var
  if (process.env.BOARDERLESS_MCP_BROWSER_EXE) {
    const exe = process.env.BOARDERLESS_MCP_BROWSER_EXE;
    if (fs.existsSync(exe)) return { path: exe, source: "env:BOARDERLESS_MCP_BROWSER_EXE" };
    return null;
  }

  const candidates = getBrowserCandidates();
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return { path: p, source: "auto-detected" };
  }
  return null;
}

/**
 * Compute a safe, cross-platform persistent profile directory for the MCP
 * browser session. Never touches the user's default browser profile.
 */
function getMcpProfileDir() {
  if (process.env.BOARDERLESS_MCP_PROFILE_DIR) {
    return process.env.BOARDERLESS_MCP_PROFILE_DIR;
  }

  const platform = os.platform();
  if (platform === "win32") {
    const base = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(base, "boarderless-mcp-profile");
  }
  if (platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "boarderless-mcp-profile");
  }
  return path.join(os.homedir(), ".boarderless-mcp-profile");
}

// ─── Browser launcher ─────────────────────────────────────────────────────────

async function ensureBrowserRunning(appUrl) {
  const urlObj = new URL(BROWSER_URL);
  // Only attempt auto-launch when pointing at localhost
  if (urlObj.hostname !== "127.0.0.1" && urlObj.hostname !== "localhost") return;

  const port   = parseInt(urlObj.port || "9222", 10);
  const isOpen = await isPortOpen(port);
  if (isOpen) return; // Already running — nothing to do.

  console.error(`[Boarderless] Port ${port} not open. Attempting to launch a Chromium-based browser...`);

  const browser = findBrowser();
  if (!browser) {
    console.error("[Boarderless] ⚠ No supported browser found. Checked paths:");
    for (const p of getBrowserCandidates()) console.error(`    ${p}`);
    console.error("[Boarderless] Fix: Install Google Chrome, Edge, Brave, or Chromium, OR set env BOARDERLESS_MCP_BROWSER_EXE=/path/to/browser");
    return;
  }

  const profileDir = getMcpProfileDir();
  console.error(`[Boarderless] Launching: ${browser.path} (${browser.source})`);
  console.error(`[Boarderless] Profile:   ${profileDir}`);

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--start-maximized",
  ];
  args.push(appUrl);

  const child = spawn(browser.path, args, { detached: true, stdio: "ignore" });
  child.unref();

  // Wait up to 6 seconds for port to open
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    if (await isPortOpen(port)) {
      console.error(`[Boarderless] ✓ Browser connected on port ${port}.`);
      _status.browserConnected = true;
      return;
    }
  }
  console.error(`[Boarderless] ⚠ Browser launched but port ${port} did not open within 6 s.`);
}

// ─── App URL detection ────────────────────────────────────────────────────────

async function detectAppUrl() {
  if (process.env.BOARDERLESS_MCP_APP_URL) return process.env.BOARDERLESS_MCP_APP_URL;

  // Detect local dev server on Vite's default port
  try {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 200);
    const res  = await fetch("http://127.0.0.1:5174/canvas", { signal: ctrl.signal });
    clearTimeout(tid);
    if (res.ok) return "http://127.0.0.1:5174/canvas";
  } catch (_) { /* not running locally */ }

  return DEFAULT_APP_URL;
}

// ─── Live page resolver ───────────────────────────────────────────────────────

let _browser = null;
let _APP_URL  = null;

async function getPage() {
  // Reconnect if handle is stale or disconnected
  if (!_browser || !_browser.isConnected()) {
    await ensureBrowserRunning(_APP_URL);
    _browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
    _status.browserConnected = true;
  }

  const appOrigin = new URL(_APP_URL).origin;
  let pages;
  try {
    pages = await _browser.pages();
  } catch (_) {
    _browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
    pages = await _browser.pages();
  }

  // Find an active (non-detached) canvas tab
  let page = null;
  for (const p of pages) {
    try {
      const url = p.url();
      if (url.startsWith(appOrigin)) { page = p; break; }
    } catch (_) { /* skip detached */ }
  }

  // No canvas tab found — open one
  if (!page) {
    page = await _browser.newPage();
    await page.goto(_APP_URL, { waitUntil: "domcontentloaded" });
  }

  await assertVisibleBoarderlessPage(_browser, page);

  // Wait for boarderlessMcp bridge to mount (up to 5 s)
  let mcpReady = false;
  for (let i = 0; i < 20; i++) {
    try {
      mcpReady = await page.evaluate(() => typeof window.boarderlessMcp !== "undefined");
      if (mcpReady) break;
    } catch (_) { /* frame transition — retry */ }
    await new Promise(r => setTimeout(r, 250));
  }

  _status.mcpBridgeReady = mcpReady;

  if (mcpReady) {
    try {
      await page.evaluate(() => { window.boarderlessMcpAutoApprove = true; });
      await page.evaluateOnNewDocument(() => { window.boarderlessMcpAutoApprove = true; });
    } catch (_) { /* ignore mid-navigation race */ }
  }

  return page;
}

// ─── Auth check ───────────────────────────────────────────────────────────────

async function checkAuth(page) {
  try {
    const authed = await page.evaluate(() =>
      localStorage.getItem("boarderless_has_authenticated") === "true"
    );
    _status.authenticated = authed;
    return authed;
  } catch (_) {
    _status.authenticated = false;
    return false;
  }
}

// ─── Tool silo wrapper ────────────────────────────────────────────────────────
/**
 * Every tool invocation is wrapped here. If anything throws unexpectedly
 * the error is captured, logged, and returned as a structured error response
 * rather than crashing or silently failing.
 */
async function runTool(toolName, fn) {
  _status.toolCallCount++;
  try {
    return await fn();
  } catch (err) {
    recordToolError(toolName);
    console.error(`[Boarderless][${toolName}] Unhandled error:`, err.message);
    return makeError(
      "TOOL_UNEXPECTED_ERROR",
      `Unhandled error in tool '${toolName}': ${err.message}`,
      "Check the MCP server stderr log for a full stack trace. If the issue persists, please open an issue at https://github.com/CrackenReleased/boarderless.app_MCP",
      { tool: toolName, stack: err.stack?.split("\n").slice(0, 6).join("\n") }
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  _APP_URL         = await detectAppUrl();
  _status.appUrl   = _APP_URL;

  // Non-blocking browser warm-up
  try {
    await ensureBrowserRunning(_APP_URL);
    _browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
    _status.browserConnected = true;

    const page   = await getPage();
    const authed = await checkAuth(page);

    if (authed) {
      console.error("[Boarderless] ✓ Authenticated. Canvas tools ready.");
    } else {
      console.error("\n\x1b[33m[Boarderless Auth Required]\x1b[0m");
      console.error(`  Please sign in at: ${_APP_URL}`);
      console.error("  Canvas tools will return AUTH_REQUIRED until sign-in is complete.\n");
    }
  } catch (e) {
    // Non-fatal — log and continue. Tools will surface specific errors at call time.
    console.error("[Boarderless] ⚠ Startup warning:", e.message);
    _status.lastError = e.message;
  }

  // ─── MCP Server setup ──────────────────────────────────────────────────────

  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  // ── Tool listing ────────────────────────────────────────────────────────────

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Always include static tools; dynamically fetch canvas tools if bridge is live.
    let canvasTools = [];
    try {
      const page = await getPage();
      if (_status.mcpBridgeReady) {
        canvasTools = await page.evaluate(() =>
          typeof window.boarderlessMcp?.listTools === "function"
            ? window.boarderlessMcp.listTools()
            : []
        );
      }
    } catch (e) {
      console.error("[Boarderless] Could not fetch dynamic canvas tools:", e.message);
    }

    const allTools = [
        // ── Diagnostic ────────────────────────────────────────────────────────
        {
          name: "get_server_status",
          description:
            "Returns a full diagnostic status report for the Boarderless MCP server. " +
            "Use this first to verify connectivity, authentication, and tool availability " +
            "before attempting canvas operations. Includes browser connection state, " +
            "authentication status, canvas bridge health, and per-tool error counts.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },

        // ── Canvas tools (dynamic from bridge) ───────────────────────────────
        ...canvasTools,

        // ── Durable board files ─────────────────────────────────────────────
        {
          name: "get_board_workspace",
          description:
            "Return the local workspace directory where Boarderless MCP automatically saves canonical .bdrl.json files after every successful canvas mutation.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        {
          name: "set_board_workspace",
          description:
            "Set the absolute local workspace directory used for automatic and explicit .bdrl.json board files. Call this once at the beginning of work when the MCP process was not launched from the intended project directory.",
          inputSchema: {
            type: "object",
            properties: {
              directory: { type: "string", description: "Absolute path to the agent's current project/workspace directory." },
            },
            required: ["directory"],
            additionalProperties: false,
          },
        },
        {
          name: "export_board_file",
          description:
            "Atomically save the current canonical schema-v2 Boarderless board as a .bdrl.json file inside the configured workspace. Without filename, uses a stable board-name-and-id autosave filename.",
          inputSchema: {
            type: "object",
            properties: {
              filename: { type: "string", description: "Optional single filename ending in .bdrl.json. Subdirectories and path traversal are rejected." },
            },
            additionalProperties: false,
          },
        },
        {
          name: "import_board_file",
          description:
            "Read a canonical schema-v2 .bdrl.json file from the configured workspace, import it into Boarderless, switch the live canvas to it, and refresh its automatic local snapshot.",
          inputSchema: {
            type: "object",
            properties: {
              filename: { type: "string", description: "Single .bdrl.json filename inside the configured workspace." },
            },
            required: ["filename"],
            additionalProperties: false,
          },
        },

        // ── Export ────────────────────────────────────────────────────────────
        {
          name: "export_board",
          description:
            "Export the current Boarderless canvas to PNG, PDF, or SVG. " +
            "Requires the user to be authenticated. " +
            "Returns a structured error with resolution steps if export fails.",
          inputSchema: {
            type: "object",
            properties: {
              format:   { type: "string", enum: ["png", "pdf", "svg"], description: "Export format." },
              mode:     { type: "string", enum: ["canvas", "selection"], description: "Export scope. Defaults to 'canvas'." },
              filename: { type: "string", description: "Optional output filename override." },
            },
            required: ["format"],
            additionalProperties: false,
          },
        },
        {
          name: "render_board_in_blender",
          description:
            "Generate a 3D studio render of the current canvas using Blender. " +
            "Automatically captures the board snapshot, decodes base64 assets, " +
            "builds a 3D scene with lighting/camera alignment, and exports a finished PNG image. " +
            "Requires Blender to be installed and available on the system environment path.",
          inputSchema: {
            type: "object",
            properties: {
              engine: {
                type: "string",
                enum: ["BLENDER_EEVEE", "CYCLES"],
                description: "Blender render engine. BLENDER_EEVEE is fast; CYCLES is high-fidelity path tracing. Defaults to BLENDER_EEVEE.",
              },
              filename: {
                type: "string",
                description: "Optional output render filename (e.g. render.png). Saved to the active project workspace.",
              },
            },
            additionalProperties: false,
          },
        },

        // ── File helpers ──────────────────────────────────────────────────────
        {
          name: "graduation_rename_photos",
          description:
            "Rename and number photo files inside a directory to a sequential format " +
            "(e.g. seniorname_01.jpg). Operates on the local filesystem — no browser required. " +
            "Returns a structured report of renamed files and any errors encountered.",
          inputSchema: {
            type: "object",
            properties: {
              seniorsDir: { type: "string", description: "Absolute path to the folder containing photos." },
              mode: {
                type: "string",
                enum: ["sequential", "gap_fill"],
                description: "'sequential' numbers files 01–XX strictly. 'gap_fill' preserves existing numbers and fills gaps.",
              },
            },
            required: ["seniorsDir", "mode"],
            additionalProperties: false,
          },
        },
        {
          name: "graduation_standardize_images",
          description:
            "Scan and convert progressive JPEGs and HEIC files inside subdirectories " +
            "into standard baseline RGB JPEGs. Operates on the local filesystem — no browser required. " +
            "Returns a structured report of converted files and any errors encountered.",
          inputSchema: {
            type: "object",
            properties: {
              seniorsDir: { type: "string", description: "Absolute path to the folder containing photos." },
            },
            required: ["seniorsDir"],
            additionalProperties: false,
          },
        },
      ];

    // Directory requirement: every tool ships a title and readOnlyHint/destructiveHint.
    return { tools: allTools.map(withToolAnnotations) };
  });

  // ── Tool dispatch ───────────────────────────────────────────────────────────

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments || {};

    // ── get_server_status ─────────────────────────────────────────────────────
    if (name === "get_server_status") {
      return runTool(name, async () => {
        // Re-check live state
        let browserOk  = false;
        let authed     = false;
        let bridgeOk   = false;
        let pageUrl    = null;
        let browserErr = null;
        let authErr    = null;

        try {
          const urlObj = new URL(BROWSER_URL);
          const port   = parseInt(urlObj.port || "9222", 10);
          browserOk    = await isPortOpen(port, urlObj.hostname);

          if (browserOk) {
            const page = await getPage();
            pageUrl    = page.url();
            bridgeOk   = _status.mcpBridgeReady;
            authed     = await checkAuth(page);
          }
        } catch (e) {
          browserErr = e.message;
        }

        const checks = [
          {
            check: "browser_port",
            passed: browserOk,
            detail: browserOk
              ? `Chromium DevTools listening on ${BROWSER_URL}`
              : `No browser found on ${BROWSER_URL}`,
            resolution: browserOk ? null :
              "Launch your browser with: chrome --remote-debugging-port=9222\n" +
              "Or use the Boarderless MCP desktop app to launch it automatically.\n" +
              "You can also set env BOARDERLESS_MCP_BROWSER_URL=http://127.0.0.1:9222",
          },
          {
            check: "canvas_tab",
            passed: !!pageUrl,
            detail: pageUrl ? `Active canvas tab: ${pageUrl}` : "No Boarderless canvas tab detected",
            resolution: pageUrl ? null :
              `Open ${_APP_URL} in the connected browser. The MCP server will attach automatically.`,
          },
          {
            check: "mcp_bridge",
            passed: bridgeOk,
            detail: bridgeOk
              ? "window.boarderlessMcp bridge is mounted and ready"
              : "window.boarderlessMcp not found on page",
            resolution: bridgeOk ? null :
              "Ensure you are on the canvas page at boarderless.app/canvas and are logged in. " +
              "If this persists, try refreshing the browser tab.",
          },
          {
            check: "authentication",
            passed: authed,
            detail: authed
              ? "User is authenticated — canvas tools are available"
              : "User is NOT authenticated — canvas tools will be blocked",
            resolution: authed ? null :
              `Sign in with Google at ${_APP_URL}. Canvas tools require an active Boarderless session.`,
          },
        ];

        const allPassed = checks.every(c => c.passed);

        return makeSuccess({
          ready: allPassed,
          summary: allPassed
            ? "All systems operational. Ready to control Boarderless."
            : "One or more checks failed. See 'checks' array for resolution steps.",
          checks,
          runtime: {
            platform:       _status.platform,
            node_version:   _status.nodeVersion,
            server_version: SERVER_VERSION,
            app_url:        _APP_URL,
            browser_url:    BROWSER_URL,
            board_workspace: _workspaceDir,
            started_at:     _status.startedAt,
            tool_calls:     _status.toolCallCount,
            tool_errors:    _status.toolErrors,
            last_error:     _status.lastError,
          },
          next_steps: allPassed
            ? ["Call get_board_workspace and confirm it matches your project directory.", "Call get_board_state to inspect the current canvas.", "Canvas mutations are automatically saved as .bdrl.json files."]
            : checks.filter(c => !c.passed).map(c => c.resolution).filter(Boolean),
        });
      });
    }


    // ── Board workspace configuration ───────────────────────────────────────
    if (name === "get_board_workspace") {
      return runTool(name, async () => makeSuccess({
        workspace: _workspaceDir,
        source: process.env.BOARDERLESS_WORKSPACE_DIR ? "env:BOARDERLESS_WORKSPACE_DIR" : "runtime",
        autosave: true,
        file_pattern: "<board-name>--<board-id>.bdrl.json",
      }));
    }

    if (name === "set_board_workspace") {
      return runTool(name, async () => {
        if (!args.directory || !path.isAbsolute(args.directory)) {
          return makeError("WORKSPACE_PATH_INVALID", "directory must be an absolute path.", "Provide the absolute path of the local project directory where board files should live.");
        }
        _workspaceDir = resolveWorkspaceDirectory(args.directory);
        return makeSuccess({ workspace: _workspaceDir, autosave: true });
      });
    }

    // ── graduation_rename_photos ──────────────────────────────────────────────
    if (name === "graduation_rename_photos") {
      return runTool(name, async () => {
        if (!args.seniorsDir) {
          return makeError("MISSING_ARGUMENT", "seniorsDir is required.", "Provide an absolute path to the photos directory.");
        }
        if (!fs.existsSync(args.seniorsDir)) {
          return makeError(
            "PATH_NOT_FOUND",
            `Directory not found: ${args.seniorsDir}`,
            "Ensure the path exists and is accessible. Use an absolute path (e.g. /Users/name/Photos or C:\\Users\\name\\Photos).",
            { provided_path: args.seniorsDir }
          );
        }
        const { performRenaming } = await getGraduationHelpers();
        const result = await performRenaming(args.seniorsDir, args.mode);
        return makeSuccess({ result, path: args.seniorsDir, mode: args.mode });
      });
    }

    // ── graduation_standardize_images ─────────────────────────────────────────
    if (name === "graduation_standardize_images") {
      return runTool(name, async () => {
        if (!args.seniorsDir) {
          return makeError("MISSING_ARGUMENT", "seniorsDir is required.", "Provide an absolute path to the photos directory.");
        }
        if (!fs.existsSync(args.seniorsDir)) {
          return makeError(
            "PATH_NOT_FOUND",
            `Directory not found: ${args.seniorsDir}`,
            "Ensure the path exists and is accessible. Use an absolute path.",
            { provided_path: args.seniorsDir }
          );
        }
        const { standardize } = await getGraduationHelpers();
        const result = await standardize(args.seniorsDir);
        return makeSuccess({ result, path: args.seniorsDir });
      });
    }

    // ── All canvas tools — require browser + auth ─────────────────────────────

    return runTool(name, async () => {
      // Step 1: Get live page
      let page;
      try {
        page = await getPage();
      } catch (e) {
        return makeError(
          "BROWSER_CONNECT_FAILED",
          `Cannot connect to browser on ${BROWSER_URL}: ${e.message}`,
          "Run get_server_status to diagnose the issue. Common fixes:\n" +
          "1. Launch a Chromium browser with --remote-debugging-port=9222\n" +
          "2. Set BOARDERLESS_MCP_BROWSER_URL if your browser is on a different port\n" +
          "3. Use the Boarderless MCP desktop app which handles browser launch automatically.",
          { browser_url: BROWSER_URL }
        );
      }

      // Step 2: Auth gate
      const authed = await checkAuth(page);
      if (!authed) {
        return makeError(
          "AUTH_REQUIRED",
          "You must be signed in to Boarderless to use canvas tools.",
          `1. Open ${_APP_URL} in the connected browser.\n` +
          "2. Sign in with your Google account.\n" +
          "3. Wait for the canvas to load, then retry this tool.",
          { app_url: _APP_URL }
        );
      }

      // Step 3: Canvas bridge check
      if (!_status.mcpBridgeReady) {
        return makeError(
          "BRIDGE_NOT_READY",
          "The window.boarderlessMcp bridge is not mounted on the canvas page.",
          "1. Ensure the browser tab is on boarderless.app/canvas (not the home page).\n" +
          "2. Refresh the browser tab and wait a few seconds.\n" +
          "3. Call get_server_status to check current bridge health.",
          { app_url: _APP_URL }
        );
      }

      // Step 4: export_board (special handling)
      if (name === "export_board_file") {
        try {
          const snapshot = await exportCurrentBoardSnapshot(page);
          const saved = writeBoardSnapshot(snapshot, {
            workspaceDir: _workspaceDir,
            filename: args.filename,
            cleanupAutosave: !args.filename,
          });
          return makeSuccess({
            message: "Canonical Boarderless board file saved.",
            workspace: _workspaceDir,
            file: saved.path,
            filename: saved.filename,
            bytes: saved.bytes,
            board_id: snapshot.id,
            board_name: snapshot.name,
          });
        } catch (e) {
          return makeError("BOARD_FILE_EXPORT_FAILED", e.message, "Confirm the workspace with get_board_workspace, keep the filename inside that directory, and refresh the canvas if its persistence bridge is unavailable.");
        }
      }

      if (name === "import_board_file") {
        try {
          const loaded = readBoardSnapshot(_workspaceDir, args.filename);
          const imported = await page.evaluate(async (snapshot) => {
            if (typeof window.reactPersistence?.importSnapshot !== "function") {
              return { ok: false, error: "The canvas persistence import bridge is unavailable. Refresh Boarderless and retry." };
            }
            const changed = await window.reactPersistence.importSnapshot(snapshot);
            return { ok: changed, error: changed ? null : "Board import did not change the local canvas." };
          }, loaded.snapshot);
          if (!imported.ok) throw new Error(imported.error);
          const saved = await autosaveCurrentBoard(page);
          return makeSuccess({
            message: "Board file imported and opened on the live canvas.",
            workspace: _workspaceDir,
            source_file: loaded.path,
            autosave_file: saved.path,
            board_id: loaded.snapshot.id,
            board_name: loaded.snapshot.name,
          });
        } catch (e) {
          return makeError("BOARD_FILE_IMPORT_FAILED", e.message, "Use a valid schema-v2 .bdrl.json filename inside the configured workspace and refresh the canvas if its persistence bridge is unavailable.");
        }
      }

      if (name === "export_board") {
        const format   = args.format;
        const mode     = args.mode || "canvas";
        const filename = args.filename || "";

        const result = await page.evaluate(async (fmt, md, fn) => {
          try {
            const exportMap = {
              png: window.runReactExport,
              pdf: window.runReactPdfExport,
              svg: window.runReactSvgExport,
            };
            const fn_ref = exportMap[fmt];
            if (typeof fn_ref !== "function") {
              return { success: false, error_code: "EXPORT_FN_MISSING", error: `Export function for format '${fmt}' is not bound on the page. Ensure you are on boarderless.app/canvas with a loaded board.` };
            }
            await fn_ref(md, fn);
            return { success: true };
          } catch (e) {
            return { success: false, error_code: "EXPORT_RUNTIME_ERROR", error: e.message };
          }
        }, format, mode, filename);

        if (result.success) {
          return makeSuccess({ message: `Board exported as ${format.toUpperCase()} (${mode} mode).`, format, mode });
        }
        return makeError(
          result.error_code || "EXPORT_FAILED",
          result.error,
          "Ensure a board is open in the canvas before exporting. " +
          "SVG and PDF export require a Pro plan. Check your account at boarderless.app.",
          { format, mode }
        );
      }

      if (name === "render_board_in_blender") {
        const engine = args.engine || "BLENDER_EEVEE";
        const filename = args.filename || "blender_render.png";
        
        try {
          // 1. Export board snapshot from the page
          const snapshot = await exportCurrentBoardSnapshot(page);
          
          // 2. Save it temporarily in the workspace as _mcp_blender_temp.bdrl.json
          const tempFilename = "_mcp_blender_temp.bdrl.json";
          const saved = writeBoardSnapshot(snapshot, {
            workspaceDir: _workspaceDir,
            filename: tempFilename,
            cleanupAutosave: false
          });
          
          // 3. Set up paths
          let pythonScriptPath = path.join(_workspaceDir, "scratch", "import_to_blender.py");
          if (!fs.existsSync(pythonScriptPath)) {
            pythonScriptPath = "E:/boarderless/scratch/import_to_blender.py";
          }
          const outputRenderPath = path.join(_workspaceDir, filename);
          
          // 4. Run Blender subprocess in background mode
          console.error(`[Boarderless][Blender] Starting render with engine ${engine}...`);
          
          const result = await new Promise((resolve) => {
            const child = spawn("blender", [
              "-b",
              "-P",
              pythonScriptPath,
              "--",
              "--json",
              saved.path,
              "--out",
              outputRenderPath,
              "--engine",
              engine
            ]);
            
            let stdout = "";
            let stderr = "";
            
            child.stdout.on("data", (data) => {
              stdout += data.toString();
            });
            
            child.stderr.on("data", (data) => {
              stderr += data.toString();
            });
            
            child.on("close", (code) => {
              // Clean up temporary JSON snapshot
              try {
                fs.unlinkSync(saved.path);
              } catch (_) {}
              
              if (code === 0) {
                resolve({ success: true, stdout });
              } else {
                resolve({ success: false, code, stderr, stdout });
              }
            });
            
            child.on("error", (err) => {
              // Clean up temporary JSON snapshot
              try {
                fs.unlinkSync(saved.path);
              } catch (_) {}
              
              resolve({ success: false, error: err });
            });
          });
          
          if (result.success) {
            return makeSuccess({
              message: `Board successfully rendered in Blender using ${engine}!`,
              engine,
              render_file: outputRenderPath,
              filename,
            });
          } else if (result.error) {
            if (result.error.code === "ENOENT") {
              return makeError(
                "BLENDER_NOT_FOUND",
                "Blender executable could not be found on your system PATH.",
                "Ensure Blender is installed and added to your system environment variables.\n" +
                "  Windows: Add 'C:\\Program Files\\Blender Foundation\\Blender X.Y\\' to your Path.\n" +
                "  macOS: Symlink blender command: ln -s /Applications/Blender.app/Contents/MacOS/Blender /usr/local/bin/blender"
              );
            }
            return makeError("BLENDER_SPAWN_FAILED", `Failed to start Blender subprocess: ${result.error.message}`, "Check if your workspace directories are fully writable.");
          } else {
            return makeError(
              "BLENDER_RENDER_FAILED",
              `Blender process exited with code ${result.code}`,
              "Check the error trace below. Ensure your board is valid and has no corrupted images.",
              { stderr: result.stderr, stdout: result.stdout }
            );
          }
        } catch (e) {
          return makeError("BLENDER_BRIDGE_FAILED", e.message, "Refresh the Boarderless canvas tab and retry.");
        }
      }

      // Step 5: All other canvas tools via the boarderlessMcp bridge
      const result = await page.evaluate(
        ({ toolName, toolArgs }) => {
          if (!window.boarderlessMcp || typeof window.boarderlessMcp.callTool !== "function") {
            return {
              content: [{ type: "text", text: JSON.stringify({
                status: "error",
                error_code: "BRIDGE_MISSING",
                message: "window.boarderlessMcp.callTool is not a function.",
                resolution: "Refresh the Boarderless canvas tab and retry.",
              }) }],
              isError: true,
            };
          }
          return window.boarderlessMcp.callTool(toolName, toolArgs || {});
        },
        { toolName: name, toolArgs: args }
      );

      if (MUTATING_CANVAS_TOOLS.has(name) && !result?.isError) {
        try {
          const saved = await autosaveCurrentBoard(page);
          result.content = [
            ...(Array.isArray(result.content) ? result.content : []),
            { type: "text", text: JSON.stringify({
              status: "autosaved",
              file: saved.path,
              filename: saved.filename,
              bytes: saved.bytes,
              workspace: _workspaceDir,
            }, null, 2) },
          ];
        } catch (e) {
          result.content = [
            ...(Array.isArray(result.content) ? result.content : []),
            { type: "text", text: JSON.stringify({
              status: "autosave_failed",
              message: e.message,
              workspace: _workspaceDir,
              resolution: "Call export_board_file before ending the task. Confirm get_board_workspace points to a writable project directory.",
            }, null, 2) },
          ];
        }
      }

      return result;
    });
  });

  // ─── Connect transport ───────────────────────────────────────────────────────

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[Boarderless] MCP Server v${SERVER_VERSION} ready → ${_APP_URL}`);
}

run().catch(err => {
  console.error("[Boarderless] Fatal startup error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
