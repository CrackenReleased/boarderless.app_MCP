import puppeteer from 'puppeteer-core';

async function main() {
  try {
    console.log('[Scratch] Connecting to Puppeteer...');
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    
    console.log(`[+] Found ${pages.length} pages open:`);
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const title = await p.title();
      console.log(`  Page ${i}: ${p.url()} - Title: "${title}"`);
    }

    let boarderlessPage = null;
    for (const page of pages) {
      const url = page.url();
      if (url.includes('boarderless.app/canvas') || url.includes('5174/canvas')) {
        boarderlessPage = page;
      }
    }
    
    if (!boarderlessPage) {
      console.log('[-] No active boarderless.app page found in the browser.');
      await browser.disconnect();
      return;
    }
    
    console.log(`[+] Found active page: ${boarderlessPage.url()}`);
    
    // Evaluate if window.boarderlessMcp is available
    const mcpAvailable = await boarderlessPage.evaluate(() => {
      return typeof window.boarderlessMcp !== 'undefined';
    });
    console.log(`[+] window.boarderlessMcp available: ${mcpAvailable}`);
    
    if (mcpAvailable) {
      const state = await boarderlessPage.evaluate(() => {
        return window.boarderlessMcp.callTool('get_board_state', {});
      });
      console.log('[+] Board State:', JSON.stringify(state, null, 2));
    }

    await browser.disconnect();
  } catch (err) {
    console.error('[-] Error:', err.message);
  }
}

main();
