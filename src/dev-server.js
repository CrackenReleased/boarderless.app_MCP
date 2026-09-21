import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT, 10) || 1430;
const HOST = process.env.HOST || '127.0.0.1';
const UI_DIR = path.resolve(__dirname, '../ui');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  // Strip query parameters
  const urlPath = (req.url || '/').split('?')[0];
  let relativePath = urlPath === '/' ? '/index.html' : urlPath;
  const targetPath = path.resolve(UI_DIR, '.' + relativePath);

  // Security: prevent directory traversal outside UI_DIR
  if (!targetPath.startsWith(UI_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(targetPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache',
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(targetPath);
    stream.pipe(res);
  });
});

// Strict port failure requirement: fail immediately if port is in use
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[Boarderless MCP Dev Server] Error: Port ${PORT} is already in use.`);
    console.error(`[Boarderless MCP Dev Server] Another process is occupying required port ${PORT}.`);
    console.error(`[Boarderless MCP Dev Server] Exiting strictly without fallback.\n`);
    process.exit(1);
  } else {
    console.error('[Boarderless MCP Dev Server] Server error:', err);
    process.exit(1);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Boarderless MCP Dev Server running`);
  console.log(`   Endpoint:   http://${HOST}:${PORT}/`);
  console.log(`   UI Root:    ${UI_DIR}`);
  console.log(`   StrictPort: true (fails if ${PORT} occupied)`);
  console.log(`==================================================\n`);
});

// Graceful cleanup
const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
