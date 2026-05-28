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

import { performRenaming } from "./helpers/rename_photos.js";
import { standardize } from "./helpers/standardize_images.js";

const SERVER_NAME = "boarderless-mcp-bridge";
const SERVER_VERSION = "0.1.4";
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
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    );
  } else if (platform === 'darwin') {
    paths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
  } else {
    // Linux
    paths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    );
  }

  for (const p of paths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

async function ensureBrowserRunning() {
  // If BROWSER_URL is pointing to localhost:9222, we check if it is open
  const urlObj = new URL(BROWSER_URL);
  if (urlObj.hostname === '127.0.0.1' || urlObj.hostname === 'localhost') {
    const port = parseInt(urlObj.port || '9222', 10);
    const isOpen = await isPortOpen(port);
    if (!isOpen) {
      console.error(`[Boarderless] Remote debugging port ${port} is closed. Attempting to launch browser...`);
      const exePath = findChromeOrEdge();
      if (exePath) {
        console.error(`[Boarderless] Launching browser: ${exePath}`);
        const args = [
          `--remote-debugging-port=${port}`,
          '--no-first-run',
          '--no-default-browser-check',
          'about:blank'
        ];
        
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
  await ensureBrowserRunning();

  // Connect to the browser
  const browser = await puppeteer.connect({ browserURL: BROWSER_URL });
  const pages = await browser.pages();
  const appOrigin = new URL(APP_URL).origin;
  const page = pages.find(p => p.url().startsWith(appOrigin)) || await browser.newPage();
  if (!page.url().startsWith(appOrigin)) await page.goto(APP_URL, { waitUntil: "domcontentloaded" });

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
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments || {};
    
    if (name === "graduation_rename_photos") {
      try {
        const result = await performRenaming(args.seniorsDir, args.mode);
        return { content: [{ type: "text", text: result }] };
      } catch (err) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }
    
    if (name === "graduation_standardize_images") {
      try {
        const result = await standardize(args.seniorsDir);
        return { content: [{ type: "text", text: result }] };
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
