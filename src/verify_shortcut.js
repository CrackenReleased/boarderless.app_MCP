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

function testShortcutProperties() {
  const shortcutPath = path.join(rootDir, 'setup.lnk');
  console.log(`[Test] Verifying shortcut at: ${shortcutPath}`);
  
  if (!fs.existsSync(shortcutPath)) {
    throw new Error(`Regression test failed: setup.lnk does not exist in root!`);
  }
  
  if (process.platform === 'win32') {
    // Query shortcut properties using PowerShell
    const escapedPath = shortcutPath.replace(/'/g, "''");
    const cmd = `$sh = New-Object -ComObject WScript.Shell; $lnk = $sh.CreateShortcut('${escapedPath}'); Write-Output "Target:$($lnk.TargetPath)|Icon:$($lnk.IconLocation)"`;
    
    try {
      const output = execSync(cmd, { shell: 'powershell', encoding: 'utf8' }).trim();
      console.log(`[Test] Query output: ${output}`);
      
      const parts = output.split('|');
      const targetPart = parts.find(p => p.startsWith('Target:'))?.replace('Target:', '') || '';
      const iconPart = parts.find(p => p.startsWith('Icon:'))?.replace('Icon:', '') || '';
      
      if (!iconPart.includes('src\\logo.ico')) {
        throw new Error(`Regression test failed: IconLocation is not configured with 'src\\logo.ico'. Current: ${iconPart}`);
      }
      
      console.log(`[✓] Shortcut Target: ${targetPart}`);
      console.log(`[✓] Shortcut IconLocation: ${iconPart}`);
    } catch (err) {
      throw new Error(`Regression test failed to read shortcut properties: ${err.message}`);
    }
  } else {
    console.log(`[Test] Skipping shortcut check since it is only applicable on Windows.`);
  }
}

function runAll() {
  try {
    testLogoIcoHeader();
    testShortcutProperties();
    console.log(`\n\x1b[32m[✓] All regression tests passed successfully!\x1b[0m\n`);
    process.exit(0);
  } catch (error) {
    console.error(`\n\x1b[31m[!] Test Run Failed:\x1b[0m`, error.message);
    process.exit(1);
  }
}

runAll();
