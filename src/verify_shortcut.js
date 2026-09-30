import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function testLogoIcoHeader() {
  const icoPath = path.join(rootDir, 'src', 'logo.ico');
  console.log(`[Test] Verifying ICO file at: ${icoPath}`);
  
  if (!fs.existsSync(icoPath)) {
    throw new Error(`Regression test failed: src/logo.ico does not exist!`);
  }
  
  const buffer = fs.readFileSync(icoPath);
  if (buffer.length < 4) {
    throw new Error(`Regression test failed: src/logo.ico is too small.`);
  }
  
  // Verify ICO signature: 00 00 01 00
  const reserved = buffer.readUInt16LE(0);
  const type = buffer.readUInt16LE(2);
  
  if (reserved !== 0 || type !== 1) {
    throw new Error(`Regression test failed: src/logo.ico does not have a valid ICO header (reserved: ${reserved}, type: ${type})`);
  }
  
  console.log(`[✓] Valid ICO header verified.`);
}

function testSetupExecutable() {
  // Source tests run before bundling in CI. Pass --installer <path> to verify a built installer.
  const installerIndex = process.argv.indexOf('--installer');
  if (installerIndex === -1) {
    const config = JSON.parse(fs.readFileSync(path.join(rootDir, 'src-tauri/tauri.conf.json'), 'utf8'));
    if (!config.bundle.active || !config.bundle.icon.length) throw new Error('Native bundle and icons must be configured');
    console.log('[✓] Native bundle configuration verified (pre-build).');
    return;
  }
  const exePath = process.argv[installerIndex + 1];
  if (!exePath) throw new Error('--installer requires a file path');
  console.log(`[Test] Verifying setup.exe executable at: ${exePath}`);
  
  if (!fs.existsSync(exePath)) {
    throw new Error(`Regression test failed: setup.exe does not exist in root!`);
  }
  
  const stats = fs.statSync(exePath);
  console.log(`[✓] setup.exe size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  
  const binary = fs.readFileSync(exePath);
  if (binary.length < 256 || binary.toString('ascii', 0, 2) !== 'MZ') throw new Error('Installer must be a Windows executable');
  const peOffset = binary.readUInt32LE(0x3c);
  if (peOffset + 4 > binary.length || binary.toString('ascii', peOffset, peOffset + 4) !== 'PE\0\0') throw new Error('Installer must have a valid PE header');
  if (!fs.existsSync(exePath + '.sig') || !fs.readFileSync(exePath + '.sig', 'utf8').trim()) throw new Error('Signed update artifact must accompany installer');
}

function runAll() {
  try {
    testLogoIcoHeader();
    testSetupExecutable();
    console.log(`\n\x1b[32m[✓] All regression tests passed successfully!\x1b[0m\n`);
    process.exit(0);
  } catch (error) {
    console.error(`\n\x1b[31m[!] Test Run Failed:\x1b[0m`, error.message);
    process.exit(1);
  }
}

runAll();
