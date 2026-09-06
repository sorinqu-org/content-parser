import { Page, Response } from 'playwright';
import { Model3DAsset, Model3DFormat, FontAsset, VideoAsset, ImageAsset } from '../types/index.js';

export interface InterceptedAssets {
  models3d: Model3DAsset[];
  fonts: FontAsset[];
  videos: VideoAsset[];
  images: ImageAsset[];
}

const MODEL_3D_EXTENSIONS: Record<string, Model3DFormat> = {
  '.glb': 'glb',
  '.gltf': 'gltf',
  '.obj': 'obj',
  '.mtl': 'mtl',
  '.fbx': 'fbx',
  '.usdz': 'usdz',
  '.ply': 'ply',
  '.splat': 'splat',
  '.stl': 'stl',
  '.drc': 'draco'
};

const MODEL_3D_MIMES: Record<string, Model3DFormat> = {
  'model/gltf-binary': 'glb',
  'model/gltf+json': 'gltf',
  'model/vnd.usdz+zip': 'usdz',
  'model/obj': 'obj',
  'model/stl': 'stl',
  'model/ply': 'ply'
};

export class NetworkInterceptor {
  private page: Page;
  private assets: InterceptedAssets = {
    models3d: [],
    fonts: [],
    videos: [],
    images: []
  };
  private seenUrls = new Set<string>();

  constructor(page: Page) {
    this.page = page;
  }

  public start(): void {
    this.page.on('response', (response: Response) => {
      this.handleResponse(response).catch(() => {});
    });
  }

  private async handleResponse(response: Response): Promise<void> {
    const url = response.url();
    if (!url || url.startsWith('data:') || this.seenUrls.has(url)) {
      return;
    }
    this.seenUrls.add(url);

    const headers = response.headers();
    const contentType = (headers['content-type'] || '').toLowerCase();
    const contentLength = headers['content-length'] ? parseInt(headers['content-length'], 10) : undefined;
    const urlLower = url.toLowerCase().split('?')[0];

    // 1. Check 3D models
    let modelFormat: Model3DFormat | null = null;
    for (const [ext, fmt] of Object.entries(MODEL_3D_EXTENSIONS)) {
      if (urlLower.endsWith(ext)) {
        modelFormat = fmt;
        break;
      }
    }
    if (!modelFormat) {
      for (const [mime, fmt] of Object.entries(MODEL_3D_MIMES)) {
        if (contentType.includes(mime)) {
          modelFormat = fmt;
          break;
        }
      }
    }

    if (modelFormat) {
      this.assets.models3d.push({
        url,
        format: modelFormat,
        mimeType: contentType || undefined,
        source: 'network',
        sizeBytes: contentLength
      });
      return;
    }

    // 2. Check Web Fonts
    const fontExts: Record<string, 'woff2' | 'woff' | 'ttf' | 'otf' | 'eot'> = {
      '.woff2': 'woff2',
      '.woff': 'woff',
      '.ttf': 'ttf',
      '.otf': 'otf',
      '.eot': 'eot'
    };

    let fontFormat: 'woff2' | 'woff' | 'ttf' | 'otf' | 'eot' | null = null;
    for (const [ext, fmt] of Object.entries(fontExts)) {
      if (urlLower.endsWith(ext)) {
        fontFormat = fmt;
        break;
      }
    }

    if (!fontFormat && (contentType.includes('font/') || contentType.includes('application/x-font-'))) {
      if (contentType.includes('woff2')) fontFormat = 'woff2';
      else if (contentType.includes('woff')) fontFormat = 'woff';
      else if (contentType.includes('ttf')) fontFormat = 'ttf';
      else if (contentType.includes('otf')) fontFormat = 'otf';
      else fontFormat = 'woff2';
    }

    if (fontFormat) {
      // Derive font family name from URL if possible
      const urlParts = urlLower.split('/');
      const filename = urlParts[urlParts.length - 1] || 'font';
      const familyName = filename.replace(/\.(woff2?|ttf|otf|eot)(\?.*)?$/, '');

      this.assets.fonts.push({
        family: decodeURIComponent(familyName),
        format: fontFormat,
        url,
        source: 'network'
      });
      return;
    }

    // 3. Check Videos & Audio
    if (
      contentType.includes('video/') ||
      urlLower.endsWith('.mp4') ||
      urlLower.endsWith('.webm') ||
      urlLower.endsWith('.ogv') ||
      urlLower.endsWith('.mov') ||
      urlLower.endsWith('.m3u8')
    ) {
      this.assets.videos.push({
        url,
        type: 'video',
        format: contentType.split(';')[0] || urlLower.slice(urlLower.lastIndexOf('.') + 1),
        sizeBytes: contentLength
      });
      return;
    }

    if (contentType.includes('audio/') || urlLower.endsWith('.mp3') || urlLower.endsWith('.ogg') || urlLower.endsWith('.wav')) {
      this.assets.videos.push({
        url,
        type: 'audio',
        format: contentType.split(';')[0] || urlLower.slice(urlLower.lastIndexOf('.') + 1),
        sizeBytes: contentLength
      });
      return;
    }

    // 4. Intercepted dynamic images
    if (contentType.includes('image/')) {
      this.assets.images.push({
        url,
        type: 'img',
        format: contentType.split('/')[1]?.split(';')[0],
        sizeBytes: contentLength
      });
    }
  }

  public getAssets(): InterceptedAssets {
    return this.assets;
  }
}
