@echo off
REM Content Parser Global Installer for Windows
REM Project: https://github.com/sorinqu-org/content-parser

echo === Content Parser Global Installer (Windows) ===

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH. Please install Node.js 18+.
    exit /b 1
)

echo [+] Found Node.js
node -v

where pnpm >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PKG_MGR=pnpm
) else (
    set PKG_MGR=npm
)

echo [+] Using %PKG_MGR%

echo [*] Installing dependencies...
call %PKG_MGR% install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Dependency installation failed.
    exit /b 1
)

echo [*] Building binaries...
call %PKG_MGR% run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Build failed.
    exit /b 1
)

echo [*] Installing Playwright Chromium...
call npx playwright install chromium

echo [*] Linking global command...
call npm link

echo.
echo === Installation Complete ===
echo Run 'content-parser --help' to get started.
echo Commands:
echo   content-parser start [--stdio]
echo   content-parser stop
echo   content-parser add [agent] (claude, cursor, codex, antigravity, hermes, all)
echo   content-parser parse ^<url^>
echo   content-parser status
pause
