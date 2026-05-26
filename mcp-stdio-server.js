#!/usr/bin/env node

// mcp-stdio-server.js
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import puppeteer from "puppeteer-core";

const SERVER_NAME = "boarderless-mcp-bridge";
const SERVER_VERSION = "1.0.0";
const DEFAULT_APP_URL = "http://127.0.0.1:5174/canvas";
const DEFAULT_BROWSER_URL = "http://127.0.0.1:9222";
const APP_URL = process.env.BOARDERLESS_MCP_APP_URL || DEFAULT_APP_URL;
const BROWSER_URL = process.env.BOARDERLESS_MCP_BROWSER_URL || DEFAULT_BROWSER_URL;

async function run() {
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
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return page.evaluate(
      ({ name, args }) => window.boarderlessMcp.callTool(name, args || {}),
      { name: request.params.name, args: request.params.arguments },
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
