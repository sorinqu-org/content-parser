import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ImageAsset, VideoAsset, Model3DAsset, FontAsset } from '../types/index.js';

export interface DownloadManifest {
  url: string;
  timestamp: string;
  outputDir: string;
  totalAssetsDownloaded: number;
  files: Array<{
    category: 'images' | 'videos' | 'models3d' | 'fonts';
    originalUrl: string;
    localPath: string;
    sizeBytes?: number;
  }>;
}

export class AssetStorage {
  private baseDir: string;

  constructor(outputDir: string) {
    this.baseDir = outputDir;
  }

  public initDirectories(): {
    imagesDir: string;
    videosDir: string;
    modelsDir: string;
    fontsDir: string;
    screenshotsDir: string;
  } {
    const imagesDir = path.join(this.baseDir, 'images');
    const videosDir = path.join(this.baseDir, 'videos');
    const modelsDir = path.join(this.baseDir, 'models3d');
    const fontsDir = path.join(this.baseDir, 'fonts');
    const screenshotsDir = path.join(this.baseDir, 'screenshots');

    for (const dir of [imagesDir, videosDir, modelsDir, fontsDir, screenshotsDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    return { imagesDir, videosDir, modelsDir, fontsDir, screenshotsDir };
  }

  private sanitizeFilename(urlStr: string, defaultExt: string): string {
    try {
      const parsed = new URL(urlStr);
      const pathname = parsed.pathname;
      const basename = path.basename(pathname);
      if (basename && basename.includes('.')) {
        return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
      }
    } catch {}

    const hash = crypto.createHash('md5').update(urlStr).digest('hex').slice(0, 10);
    return `asset_${hash}.${defaultExt}`;
  }

  public async downloadFile(urlStr: string, targetDir: string, defaultExt: string): Promise<string | null> {
    try {
      // Handle data URLs
      if (urlStr.startsWith('data:')) {
        const commaIdx = urlStr.indexOf(',');
        if (commaIdx === -1) return null;

        const meta = urlStr.slice(5, commaIdx);
        const data = urlStr.slice(commaIdx + 1);
        const isBase64 = meta.includes(';base64');
        const mime = meta.split(';')[0];

        let ext = defaultExt;
        if (mime.includes('svg')) ext = 'svg';
        else if (mime.includes('png')) ext = 'png';
        else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
        else if (mime.includes('webp')) ext = 'webp';

        const hash = crypto.createHash('md5').update(data).digest('hex').slice(0, 8);
        const fileName = `inline_${hash}.${ext}`;
        const filePath = path.join(targetDir, fileName);

        const buffer = isBase64 ? Buffer.from(data, 'base64') : Buffer.from(decodeURIComponent(data), 'utf8');
        await fs.promises.writeFile(filePath, buffer);
        return filePath;
      }

      const fileName = this.sanitizeFilename(urlStr, defaultExt);
      const filePath = path.join(targetDir, fileName);

      // Avoid re-downloading if already present
      if (fs.existsSync(filePath)) {
        return filePath;
      }

      const response = await fetch(urlStr, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) return null;

      const arrayBuffer = await response.arrayBuffer();
      await fs.promises.writeFile(filePath, Buffer.from(arrayBuffer));
      return filePath;
    } catch {
      return null;
    }
  }

  public async downloadAssets(
    siteUrl: string,
    assets: {
      images?: ImageAsset[];
      videos?: VideoAsset[];
      models3d?: Model3DAsset[];
      fonts?: FontAsset[];
    }
  ): Promise<string> {
    const { imagesDir, videosDir, modelsDir, fontsDir } = this.initDirectories();
    const manifest: DownloadManifest = {
      url: siteUrl,
      timestamp: new Date().toISOString(),
      outputDir: this.baseDir,
      totalAssetsDownloaded: 0,
      files: []
    };

    // Download images (up to 30)
    if (assets.images) {
      for (const img of assets.images.slice(0, 30)) {
        const local = await this.downloadFile(img.url, imagesDir, img.format || 'jpg');
        if (local) {
          img.localPath = local;
          manifest.files.push({
            category: 'images',
            originalUrl: img.url,
            localPath: local,
            sizeBytes: fs.statSync(local).size
          });
          manifest.totalAssetsDownloaded++;
        }
      }
    }

    // Download 3D models
    if (assets.models3d) {
      for (const model of assets.models3d) {
        const local = await this.downloadFile(model.url, modelsDir, model.format || 'glb');
        if (local) {
          model.localPath = local;
          manifest.files.push({
            category: 'models3d',
            originalUrl: model.url,
            localPath: local,
            sizeBytes: fs.statSync(local).size
          });
          manifest.totalAssetsDownloaded++;
        }
      }
    }

    // Download fonts
    if (assets.fonts) {
      for (const font of assets.fonts) {
        if (font.url && !font.url.includes('googleapis.com')) {
          const local = await this.downloadFile(font.url, fontsDir, font.format || 'woff2');
          if (local) {
            font.localPath = local;
            manifest.files.push({
              category: 'fonts',
              originalUrl: font.url,
              localPath: local,
              sizeBytes: fs.statSync(local).size
            });
            manifest.totalAssetsDownloaded++;
          }
        }
      }
    }

    // Download direct videos (skip embeds)
    if (assets.videos) {
      for (const vid of assets.videos) {
        if (vid.type === 'video' || vid.type === 'audio') {
          const local = await this.downloadFile(vid.url, videosDir, vid.format || 'mp4');
          if (local) {
            vid.localPath = local;
            manifest.files.push({
              category: 'videos',
              originalUrl: vid.url,
              localPath: local,
              sizeBytes: fs.statSync(local).size
            });
            manifest.totalAssetsDownloaded++;
          }
        }
      }
    }

    const manifestPath = path.join(this.baseDir, 'manifest.json');
    await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    return manifestPath;
  }
}
