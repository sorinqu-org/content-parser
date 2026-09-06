import { ContentParserMcpServer } from '../../mcp/server.js';
import { startDaemonProcess } from '../daemon.js';
import pc from 'picocolors';

export interface StartCommandOptions {
  stdio?: boolean;
  daemon?: boolean;
}

export async function handleStartCommand(options: StartCommandOptions): Promise<void> {
  if (options.daemon) {
    const res = startDaemonProcess();
    if (res.success) {
      console.log(pc.green(res.message));
    } else {
      console.error(pc.red(res.message));
      process.exit(1);
    }
    return;
  }

  if (process.env.DAEMON_MODE === 'true') {
    const mcpServer = new ContentParserMcpServer();
    await mcpServer.startStdio();

    // Prevent immediate exit when stdin is ignored in daemon mode
    const timer = setInterval(() => {}, 60000);
    process.on('SIGTERM', () => {
      clearInterval(timer);
      process.exit(0);
    });
    return;
  }

  // Default: start MCP server on stdio for AI agent connection
  const mcpServer = new ContentParserMcpServer();
  await mcpServer.startStdio();
}
