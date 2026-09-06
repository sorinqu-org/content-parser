import { Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { ScreenshotResult } from '../types/index.js';

export interface ScreenshotOptions {
  outputDir: string;
  viewports?: Array<'desktop' | 'mobile' | 'tablet' | 'fullpage'>;
  colorScheme?: 'light' | 'dark' | 'both';
  routes?: string[];
}

const VIEWPORT_MAP = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 }
};

export async function captureScreenshots(
  page: Page,
  currentUrl: string,
  options: ScreenshotOptions
): Promise<ScreenshotResult[]> {
  const dir = options.outputDir;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const viewports = options.viewports && options.viewports.length > 0
    ? options.viewports
    : (['desktop', 'mobile', 'fullpage'] as Array<'desktop' | 'mobile' | 'tablet' | 'fullpage'>);

  const schemes: Array<'light' | 'dark'> =
    options.colorScheme === 'both'
      ? ['light', 'dark']
      : [options.colorScheme || 'light'];

  const results: ScreenshotResult[] = [];
  const safeHost = new URL(currentUrl).hostname.replace(/[^a-z0-9_-]/gi, '_');

  for (const scheme of schemes) {
    try {
      await page.emulateMedia({ colorScheme: scheme });
    } catch {}

    for (const vp of viewports) {
      const fileName = `${safeHost}_${vp}_${scheme}.png`;
      const filePath = path.join(dir, fileName);

      try {
        if (vp === 'fullpage') {
          await page.setViewportSize({ width: 1920, height: 1080 });
          // Scroll page to trigger lazy loaded images
          await page.evaluate(async () => {
            await new Promise<void>((resolve) => {
              let totalHeight = 0;
              const distance = 400;
              const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight || totalHeight > 5000) {
                  clearInterval(timer);
                  window.scrollTo(0, 0);
                  resolve();
                }
              }, 100);
            });
          });
          await page.waitForTimeout(500);

          await page.screenshot({ path: filePath, fullPage: true });

          results.push({
            viewport: 'fullpage',
            width: 1920,
            height: 1080,
            colorScheme: scheme,
            filePath,
            url: currentUrl
          });
        } else {
          const dims = VIEWPORT_MAP[vp];
          await page.setViewportSize(dims);
          await page.waitForTimeout(300);

          await page.screenshot({ path: filePath, fullPage: false });

          results.push({
            viewport: vp,
            width: dims.width,
            height: dims.height,
            colorScheme: scheme,
            filePath,
            url: currentUrl
          });
        }
      } catch (err) {
        // Continue capturing other viewports on error
      }
    }
  }

  // If additional routes provided, take screenshots for each route
  if (options.routes && options.routes.length > 0) {
    for (const route of options.routes) {
      if (route === currentUrl) continue;
      try {
        await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const routePath = new URL(route).pathname.replace(/[^a-z0-9_-]/gi, '_') || 'index';
        const routeFileName = `${safeHost}_route_${routePath}_desktop.png`;
        const routeFilePath = path.join(dir, routeFileName);

        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.screenshot({ path: routeFilePath, fullPage: false });

        results.push({
          viewport: 'desktop',
          width: 1920,
          height: 1080,
          colorScheme: 'light',
          filePath: routeFilePath,
          url: route
        });
      } catch {}
    }
    // Return to initial URL
    try {
      await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch {}
  }

  return results;
}
