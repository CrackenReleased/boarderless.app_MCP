import puppeteer from 'puppeteer-core';

async function main() {
  try {
    console.log('[Scratch] Connecting to debug Chrome at http://127.0.0.1:9222...');
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    
    let boarderlessPage = null;
    console.log('Open tabs:');
    for (const page of pages) {
      const url = page.url();
      console.log(`- ${url}`);
      if (url.includes('boarderless.app/canvas') || url.includes('5174/canvas')) {
        boarderlessPage = page;
      }
    }
    
    if (!boarderlessPage) {
      console.log('[-] No active Boarderless canvas page found.');
      await browser.disconnect();
      return;
    }
    
    console.log(`[+] Found active Boarderless page: ${boarderlessPage.url()}`);
    
    // Check if authenticated
    const isAuthenticated = await boarderlessPage.evaluate(() => {
      return localStorage.getItem('boarderless_has_authenticated') === 'true';
    });
    console.log(`[+] Authenticated (localStorage): ${isAuthenticated}`);
    
    // Check if boarderlessMcp is initialized
    const mcpReady = await boarderlessPage.evaluate(() => {
      return typeof window.boarderlessMcp !== 'undefined';
    });
    console.log(`[+] window.boarderlessMcp exists: ${mcpReady}`);
    
    if (mcpReady) {
      const tools = await boarderlessPage.evaluate(() => {
        return window.boarderlessMcp.listTools().map(t => t.name);
      });
      console.log('[+] Dynamic tools listed on page:', tools);
    }
    
    // Try to trigger runReactExport
    console.log('[*] Attempting to trigger PNG export on canvas...');
    const exportResult = await boarderlessPage.evaluate(async () => {
      try {
        if (typeof window.runReactExport !== 'function') {
          return { success: false, error: 'window.runReactExport is not a function' };
        }
        // Run export in canvas mode with a custom name
        await window.runReactExport('canvas', 'scratch_diagnostic_export');
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    
    console.log('[+] Export execution result:', exportResult);
    await browser.disconnect();
  } catch (err) {
    console.error('[-] Error:', err.message);
  }
}

main();
