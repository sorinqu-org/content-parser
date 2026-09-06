#!/usr/bin/env bash
set -e

# Content Parser Global Installer for Bash and Zsh
# Project: https://github.com/sorinqu-org/content-parser

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "=== Content Parser Global Installer (Bash / Zsh) ==="

# 1. Verify Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed. Please install Node.js >= 18." >&2
  exit 1
fi

NODE_VERSION=$(node -v | tr -d 'v' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "Error: Node.js version 18+ required (detected v$NODE_VERSION)." >&2
  exit 1
fi

echo "[+] Detected Node.js $(node -v)"

# 2. Package manager detection
if command -v pnpm >/dev/null 2>&1; then
  PKG_MGR="pnpm"
elif command -v npm >/dev/null 2>&1; then
  PKG_MGR="npm"
else
  echo "Error: Neither pnpm nor npm found." >&2
  exit 1
fi

echo "[+] Using package manager: $PKG_MGR"

# 3. Install dependencies and compile
echo "[*] Installing project dependencies..."
$PKG_MGR install

echo "[*] Building TypeScript binaries..."
$PKG_MGR run build

# 4. Install Playwright Chromium browser
echo "[*] Verifying Playwright browser..."
if ! command -v google-chrome-stable >/dev/null 2>&1; then
  npx playwright install chromium
fi

# 5. Global CLI link
BIN_SRC="$SCRIPT_DIR/bin/content-parser.js"
chmod +x "$BIN_SRC"

INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"

ln -sf "$BIN_SRC" "$INSTALL_DIR/content-parser"
ln -sf "$BIN_SRC" "$INSTALL_DIR/cp-mcp"

# Check if ~/.local/bin is in PATH
CURRENT_PATH=":$PATH:"
if [ "${CURRENT_PATH#*:$INSTALL_DIR:}" = "$CURRENT_PATH" ]; then
  echo "[*] Adding $INSTALL_DIR to PATH in shell rc..."
  if [ -n "$ZSH_VERSION" ] || [ -f "$HOME/.zshrc" ]; then
    grep -q 'export PATH="$HOME/.local/bin:$PATH"' "$HOME/.zshrc" 2>/dev/null || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
  fi
  if [ -f "$HOME/.bashrc" ]; then
    grep -q 'export PATH="$HOME/.local/bin:$PATH"' "$HOME/.bashrc" 2>/dev/null || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
  fi
  export PATH="$INSTALL_DIR:$PATH"
fi

echo
echo "=== Installation Successful ==="
echo "Global commands registered:"
echo "  - content-parser"
echo "  - cp-mcp"
echo
echo "Usage:"
echo "  content-parser start [--stdio]      # Start MCP server"
echo "  content-parser stop                 # Stop background daemon"
echo "  content-parser add [agent]          # Add to claude, codex, cursor, antigravity, harmess, all"
echo "  content-parser parse <url>          # Extract assets directly via CLI"
echo "  content-parser status               # Check status and integrations"
