import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import * as toml from 'smol-toml';

export function addCodexMcp(): { success: boolean; message: string } {
  // Method 1: Try using codex CLI
  try {
    execSync('codex mcp add content-parser -- content-parser start --stdio', {
      stdio: 'pipe',
      timeout: 5000
    });
    return { success: true, message: 'Added content-parser to Codex via "codex mcp add"' };
  } catch {
    // Method 2: Manually update ~/.codex/config.toml
    try {
      const codexDir = path.join(os.homedir(), '.codex');
      const tomlPath = path.join(codexDir, 'config.toml');

      if (!fs.existsSync(codexDir)) {
        fs.mkdirSync(codexDir, { recursive: true });
      }

      let parsed: any = {};
      if (fs.existsSync(tomlPath)) {
        try {
          const content = fs.readFileSync(tomlPath, 'utf8');
          parsed = toml.parse(content);
        } catch {
          parsed = {};
        }
      }

      if (!parsed.mcp_servers) {
        parsed.mcp_servers = {};
      }

      parsed.mcp_servers['content-parser'] = {
        command: 'content-parser',
        args: ['start', '--stdio']
      };

      const newToml = toml.stringify(parsed);
      fs.writeFileSync(tomlPath, newToml, 'utf8');
      return { success: true, message: `Added content-parser to ${tomlPath}` };
    } catch (err: any) {
      return { success: false, message: `Failed to configure Codex: ${err.message}` };
    }
  }
}
