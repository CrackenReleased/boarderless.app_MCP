import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_PATH = path.join(__dirname, 'mcp-stdio-server.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showHeader() {
  console.clear();
  console.log("\x1b[36m=================================================================\x1b[0m");
  console.log("\x1b[36m         Boarderless MCP Setup & Configurator (v0.1.12)          \x1b[0m");
  console.log("\x1b[36m=================================================================\x1b[0m\n");
}

function showPermissions() {
  console.log("\x1b[33m--- REQUIRED PERMISSIONS & SECURITY OVERVIEW ---\x1b[0m");
  console.log("1. \x1b[1mLocal Browser Control (Port 9222):\x1b[0m");
  console.log("   - The MCP bridge attaches to Chrome or Edge via remote debugging.");
  console.log("   - \x1b[2mWhy:\x1b[0m To interactively read/mutate elements on https://boarderless.app/canvas.");
  console.log("   - \x1b[2mSecurity:\x1b[0m A consent popup on the canvas guards all write actions.");
  console.log("2. \x1b[1mLocal Filesystem Access:\x1b[0m");
  console.log("   - Used ONLY when you invoke photo renaming/standardizing tools.");
  console.log("   - \x1b[2mWhy:\x1b[0m To convert HEIC/Progressive JPEGs and natural-sort student images.");
  console.log("-----------------------------------------------------------------\n");
}

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
  console.log(`\n[*] Configuring Claude config at: ${configPath}`);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  let config = { mcpServers: {} };
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (!config.mcpServers) config.mcpServers = {};
    } catch (e) {
      console.warn("[!] Could not parse existing Claude Desktop config. Starting fresh.");
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
  console.log("\x1b[32m✓ Successfully updated Claude Desktop Configuration!\x1b[0m");
}

function printCursorSnippet() {
  console.log("\n\x1b[36m=================================================================\x1b[0m");
  console.log("               Cursor & Windsurf Setup Instructions              ");
  console.log("\x1b[36m=================================================================\x1b[0m");
  console.log("\nTo connect Cursor or Windsurf, copy and paste this into MCP settings:");
  console.log(`\n- Type: stdio`);
  console.log(`- Name: boarderless`);
  console.log(`- Command: node "${SERVER_PATH}"`);
  console.log(`- Environment variables:`);
  console.log(`    BOARDERLESS_MCP_APP_URL = https://boarderless.app/canvas`);
  console.log(`    BOARDERLESS_MCP_BROWSER_URL = http://127.0.0.1:9222`);
  console.log("\n\x1b[36m=================================================================\x1b[0m\n");
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
    paths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium'
    );
  }

  for (const p of paths) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function launchBrowser() {
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

    console.log(`\n[*] Launching browser at: ${exePath} with profile: ${profilePath}`);
    const args = [
      '--remote-debugging-port=9222',
      `--user-data-dir=${profilePath}`,
      '--no-first-run',
      '--no-default-browser-check',
      'https://boarderless.app/canvas'
    ];
    const child = spawn(exePath, args, { detached: true, stdio: 'ignore' });
    child.unref();
    console.log("\x1b[32m✓ Browser launched successfully on port 9222!\x1b[0m");
  } else {
    console.log("\x1b[31m[!] Could not automatically locate Google Chrome or Microsoft Edge.\x1b[0m");
    console.log("Please run Chrome manually from command line:");
    console.log("  chrome.exe --remote-debugging-port=9222");
  }
}

function showTroubleshooting() {
  console.log("\n\x1b[33m--- TROUBLESHOOTING & SECURITY FAQ ---\x1b[0m");
  console.log("Q: Why does the terminal show 'Remote debugging port is closed'?");
  console.log("A: Puppeteer needs to attach to an active browser tab. Start Chrome with port 9222 (Option 4).");
  console.log("\nQ: Does the AI have unrestricted access to my computer?");
  console.log("A: No. The AI is sandboxed to Boarderless canvas actions and file helper commands you run.");
  console.log("   Additionally, the Boarderless.app UI prompts a Consent Modal before modifying any object.");
  console.log("\nQ: How do I sign in?");
  console.log("A: Just open boarderless.app/canvas in the debugging Chrome window and sign in via Google.");
  console.log("   The MCP server will automatically detect the active OAuth session.");
  console.log("-----------------------------------------------------------------\n");
}

function main() {
  showHeader();
  showPermissions();

  console.log("Please choose an option (1-5):");
  console.log(" [1] \x1b[1mStandard Auto-Setup\x1b[0m (Install deps, configure Claude, and output Cursor instructions)");
  console.log(" [2] Configure Claude Desktop Only");
  console.log(" [3] Output Cursor & Windsurf Instructions");
  console.log(" [4] Launch Chrome in Remote Debugging Mode (Port 9222)");
  console.log(" [5] Troubleshooting & Security FAQ");
  console.log(" [0] Exit");

  rl.question('\nOption > ', (answer) => {
    switch (answer.trim()) {
      case '1':
        console.log("\n[*] Running dependencies install...");
        exec('npm install', (err) => {
          if (err) {
            console.error("[!] Failed running npm install:", err);
          } else {
            console.log("✓ Dependencies checked.");
          }
          configureClaudeDesktop();
          printCursorSnippet();
          rl.question('Press Enter to return to main menu...', () => main());
        });
        break;

      case '2':
        configureClaudeDesktop();
        rl.question('\nPress Enter to return to main menu...', () => main());
        break;

      case '3':
        printCursorSnippet();
        rl.question('Press Enter to return to main menu...', () => main());
        break;

      case '4':
        launchBrowser();
        rl.question('\nPress Enter to return to main menu...', () => main());
        break;

      case '5':
        showTroubleshooting();
        rl.question('Press Enter to return to main menu...', () => main());
        break;

      case '0':
      case '':
        console.log("Goodbye!");
        rl.close();
        break;

      default:
        console.log("Invalid option. Try again.");
        setTimeout(() => main(), 1000);
        break;
    }
  });
}

main();
