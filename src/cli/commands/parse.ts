import { parseUrl } from '../../engine/index.js';
import { ParseTarget } from '../../types/index.js';
import pc from 'picocolors';
import path from 'path';

export interface ParseCliOptions {
  targets?: string;
  download?: boolean;
  out?: string;
  crawl?: boolean;
  maxPages?: string;
  maxDepth?: string;
  viewports?: string;
  colorScheme?: 'light' | 'dark' | 'both';
}

export async function handleParseCommand(url: string, options: ParseCliOptions): Promise<void> {
  console.log(pc.cyan(`\nStarting parse for: ${pc.bold(url)}...`));

  const targets: ParseTarget[] | undefined = options.targets
    ? (options.targets.split(',').map((t) => t.trim()) as ParseTarget[])
    : undefined;

  const viewports = options.viewports
    ? (options.viewports.split(',').map((v) => v.trim()) as any)
    : undefined;

  const outputDir = options.out ? path.resolve(process.cwd(), options.out) : undefined;

  try {
    const result = await parseUrl({
      url,
      targets,
      downloadAssets: Boolean(options.download),
      outputDir,
      crawlPages: Boolean(options.crawl),
      maxPages: options.maxPages ? parseInt(options.maxPages, 10) : 5,
      maxDepth: options.maxDepth ? parseInt(options.maxDepth, 10) : 2,
      viewports,
      colorScheme: options.colorScheme
    });

    console.log(pc.green(`\nParse completed in ${(result.durationMs / 1000).toFixed(2)}s\n`));
    console.log(pc.bold('Extraction Summary:'));
    console.log(`  - Images:        ${pc.yellow(result.summary.imagesCount.toString())}`);
    console.log(`  - Videos/Audio:  ${pc.yellow(result.summary.videosCount.toString())}`);
    console.log(`  - 3D Models:     ${pc.yellow(result.summary.models3dCount.toString())}`);
    console.log(`  - Typography:    ${pc.yellow(result.summary.fontsCount.toString())}`);
    console.log(`  - UI Components: ${pc.yellow(result.summary.uiComponentsCount.toString())}`);
    console.log(`  - Routes:        ${pc.yellow(result.summary.routesCount.toString())}`);
    console.log(`  - Screenshots:   ${pc.yellow(result.summary.screenshotsCount.toString())}`);
    console.log(`  - Words:         ${pc.yellow(result.summary.wordCount.toString())}`);

    if (result.downloadManifestPath) {
      console.log(pc.cyan(`\nAssets downloaded to manifest: ${result.downloadManifestPath}`));
    }
    if (result.screenshots && result.screenshots.length > 0) {
      console.log(pc.cyan(`Screenshots captured:`));
      for (const s of result.screenshots) {
        console.log(`  * [${s.viewport}/${s.colorScheme}] -> ${s.filePath}`);
      }
    }
    console.log();
  } catch (err: any) {
    console.error(pc.red(`\nParse failed: ${err.message}`));
    process.exit(1);
  }
}
