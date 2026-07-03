import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adapterPath = path.resolve(__dirname, '../remote-adapter/dist/server.cjs');

if (fs.existsSync(adapterPath)) {
  console.log('[Launcher] Found remote adapter bundle. Starting Express server...');
  await import('../remote-adapter/dist/server.cjs');
} else {
  console.log('[Launcher] No remote adapter found. Starting local stdio MCP server...');
  await import('./mcp-stdio-server.js');
}
