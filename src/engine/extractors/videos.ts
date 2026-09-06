import { Page } from 'playwright';
import { VideoAsset } from '../../types/index.js';

export async function extractVideos(page: Page, baseUrl: string, interceptedVideos: VideoAsset[] = []): Promise<VideoAsset[]> {
  const domVideos = await page.evaluate((base) => {
    const results: Array<{
      url: string;
      type: 'video' | 'audio' | 'embed_youtube' | 'embed_vimeo' | 'embed_other';
      poster?: string;
      format?: string;
      title?: string;
    }> = [];

    const resolveUrl = (rel: string): string => {
      try {
        return new URL(rel, base).href;
      } catch {
        return rel;
      }
    };

    // 1. <video> elements
    const videos = Array.from(document.querySelectorAll('video'));
    for (const v of videos) {
      const poster = v.poster ? resolveUrl(v.poster) : undefined;
      const directSrc = v.currentSrc || v.src || v.getAttribute('data-src');
      if (directSrc) {
        results.push({
          url: resolveUrl(directSrc),
          type: 'video',
          poster
        });
      }

      const sources = Array.from(v.querySelectorAll('source'));
      for (const s of sources) {
        const src = s.src || s.getAttribute('data-src');
        if (src) {
          results.push({
            url: resolveUrl(src),
            type: 'video',
            poster,
            format: s.type || undefined
          });
        }
      }
    }

    // 2. <audio> elements
    const audios = Array.from(document.querySelectorAll('audio'));
    for (const a of audios) {
      const directSrc = a.currentSrc || a.src;
      if (directSrc) {
        results.push({
          url: resolveUrl(directSrc),
          type: 'audio'
        });
      }
      const sources = Array.from(a.querySelectorAll('source'));
      for (const s of sources) {
        if (s.src) {
          results.push({
            url: resolveUrl(s.src),
            type: 'audio',
            format: s.type || undefined
          });
        }
      }
    }

    // 3. <iframe> video embeds
    const iframes = Array.from(document.querySelectorAll('iframe'));
    for (const iframe of iframes) {
      const src = iframe.src || iframe.getAttribute('data-src');
      if (!src) continue;

      const fullUrl = resolveUrl(src);
      const title = iframe.title || undefined;

      if (fullUrl.includes('youtube.com') || fullUrl.includes('youtu.be')) {
        results.push({
          url: fullUrl,
          type: 'embed_youtube',
          title
        });
      } else if (fullUrl.includes('vimeo.com')) {
        results.push({
          url: fullUrl,
          type: 'embed_vimeo',
          title
        });
      } else if (fullUrl.includes('wistia.net') || fullUrl.includes('loom.com') || fullUrl.includes('dailymotion.com')) {
        results.push({
          url: fullUrl,
          type: 'embed_other',
          title
        });
      }
    }

    return results;
  }, baseUrl);

  const allVideos = [...domVideos, ...interceptedVideos];
  const seen = new Set<string>();
  const unique: VideoAsset[] = [];

  for (const item of allVideos) {
    if (!item.url || seen.has(item.url)) continue;
    seen.add(item.url);

    if (!item.format && !item.type.startsWith('embed')) {
      const clean = item.url.split('?')[0].toLowerCase();
      const match = clean.match(/\.(mp4|webm|ogv|mov|m3u8|mp3|wav|ogg)$/);
      if (match) {
        item.format = match[1];
      }
    }

    unique.push(item);
  }

  return unique;
}
