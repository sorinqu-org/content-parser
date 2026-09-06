import { Page } from 'playwright';
import { FontAsset } from '../../types/index.js';

export async function extractFonts(page: Page, baseUrl: string, interceptedFonts: FontAsset[] = []): Promise<FontAsset[]> {
  const domFonts = await page.evaluate(() => {
    const results: Array<{
      family: string;
      format: 'woff2' | 'woff' | 'ttf' | 'otf' | 'eot' | 'unknown';
      url: string;
      weight?: string;
      style?: string;
      source: 'css_rule' | 'document_fonts' | 'link_tag';
    }> = [];

    // 1. Google Fonts / Typekit link tags
    const fontLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    for (const link of fontLinks) {
      const href = link.getAttribute('href');
      if (href && (href.includes('fonts.googleapis.com') || href.includes('use.typekit.net') || href.includes('fonts.bunny.net'))) {
        let fullHref = href;
        try {
          fullHref = new URL(href, window.location.href).href;
        } catch {}

        results.push({
          family: href.includes('family=') ? decodeURIComponent(href.split('family=')[1].split('&')[0]) : 'External Provider Font',
          format: 'unknown',
          url: fullHref,
          source: 'link_tag'
        });
      }
    }

    // 2. Iterate document.styleSheets for @font-face
    try {
      for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i];
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (!rules) continue;

          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j];
            if (rule.type === CSSRule.FONT_FACE_RULE || (rule as any).constructor?.name === 'CSSFontFaceRule') {
              const style = (rule as CSSFontFaceRule).style;
              const family = style.getPropertyValue('font-family').replace(/["']/g, '').trim();
              const src = style.getPropertyValue('src');
              const weight = style.getPropertyValue('font-weight');
              const fontStyle = style.getPropertyValue('font-style');

              if (src) {
                const urlMatches = src.match(/url\(["']?([^"')]+)["']?\)(\s+format\(["']?([^"')]+)["']?\))?/g);
                if (urlMatches) {
                  for (const match of urlMatches) {
                    const urlPart = match.match(/url\(["']?([^"')]+)["']?\)/);
                    const formatPart = match.match(/format\(["']?([^"')]+)["']?\)/);
                    if (urlPart && urlPart[1]) {
                      let fmt: 'woff2' | 'woff' | 'ttf' | 'otf' | 'eot' | 'unknown' = 'unknown';
                      const formatName = (formatPart ? formatPart[1] : '').toLowerCase();
                      if (formatName.includes('woff2')) fmt = 'woff2';
                      else if (formatName.includes('woff')) fmt = 'woff';
                      else if (formatName.includes('truetype') || formatName.includes('ttf')) fmt = 'ttf';
                      else if (formatName.includes('opentype') || formatName.includes('otf')) fmt = 'otf';
                      else if (formatName.includes('embedded-opentype') || formatName.includes('eot')) fmt = 'eot';
                      else {
                        const cleanUrl = urlPart[1].toLowerCase().split('?')[0];
                        if (cleanUrl.endsWith('.woff2')) fmt = 'woff2';
                        else if (cleanUrl.endsWith('.woff')) fmt = 'woff';
                        else if (cleanUrl.endsWith('.ttf')) fmt = 'ttf';
                        else if (cleanUrl.endsWith('.otf')) fmt = 'otf';
                        else if (cleanUrl.endsWith('.eot')) fmt = 'eot';
                      }

                      let fullFontUrl = urlPart[1];
                      try {
                        fullFontUrl = new URL(urlPart[1], window.location.href).href;
                      } catch {}

                      results.push({
                        family,
                        format: fmt,
                        url: fullFontUrl,
                        weight: weight || undefined,
                        style: fontStyle || undefined,
                        source: 'css_rule'
                      });
                    }
                  }
                }
              }
            }
          }
        } catch {}
      }
    } catch {}

    return results;
  });

  const all = [...domFonts, ...interceptedFonts];
  const seen = new Set<string>();
  const unique: FontAsset[] = [];

  for (const item of all) {
    if (!item.url || seen.has(item.url)) continue;
    seen.add(item.url);
    unique.push(item);
  }

  return unique;
}
