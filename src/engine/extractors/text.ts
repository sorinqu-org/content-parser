import { Page } from 'playwright';
import TurndownService from 'turndown';
import { TextContent, HeadingItem } from '../../types/index.js';

export async function extractText(page: Page): Promise<TextContent> {
  const metadata = await page.evaluate(() => {
    const title = document.title || '';

    const descEl = document.querySelector('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]');
    const metaDescription = descEl ? descEl.getAttribute('content') || undefined : undefined;

    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const canonical = canonicalEl ? canonicalEl.getAttribute('href') || undefined : undefined;

    const lang = document.documentElement.lang || undefined;
    const authorEl = document.querySelector('meta[name="author"], meta[property="article:author"]');
    const author = authorEl ? authorEl.getAttribute('content') || undefined : undefined;

    // Extract headings
    const headingElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const headings: HeadingItem[] = headingElements.map((h) => {
      const level = parseInt(h.tagName.substring(1), 10);
      return {
        level,
        text: (h.textContent || '').trim()
      };
    }).filter((h) => h.text.length > 0);

    // Clone body to strip clutter before markdown conversion
    const clone = document.body.cloneNode(true) as HTMLElement;
    const clutterSelectors = [
      'script',
      'style',
      'noscript',
      'iframe',
      'svg',
      'canvas',
      '[aria-hidden="true"]',
      '#cookie-banner',
      '.cookie-consent',
      '.cookie-banner'
    ];
    for (const sel of clutterSelectors) {
      clone.querySelectorAll(sel).forEach((el) => el.remove());
    }

    const cleanHtml = clone.innerHTML;
    const cleanText = (clone.textContent || '').replace(/\s+/g, ' ').trim();

    return {
      title,
      metaDescription,
      canonical,
      language: lang,
      author,
      headings,
      cleanHtml,
      cleanText
    };
  });

  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    hr: '---'
  });

  // Remove images and raw styles from markdown for concise content reading
  turndown.addRule('removeExtra', {
    filter: ['style', 'button', 'input', 'select', 'textarea'],
    replacement: () => ''
  });

  let markdown = '';
  try {
    markdown = turndown.turndown(metadata.cleanHtml);
  } catch {
    markdown = metadata.cleanText;
  }

  const wordCount = metadata.cleanText.split(/\s+/).filter(Boolean).length;

  return {
    title: metadata.title,
    metaDescription: metadata.metaDescription,
    canonical: metadata.canonical,
    language: metadata.language,
    author: metadata.author,
    headings: metadata.headings,
    markdown,
    cleanText: metadata.cleanText,
    wordCount
  };
}
