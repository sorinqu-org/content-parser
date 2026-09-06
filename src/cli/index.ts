import { Command } from 'commander';
import { handleStartCommand } from './commands/start.js';
import { handleStopCommand } from './commands/stop.js';
import { handleAddCommand } from './commands/add.js';
import { handleParseCommand } from './commands/parse.js';
import { handleStatusCommand } from './commands/status.js';

const program = new Command();

program
  .name('content-parser')
  .description('High-performance website and asset parser MCP server and CLI for AI agents')
  .version('1.0.0');

program
  .command('start')
  .description('Start the Model Context Protocol (MCP) server')
  .option('--stdio', 'Run in stdio mode for AI agent pipes (default)', true)
  .option('--daemon', 'Run in background daemon mode')
  .action(async (options) => {
    await handleStartCommand(options);
  });

program
  .command('stop')
  .description('Stop any running content-parser background daemon')
  .action(async () => {
    await handleStopCommand();
  });

program
  .command('add [agent]')
  .description('Configure content-parser MCP into an AI agent (claude, codex, cursor, antigravity, hermes, all)')
  .action(async (agent) => {
    await handleAddCommand(agent);
  });

program
  .command('parse <url>')
  .description('Extract assets, text, structure, UI components, and screenshots from a target website')
  .option('-t, --targets <targets>', 'Comma-separated targets: images,videos,models_3d,fonts,text,ui_components,structure,screenshots')
  .option('-d, --download', 'Download discovered assets to disk')
  .option('-o, --out <dir>', 'Output directory for assets and screenshots')
  .option('-c, --crawl', 'Crawl internal links for multi-page scanning')
  .option('--max-pages <number>', 'Maximum pages to crawl', '5')
  .option('--max-depth <number>', 'Maximum link crawl depth', '2')
  .option('--viewports <viewports>', 'Comma-separated viewports: desktop,mobile,tablet,fullpage')
  .option('--color-scheme <scheme>', 'Color scheme: light, dark, or both', 'light')
  .action(async (url, options) => {
    await handleParseCommand(url, options);
  });

program
  .command('status')
  .description('Inspect environment, browser status, daemon state, and agent integrations')
  .action(() => {
    handleStatusCommand();
  });

// If invoked without arguments, display help
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);
