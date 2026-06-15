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

    // Run deep search for stores
    const foundStores = await page.evaluate(() => {
      const rootEl = document.getElementById('react-root');
      if (!rootEl) return { error: '#react-root element not found' };

      const key = Object.keys(rootEl).find(k => k.startsWith('__reactContainer$'));
      if (!key) return { error: 'React container key not found on #react-root' };

      const fiber = rootEl[key];
      const visited = new Set();
      const storesFound = {};

      function search(obj, depth = 0) {
        if (depth > 25) return; // limit depth to prevent stack overflow
        if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return;
        if (visited.has(obj)) return;
        visited.add(obj);

        if (typeof obj.getState === 'function' && typeof obj.setState === 'function' && typeof obj.subscribe === 'function') {
          const state = obj.getState();
          if (state) {
            if (typeof state.setBackgroundColor === 'function') {
              storesFound.useAppStore = true;
            } else if (typeof state.addNode === 'function' && state.nodes) {
              storesFound.useShapeToolStore = true;
            } else if (typeof state.upsertTextNode === 'function') {
              storesFound.useTextToolStore = true;
            } else if (typeof state.updateNode === 'function' && state.assets) {
              storesFound.useGalleryStore = true;
            } else if (typeof state.createBoard === 'function') {
              storesFound.useBoardsStore = true;
            } else if (state.hasOwnProperty('isAuthenticated')) {
              storesFound.useAuthStore = true;
            }
          }
        }

        // Search properties
        try {
          const keys = Object.keys(obj);
          for (const k of keys) {
            if (k === 'window' || k === 'document' || k === 'view' || k === 'stage' || k === 'contentLayer') continue;
            search(obj[k], depth + 1);
          }
        } catch (e) {}

        // Prototype search
        try {
          const proto = Object.getPrototypeOf(obj);
          if (proto) search(proto, depth + 1);
        } catch (e) {}
      }

      function searchHooks(hook) {
        if (!hook) return;
        search(hook.memoizedState);
        search(hook.queue);
        if (hook.next) searchHooks(hook.next);
      }

      function traverseFiber(node) {
        if (!node) return;
        
        search(node.memoizedProps);
        search(node.stateNode);
        
        if (node.memoizedState) {
          search(node.memoizedState);
          if (node.memoizedState.hasOwnProperty('next')) {
            searchHooks(node.memoizedState);
          }
        }

        if (node.child) traverseFiber(node.child);
        if (node.sibling) traverseFiber(node.sibling);
      }

      const rootFiber = fiber.current || fiber;
      traverseFiber(rootFiber);

      return {
        success: true,
        stores: storesFound
      };
    });

    console.log('Stores found in production:', foundStores);
    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
