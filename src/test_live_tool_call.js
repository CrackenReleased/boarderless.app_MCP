import puppeteer from 'puppeteer-core';

const BROWSER_URL = 'http://127.0.0.1:9222';

async function main() {
  console.log('=== Boarderless MCP Live Tool Test ===\n');

  const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().startsWith('https://boarderless.app'));

  if (!page) {
    console.error('[-] No boarderless.app page found! Open pages:');
    pages.forEach(p => console.error('   ', p.url()));
    await browser.disconnect();
    return;
  }

  console.log(`[+] Canvas tab: ${page.url()}\n`);

  // Setup page logging
  page.on('console', msg => {
    console.log(`[Browser Console] [${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.error('[Browser Error]', err.message);
  });

  // Inject auto-approve bypass hook
  await page.evaluate(() => {
    window.boarderlessMcpAutoApprove = true;
    console.log('[+] Injected window.boarderlessMcpAutoApprove = true');
  });

  // 1. Auth check
  const auth = await page.evaluate(() => ({
    hasAuthFlag: localStorage.getItem('boarderless_has_authenticated'),
    hasMcp: typeof window.boarderlessMcp !== 'undefined',
    mcpKeys: typeof window.boarderlessMcp !== 'undefined' ? Object.keys(window.boarderlessMcp) : [],
    autoApproveVal: window.boarderlessMcpAutoApprove,
  }));
  console.log('Auth flag:', auth.hasAuthFlag);
  console.log('boarderlessMcp exists:', auth.hasMcp);
  console.log('boarderlessMcp keys:', auth.mcpKeys.join(', '));
  console.log('AutoApprove value in page context:', auth.autoApproveVal);

  if (!auth.hasMcp) {
    console.error('\n[-] window.boarderlessMcp is NOT defined. The canvas bridge is not loaded.');
    await browser.disconnect();
    return;
  }

  // 2. List available tools
  const tools = await page.evaluate(() => {
    return window.boarderlessMcp.listTools().map(t => t.name);
  });
  console.log('\nAvailable tools:', tools.join(', '));

  // 3. Try get_board_state first
  console.log('\n--- Calling get_board_state ---');
  try {
    const state = await page.evaluate(() => {
      return window.boarderlessMcp.callTool('get_board_state', {});
    });
    console.log('get_board_state result:', JSON.stringify(state, null, 2).substring(0, 500));
  } catch (e) {
    console.error('get_board_state ERROR:', e.message);
  }

  // 4. Try create_object (a simple yellow rectangle)
  console.log('\n--- Calling create_object (yellow rectangle) ---');
  try {
    const result = await page.evaluate(() => {
      return window.boarderlessMcp.callTool('create_object', {
        type: 'rect',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        fill: '#FFD700',
        label: 'MCP Test Rect'
      });
    });
    console.log('create_object result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('create_object ERROR:', e.message);
  }

  // 5. Try export_board
  console.log('\n--- Calling export_board ---');
  try {
    const exportResult = await page.evaluate(async () => {
      try {
        if (typeof window.runReactExport !== 'function') {
          return { success: false, error: 'window.runReactExport is not a function' };
        }
        await window.runReactExport('canvas', 'mcp_test_export');
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    console.log('exportResult:', exportResult);
  } catch (e) {
    console.error('export_board ERROR:', e.message);
  }

  await browser.disconnect();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
