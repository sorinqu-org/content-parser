import fs from 'fs';
import path from 'path';
import os from 'os';

export function addAntigravityMcp(): { success: boolean; message: string } {
  try {
    const candidatePaths = [
      path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json'),
      path.join(os.homedir(), '.gemini', 'config', 'mcp_config.json'),
      path.join(os.homedir(), '.config', 'antigravity', 'mcp_config.json')
    ];

    let updatedCount = 0;
    const modifiedFiles: string[] = [];

    for (const configPath of candidatePaths) {
      const dir = path.dirname(configPath);
      // If the parent directory exists or it's the primary ~/.gemini/antigravity path
      if (fs.existsSync(dir) || configPath.includes('.gemini/antigravity')) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        let data: any = {};
        if (fs.existsSync(configPath)) {
          try {
            data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
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

        fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
        updatedCount++;
        modifiedFiles.push(configPath);
      }
    }

    if (updatedCount === 0) {
      // Create default primary path
      const primary = candidatePaths[0];
      const dir = path.dirname(primary);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        primary,
        JSON.stringify(
          {
            mcpServers: {
              'content-parser': {
                command: 'content-parser',
                args: ['start', '--stdio']
              }
            }
          },
          null,
          2
        ),
        'utf8'
      );
      return { success: true, message: `Created Antigravity MCP config at ${primary}` };
    }

    return { success: true, message: `Configured Antigravity in: ${modifiedFiles.join(', ')}` };
  } catch (err: any) {
    return { success: false, message: `Failed to configure Antigravity: ${err.message}` };
  }
}
