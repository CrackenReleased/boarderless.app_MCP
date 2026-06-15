import { spawn, execSync } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

async function main() {
  const exePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const targetDir = path.join(os.homedir(), 'AppData', 'Local', 'boarderless-mcp-profile');
  const sourceDefault = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Profile 6');
  
  console.log(`[+] Cleaning up existing target directory...`);
  if (fs.existsSync(targetDir)) {
    try {
      // Deleting a directory containing a junction can be tricky.
      // We first delete the junction specifically, then the directory.
      const targetDefault = path.join(targetDir, 'Default');
      if (fs.existsSync(targetDefault)) {
        fs.rmSync(targetDefault, { recursive: true, force: true });
      }
      fs.rmSync(targetDir, { recursive: true, force: true });
    } catch (e) {
      console.log(`[*] Standard delete failed: ${e.message}. Trying cmd rmdir...`);
      try {
        execSync(`rmdir /S /Q "${targetDir}"`);
      } catch (err) {}
    }
  }
  
  fs.mkdirSync(targetDir, { recursive: true });
  
  const targetDefault = path.join(targetDir, 'Default');
  console.log(`[+] Creating directory junction from:\n    ${sourceDefault}\nto:\n    ${targetDefault}`);
  
  try {
    execSync(`mklink /J "${targetDefault}" "${sourceDefault}"`);
    console.log('[+] Junction created successfully.');
  } catch (err) {
    console.error('[-] Failed to create junction:', err.message);
    return;
  }
  
  console.log('[+] Spawning Chrome in debug mode...');
  const args = [
    '--remote-debugging-port=9222',
    `--user-data-dir=${targetDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://boarderless.app/canvas'
  ];
  
  const child = spawn(exePath, args);
  
  child.stderr.on('data', (data) => {
    console.log(`[Chrome STDERR]: ${data}`);
  });
  
  child.on('close', (code) => {
    console.log(`[Chrome] exited with code ${code}`);
  });

  await new Promise(r => setTimeout(r, 4000));
}

main().catch(console.error);
