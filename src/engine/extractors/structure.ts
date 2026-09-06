import { Page } from 'playwright';
import { StructureResult, PageRoute } from '../../types/index.js';

export interface StructureOptions {
  maxDepth?: number;
  maxPages?: number;
  includeExternal?: boolean;
}

export async function extractStructure(
  page: Page,
  rootUrl: string,
  options: StructureOptions = {}
): Promise<StructureResult> {
  const maxDepth = options.maxDepth ?? 2;
  const maxPages = options.maxPages ?? 15;

  let rootOrigin = '';
  try {
    const parsed = new URL(rootUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      rootOrigin = parsed.origin;
    }
  } catch {}

  // 1. Discover sitemaps via robots.txt and standard paths (HTTP only)
  const sitemaps: string[] = [];
  if (rootOrigin) {
    const sitemapCandidates = [
      new URL('/sitemap.xml', rootOrigin).href,
      new URL('/sitemap_index.xml', rootOrigin).href,
      new URL('/sitemap/sitemap.xml', rootOrigin).href
    ];

    for (const smUrl of sitemapCandidates) {
      try {
        const resp = await page.request.get(smUrl, { timeout: 5000 });
        if (resp.ok()) {
          sitemaps.push(smUrl);
        }
      } catch {}
    }

    // Check robots.txt for Sitemap directives
    try {
      const robotsUrl = new URL('/robots.txt', rootOrigin).href;
      const robotsResp = await page.request.get(robotsUrl, { timeout: 5000 });
      if (robotsResp.ok()) {
        const text = await robotsResp.text();
        const matches = text.match(/Sitemap:\s*(https?:\/\/[^\s]+)/gi);
        if (matches) {
          for (const m of matches) {
            const s = m.replace(/^Sitemap:\s*/i, '').trim();
            if (s && !sitemaps.includes(s)) {
              sitemaps.push(s);
            }
          }
        }
      }
    } catch {}
  }

  // Parse discovered sitemaps to extract all <loc> URLs
  const sitemapUrls: string[] = [];
  for (const smUrl of sitemaps) {
    try {
      const resp = await page.request.get(smUrl, { timeout: 8000 });
      if (resp.ok()) {
        const xml = await resp.text();
        const locMatches = xml.match(/<loc>([^<]+)<\/loc>/gi);
        if (locMatches) {
          for (const lm of locMatches) {
            const u = lm.replace(/<\/?loc>/gi, '').trim();
            if (u && !sitemapUrls.includes(u)) {
              sitemapUrls.push(u);
            }
          }
        }
      }
    } catch {}
  }

  // 2. Extract internal and external links from current page
  const pageLinks = await page.evaluate((origin) => {
    const internal: string[] = [];
    const external: string[] = [];

    const anchors = Array.from(document.querySelectorAll('a[href]'));
    for (const a of anchors) {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue;
      }

      try {
        const resolved = new URL(href, window.location.href);
        // Normalize: remove hash and trailing slash if root
        resolved.hash = '';
        const urlStr = resolved.href;

        if (resolved.origin === origin) {
          if (!internal.includes(urlStr)) {
            internal.push(urlStr);
          }
        } else {
          if (!external.includes(urlStr)) {
            external.push(urlStr);
          }
        }
      } catch {}
    }

    return { internal, external };
  }, rootOrigin);

  // 3. Multi-page crawler queue
  const routes: PageRoute[] = [
    {
      url: rootUrl,
      title: await page.title().catch(() => ''),
      depth: 0,
      status: 200
    }
  ];

  const visited = new Set<string>([rootUrl]);
  const queue: Array<{ url: string; depth: number }> = [];

  // Enqueue sitemap URLs first
  for (const smUrl of sitemapUrls) {
    try {
      const parsed = new URL(smUrl);
      if (parsed.origin === rootOrigin && !visited.has(smUrl)) {
        queue.push({ url: smUrl, depth: 1 });
      }
    } catch {}
  }

  // Enqueue internal links from page
  for (const intUrl of pageLinks.internal) {
    if (!visited.has(intUrl) && !queue.some((q) => q.url === intUrl)) {
      queue.push({ url: intUrl, depth: 1 });
    }
  }

  const effectiveMaxPages = options.maxPages !== undefined ? options.maxPages : 50;

  while (queue.length > 0 && (effectiveMaxPages === 0 || routes.length < effectiveMaxPages)) {
    const current = queue.shift()!;
    if (visited.has(current.url)) continue;
    visited.add(current.url);

    if (current.depth > maxDepth) continue;

    try {
      const response = await page.request.get(current.url, { timeout: 6000 });
      const status = response.status();
      let title = '';
      let metaDesc = '';

      if (response.ok()) {
        const html = await response.text();
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        if (titleMatch) title = titleMatch[1].trim();

        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
        if (descMatch) metaDesc = descMatch[1].trim();
      }

      routes.push({
        url: current.url,
        title: title || undefined,
        depth: current.depth,
        status,
        metaDescription: metaDesc || undefined
      });
    } catch {
      routes.push({
        url: current.url,
        depth: current.depth,
        status: 0
      });
    }
  }

  // Collect all distinct discovered endpoints
  const allEndpoints = Array.from(
    new Set([
      rootUrl,
      ...sitemapUrls.filter((u) => {
        try {
          return new URL(u).origin === rootOrigin;
        } catch {
          return false;
        }
      }),
      ...pageLinks.internal,
      ...routes.map((r) => r.url)
    ])
  );

  return {
    rootUrl,
    sitemaps,
    sitemapUrls,
    endpoints: allEndpoints,
    routes,
    internalLinksCount: pageLinks.internal.length,
    externalLinksCount: pageLinks.external.length,
    externalLinks: options.includeExternal ? pageLinks.external : pageLinks.external.slice(0, 20)
  };
}
