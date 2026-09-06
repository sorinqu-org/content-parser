#!/usr/bin/env fish

# Content Parser Global Installer for Fish Shell
# Project: https://github.com/sorinqu-org/content-parser

set -l SCRIPT_DIR (cd (dirname (status filename))/..; and pwd)
cd $SCRIPT_DIR

echo "=== Content Parser Global Installer (Fish Shell) ==="

# 1. Verify Node.js
if not type -q node
    echo "Error: Node.js is not installed. Please install Node.js >= 18." >&2
    exit 1
end

set -l NODE_VER (node -v | string trim -c 'v' | string split '.')[1]
if test $NODE_VER -lt 18
    echo "Error: Node.js version 18+ required (detected v$NODE_VER)." >&2
    exit 1
end

echo "[+] Detected Node.js (node -v)"

# 2. Package manager detection
set -l PKG_MGR "npm"
if type -q pnpm
    set PKG_MGR "pnpm"
end

echo "[+] Using package manager: $PKG_MGR"

# 3. Install dependencies and compile
echo "[*] Installing project dependencies..."
$PKG_MGR install

echo "[*] Building TypeScript binaries..."
$PKG_MGR run build

# 4. Install Playwright Chromium browser
echo "[*] Verifying Playwright browser..."
if not type -q google-chrome-stable
    npx playwright install chromium
end

# 5. Global CLI link
set -l BIN_SRC "$SCRIPT_DIR/bin/content-parser.js"
chmod +x "$BIN_SRC"

set -l INSTALL_DIR "$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"

ln -sf "$BIN_SRC" "$INSTALL_DIR/content-parser"
ln -sf "$BIN_SRC" "$INSTALL_DIR/cp-mcp"

# Ensure ~/.local/bin is in Fish path
if not contains "$INSTALL_DIR" $PATH
    echo "[*] Adding $INSTALL_DIR to Fish universal PATH..."
    fish_add_path "$INSTALL_DIR"
end

echo
echo "=== Installation Successful ==="
echo "Global commands registered in Fish:"
echo "  - content-parser"
echo "  - cp-mcp"
echo
echo "Usage:"
echo "  content-parser start [--stdio]      # Start MCP server"
echo "  content-parser stop                 # Stop background daemon"
echo "  content-parser add [agent]          # Add to claude, codex, cursor, antigravity, hermes, all"
echo "  content-parser parse <url>          # Extract assets directly via CLI"
echo "  content-parser status               # Check status and integrations"
