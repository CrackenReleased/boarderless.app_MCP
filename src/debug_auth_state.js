import puppeteer from 'puppeteer-core';

async function main() {
  const browserURL = 'http://127.0.0.1:9222';
  console.log(`Connecting to Chrome at ${browserURL}...`);
  
  const browser = await puppeteer.connect({ browserURL, defaultViewport: null });
  const pages = await browser.pages();
  
  console.log(`\n[Found ${pages.length} open page(s)]:`);
  for (const p of pages) {
    console.log(`  - ${p.url()}`);
  }

  const appOrigin = 'https://boarderless.app';
  const page = pages.find(p => p.url().startsWith(appOrigin));
  
  if (!page) {
    console.error('\n[-] No boarderless.app page found. Pages open:');
    for (const p of pages) console.error('   ', p.url());
    await browser.disconnect();
    return;
  }
  
  console.log(`\n[+] Found canvas tab: ${page.url()}`);

  const result = await page.evaluate(() => {
    const out = {};

    // Check if stores exist at all
    out.hasAuthStore = typeof window.useAuthStore !== 'undefined';
    out.hasBoarderlessMcp = typeof window.boarderlessMcp !== 'undefined';
    out.hasUseAppStore = typeof window.useAppStore !== 'undefined';

    // Check raw auth state
    if (out.hasAuthStore) {
      const state = window.useAuthStore.getState();
      out.isAuthenticated = state.isAuthenticated;
      out.isCheckingSession = state.isCheckingSession;
      out.userEmail = state.user?.email || null;
      out.hasToken = !!state.token;
      out.tokenPreview = state.token ? state.token.substring(0, 40) + '...' : null;
    }

    // Check localStorage
    out.localStorageToken = !!localStorage.getItem('boarderless_auth_token');
    out.hasAuthenticatedFlag = localStorage.getItem('boarderless_has_authenticated');

    // Check boarderlessMcp tools
    if (out.hasBoarderlessMcp) {
      try {
        out.mcpTools = window.boarderlessMcp.listTools().map(t => t.name);
      } catch (e) {
        out.mcpToolsError = e.message;
      }
    }

    return out;
  });

  console.log('\n=== Auth Diagnostics ===');
  console.log(JSON.stringify(result, null, 2));

  await browser.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
