import fs from 'fs';
import path from 'path';
import os from 'os';

async function main() {
  const userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
  
  if (!fs.existsSync(userDataDir)) {
    console.error('Chrome User Data directory not found.');
    return;
  }
  
  const entries = fs.readdirSync(userDataDir);
  const profiles = [];
  
  for (const entry of entries) {
    if (entry === 'Default' || entry.startsWith('Profile ')) {
      const fullPath = path.join(userDataDir, entry);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          // Check for Preferences or History inside to see if it's an actual active profile folder
          const prefPath = path.join(fullPath, 'Preferences');
          let mtime = stats.mtime;
          if (fs.existsSync(prefPath)) {
            mtime = fs.statSync(prefPath).mtime;
          }
          profiles.push({ name: entry, mtime });
        }
      } catch (e) {}
    }
  }
  
  profiles.sort((a, b) => b.mtime - a.mtime);
  
  console.log('Chrome profiles sorted by last modified (newest first):');
  for (const p of profiles) {
    console.log(`- ${p.name}: ${p.mtime.toISOString()}`);
  }
}

main();
