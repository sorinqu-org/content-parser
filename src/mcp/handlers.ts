import path from 'path';
import fs from 'fs';
import { parseUrl } from '../engine/index.js';
import { createBrowserSession } from '../engine/browser.js';
import { extractUIComponents } from '../engine/extractors/ui.js';
import { extractStructure } from '../engine/extractors/structure.js';
import { extractText } from '../engine/extractors/text.js';
import { captureScreenshots } from '../engine/screenshots.js';
import { ParseTarget } from '../types/index.js';

export async function handleToolCall(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case 'parse_website': {
      const url = args.url as string;
      const targets = args.targets as ParseTarget[] | undefined;
      const downloadAssets = Boolean(args.downloadAssets);
      const outputDir = args.outputDir as string | undefined;
      const crawlPages = Boolean(args.crawlPages);
      const crawlAllRoutes = Boolean(args.crawlAllRoutes);
      const maxPages = typeof args.maxPages === 'number' ? args.maxPages : (crawlAllRoutes ? 0 : 50);
      const maxDepth = typeof args.maxDepth === 'number' ? args.maxDepth : 2;
      const viewports = args.viewports;
      const colorScheme = args.colorScheme;

      const result = await parseUrl({
        url,
        targets,
        downloadAssets,
        outputDir,
        crawlPages,
        crawlAllRoutes,
        maxPages,
        maxDepth,
        viewports,
        colorScheme
      });

      return {
        url: result.url,
        summary: result.summary,
        durationMs: result.durationMs,
        targetsParsed: result.targetsParsed,
        assets: result.assets,
        structure: result.structure,
        content: result.content
          ? {
              title: result.content.title,
              metaDescription: result.content.metaDescription,
              headings: result.content.headings,
              wordCount: result.content.wordCount,
              markdownSnippet: result.content.markdown.slice(0, 4000)
            }
          : undefined,
        uiComponentsCount: result.uiComponents ? result.uiComponents.length : 0,
        uiComponents: result.uiComponents ? result.uiComponents.slice(0, 10) : undefined,
        screenshots: result.screenshots,
        downloadManifestPath: result.downloadManifestPath,
        errors: result.errors && result.errors.length > 0 ? result.errors : undefined
      };
    }

    case 'extract_assets': {
      const url = args.url as string;
      const assetTypes = (args.assetTypes as string[]) || ['images', 'videos', 'models_3d', 'fonts'];
      const targets: ParseTarget[] = [];
      if (assetTypes.includes('images')) targets.push('images');
      if (assetTypes.includes('videos')) targets.push('videos');
      if (assetTypes.includes('models_3d')) targets.push('models_3d');
      if (assetTypes.includes('fonts')) targets.push('fonts');

      const result = await parseUrl({
        url,
        targets,
        downloadAssets: Boolean(args.download),
        outputDir: args.outputDir as string | undefined
      });

      return {
        url: result.url,
        summary: {
          images: result.assets?.images?.length || 0,
          videos: result.assets?.videos?.length || 0,
          models3d: result.assets?.models3d?.length || 0,
          fonts: result.assets?.fonts?.length || 0
        },
        assets: result.assets,
        downloadManifestPath: result.downloadManifestPath
      };
    }

    case 'extract_ui_components': {
      const url = args.url as string;
      const session = await createBrowserSession();
      try {
        await session.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await session.page.waitForTimeout(1000);

        const outputDir = args.outputDir || path.resolve(process.cwd(), 'parsed_output', 'components');
        const components = await extractUIComponents(session.page, {
          components: args.components || ['all'],
          includeStyles: true,
          includeScreenshot: Boolean(args.includeScreenshot),
          screenshotsDir: outputDir
        });

        return {
          url,
          count: components.length,
          components
        };
      } finally {
        await session.close();
      }
    }

    case 'extract_site_structure': {
      const url = args.url as string;
      const session = await createBrowserSession();
      try {
        await session.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const structure = await extractStructure(session.page, url, {
          maxDepth: args.maxDepth ?? 2,
          maxPages: args.maxPages !== undefined ? args.maxPages : 50,
          includeExternal: Boolean(args.includeExternal)
        });

        return structure;
      } finally {
        await session.close();
      }
    }

    case 'extract_page_content': {
      const url = args.url as string;
      const session = await createBrowserSession();
      try {
        await session.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const content = await extractText(session.page);
        return content;
      } finally {
        await session.close();
      }
    }

    case 'capture_screenshots': {
      const url = args.url as string;
      const session = await createBrowserSession();
      try {
        await session.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const outputDir = args.outputDir || path.resolve(process.cwd(), 'parsed_output', 'screenshots');
        const screenshots = await captureScreenshots(session.page, url, {
          outputDir,
          viewports: args.viewports,
          colorScheme: args.colorScheme,
          routes: args.routes
        });

        return {
          url,
          count: screenshots.length,
          screenshots
        };
      } finally {
        await session.close();
      }
    }

    case 'inspect_element': {
      const url = args.url as string;
      const selector = args.selector as string;
      const session = await createBrowserSession();
      try {
        await session.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await session.page.waitForTimeout(1000);

        const locator = session.page.locator(selector).first();
        const exists = await locator.count();
        if (exists === 0) {
          return { error: `Element matching selector "${selector}" not found on ${url}` };
        }

        const info = await session.page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;

          const computed = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const classes = Array.from(el.classList);

          return {
            tag: el.tagName.toLowerCase(),
            classes,
            box: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            },
            styles: {
              display: computed.display,
              position: computed.position,
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontFamily: computed.fontFamily,
              fontSize: computed.fontSize,
              fontWeight: computed.fontWeight,
              lineHeight: computed.lineHeight,
              padding: computed.padding,
              margin: computed.margin,
              border: computed.border,
              borderRadius: computed.borderRadius,
              boxShadow: computed.boxShadow,
              zIndex: computed.zIndex
            },
            html: el.outerHTML.slice(0, 10000)
          };
        }, selector);

        let screenshotPath: string | undefined;
        if (args.includeScreenshot) {
          const outDir = args.outputDir || path.resolve(process.cwd(), 'parsed_output', 'elements');
          if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
          }
          screenshotPath = path.join(outDir, `element_${Date.now()}.png`);
          await locator.screenshot({ path: screenshotPath });
        }

        return {
          url,
          selector,
          element: info,
          screenshotPath
        };
      } finally {
        await session.close();
      }
    }

    default:
      throw new Error(`Unknown MCP tool: ${name}`);
  }
}
