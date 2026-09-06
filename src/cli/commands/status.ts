import fs from 'fs';
import path from 'path';
import os from 'os';
import { isDaemonRunning, getDaemonPid } from '../daemon.js';
import pc from 'picocolors';

export function handleStatusCommand(): void {
  console.log(pc.bold('\n--- Content Parser Status ---\n'));

  // 1. Runtime
  console.log(pc.bold('Runtime:'));
  console.log(`  Node.js:  ${process.version}`);
  console.log(`  Platform: ${process.platform} (${process.arch})`);

  // 2. Browser
  const systemChrome = '/usr/bin/google-chrome-stable';
  const chromeFound = fs.existsSync(systemChrome);
  console.log(`  Chrome:   ${chromeFound ? pc.green(systemChrome) : pc.yellow('Playwright bundled chromium')}`);

  // 3. Daemon
  const running = isDaemonRunning();
  const pid = getDaemonPid();
  console.log(`  Daemon:   ${running ? pc.green(`RUNNING (PID: ${pid})`) : pc.dim('STOPPED')}`);

  // 4. Integrations
  console.log(pc.bold('\nAI Agent MCP Integrations:'));

  const checkFile = (name: string, filePath: string, pattern: string) => {
    let exists = false;
    let registered = false;

    if (fs.existsSync(filePath)) {
      exists = true;
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        registered = content.includes(pattern);
      } catch {}
    }

    const statusText = registered
      ? pc.green('CONFIGURED')
      : exists
      ? pc.yellow('AGENT FOUND (not configured)')
      : pc.dim('NOT DETECTED');

    console.log(`  - ${name.padEnd(16)}: ${statusText} ${pc.dim(`(${filePath})`)}`);
  };

  checkFile('Claude Code', path.join(os.homedir(), '.claude.json'), 'content-parser');
  checkFile('Cursor IDE', path.join(os.homedir(), '.cursor', 'mcp.json'), 'content-parser');
  checkFile('OpenAI Codex', path.join(os.homedir(), '.codex', 'config.toml'), 'content-parser');
  checkFile('Antigravity', path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json'), 'content-parser');
  checkFile('FrontHarness', path.join(os.homedir(), '.config', 'frontharness', 'config.yaml'), 'content-parser');

  console.log();
}
