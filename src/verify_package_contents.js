import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const readProjectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
assert.equal(
  manifest.bin?.['boarderless-mcp-server'],
  'src/mcp-stdio-server.js',
  'npm must retain the boarderless-mcp-server executable during publication',
);

for (const [path, requiredPolicy] of [
  ['README.md', /every production MCP version must be delivered to both GitHub and npm/i],
  ['docs/connector_operator_runbook.md', /Required GitHub ↔ npm production release gate/],
  ['docs/connector_distribution_plan.md', /Permanent npm release synchronization/],
]) {
  assert.match(readProjectFile(path), requiredPolicy, `${path} must preserve the GitHub/npm release synchronization policy`);
}

for (const [path, requiredHostedBoundary] of [
  ['README.md', /OAuth identifies and authorizes a user; it does not make a cloud service capable of reaching that user's localhost browser/i],
  ['docs/connector_operator_runbook.md', /OAuth is necessary authorization infrastructure but does not solve the remote session bridge/i],
  ['docs/connector_distribution_plan.md', /Outstanding hosted OpenAI work[\s\S]*OAuth 2\.1[\s\S]*Outstanding Microsoft work[\s\S]*Streamable HTTP/i],
  ['docs/features_catalog.md', /published npm MCP is a local `stdio` connector/i],
]) {
  assert.match(readProjectFile(path), requiredHostedBoundary, `${path} must preserve the hosted OpenAI/Microsoft OAuth and session-bridge boundary`);
}

const output = execFileSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', 'npm pack --dry-run --json'], {
  cwd: packageRoot,
  encoding: 'utf8',
});
const preview = JSON.parse(output)[0];
const paths = preview.files.map((file) => file.path);

const required = [
  'LICENSE',
  'README.md',
  'package.json',
  'functions.json',
  'src/mcp-stdio-server.js',
  'src/board-files.js',
  'helpers/rename_photos.js',
  'helpers/standardize_images.js',
];
for (const path of required) {
  assert(paths.includes(path), `Required runtime/package file is missing: ${path}`);
}

const forbidden = paths.filter((path) =>
  path.endsWith('.bdrl.json') ||
  path.startsWith('src-tauri/') ||
  path.startsWith('ui/') ||
  path.startsWith('.github/') ||
  /(^|\/)verify[_-]/.test(path) ||
  /(^|\/)test[_-]/.test(path) ||
  /(^|\/)debug[_-]/.test(path) ||
  /(^|\/)scratch[_-]/.test(path)
);
assert.deepEqual(forbidden, [], `Internal/development files would be published: ${forbidden.join(', ')}`);
assert(preview.entryCount <= 20, `Package contains ${preview.entryCount} files; expected no more than 20`);
assert(preview.unpackedSize < 500_000, `Package is unexpectedly large: ${preview.unpackedSize} bytes unpacked`);

console.log(`[✓] npm package boundary is safe: ${preview.entryCount} files, ${preview.unpackedSize} bytes unpacked.`);
