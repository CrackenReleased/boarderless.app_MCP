import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

async function main() {
  const exePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profilePath = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
  
  console.log(`[+] Launching Chrome and capturing output...`);
  
  const args = [
    '--remote-debugging-port=9222',
    `--user-data-dir=${profilePath}`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://boarderless.app/canvas'
  ];
  
  const child = spawn(exePath, args);
  
  child.stdout.on('data', (data) => {
    console.log(`[Chrome STDOUT]: ${data}`);
  });
  
  child.stderr.on('data', (data) => {
    console.error(`[Chrome STDERR]: ${data}`);
  });
  
  child.on('close', (code) => {
    console.log(`[Chrome] exited with code ${code}`);
  });

  // Wait 3 seconds
  await new Promise(r => setTimeout(r, 3000));
}

main().catch(console.error);
