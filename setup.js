import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_PATH = path.join(__dirname, 'mcp-stdio-server.js');

console.log("==========================================");
console.log("   Boarderless MCP Setup & Configurator   ");
console.log("==========================================\n");

function configureClaudeDesktop() {
  let configDir;
  if (process.platform === 'win32') {
    configDir = path.join(process.env.APPDATA, 'Claude');
  } else if (process.platform === 'darwin') {
    configDir = path.join(os.homedir(), 'Library', 'Application Support', 'Claude');
  } else {
    configDir = path.join(os.homedir(), '.config', 'Claude');
  }

  const configPath = path.join(configDir, 'claude_desktop_config.json');
  console.log(`Targeting Claude config: ${configPath}`);

  // Create directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  let config = { mcpServers: {} };
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (!config.mcpServers) config.mcpServers = {};
    } catch (e) {
      console.warn("Could not parse existing Claude Desktop config. Starting fresh.");
    }
  }

  config.mcpServers.boarderless = {
    command: 'node',
    args: [SERVER_PATH],
    env: {
      BOARDERLESS_MCP_APP_URL: "https://boarderless.app/canvas",
      BOARDERLESS_MCP_BROWSER_URL: "http://127.0.0.1:9222"
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  console.log("✓ Successfully updated Claude Desktop Configuration!");
}

function printCursorSnippet() {
  console.log("\n==========================================");
  console.log("   Cursor & Windsurf Setup Instructions   ");
  console.log("==========================================");
  console.log("\nTo connect Cursor or Windsurf, add a new MCP server in settings:");
  console.log(`- Type: stdio`);
  console.log(`- Name: boarderless`);
  console.log(`- Command: node "${SERVER_PATH}"`);
  console.log(`- Environment variables:`);
  console.log(`    BOARDERLESS_MCP_APP_URL = https://boarderless.app/canvas`);
  console.log(`    BOARDERLESS_MCP_BROWSER_URL = http://127.0.0.1:9222`);
  console.log("\n==========================================\n");
}

try {
  configureClaudeDesktop();
  printCursorSnippet();
} catch (error) {
  console.error("Setup failed:", error);
}
