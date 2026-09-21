import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTENSION_ROOT = path.resolve(__dirname, '..');
const MCP_PACKAGE_ROOT = path.resolve(EXTENSION_ROOT, '..');
const SERVER_DEST_DIR = path.resolve(EXTENSION_ROOT, 'server');

export function adaptMcpStdioServer(canonicalSource) {
  let adapted = canonicalSource;

  // 1. Remove native desktop probe & RPC functions
  const desktopFastPathRegex = /\/\/ ─── Native Desktop MCP Fast Path ───[\s\S]*?async function callNativeDesktopRpc[\s\S]*?\n\}\n+/;
  adapted = adapted.replace(desktopFastPathRegex, '');

  // 2. Remove desktop_app_bridge status check in get_server_status
  const desktopStatusRegex = /\n\s*const isDesktopOnline = await probeNativeDesktopServer\(\);\n\s*const checks = \[\n\s*\{\n\s*check: "desktop_app_bridge",[\s\S]*?toggle MCP in Ctrl\+K menu\.",\n\s*\},/;
  adapted = adapted.replace(desktopStatusRegex, '\n        const checks = [');

  // 3. Remove native desktop fast path in tools/call dispatch
  const desktopDispatchRegex = /\n\s*\/\/ ── Native Desktop Server Fast Path ──[\s\S]*?falling back to browser:', err\.message\);\n\s*\}\n\s*\}\);\n\s*\}/;
  adapted = adapted.replace(desktopDispatchRegex, '');

  return adapted;
}

export function syncServerFiles() {
  console.log(`[sync-server] Canonical MCP source: ${MCP_PACKAGE_ROOT}`);
  console.log(`[sync-server] Destination: ${SERVER_DEST_DIR}`);

  if (!fs.existsSync(MCP_PACKAGE_ROOT)) {
    throw new Error(`Canonical MCP source directory not found at ${MCP_PACKAGE_ROOT}`);
  }

  fs.mkdirSync(SERVER_DEST_DIR, { recursive: true });
  fs.mkdirSync(path.join(SERVER_DEST_DIR, 'helpers'), { recursive: true });

  // Copy 1:1 runtime files
  const filesToCopy = [
    { src: 'src/board-files.js', dest: 'board-files.js' },
    { src: 'src/visible-browser-policy.js', dest: 'visible-browser-policy.js' },
    { src: 'functions.json', dest: 'functions.json' },
    { src: 'helpers/rename_photos.js', dest: 'helpers/rename_photos.js' },
    { src: 'helpers/standardize_images.js', dest: 'helpers/standardize_images.js' },
  ];

  for (const { src, dest } of filesToCopy) {
    const srcPath = path.join(MCP_PACKAGE_ROOT, src);
    const destPath = path.join(SERVER_DEST_DIR, dest);
    fs.copyFileSync(srcPath, destPath);
    console.log(`  ✓ Synced ${dest}`);
  }

  // Transform and adapt mcp-stdio-server.js
  const canonicalStdioPath = path.join(MCP_PACKAGE_ROOT, 'src/mcp-stdio-server.js');
  const canonicalContent = fs.readFileSync(canonicalStdioPath, 'utf8');
  const adaptedContent = adaptMcpStdioServer(canonicalContent);

  const destStdioPath = path.join(SERVER_DEST_DIR, 'mcp-stdio-server.js');
  fs.writeFileSync(destStdioPath, adaptedContent, 'utf8');
  console.log(`  ✓ Adapted and synced mcp-stdio-server.js (browser-canvas target preserved)`);

  // Validate syntax
  execFileSync('node', ['--check', destStdioPath]);
  console.log(`  ✓ Syntax check passed for bundled server`);

  console.log('[sync-server] Complete. All bundled server files up to date.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncServerFiles();
}
