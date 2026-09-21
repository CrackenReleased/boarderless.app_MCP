import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { adaptMcpStdioServer } from './sync-server.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTENSION_ROOT = path.resolve(__dirname, '..');
const MCP_PACKAGE_ROOT = path.resolve(EXTENSION_ROOT, '..');
const SERVER_DIR = path.resolve(EXTENSION_ROOT, 'server');

let hasErrors = false;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  hasErrors = true;
}

function pass(msg) {
  console.log(`PASS: ${msg}`);
}

console.log('--- Checking Bundled Server Drift Against Canonical packages/mcp ---');

// 1. Verify all required runtime files exist
const requiredFiles = [
  'mcp-stdio-server.js',
  'board-files.js',
  'visible-browser-policy.js',
  'functions.json',
  'helpers/rename_photos.js',
  'helpers/standardize_images.js'
];

for (const f of requiredFiles) {
  const fullPath = path.join(SERVER_DIR, f);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing required bundled server file: server/${f}`);
  } else {
    pass(`Found server/${f}`);
  }
}

if (!fs.existsSync(MCP_PACKAGE_ROOT)) {
  console.warn(`WARNING: Canonical packages/mcp directory not found at ${MCP_PACKAGE_ROOT}. Skipping parity diff.`);
  process.exit(hasErrors ? 1 : 0);
}

// 2. Check 1:1 parity files
const parityFiles = [
  { mcp: 'src/board-files.js', vsc: 'board-files.js' },
  { mcp: 'src/visible-browser-policy.js', vsc: 'visible-browser-policy.js' },
  { mcp: 'functions.json', vsc: 'functions.json' },
  { mcp: 'helpers/rename_photos.js', vsc: 'helpers/rename_photos.js' },
  { mcp: 'helpers/standardize_images.js', vsc: 'helpers/standardize_images.js' }
];

for (const { mcp, vsc } of parityFiles) {
  const mcpPath = path.join(MCP_PACKAGE_ROOT, mcp);
  const vscPath = path.join(SERVER_DIR, vsc);

  const mcpBuf = fs.readFileSync(mcpPath);
  const vscBuf = fs.readFileSync(vscPath);

  if (!mcpBuf.equals(vscBuf)) {
    fail(`server/${vsc} has drifted from packages/mcp/${mcp}. Run 'npm run sync:server' to resolve.`);
  } else {
    pass(`server/${vsc} exactly matches canonical packages/mcp/${mcp}`);
  }
}

// 3. Check adapted mcp-stdio-server.js
const canonicalPath = path.join(MCP_PACKAGE_ROOT, 'src/mcp-stdio-server.js');
const canonicalContent = fs.readFileSync(canonicalPath, 'utf8');
const expectedAdapted = adaptMcpStdioServer(canonicalContent);

const currentAdaptedPath = path.join(SERVER_DIR, 'mcp-stdio-server.js');
const currentAdapted = fs.readFileSync(currentAdaptedPath, 'utf8');

// Normalize line endings for comparison
const normExpected = expectedAdapted.replace(/\r\n/g, '\n');
const normCurrent = currentAdapted.replace(/\r\n/g, '\n');

if (normExpected !== normCurrent) {
  fail("server/mcp-stdio-server.js has drifted from canonical packages/mcp/src/mcp-stdio-server.js adaptation. Run 'npm run sync:server' to resolve.");
} else {
  pass("server/mcp-stdio-server.js matches canonical adaptation (browser-canvas target preserved)");
}

// 4. Verify no unpublished sibling directory dependencies
const code = fs.readFileSync(currentAdaptedPath, 'utf8');
if (code.includes('../mcp') || code.includes('../../packages') || code.includes('packages/mcp')) {
  fail("server/mcp-stdio-server.js contains hardcoded relative paths to sibling directories!");
} else {
  pass("Bundled server has no external sibling directory paths");
}

// 5. Syntax check
try {
  execFileSync('node', ['--check', currentAdaptedPath]);
  pass("server/mcp-stdio-server.js passes node syntax validation");
} catch (e) {
  fail(`Syntax error in server/mcp-stdio-server.js: ${e.message}`);
}

if (hasErrors) {
  console.error('\nServer drift check FAILED. Run "npm run sync:server" to synchronize with packages/mcp.');
  process.exit(1);
} else {
  console.log('\nAll server drift checks PASSED.');
  process.exit(0);
}
