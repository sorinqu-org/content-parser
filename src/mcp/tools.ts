import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const TOOLS: Tool[] = [
  {
    name: 'parse_website',
    description:
      'Parses any website or web application. Selectively extracts visual assets (images, svg), videos, 3D models (GLTF, GLB, USDZ, Gaussian Splats), typography fonts, semantic text, UI components, sitemaps, and screenshots. Specify targets to avoid bloating context.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The target URL to parse (e.g. https://example.com)'
        },
        targets: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['images', 'videos', 'models_3d', 'fonts', 'text', 'ui_components', 'structure', 'screenshots']
          },
          description:
            'Specific categories to extract. Leave empty to parse all targets. Selecting only needed targets saves tokens.'
        },
        downloadAssets: {
          type: 'boolean',
          description: 'If true, downloads all discovered assets to local filesystem outputDir and returns manifest path.'
        },
        outputDir: {
          type: 'string',
          description: 'Custom directory path for saving downloaded assets and screenshots.'
        },
        crawlPages: {
          type: 'boolean',
          description: 'If true, crawls internal links and captures multi-page screenshots/routes.'
        },
        crawlAllRoutes: {
          type: 'boolean',
          description: 'If true, discovers and crawls all endpoints discovered via sitemaps and links.'
        },
        maxPages: {
          type: 'number',
          description: 'Maximum number of pages to crawl (default: 50, set 0 for all discovered endpoints)'
        },
        maxDepth: {
          type: 'number',
          description: 'Maximum link traversal depth (default: 2)'
        },
        viewports: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['desktop', 'mobile', 'tablet', 'fullpage']
          },
          description: 'Screen sizes to capture when screenshots target is active.'
        },
        colorScheme: {
          type: 'string',
          enum: ['light', 'dark', 'both'],
          description: 'Color scheme mode for screenshots and CSS emulation.'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'extract_assets',
    description:
      'High-speed extractor for media files: images, SVGs, background graphics, HTML5/embedded videos, 3D models (GLTF/GLB/Splats/USDZ), and web fonts.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The target webpage URL'
        },
        assetTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['images', 'videos', 'models_3d', 'fonts']
          },
          description: 'Asset types to retrieve (defaults to all)'
        },
        download: {
          type: 'boolean',
          description: 'Whether to download assets to disk and return local paths'
        },
        outputDir: {
          type: 'string',
          description: 'Directory for downloaded assets'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'extract_ui_components',
    description:
      'Identifies UI components (headers, navbars, hero sections, cards, buttons, forms, modals, footers) with computed CSS styles, classes (Tailwind/BEM), and clean HTML markup.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The target webpage URL'
        },
        components: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['navbar', 'hero', 'card', 'button', 'form', 'modal', 'footer', 'badge', 'accordion', 'all']
          },
          description: 'Types of UI components to locate and extract'
        },
        includeScreenshot: {
          type: 'boolean',
          description: 'Capture dedicated PNG screenshots for each extracted component'
        },
        outputDir: {
          type: 'string',
          description: 'Directory to store component screenshots'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'extract_site_structure',
    description:
      'Crawls the website to map all internal endpoints, routes, sitemaps (parsing sitemap.xml, robots.txt), and external outbound links.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The root URL to explore'
        },
        maxDepth: {
          type: 'number',
          description: 'Link depth to crawl (default: 2)'
        },
        maxPages: {
          type: 'number',
          description: 'Maximum routes to discover (default: 50, set 0 for all endpoints)'
        },
        includeExternal: {
          type: 'boolean',
          description: 'Include external outbound URLs in output'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'extract_page_content',
    description:
      'Extracts clean semantic markdown copy, heading hierarchy (H1-H6), and metadata from a web page, stripping cookie banners and noise.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Target webpage URL'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'capture_screenshots',
    description:
      'Captures full-page, desktop (1920x1080), mobile (375x812), or tablet screenshots of any webpage or list of page routes.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Target URL'
        },
        viewports: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['desktop', 'mobile', 'tablet', 'fullpage']
          },
          description: 'Viewports to render (default: desktop, mobile, fullpage)'
        },
        colorScheme: {
          type: 'string',
          enum: ['light', 'dark', 'both'],
          description: 'Emulate light, dark, or both color schemes'
        },
        outputDir: {
          type: 'string',
          description: 'Directory to store screenshot files'
        },
        routes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional additional routes on the same domain to screenshot'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'inspect_element',
    description:
      'Inspects a specific CSS selector on a webpage to extract computed styles, DOM hierarchy, and element screenshot.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Target webpage URL'
        },
        selector: {
          type: 'string',
          description: 'CSS selector of the element to inspect (e.g. "nav.top-bar", "#main-form", ".pricing-table")'
        },
        includeScreenshot: {
          type: 'boolean',
          description: 'Capture screenshot of the inspected element'
        },
        outputDir: {
          type: 'string',
          description: 'Directory to store element screenshot'
        }
      },
      required: ['url', 'selector']
    }
  }
];
