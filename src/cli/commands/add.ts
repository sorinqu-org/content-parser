import { addMcpToTarget } from '../integrators/index.js';
import pc from 'picocolors';
import readline from 'readline';

export async function handleAddCommand(agent?: string): Promise<void> {
  let target = agent?.trim();

  if (!target) {
    console.log(pc.bold('\nSelect an AI agent to install content-parser MCP server:'));
    console.log(`  ${pc.cyan('1)')} claude       ${pc.dim('(Claude Code CLI & ~/.claude.json)')}`);
    console.log(`  ${pc.cyan('2)')} cursor       ${pc.dim('(Cursor IDE ~/.cursor/mcp.json)')}`);
    console.log(`  ${pc.cyan('3)')} codex        ${pc.dim('(OpenAI Codex CLI & ~/.codex/config.toml)')}`);
    console.log(`  ${pc.cyan('4)')} antigravity  ${pc.dim('(Google Antigravity ~/.gemini/antigravity/mcp_config.json)')}`);
    console.log(`  ${pc.cyan('5)')} hermes       ${pc.dim('(Hermes Agent CLI & ~/.hermes/config.yaml)')}`);
    console.log(`  ${pc.cyan('6)')} all          ${pc.dim('(Install into all detected AI agents)')}\n`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(pc.yellow('Enter choice [1-6 or name]: '), (ans) => {
        rl.close();
        resolve(ans.trim().toLowerCase());
      });
    });

    const choiceMap: Record<string, string> = {
      '1': 'claude',
      '2': 'cursor',
      '3': 'codex',
      '4': 'antigravity',
      '5': 'hermes',
      '6': 'all'
    };

    target = choiceMap[answer] || answer;
  }

  if (!target) {
    console.log(pc.red('No agent specified. Aborted.'));
    return;
  }

  console.log(pc.cyan(`\nConfiguring MCP integration for: ${pc.bold(target)}...`));
  const results = await addMcpToTarget(target);

  for (const r of results) {
    if (r.success) {
      console.log(`[+] ${pc.green(r.target)}: ${r.message}`);
    } else {
      console.log(`[-] ${pc.red(r.target)}: ${r.message}`);
    }
  }
  console.log();
}
