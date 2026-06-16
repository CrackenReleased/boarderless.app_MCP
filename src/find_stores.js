import puppeteer from 'puppeteer-core';

async function main() {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().startsWith('https://boarderless.app/canvas'));
    if (!page) {
      console.log('[-] Boarderless canvas page not found in open tabs.');
      await browser.disconnect();
      return;
    }
    console.log(`[+] Connected to page: ${page.url()}`);

    const result = await page.evaluate(() => {
      const rootEl = document.getElementById('react-root');
      if (!rootEl) return { error: '#react-root element not found' };

      const key = Object.keys(rootEl).find(k => k.startsWith('__reactContainer$'));
      if (!key) return { error: 'React container key not found on #react-root', keys: Object.keys(rootEl) };

      const fiber = rootEl[key];
      
      // Return a structural summary of fiber
      function summarize(obj, depth = 0) {
        if (depth > 4) return '[Max Depth]';
        if (!obj || typeof obj !== 'object') return typeof obj;
        
        const summary = {};
        for (const k of Object.keys(obj)) {
          if (k.startsWith('__react') || k === 'stateNode' || k === 'memoizedState' || k === 'memoizedProps' || k === 'child' || k === 'sibling' || k === 'current') {
            summary[k] = summarize(obj[k], depth + 1);
          } else {
            summary[k] = typeof obj[k];
          }
        }
        return summary;
      }
      
      return {
        success: true,
        key,
        structure: summarize(fiber)
      };
    });

    console.log('Fiber structure:', JSON.stringify(result, null, 2));
    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
