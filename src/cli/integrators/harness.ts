import fs from 'fs';
import path from 'path';
import os from 'os';
import * as yaml from 'yaml';

export function addHarnessMcp(): { success: boolean; message: string } {
  try {
    const candidateDirs = [
      path.join(os.homedir(), '.config', 'frontharness'),
      path.join(os.homedir(), '.config', 'harmess')
    ];

    const modifiedFiles: string[] = [];

    for (const confDir of candidateDirs) {
      if (fs.existsSync(confDir) || confDir.endsWith('frontharness')) {
        if (!fs.existsSync(confDir)) {
          fs.mkdirSync(confDir, { recursive: true });
        }

        const yamlPath = path.join(confDir, 'config.yaml');
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
        modifiedFiles.push(yamlPath);

        // Also write standard mcp.json in the directory for compatibility
        const mcpJsonPath = path.join(confDir, 'mcp.json');
        let jsonDoc: any = {};
        if (fs.existsSync(mcpJsonPath)) {
          try {
            jsonDoc = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf8'));
          } catch {
            jsonDoc = {};
          }
        }
        if (!jsonDoc.mcpServers) jsonDoc.mcpServers = {};
        jsonDoc.mcpServers['content-parser'] = {
          command: 'content-parser',
          args: ['start', '--stdio']
        };
        fs.writeFileSync(mcpJsonPath, JSON.stringify(jsonDoc, null, 2), 'utf8');
      }
    }

    return {
      success: true,
      message: `Configured FrontHarness / Harmess in: ${modifiedFiles.join(', ')}`
    };
  } catch (err: any) {
    return { success: false, message: `Failed to configure FrontHarness: ${err.message}` };
  }
}
