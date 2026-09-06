import { Page } from 'playwright';
import { ImageAsset } from '../../types/index.js';

export async function extractImages(page: Page, baseUrl: string, interceptedImages: ImageAsset[] = []): Promise<ImageAsset[]> {
  const domImages = await page.evaluate(() => {
    const results: Array<{
      url: string;
      type: 'img' | 'background' | 'svg' | 'favicon' | 'og_image' | 'picture_source' | 'canvas';
      alt?: string;
      width?: number;
      height?: number;
      format?: string;
    }> = [];

    // 1. <img> elements
    const imgs = Array.from(document.querySelectorAll('img'));
    for (const img of imgs) {
      const src = img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
      if (src) {
        let fullSrc = src;
        try {
          fullSrc = new URL(src, window.location.href).href;
        } catch {}

        results.push({
          url: fullSrc,
          type: 'img',
          alt: img.alt || undefined,
          width: img.naturalWidth || img.width || undefined,
          height: img.naturalHeight || img.height || undefined
        });
      }

      // Check srcset
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        const entries = srcset.split(',').map((s) => s.trim().split(' ')[0]);
        for (const candidate of entries) {
          if (candidate && candidate !== src) {
            let fullCandidate = candidate;
            try {
              fullCandidate = new URL(candidate, window.location.href).href;
            } catch {}
            results.push({
              url: fullCandidate,
              type: 'img',
              alt: img.alt || undefined
            });
          }
        }
      }
    }

    // 2. <picture> <source>
    const sources = Array.from(document.querySelectorAll('picture source'));
    for (const source of sources) {
      const srcset = source.getAttribute('srcset');
      if (srcset) {
        const entries = srcset.split(',').map((s) => s.trim().split(' ')[0]);
        for (const src of entries) {
          if (src) {
            let fullSource = src;
            try {
              fullSource = new URL(src, window.location.href).href;
            } catch {}
            results.push({
              url: fullSource,
              type: 'picture_source'
            });
          }
        }
      }
    }

    // 3. CSS background-image
    const allElements = Array.from(document.querySelectorAll('*'));
    for (const el of allElements) {
      const style = window.getComputedStyle(el);
      const bg = style.backgroundImage;
      if (bg && bg !== 'none' && bg.includes('url(')) {
        const matches = bg.match(/url\(["']?([^"')]+)["']?\)/g);
        if (matches) {
          for (const match of matches) {
            const rawUrl = match.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
            if (rawUrl && !rawUrl.startsWith('data:')) {
              let fullBg = rawUrl;
              try {
                fullBg = new URL(rawUrl, window.location.href).href;
              } catch {}
              results.push({
                url: fullBg,
                type: 'background'
              });
            }
          }
        }
      }
    }

    // 4. Favicons & Apple Touch Icons
    const icons = Array.from(document.querySelectorAll('link[rel*="icon"], link[rel*="apple-touch-icon"]'));
    for (const icon of icons) {
      const href = icon.getAttribute('href');
      if (href) {
        let fullHref = href;
        try {
          fullHref = new URL(href, window.location.href).href;
        } catch {}
        results.push({
          url: fullHref,
          type: 'favicon'
        });
      }
    }

    // 5. OpenGraph & Twitter cards
    const ogImg = document.querySelector('meta[property="og:image"], meta[name="og:image"]');
    if (ogImg) {
      const content = ogImg.getAttribute('content');
      if (content) {
        let fullOg = content;
        try {
          fullOg = new URL(content, window.location.href).href;
        } catch {}
        results.push({
          url: fullOg,
          type: 'og_image'
        });
      }
    }

    const twitterImg = document.querySelector('meta[name="twitter:image"]');
    if (twitterImg) {
      const content = twitterImg.getAttribute('content');
      if (content) {
        let fullTw = content;
        try {
          fullTw = new URL(content, window.location.href).href;
        } catch {}
        results.push({
          url: fullTw,
          type: 'og_image'
        });
      }
    }

    // 6. Inline SVG images
    const svgs = Array.from(document.querySelectorAll('svg'));
    for (let i = 0; i < svgs.length; i++) {
      const svg = svgs[i];
      const box = svg.getBoundingClientRect();
      if (box.width > 10 && box.height > 10) {
        const svgString = new XMLSerializer().serializeToString(svg);
        if (svgString.length < 50000) {
          results.push({
            url: `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`,
            type: 'svg',
            width: Math.round(box.width),
            height: Math.round(box.height),
            format: 'svg'
          });
        }
      }
    }

    return results;
  });

  // Combine DOM images and intercepted images
  const allImages = [...domImages, ...interceptedImages];

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique: ImageAsset[] = [];

  for (const img of allImages) {
    if (!img.url || seen.has(img.url)) continue;
    seen.add(img.url);

    // Infer format if missing
    if (!img.format && !img.url.startsWith('data:')) {
      const cleanUrl = img.url.split('?')[0].toLowerCase();
      const extMatch = cleanUrl.match(/\.(png|jpe?g|webp|avif|gif|svg|ico)$/);
      if (extMatch) {
        img.format = extMatch[1].replace('jpeg', 'jpg');
      }
    }

    unique.push(img);
  }

  return unique;
}
