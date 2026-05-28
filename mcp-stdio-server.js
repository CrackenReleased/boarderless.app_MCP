#!/usr/bin/env node

// mcp-stdio-server.js
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import puppeteer from "puppeteer-core";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const SERVER_NAME = "boarderless-mcp-bridge";
const SERVER_VERSION = "0.1.3";
const DEFAULT_APP_URL = "https://boarderless.app/canvas";
const DEFAULT_BROWSER_URL = "http://127.0.0.1:9222";
const BROWSER_URL = process.env.BOARDERLESS_MCP_BROWSER_URL || DEFAULT_BROWSER_URL;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runPythonHelper(scriptName, argsArray) {
  return new Promise((resolve, reject) => {
    // We run it using the user's system Python 3.10 executable since it has Pillow and pillow-heif installed.
    const pythonPath = "C:\\Users\\Beast\\AppData\\Local\\Programs\\Python\\Python310\\python.exe";
    const scriptPath = path.join(__dirname, "python_helpers", scriptName);
    
    const argsStr = argsArray.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(" ");
    const command = `"${pythonPath}" "${scriptPath}" ${argsStr}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Execution error: ${error.message}\nStderr: ${stderr}`));
        return;
      }
      resolve(stdout);
    });
  });
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
  // Connect to a user-launched Chrome/Edge instance with --remote-debugging-port=9222.
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
        const result = await runPythonHelper("rename_photos.py", ["--dir", args.seniorsDir, "--mode", args.mode]);
        return { content: [{ type: "text", text: result }] };
      } catch (err) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    }
    
    if (name === "graduation_standardize_images") {
      try {
        const result = await runPythonHelper("standardize_images.py", ["--dir", args.seniorsDir]);
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
