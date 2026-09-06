# Technical Architecture

`content-parser` couples a headless browser automation engine with the Model Context Protocol (MCP) server specification. This document outlines the internal execution pipeline, data flow, and heuristics.

## Execution Pipeline

1. **CLI / MCP Dispatch**: Commands enter through `src/cli/index.ts` or the JSON-RPC handler in `src/mcp/server.ts`.
2. **Session Initialization**: `src/engine/browser.ts` launches Chromium through Playwright. If `/usr/bin/google-chrome-stable` exists on Linux, the engine binds to it to save memory.
3. **Network Interception**: Before page navigation, `src/engine/interceptor.ts` attaches to the `response` event stream. It analyzes response headers, MIME types, and URI extensions in real time.
4. **Hydration & Settle**: The page navigates to the target URL with `waitUntil: 'domcontentloaded'`. A brief settle period allows asynchronous scripts (WebGL canvas scene setup, dynamic font loading, CSS-in-JS style injection) to evaluate.
5. **Target Extractors**: Only the extractors matching requested `targets` run:
   - Images and SVGs (`src/engine/extractors/images.ts`)
   - Video and audio streams (`src/engine/extractors/videos.ts`)
   - 3D models and Gaussian splats (`src/engine/extractors/models3d.ts`)
   - Typography and web fonts (`src/engine/extractors/fonts.ts`)
   - Link tree and sitemap discovery (`src/engine/extractors/structure.ts`)
   - Semantic text and markdown conversion (`src/engine/extractors/text.ts`)
   - UI component detection and computed styles (`src/engine/extractors/ui.ts`)
6. **Visual Capture**: If screenshots are requested, `src/engine/screenshots.ts` adjusts viewports, scrolls to trigger lazy loading, and captures PNGs.
7. **Storage Pipeline**: If `downloadAssets` is true, `src/engine/storage.ts` downloads remote assets, sanitizes filenames, saves raw files into dedicated folders (`images/`, `videos/`, `models3d/`, `fonts/`), and writes a structured `manifest.json`.
8. **Teardown**: The browser context closes, freeing memory and CPU cycles.

## 3D Asset Interception

Many modern 3D experiences (Three.js, Spline, Babylon.js) do not place static links in the DOM. Instead, JavaScript fetches binary models during runtime.

`content-parser` captures these models through two parallel mechanisms:

1. **DOM Scans**: Inspects `<model-viewer>` tags for `src` and `ios-src`, plus regex matching inside inline `<script>` tags for common loader calls (`.glb`, `.gltf`, `.splat`, `.usdz`).
2. **Network Interceptor**: Detects HTTP responses carrying model MIME types (`model/gltf-binary`, `model/gltf+json`, `model/vnd.usdz+zip`) or file extensions (`.glb`, `.gltf`, `.obj`, `.mtl`, `.fbx`, `.usdz`, `.ply`, `.splat`, `.stl`).

## UI Component Heuristics

The UI extractor scans DOM elements against structural archetypes:

- **Navbar**: Elements matching `header, nav, [role="navigation"], .navbar`.
- **Hero**: Elements matching `[class*="hero"], main > section:first-of-type, .hero-section`.
- **Card**: Elements matching `[class*="card"], article, .feature-card`.
- **Button**: Interactive elements matching `button, a[role="button"], .btn`.
- **Form**: Input containers matching `form, [role="search"]`.
- **Modal**: Overlays matching `dialog, [role="dialog"], .modal`.
- **Footer**: Elements matching `footer, [role="contentinfo"]`.

For each match, the engine queries `window.getComputedStyle(el)` to pull exact hex/rgb colors, font families, font sizes, border radii, padding, margin, and box shadows.

## Integrator Modules

The `src/cli/integrators/` package updates agent configurations:

- **Claude Code**: Updates `~/.claude.json` under the `mcpServers` key or invokes `claude mcp add`.
- **Cursor IDE**: Updates `~/.cursor/mcp.json`.
- **OpenAI Codex**: Updates `~/.codex/config.toml` using `smol-toml`.
- **Google Antigravity**: Updates `~/.gemini/antigravity/mcp_config.json` and `~/.gemini/config/mcp_config.json`.
- **Hermes Agent**: Invokes `hermes mcp add content-parser --command content-parser --args start --stdio` with auto-confirmation, or patches `~/.hermes/config.yaml` under `mcp_servers:` using `yaml`.
