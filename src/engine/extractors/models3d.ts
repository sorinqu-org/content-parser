import { Page } from 'playwright';
import { Model3DAsset, Model3DFormat } from '../../types/index.js';

export async function extract3DModels(page: Page, baseUrl: string, interceptedModels: Model3DAsset[] = []): Promise<Model3DAsset[]> {
  const domModels = await page.evaluate(() => {
    const results: Array<{
      url: string;
      format: Model3DFormat;
      source: 'model_viewer' | 'link' | 'script' | 'canvas';
    }> = [];

    // 1. <model-viewer> web component
    const modelViewers = Array.from(document.querySelectorAll('model-viewer'));
    for (const mv of modelViewers) {
      const src = mv.getAttribute('src');
      if (src) {
        let fullSrc = src;
        try {
          fullSrc = new URL(src, window.location.href).href;
        } catch {}

        const lower = fullSrc.toLowerCase().split('?')[0];
        let fmt: Model3DFormat = 'unknown';
        if (lower.endsWith('.glb')) fmt = 'glb';
        else if (lower.endsWith('.gltf')) fmt = 'gltf';
        else if (lower.endsWith('.usdz')) fmt = 'usdz';

        results.push({
          url: fullSrc,
          format: fmt,
          source: 'model_viewer'
        });
      }
      const iosSrc = mv.getAttribute('ios-src');
      if (iosSrc) {
        let fullIos = iosSrc;
        try {
          fullIos = new URL(iosSrc, window.location.href).href;
        } catch {}
        results.push({
          url: fullIos,
          format: 'usdz',
          source: 'model_viewer'
        });
      }
    }

    // 2. Direct <a> links to 3D files
    const links = Array.from(document.querySelectorAll('a[href]'));
    for (const a of links) {
      const href = a.getAttribute('href');
      if (href) {
        let fullHref = href;
        try {
          fullHref = new URL(href, window.location.href).href;
        } catch {}

        const lower = fullHref.toLowerCase().split('?')[0];
        let fmt: Model3DFormat = 'unknown';
        if (lower.endsWith('.glb')) fmt = 'glb';
        else if (lower.endsWith('.gltf')) fmt = 'gltf';
        else if (lower.endsWith('.obj')) fmt = 'obj';
        else if (lower.endsWith('.mtl')) fmt = 'mtl';
        else if (lower.endsWith('.fbx')) fmt = 'fbx';
        else if (lower.endsWith('.usdz')) fmt = 'usdz';
        else if (lower.endsWith('.ply')) fmt = 'ply';
        else if (lower.endsWith('.splat')) fmt = 'splat';
        else if (lower.endsWith('.stl')) fmt = 'stl';

        if (fmt !== 'unknown') {
          results.push({
            url: fullHref,
            format: fmt,
            source: 'link'
          });
        }
      }
    }

    // 3. Script / inline data inspecting 3D model paths
    const scripts = Array.from(document.querySelectorAll('script:not([src])'));
    const regex3d = /["']([^"']+\.(glb|gltf|obj|mtl|fbx|usdz|ply|splat|stl))(\?[^"']*)?["']/gi;
    for (const s of scripts) {
      const text = s.textContent || '';
      let match: RegExpExecArray | null;
      while ((match = regex3d.exec(text)) !== null) {
        const path = match[1];
        if (path && !path.includes('\n')) {
          let fullPath = path;
          try {
            fullPath = new URL(path, window.location.href).href;
          } catch {}

          const lower = fullPath.toLowerCase().split('?')[0];
          let fmt: Model3DFormat = 'unknown';
          if (lower.endsWith('.glb')) fmt = 'glb';
          else if (lower.endsWith('.gltf')) fmt = 'gltf';
          else if (lower.endsWith('.obj')) fmt = 'obj';
          else if (lower.endsWith('.mtl')) fmt = 'mtl';
          else if (lower.endsWith('.fbx')) fmt = 'fbx';
          else if (lower.endsWith('.usdz')) fmt = 'usdz';
          else if (lower.endsWith('.ply')) fmt = 'ply';
          else if (lower.endsWith('.splat')) fmt = 'splat';
          else if (lower.endsWith('.stl')) fmt = 'stl';

          results.push({
            url: fullPath,
            format: fmt,
            source: 'script'
          });
        }
      }
    }

    return results;
  });

  const all = [...domModels, ...interceptedModels];
  const seen = new Set<string>();
  const unique: Model3DAsset[] = [];

  for (const item of all) {
    if (!item.url || seen.has(item.url)) continue;
    seen.add(item.url);
    unique.push(item);
  }

  return unique;
}
