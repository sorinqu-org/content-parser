import fs from 'fs';
import path from 'path';
import os from 'os';

export function addCursorMcp(): { success: boolean; message: string } {
  try {
    const cursorDir = path.join(os.homedir(), '.cursor');
    const mcpJsonPath = path.join(cursorDir, 'mcp.json');

    if (!fs.existsSync(cursorDir)) {
      fs.mkdirSync(cursorDir, { recursive: true });
    }

    let data: any = {};
    if (fs.existsSync(mcpJsonPath)) {
      try {
        data = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf8'));
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

    fs.writeFileSync(mcpJsonPath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true, message: `Added content-parser to ${mcpJsonPath}` };
  } catch (err: any) {
    return { success: false, message: `Failed to configure Cursor: ${err.message}` };
  }
}
