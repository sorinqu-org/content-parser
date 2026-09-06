import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

export function addClaudeCodeMcp(): { success: boolean; message: string } {
  // Method 1: Try using claude CLI directly if available
  try {
    execSync('claude mcp add content-parser -- content-parser start --stdio', {
      stdio: 'pipe',
      timeout: 5000
    });
    return { success: true, message: 'Added content-parser to Claude Code via "claude mcp add"' };
  } catch {
    // Method 2: Manually patch ~/.claude.json
    try {
      const claudeJsonPath = path.join(os.homedir(), '.claude.json');
      let data: any = {};
      if (fs.existsSync(claudeJsonPath)) {
        try {
          data = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf8'));
        } catch {
          data = {};
        }
      }

      if (!data.mcpServers) {
        data.mcpServers = {};
      }

      data.mcpServers['content-parser'] = {
        command: 'content-parser',
        args: ['start', '--stdio']
      };

      fs.writeFileSync(claudeJsonPath, JSON.stringify(data, null, 2), 'utf8');
      return { success: true, message: `Added content-parser to ${claudeJsonPath}` };
    } catch (err: any) {
      return { success: false, message: `Failed to configure Claude Code: ${err.message}` };
    }
  }
}
