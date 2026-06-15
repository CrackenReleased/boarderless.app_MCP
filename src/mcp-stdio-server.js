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
const SERVER_VERSION = "0.1.12";
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

async function run() {
  const APP_URL = await detectAppUrl();
  
  // Make sure remote debugging browser is open
  await ensureBrowserRunning(APP_URL);

  // Connect to the browser
  const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
  const pages = await browser.pages();
  const appOrigin = new URL(APP_URL).origin;
  const page = pages.find(p => p.url().startsWith(appOrigin)) || await browser.newPage();
  if (!page.url().startsWith(appOrigin)) await page.goto(APP_URL, { waitUntil: "domcontentloaded" });

  try {
    const client = await page.createCDPSession();
    await client.send('Emulation.clearDeviceMetricsOverride');
  } catch (e) {
    // Ignore
  }

  await page.waitForFunction(() => Boolean(window.boarderlessMcp), { timeout: 15000 });

  let isAuthenticated = await page.evaluate(() => {
    return window.useAuthStore ? window.useAuthStore.getState().isAuthenticated : false;
  });

  if (!isAuthenticated) {
    console.error("\n\x1b[33m[Boarderless Auth Required]\x1b[0m");
    console.error("The connected browser session is not authenticated.");
    console.error(`Please complete Google OAuth sign-in in your browser window.`);
    console.error(`If the tab is not open, visit: ${APP_URL}\n`);
    
    // Poll every 1.5 seconds for authentication success
    while (!isAuthenticated) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      try {
        isAuthenticated = await page.evaluate(() => {
          return window.useAuthStore ? window.useAuthStore.getState().isAuthenticated : false;
        });
        if (isAuthenticated) {
          console.error("\x1b[32m[Boarderless Auth Success]\x1b[0m OAuth session verified. Starting MCP server...\n");
        }
      } catch (e) {
        // Tab might be navigating or temporarily unavailable
      }
    }
  }

  const server = new Server({ name: SERVER_NAME, version: SERVER_VERSION }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = await page.evaluate(() => window.boarderlessMcp.listTools());
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
          description: "Trigger a canvas or selection export inside the browser to download the board as PNG, PDF, or SVG.",
          inputSchema: {
            type: "object",
            properties: {
              format: { type: "string", enum: ["png", "pdf", "svg"], description: "The export file format: png, pdf, or svg." },
              mode: { type: "string", enum: ["canvas", "selection"], description: "The export mode: canvas (entire composition) or selection (only currently highlighted items). Defaults to canvas." },
              filename: { type: "string", description: "Optional custom name for the exported file." }
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

    if (name === "export_board") {
      try {
        const format = args.format;
        const mode = args.mode || "canvas";
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
          return { content: [{ type: "text", text: `[+] Exported board successfully as ${format.toUpperCase()} (${mode} mode) in the browser window.` }] };
        } else {
          return { content: [{ type: "text", text: `[-] Failed to export: ${result.error}` }], isError: true };
        }
      } catch (err) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }

    return page.evaluate(
      ({ name, args }) => window.boarderlessMcp.callTool(name, args || {}),
      { name, args },
    );
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[Boarderless] MCP Server running on stdio connected to ${APP_URL}`);
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
