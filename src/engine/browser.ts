import { chromium, Browser, BrowserContext, Page, LaunchOptions } from 'playwright';
import fs from 'fs';

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
}

export interface LaunchBrowserOptions {
  headless?: boolean;
  userAgent?: string;
  viewport?: { width: number; height: number };
  colorScheme?: 'light' | 'dark' | 'no-preference';
  extraHeaders?: Record<string, string>;
}

export async function createBrowserSession(options: LaunchBrowserOptions = {}): Promise<BrowserSession> {
  const headless = options.headless ?? true;
  const launchOptions: LaunchOptions = {
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security'
    ]
  };

  // If system Chrome is present, use it if needed, or fallback to playwright's chromium
  const systemChrome = '/usr/bin/google-chrome-stable';
  if (!process.env.USE_PLAYWRIGHT_CHROMIUM && fs.existsSync(systemChrome)) {
    launchOptions.executablePath = systemChrome;
  }

  let browser: Browser;
  try {
    browser = await chromium.launch(launchOptions);
  } catch (err) {
    // If system chrome failed, fallback to default chromium
    delete launchOptions.executablePath;
    browser = await chromium.launch(launchOptions);
  }

  const defaultUserAgent =
    options.userAgent ||
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  const context = await browser.newContext({
    userAgent: defaultUserAgent,
    viewport: options.viewport || { width: 1920, height: 1080 },
    colorScheme: options.colorScheme || 'light',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
      ...options.extraHeaders
    },
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  // Basic evasions and bundler helper polyfills inside browser context
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });
    (window as any).__name = (target: any) => target;
  });

  const close = async () => {
    try {
      await page.close().catch(() => {});
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    } catch {}
  };

  return { browser, context, page, close };
}
