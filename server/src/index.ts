import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { guidance } from './tools/guidance';
import { projectContext } from './tools/project_context';
import { instructionsStructure } from './tools/instructions_structure';

const server = new Server(
  {
    name: 'copilot-instructions',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツール一覧を公開
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'guidance',
        description: 'MCPサーバの使用ガイドと現在状態を返す',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['overview', 'getting-started', 'current-state'],
              description: 'アクション: overview/getting-started/current-state',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'project_context',
        description: 'プロジェクト文脈のCRUD操作',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['create', 'read'],
              description: 'アクション: create/read',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'instructions_structure',
        description: '指示書Markdown ASTのCRUD操作',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['read', 'update'],
              description: 'アクション: read/update',
            },
          },
          required: ['action'],
        },
      },
    ],
  };
});

// ツール呼び出しを処理
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [{ type: 'text', text: 'Error: No arguments provided' }],
      isError: true,
    };
  }

  try {
    switch (name) {
      case 'guidance': {
        const result = await guidance({ action: args.action as string });
        return {
          content: [{ type: 'text', text: result }],
        };
      }
      case 'project_context': {
        const result = await projectContext({ action: args.action as string });
        return {
          content: [{ type: 'text', text: result }],
        };
      }
      case 'instructions_structure': {
        const result = await instructionsStructure({
          action: args.action as string,
        });
        return {
          content: [{ type: 'text', text: result }],
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// サーバを起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Copilot Instructions Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
