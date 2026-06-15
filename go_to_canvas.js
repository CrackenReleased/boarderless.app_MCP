import puppeteer from 'puppeteer-core';

async function main() {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    console.log('[+] Navigating page to https://boarderless.app/canvas...');
    await page.goto('https://boarderless.app/canvas', { waitUntil: 'domcontentloaded' });
    console.log('[+] Navigation complete. Current URL:', page.url());
    await browser.disconnect();
  } catch (err) {
    console.error('Error navigating:', err);
  }
}

main();
