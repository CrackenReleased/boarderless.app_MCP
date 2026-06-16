import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function main() {
  try {
    console.log('[Scratch] Connecting...');
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    
    let boarderlessPage = null;
    for (const page of pages) {
      const url = page.url();
      if (url.includes('boarderless.app/canvas') || url.includes('5174/canvas')) {
        boarderlessPage = page;
      }
    }
    
    if (!boarderlessPage) {
      console.log('[-] No active page found.');
      await browser.disconnect();
      return;
    }
    
    console.log(`[+] Found active page: ${boarderlessPage.url()}`);
    
    const pageDetails = await boarderlessPage.evaluate(() => {
      const html = document.body.innerHTML;
      const text = document.body.innerText;
      const localStorageKeys = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        localStorageKeys[key] = localStorage.getItem(key);
      }
      return {
        title: document.title,
        url: window.location.href,
        hasStageWrap: !!document.getElementById('stage-wrap'),
        hasReactRoot: !!document.getElementById('react-root'),
        bodyLength: html.length,
        bodyTextSnippet: text.slice(0, 1000),
        localStorageKeys
      };
    });
    
    console.log('[Page Details]:', JSON.stringify(pageDetails, null, 2));
    
    // Save screenshot
    const screenshotPath = 'C:/Users/Beast/.gemini/antigravity/brain/c3a1aa3a-daa6-48c4-8c9a-d4a3772e9447/current_page.png';
    await boarderlessPage.screenshot({ path: screenshotPath });
    console.log(`[+] Screenshot saved to ${screenshotPath}`);
    
    await browser.disconnect();
  } catch (err) {
    console.error('[-] Error:', err);
  }
}

main();
