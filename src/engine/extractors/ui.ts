import { Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { UIComponent, UIComponentType } from '../../types/index.js';

export interface UIExtractOptions {
  components?: Array<UIComponentType | 'all'>;
  includeStyles?: boolean;
  includeScreenshot?: boolean;
  screenshotsDir?: string;
  maxPerType?: number;
}

export async function extractUIComponents(
  page: Page,
  options: UIExtractOptions = {}
): Promise<UIComponent[]> {
  const filterTypes = options.components || ['all'];
  const maxPerType = options.maxPerType ?? 5;
  const includeAll = filterTypes.includes('all');

  const rawComponents = await page.evaluate((maxCount) => {
    const results: Array<{
      id: string;
      name: string;
      type: UIComponentType;
      selector: string;
      tag: string;
      classes: string[];
      computedStyles: Record<string, string>;
      html: string;
      jsxSnippet?: string;
      screenshotPath?: string;
    }> = [];

    const selectors: Array<{ type: UIComponentType; sel: string; name: string }> = [
      { type: 'navbar', sel: 'header, nav, [role="navigation"], .navbar, .site-header', name: 'Navigation Header' },
      { type: 'hero', sel: '[class*="hero"], [data-testid*="hero"], main > section:first-of-type, .hero-section', name: 'Hero Section' },
      { type: 'card', sel: '[class*="card"], article, .card-item, .feature-card, [class*="feature-item"]', name: 'Card Element' },
      { type: 'button', sel: 'button, a[role="button"], .btn, .button, [class*="btn-"], [class*="button-"]', name: 'Button Component' },
      { type: 'form', sel: 'form, [role="search"], .search-form, .contact-form', name: 'Form Container' },
      { type: 'modal', sel: 'dialog, [role="dialog"], .modal, .popup, [aria-modal="true"]', name: 'Modal Dialog' },
      { type: 'footer', sel: 'footer, [role="contentinfo"], .site-footer, .footer', name: 'Footer Container' },
      { type: 'badge', sel: '[class*="badge"], [class*="chip"], [class*="tag"], .pill', name: 'Badge Tag' },
      { type: 'accordion', sel: 'details, [class*="accordion"], .collapsible', name: 'Accordion Component' }
    ];

    let counter = 0;
    const seenElements = new Set<Element>();

    for (const rule of selectors) {
      let typeCount = 0;
      const elements = Array.from(document.querySelectorAll(rule.sel));

      for (const el of elements) {
        if (typeCount >= maxCount) break;
        if (seenElements.has(el)) continue;

        // Verify visibility
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0 && rule.type !== 'modal') continue;

        seenElements.add(el);
        typeCount++;
        counter++;

        const computed = window.getComputedStyle(el);
        const classes = Array.from(el.classList);

        // Sanitize html length to avoid bloating context
        let outer = el.outerHTML;
        if (outer.length > 5000) {
          outer = outer.slice(0, 5000) + '<!-- [truncated] -->';
        }

        // Build a unique CSS selector for this element
        let uniqueSelector = el.tagName.toLowerCase();
        if (el.id) {
          uniqueSelector += `#${el.id}`;
        } else if (classes.length > 0) {
          uniqueSelector += `.${classes[0]}`;
        }

        results.push({
          id: `ui-${rule.type}-${counter}`,
          name: `${rule.name} #${typeCount}`,
          type: rule.type,
          selector: uniqueSelector,
          tag: el.tagName.toLowerCase(),
          classes,
          computedStyles: {
            display: computed.display,
            position: computed.position,
            fontFamily: computed.fontFamily,
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight,
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            borderRadius: computed.borderRadius,
            border: computed.border,
            padding: computed.padding,
            margin: computed.margin,
            boxShadow: computed.boxShadow
          },
          html: outer
        });
      }
    }

    return results;
  }, maxPerType);

  // Filter based on user-requested types
  const filtered = includeAll
    ? rawComponents
    : rawComponents.filter((c) => filterTypes.includes(c.type));

  // If screenshots requested, take element screenshots
  if (options.includeScreenshot && options.screenshotsDir) {
    if (!fs.existsSync(options.screenshotsDir)) {
      fs.mkdirSync(options.screenshotsDir, { recursive: true });
    }

    for (const comp of filtered) {
      try {
        const locator = page.locator(comp.selector).first();
        if (await locator.isVisible()) {
          const filePath = path.join(options.screenshotsDir, `${comp.id}.png`);
          await locator.screenshot({ path: filePath, timeout: 2000 });
          comp.screenshotPath = filePath;
        }
      } catch {}
    }
  }

  return filtered;
}
