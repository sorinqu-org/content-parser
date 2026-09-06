import path from 'path';
import fs from 'fs';
import { ParseOptions, ParseResult, ParseTarget } from '../types/index.js';
import { createBrowserSession } from './browser.js';
import { NetworkInterceptor } from './interceptor.js';
import { extractImages } from './extractors/images.js';
import { extractVideos } from './extractors/videos.js';
import { extract3DModels } from './extractors/models3d.js';
import { extractFonts } from './extractors/fonts.js';
import { extractStructure } from './extractors/structure.js';
import { extractText } from './extractors/text.js';
import { extractUIComponents } from './extractors/ui.js';
import { captureScreenshots } from './screenshots.js';
import { AssetStorage } from './storage.js';

export async function parseUrl(options: ParseOptions): Promise<ParseResult> {
  const startTime = Date.now();
  const targets: ParseTarget[] = options.targets && options.targets.length > 0
    ? options.targets
    : ['images', 'videos', 'models_3d', 'fonts', 'text', 'ui_components', 'structure', 'screenshots'];

  const url = options.url.trim();
  const errors: string[] = [];

  const session = await createBrowserSession({
    userAgent: options.userAgent,
    extraHeaders: options.headers,
    colorScheme: options.colorScheme === 'dark' ? 'dark' : 'light'
  });

  const interceptor = new NetworkInterceptor(session.page);
  interceptor.start();

  try {
    const timeout = options.timeoutMs ?? 30000;
    await session.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout
    });

    // Give asynchronous scripts/models a brief moment to hydrate
    await session.page.waitForTimeout(1500);

    const intercepted = interceptor.getAssets();

    let safeHost = 'site';
    try {
      safeHost = new URL(url).hostname.replace(/[^a-z0-9_-]/gi, '_') || 'page';
    } catch {}

    const outputDir = options.outputDir || path.resolve(process.cwd(), 'parsed_output', safeHost);
    const storage = new AssetStorage(outputDir);
    const { screenshotsDir } = storage.initDirectories();

    const result: ParseResult = {
      url,
      timestamp: new Date().toISOString(),
      durationMs: 0,
      targetsParsed: targets,
      summary: {
        imagesCount: 0,
        videosCount: 0,
        models3dCount: 0,
        fontsCount: 0,
        routesCount: 0,
        uiComponentsCount: 0,
        screenshotsCount: 0,
        wordCount: 0
      },
      assets: {},
      errors
    };

    // 1. Extract Images
    if (targets.includes('images')) {
      try {
        result.assets!.images = await extractImages(session.page, url, intercepted.images);
        result.summary.imagesCount = result.assets!.images.length;
      } catch (e: any) {
        errors.push(`Images extraction error: ${e.message}`);
      }
    }

    // 2. Extract Videos
    if (targets.includes('videos')) {
      try {
        result.assets!.videos = await extractVideos(session.page, url, intercepted.videos);
        result.summary.videosCount = result.assets!.videos.length;
      } catch (e: any) {
        errors.push(`Videos extraction error: ${e.message}`);
      }
    }

    // 3. Extract 3D Models
    if (targets.includes('models_3d')) {
      try {
        result.assets!.models3d = await extract3DModels(session.page, url, intercepted.models3d);
        result.summary.models3dCount = result.assets!.models3d.length;
      } catch (e: any) {
        errors.push(`3D models extraction error: ${e.message}`);
      }
    }

    // 4. Extract Fonts
    if (targets.includes('fonts')) {
      try {
        result.assets!.fonts = await extractFonts(session.page, url, intercepted.fonts);
        result.summary.fontsCount = result.assets!.fonts.length;
      } catch (e: any) {
        errors.push(`Fonts extraction error: ${e.message}`);
      }
    }

    // 5. Extract Structure & Crawl
    if (targets.includes('structure') || options.crawlAllRoutes || options.crawlPages) {
      try {
        result.structure = await extractStructure(session.page, url, {
          maxDepth: options.maxDepth ?? 2,
          maxPages: options.maxPages !== undefined ? options.maxPages : (options.crawlAllRoutes ? 0 : 50)
        });
        result.summary.routesCount = result.structure.routes.length;
      } catch (e: any) {
        errors.push(`Structure extraction error: ${e.message}`);
      }
    }

    // 6. Extract Semantic Text & Headings
    if (targets.includes('text')) {
      try {
        result.content = await extractText(session.page);
        result.summary.wordCount = result.content.wordCount;
      } catch (e: any) {
        errors.push(`Text extraction error: ${e.message}`);
      }
    }

    // 7. Extract UI Components
    if (targets.includes('ui_components')) {
      try {
        result.uiComponents = await extractUIComponents(session.page, {
          includeStyles: true,
          includeScreenshot: options.downloadAssets,
          screenshotsDir: path.join(screenshotsDir, 'components')
        });
        result.summary.uiComponentsCount = result.uiComponents.length;
      } catch (e: any) {
        errors.push(`UI components extraction error: ${e.message}`);
      }
    }

    // 8. Capture Screenshots
    if (targets.includes('screenshots')) {
      try {
        const extraRoutes = options.crawlPages && result.structure
          ? result.structure.routes.slice(1, 4).map((r) => r.url)
          : [];

        result.screenshots = await captureScreenshots(session.page, url, {
          outputDir: screenshotsDir,
          viewports: options.viewports,
          colorScheme: options.colorScheme,
          routes: extraRoutes
        });
        result.summary.screenshotsCount = result.screenshots.length;
      } catch (e: any) {
        errors.push(`Screenshots capture error: ${e.message}`);
      }
    }

    // 9. Download assets to disk if requested
    if (options.downloadAssets && result.assets) {
      try {
        result.downloadManifestPath = await storage.downloadAssets(url, result.assets);
      } catch (e: any) {
        errors.push(`Asset download error: ${e.message}`);
      }
    }

    result.durationMs = Date.now() - startTime;
    return result;
  } finally {
    await session.close();
  }
}
