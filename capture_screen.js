import puppeteer from 'puppeteer-core';

async function main() {
  const browserURL = 'http://127.0.0.1:9222';
  try {
    const browser = await puppeteer.connect({ browserURL, defaultViewport: null });
    const pages = await browser.pages();
    console.log(`Found ${pages.length} pages.`);
    let boarderlessPage = null;
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      console.log(`Page ${i}: URL=${p.url()} Title=${await p.title()}`);
      if (p.url().includes('boarderless.app') || p.url().includes('5174')) {
        boarderlessPage = p;
      }
    }
    
    const targetPage = boarderlessPage || pages[0];
    if (targetPage) {
      console.log(`Taking screenshot of: ${targetPage.url()}`);
      const screenshotPath = 'C:\\Users\\Beast\\.gemini\\antigravity-ide\\brain\\84f66ae2-f100-478d-b314-76cf7fcbb169/screenshot.png';
      await targetPage.screenshot({ path: screenshotPath });
      console.log(`Screenshot saved to: ${screenshotPath}`);
    } else {
      console.log('No pages found.');
    }
    await browser.disconnect();
  } catch (e) {
    console.error('Error:', e);
  }
}

main();
