import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
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
  const exePath = path.join(rootDir, 'setup.exe');
  console.log(`[Test] Verifying setup.exe executable at: ${exePath}`);
  
  if (!fs.existsSync(exePath)) {
    throw new Error(`Regression test failed: setup.exe does not exist in root!`);
  }
  
  const stats = fs.statSync(exePath);
  console.log(`[✓] setup.exe size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  
  if (stats.size < 5 * 1024 * 1024) {
    throw new Error(`Regression test failed: setup.exe size is too small (${stats.size} bytes). It should be a fully compiled Tauri binary.`);
  }
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
