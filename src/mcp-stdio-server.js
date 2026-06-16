#!/usr/bin/env node

// mcp-stdio-server.js
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import puppeteer from "puppeteer-core";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import net from "net";
import fs from "fs";
import os from "os";

// Graduation helpers are lazy-loaded on first use — keeps server startup
// clean even if heic-convert/jimp have install issues on the user's machine.
let _performRenaming = null;
let _standardize = null;
async function getGraduationHelpers() {
  if (!_performRenaming) {
    try {
      const renameModule = await import("./helpers/rename_photos.js");
      const stdModule    = await import("./helpers/standardize_images.js");
      _performRenaming = renameModule.performRenaming;
      _standardize     = stdModule.standardize;
    } catch (e) {
      throw new Error(
        `[Boarderless] Failed to load graduation photo helpers: ${e.message}\n` +
        `Run 'npm install' in the boarderless-mcp directory and try again.`
      );
    }
  }
  return { performRenaming: _performRenaming, standardize: _standardize };
}

const SERVER_NAME = "boarderless-mcp-bridge";
const SERVER_VERSION = "0.1.16";
const DEFAULT_APP_URL = "https://boarderless.app/canvas";
const DEFAULT_BROWSER_URL = "http://127.0.0.1:9222";
const BROWSER_URL = process.env.BOARDERLESS_MCP_BROWSER_URL || DEFAULT_BROWSER_URL;

function isPortOpen(port) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.setTimeout(150);
    client.once('connect', () => {
      client.destroy();
      resolve(true);
    });
    client.once('timeout', () => {
      client.destroy();
      resolve(false);
    });
    client.once('error', () => {
      client.destroy();
      resolve(false);
    });
    client.connect(port, '127.0.0.1');
  });
}

