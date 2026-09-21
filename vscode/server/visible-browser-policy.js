const HEADLESS_PRODUCT_PATTERN = /HeadlessChrome|HeadlessChromium|PhantomJS/i;

export function assertVisibleBrowserMetadata(metadata) {
  const identity = `${metadata.product || ""} ${metadata.userAgent || ""}`;
  if (HEADLESS_PRODUCT_PATTERN.test(identity)) {
    const error = new Error("HEADLESS_BROWSER_REJECTED: Boarderless MCP requires a visible browser window.");
    error.code = "HEADLESS_BROWSER_REJECTED";
    throw error;
  }
  if (!(metadata.outerWidth > 0) || !(metadata.outerHeight > 0) || metadata.visibilityState !== "visible") {
    const error = new Error("INVISIBLE_BROWSER_REJECTED: Bring the Boarderless window and canvas tab into view.");
    error.code = "INVISIBLE_BROWSER_REJECTED";
    throw error;
  }
}

export async function assertVisibleBoarderlessPage(browser, page) {
  await page.bringToFront();
  const [product, state] = await Promise.all([
    browser.version(),
    page.evaluate(() => ({
      userAgent: navigator.userAgent,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      visibilityState: document.visibilityState,
    })),
  ]);
  assertVisibleBrowserMetadata({ product, ...state });
}
