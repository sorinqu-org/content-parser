import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import * as yaml from 'yaml';

export function addHermesMcp(): { success: boolean; message: string } {
  // Method 1: Try using hermes CLI if available (piping "y" to auto-enable all tools)
  try {
    execSync('echo "y" | hermes mcp add content-parser --command content-parser --args start --stdio', {
      stdio: 'pipe',
      timeout: 10000,
      shell: '/bin/bash'
    });
    return { success: true, message: 'Added content-parser to Hermes Agent via "hermes mcp add" (7/7 tools enabled)' };
  } catch {
    // Method 2: Manually patch ~/.hermes/config.yaml
    try {
      const hermesDir = path.join(os.homedir(), '.hermes');
      const yamlPath = path.join(hermesDir, 'config.yaml');

      if (!fs.existsSync(hermesDir)) {
        fs.mkdirSync(hermesDir, { recursive: true });
      }

      let doc: any = {};
      if (fs.existsSync(yamlPath)) {
        try {
          const raw = fs.readFileSync(yamlPath, 'utf8');
          doc = yaml.parse(raw) || {};
        } catch {
          doc = {};
        }
      }

      if (!doc.mcp_servers) {
        doc.mcp_servers = {};
      }

      doc.mcp_servers['content-parser'] = {
        command: 'content-parser',
        args: ['start', '--stdio']
      };

      fs.writeFileSync(yamlPath, yaml.stringify(doc), 'utf8');
      return { success: true, message: `Added content-parser to ${yamlPath}` };
    } catch (err: any) {
      return { success: false, message: `Failed to configure Hermes Agent: ${err.message}` };
    }
  }
}