function findChromeOrEdge() {
  const platform = os.platform();
  const paths = [];

  if (platform === 'win32') {
    paths.push(
      // Chrome
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      // Edge
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      // Brave
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
      // Opera
      path.join(process.env.LOCALAPPDATA || '', 'Programs\\Opera\\opera.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs\\Opera GX\\opera.exe')
    );
  } else if (platform === 'darwin') {
    paths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Opera.app/Contents/MacOS/Opera',
      '/Applications/Opera GX.app/Contents/MacOS/Opera GX'
    );
  } else {
    // Linux
    paths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/brave-browser',
      '/opt/brave.com/brave/brave-browser'
    );
  }

  for (const p of paths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

async function ensureBrowserRunning(appUrl) {
  // If BROWSER_URL is pointing to localhost:9222, we check if it is open
  const urlObj = new URL(BROWSER_URL);
  if (urlObj.hostname === '127.0.0.1' || urlObj.hostname === 'localhost') {
    const port = parseInt(urlObj.port || '9222', 10);
    const isOpen = await isPortOpen(port);
    if (!isOpen) {
      console.error(`[Boarderless] Remote debugging port ${port} is closed. Attempting to launch browser...`);
      const exePath = findChromeOrEdge();
      if (exePath) {
        let profilePath = "";
        if (os.platform() === 'win32') {
          profilePath = path.join(process.env.LOCALAPPDATA || '', 'boarderless-mcp-profile');
        } else if (os.platform() === 'darwin') {
          profilePath = path.join(os.homedir(), 'Library', 'Application Support', 'boarderless-mcp-profile');
        } else {
          profilePath = path.join(os.homedir(), '.boarderless-mcp-profile');
        }

        console.error(`[Boarderless] Launching browser: ${exePath} with profile ${profilePath}`);
        const args = [
          `--remote-debugging-port=${port}`,
          `--user-data-dir=${profilePath}`,
          '--no-first-run',
          '--no-default-browser-check'
        ];
        if (process.env.BOARDERLESS_MCP_HEADLESS === 'true') {
          args.push('--headless=new');
        }
        args.push(appUrl);
        
        // Spawn browser and detach so it keeps running when this server restarts
        const child = spawn(exePath, args, {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();

        // Wait up to 5 seconds for port to open
        for (let i = 0; i < 25; i++) {
          await new Promise(r => setTimeout(r, 200));
          if (await isPortOpen(port)) {
            console.error(`[Boarderless] Browser connected successfully on port ${port}.`);
            return;
          }
        }
        console.error(`[Boarderless] Warning: Launched browser but port ${port} did not open in time.`);
      } else {
        console.error(`[Boarderless] Error: Could not automatically locate Google Chrome or Microsoft Edge.`);
        console.error(`Please launch your browser manually with command:`);
        console.error(`chrome.exe --remote-debugging-port=9222`);
      }
    }
  }
}

async function detectAppUrl() {
  if (process.env.BOARDERLESS_MCP_APP_URL) {
    return process.env.BOARDERLESS_MCP_APP_URL;
  }
  // Try to detect if local development server is running on port 5174
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 100);
    const res = await fetch("http://127.0.0.1:5174/canvas", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      return "http://127.0.0.1:5174/canvas";
    }
  } catch (e) {
    // Local server is not running
  }
  return DEFAULT_APP_URL;
}

// ─── Live page resolver ──────────────────────────────────────────────────────
// Re-connects to Chrome and finds the live canvas tab on EVERY call.
// This prevents "detached Frame" errors that occur when the page reloads,
// navigates, or the tab is refreshed while the MCP server is running.
let _browser = null;
let _APP_URL  = null;

async function getPage() {
  // Re-connect if browser handle is gone or disconnected
  if (!_browser || !_browser.isConnected()) {
    await ensureBrowserRunning(_APP_URL);
    _browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
  }

  const appOrigin = new URL(_APP_URL).origin;
  let pages;
  try {
    pages = await _browser.pages();
  } catch (e) {
    // Browser disconnected mid-call — reconnect and retry once
    _browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
    pages = await _browser.pages();
  }

  // Find an attached (non-detached) canvas tab
  let page = null;
  for (const p of pages) {
    try {
      const url = p.url(); // throws if detached
      if (url.startsWith(appOrigin)) { page = p; break; }
    } catch (_) {
      // skip detached frames
    }
  }

  // No canvas tab open — open one
  if (!page) {
    page = await _browser.newPage();
    await page.goto(_APP_URL, { waitUntil: 'domcontentloaded' });
  }

  // Ensure page is stable, window.boarderlessMcp is ready, and set auto-approve
  let mcpReady = false;
  for (let i = 0; i < 20; i++) {
    try {
      mcpReady = await page.evaluate(() => typeof window.boarderlessMcp !== 'undefined');
      if (mcpReady) break;
    } catch (e) {
      // ignore evaluation errors / detached frame transitions
    }
    await new Promise(r => setTimeout(r, 250));
  }

  if (mcpReady) {
    try {
      await page.evaluate(() => {
        window.boarderlessMcpAutoApprove = true;
      });
      await page.evaluateOnNewDocument(() => {
        window.boarderlessMcpAutoApprove = true;
      });
    } catch (e) {
      // ignore errors if frame changes mid-injection
    }
  } else {
    console.error('[Boarderless] Warning: boarderlessMcp bridge not ready after timeout.');
  }

  return page;
}

async function run() {
  _APP_URL = await detectAppUrl();

  // Make sure remote debugging browser is open
  await ensureBrowserRunning(_APP_URL);

  // Initial connection — populate _browser
  _browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });

  // Warm up: get the page once and log auth status
  try {
    const page = await getPage();
    const isAuthenticated = await page.evaluate(() =>
      localStorage.getItem('boarderless_has_authenticated') === 'true'
    );
    if (isAuthenticated) {
      console.error('[Boarderless] ✓ Authenticated. Canvas tools ready.');
    } else {
      console.error('\n\x1b[33m[Boarderless Auth Required]\x1b[0m');
      console.error(`Please sign in at: ${_APP_URL}\n`);
    }
  } catch (e) {
    console.error('[Boarderless] Warning during startup check:', e.message);
  }

  const server = new Server({ name: SERVER_NAME, version: SERVER_VERSION }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    let tools = [];
    try {
      const page = await getPage();
      tools = await page.evaluate(() => {
        return (window.boarderlessMcp && typeof window.boarderlessMcp.listTools === 'function')
          ? window.boarderlessMcp.listTools()
          : [];
      });
    } catch (e) {
      console.error('[Boarderless] Could not fetch dynamic tools:', e.message);
    }
    return {
      tools: [
        ...tools,
        {
          name: "graduation_rename_photos",
          description: "Rename and number photo files in senior subdirectories to 01-XX format.",
          inputSchema: {
            type: "object",
            properties: {
              seniorsDir: { type: "string", description: "Absolute path to the Seniors folder." },
              mode: { type: "string", enum: ["sequential", "gap_fill"], description: "Rename mode: sequential (number 01-XX strictly) or gap_fill (keep numbers, fill gaps)." }
            },
            required: ["seniorsDir", "mode"],
            additionalProperties: false
          }
        },
        {
          name: "graduation_standardize_images",
          description: "Scan and convert progressive JPEGs and HEIC files to standard baseline RGB JPEGs.",
          inputSchema: {
            type: "object",
            properties: {
              seniorsDir: { type: "string", description: "Absolute path to the Seniors folder." }
            },
            required: ["seniorsDir"],
            additionalProperties: false
          }
        },
        {
          name: "export_board",
          description: "Export the current Boarderless canvas to PNG, PDF, or SVG.",
          inputSchema: {
            type: "object",
            properties: {
              format: { type: "string", enum: ["png", "pdf", "svg"], description: "Export format." },
              mode: { type: "string", enum: ["canvas", "selection"], description: "Export mode." },
              filename: { type: "string", description: "Optional filename override." }
            },
            required: ["format"],
            additionalProperties: false
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments || {};

    if (name === "graduation_rename_photos") {
      try {
        const { performRenaming } = await getGraduationHelpers();
        const result = await performRenaming(args.seniorsDir, args.mode);
        return { content: [{ type: "text", text: result }] };
      } catch (err) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }

    if (name === "graduation_standardize_images") {
      try {
        const { standardize } = await getGraduationHelpers();
        const result = await standardize(args.seniorsDir);
        return { content: [{ type: "text", text: result }] };
      } catch (err) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }

    // All canvas tools need a live page
    let page;
    try {
      page = await getPage();
    } catch (e) {
      return { content: [{ type: "text", text: `[-] Could not connect to Boarderless canvas: ${e.message}` }], isError: true };
    }

    // Auth gate: use localStorage flag (window.useAuthStore is not exposed)
    let isAuthed = false;
    try {
      isAuthed = await page.evaluate(() =>
        localStorage.getItem('boarderless_has_authenticated') === 'true'
      );
    } catch (e) { /* ignore */ }

    if (!isAuthed) {
      return {
        content: [{ type: "text", text: `[-] Not authenticated on Boarderless. Please sign in at: ${_APP_URL}` }],
        isError: true
      };
    }

    if (name === "export_board") {
      try {
        const format   = args.format;
        const mode     = args.mode || "canvas";
        const filename = args.filename || "";
        const result = await page.evaluate(async (fmt, md, fn) => {
          try {
            if (fmt === "png") {
              if (typeof window.runReactExport !== "function") throw new Error("runReactExport not bound on page window");
              await window.runReactExport(md, fn);
            } else if (fmt === "pdf") {
              if (typeof window.runReactPdfExport !== "function") throw new Error("runReactPdfExport not bound on page window");
              await window.runReactPdfExport(md, fn);
            } else if (fmt === "svg") {
              if (typeof window.runReactSvgExport !== "function") throw new Error("runReactSvgExport not bound on page window");
              await window.runReactSvgExport(md, fn);
            } else {
              throw new Error(`Unsupported export format: ${fmt}`);
            }
            return { success: true };
          } catch (e) {
            return { success: false, error: e.message };
          }
        }, format, mode, filename);

        if (result.success) {
          return { content: [{ type: "text", text: `[+] Exported board as ${format.toUpperCase()} (${mode} mode).` }] };
        } else {
          return { content: [{ type: "text", text: `[-] Export failed: ${result.error}` }], isError: true };
        }
      } catch (err) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }

    // All other canvas tools via boarderlessMcp bridge
    try {
      return await page.evaluate(
        ({ name, args }) => window.boarderlessMcp.callTool(name, args || {}),
        { name, args }
      );
    } catch (err) {
      return { content: [{ type: "text", text: `[-] Error invoking tool on page: ${err.message}` }], isError: true };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[Boarderless] MCP Server v${SERVER_VERSION} running on stdio → ${_APP_URL}`);
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

