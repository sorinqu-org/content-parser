import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { TOOLS } from './tools.js';
import { handleToolCall } from './handlers.js';

export class ContentParserMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'content-parser',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: TOOLS };
    });

    // Handle tool invocation
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args = {} } = request.params;

      try {
        const result = await handleToolCall(name, args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error.message || 'Unknown error occurred while executing tool',
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
              })
            }
          ],
          isError: true
        };
      }
    });
  }

  public async startStdio(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // Write diagnostics strictly to stderr to keep stdout pure JSON-RPC
    process.stderr.write('[content-parser] MCP Server started over stdio\n');
  }
}
