import puppeteer from 'puppeteer-core';

async function main() {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const pages = await browser.pages();
    console.log('Open tabs:');
    for (const page of pages) {
      console.log(`- ${page.url()}`);
    }
    await browser.disconnect();
  } catch (err) {
    console.error('Error connecting to browser:', err);
  }
}

main();
