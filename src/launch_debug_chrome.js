import puppeteer from 'puppeteer-core';
import path from 'path';
import os from 'os';

async function main() {
  const exePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profilePath = path.join(os.homedir(), 'AppData', 'Local', 'boarderless-mcp-profile');

  console.log(`Launching Chrome with profile at: ${profilePath}`);
  
  const browser = await puppeteer.launch({
    executablePath: exePath,
    headless: false,
    defaultViewport: null,
    userDataDir: profilePath,
    args: [
      '--remote-debugging-port=9222',
      '--no-first-run',
      '--no-default-browser-check',
      '--start-maximized'
    ]
  });

  console.log('Chrome launched successfully via Puppeteer.');
  console.log('Navigating to https://boarderless.app/canvas...');
  
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  await page.goto('https://boarderless.app/canvas', { waitUntil: 'domcontentloaded' });
  
  console.log('Browser is active. Press Ctrl+C in this terminal to close the browser session.');
  
  // Keep the process alive
  await new Promise(() => {});
}

main().catch(console.error);
