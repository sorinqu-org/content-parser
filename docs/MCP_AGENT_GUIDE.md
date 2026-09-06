# MCP Agent Integration Guide

This guide describes how AI agents interface with `content-parser` through the Model Context Protocol.

## Protocol Mechanics

`content-parser` implements the standard MCP JSON-RPC protocol over stdio. Agents communicate by sending standard tool call requests and receiving typed JSON payloads.

All diagnostic messages and process logs stream exclusively to `stderr`. `stdout` remains dedicated to JSON-RPC traffic.

## Available MCP Tools

### 1. `parse_website`

The primary multi-target parser.

#### Parameters

- `url` (string, required): Full target URL with protocol (`https://...`).
- `targets` (array of strings, optional): Subset of targets to extract. Valid values: `images`, `videos`, `models_3d`, `fonts`, `text`, `ui_components`, `structure`, `screenshots`.
- `downloadAssets` (boolean, optional): Saves media files to the local file system.
- `outputDir` (string, optional): Directory path for downloads.
- `crawlPages` (boolean, optional): Follows internal links.
- `maxPages` (number, optional): Page ceiling during crawl (default: 5).
- `maxDepth` (number, optional): Link depth limit (default: 2).
- `viewports` (array of strings, optional): `desktop`, `mobile`, `tablet`, `fullpage`.
- `colorScheme` (string, optional): `light`, `dark`, `both`.

#### Example Tool Call

```json
{
  "name": "parse_website",
  "arguments": {
    "url": "https://stripe.com",
    "targets": ["ui_components", "fonts", "screenshots"],
    "colorScheme": "light",
    "viewports": ["desktop"]
  }
}
```

---

### 2. `extract_assets`

Focused extractor for media files. Ideal when reverse-engineering brand assets, icons, backgrounds, 3D models, or web typography.

#### Parameters

- `url` (string, required)
- `assetTypes` (array of strings, optional): `images`, `videos`, `models_3d`, `fonts`.
- `download` (boolean, optional): When true, downloads files to disk and returns paths in a manifest.
- `outputDir` (string, optional)

#### Example Tool Call

```json
{
  "name": "extract_assets",
  "arguments": {
    "url": "https://threejs.org",
    "assetTypes": ["models_3d", "fonts"],
    "download": true,
    "outputDir": "./assets/threejs"
  }
}
```

---

### 3. `extract_ui_components`

Scans the page DOM for component archetypes: navigation bars, hero sections, cards, buttons, forms, modals, footers, badges, and accordions.

#### Parameters

- `url` (string, required)
- `components` (array of strings, optional): `navbar`, `hero`, `card`, `button`, `form`, `modal`, `footer`, `badge`, `accordion`, `all`.
- `includeScreenshot` (boolean, optional): Takes element-level screenshots.
- `outputDir` (string, optional)

#### Return Structure

Returns a list of components with computed styles and HTML:

```json
{
  "id": "ui-button-1",
  "name": "Button Component #1",
  "type": "button",
  "selector": "button.btn-primary",
  "tag": "button",
  "classes": ["btn", "btn-primary", "rounded-md", "shadow-sm"],
  "computedStyles": {
    "backgroundColor": "rgb(99, 102, 241)",
    "color": "rgb(255, 255, 255)",
    "fontFamily": "Inter, sans-serif",
    "fontSize": "14px",
    "fontWeight": "600",
    "borderRadius": "6px",
    "padding": "8px 16px"
  },
  "html": "<button class=\"btn btn-primary rounded-md shadow-sm\">Get Started</button>"
}
```

---

### 4. `extract_site_structure`

Maps routing paths, internal links, and sitemaps (`sitemap.xml`, `robots.txt`).

#### Parameters

- `url` (string, required)
- `maxDepth` (number, optional, default: 2)
- `maxPages` (number, optional, default: 15)
- `includeExternal` (boolean, optional)

---

### 5. `extract_page_content`

Extracts clean Markdown copy, H1-H6 heading outlines, and document metadata. Strips banners, ads, scripts, and tracking code.

#### Parameters

- `url` (string, required)

---

### 6. `capture_screenshots`

Generates clean viewport and full-page PNG captures for multi-device responsive audits.

#### Parameters

- `url` (string, required)
- `viewports` (array: `desktop`, `mobile`, `tablet`, `fullpage`)
- `colorScheme` (`light`, `dark`, `both`)
- `routes` (array of strings, optional)
- `outputDir` (string, optional)

---

### 7. `inspect_element`

Performs targeted deep inspection of any CSS selector on the live page.

#### Parameters

- `url` (string, required)
- `selector` (string, required): e.g. `header.main-nav`, `#pricing-table`, `div[data-testid="hero"]`
- `includeScreenshot` (boolean, optional)
- `outputDir` (string, optional)

---

## Token Economy Rules for Agents

1. **Target Filtering**: Avoid requesting all targets when you only need a subset. If your task requires brand typography, pass `targets: ["fonts"]`. If you need copy, pass `targets: ["text"]`.
2. **Download Flag for Media**: Do not embed massive image data in the prompt response. Pass `downloadAssets: true` to persist assets to disk. The server returns file paths instead of raw base64 buffers.
3. **Component Scoping**: When auditing a design system, request specific components via `extract_ui_components` with `components: ["navbar", "hero", "button"]` rather than parsing the entire page tree.
