# content-parser

Website and asset extraction engine exposed as a Model Context Protocol (MCP) server and standalone CLI utility. Built for AI agents including Claude Code, OpenAI Codex, Cursor IDE, Google Antigravity, and Hermes Agent.

Extracts visual assets, media streams, 3D models, typography, DOM structure, semantic text, UI components, and multi-page screenshots.

## Installation

### Linux / macOS (Bash / Zsh)

Run the automated installer:

```bash
git clone https://github.com/sorinqu-org/content-parser.git
cd content-parser
./scripts/install.sh
```

The installer compiles the TypeScript source, verifies Playwright browser binaries, and links `content-parser` and `cp-mcp` into `~/.local/bin`.

### Fish Shell

```fish
cd content-parser
./scripts/install.fish
```

### Windows

Run `scripts\install.bat` from an Administrator command prompt or PowerShell session:

```cmd
cd content-parser
scripts\install.bat
```

## CLI Usage

### 1. Configure AI Agents

Use the `add` command to register the MCP server into your target AI environment:

```bash
# Interactive selection menu
content-parser add

# Target specific agents
content-parser add claude        # Configures Claude Code (~/.claude.json)
content-parser add cursor        # Configures Cursor IDE (~/.cursor/mcp.json)
content-parser add codex         # Configures OpenAI Codex (~/.codex/config.toml)
content-parser add antigravity   # Configures Google Antigravity (~/.gemini/antigravity/mcp_config.json)
content-parser add hermes        # Configures Hermes Agent (~/.hermes/config.yaml)
content-parser add all           # Injects into all detected agents
```

### 2. Manage MCP Server

```bash
# Run over stdio (used directly by agent process spawners)
content-parser start --stdio

# Run in background daemon mode
content-parser start --daemon

# Stop background daemon
content-parser stop

# Inspect environment and active agent integrations
content-parser status
```

### 3. Direct Website Parsing

Run extractions directly from your shell without an active agent session:

```bash
# Parse all assets, text, components, and screenshots
content-parser parse https://example.com --download --out ./output

# Extract specific targets to save time and disk space
content-parser parse https://example.com -t images,models_3d,fonts

# Crawl internal links up to depth 2 with dark mode screenshots
content-parser parse https://example.com -c --max-pages 10 --color-scheme dark
```

## Supported Asset Categories

| Category | Targets & Formats | Extraction Mechanism |
|---|---|---|
| Images | PNG, JPG, WebP, AVIF, SVG, CSS backgrounds, Favicons, OpenGraph | DOM tree scan, CSS computed background parsing, XMLSerializer for SVG |
| Video & Audio | MP4, WebM, OGV, M3U8, MP3, WAV, YouTube/Vimeo/Loom embeds | `<video>`, `<audio>`, `<source>`, iframe URL normalization |
| 3D Models | GLTF, GLB, OBJ, MTL, FBX, USDZ, PLY, Splat, STL | `<model-viewer>`, script scans, runtime network request interception |
| Typography | WOFF2, WOFF, TTF, OTF, Google Fonts, Adobe Typekit | CSS `@font-face` rules, stylesheet imports, network interception |
| UI Components | Navbars, Heroes, Cards, Buttons, Forms, Modals, Footers | Heuristic DOM matcher, computed style extraction, isolated screenshot |
| Structure | Routes, HTTP status, internal/external links, sitemap.xml | Crawler queue, `/sitemap.xml`, `robots.txt` Sitemap directives |
| Content | Page title, meta descriptions, H1-H6 hierarchy, clean Markdown | Main content isolation, clutter cleanup, Turndown parser |
| Screenshots | Desktop (1920x1080), Tablet, Mobile (375x812), Full-page | Playwright viewport manipulation, scroll trigger, media emulation |

## Agent Configuration Reference

If you prefer manual configuration, add the server definitions below to your agent configuration files.

### Claude Code (`~/.claude.json`)

```json
{
  "mcpServers": {
    "content-parser": {
      "command": "content-parser",
      "args": ["start", "--stdio"]
    }
  }
}
```

### Cursor IDE (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "content-parser": {
      "command": "content-parser",
      "args": ["start", "--stdio"]
    }
  }
}
```

### OpenAI Codex (`~/.codex/config.toml`)

```toml
[mcp_servers.content-parser]
command = "content-parser"
args = ["start", "--stdio"]
```

### Google Antigravity (`~/.gemini/antigravity/mcp_config.json`)

```json
{
  "mcpServers": {
    "content-parser": {
      "command": "content-parser",
      "args": ["start", "--stdio"]
    }
  }
}
```

### Hermes Agent (`~/.hermes/config.yaml`)

```bash
hermes mcp add content-parser --command content-parser --args start --stdio
```

Or manually in `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  content-parser:
    command: content-parser
    args:
      - start
      - --stdio
```

## Development and Testing

```bash
pnpm install
pnpm run build
pnpm test
pnpm run typecheck
```

## License

Apache-2.0
