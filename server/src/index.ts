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
              enum: ['create', 'read', 'update', 'delete'],
              description: 'アクション: create/read/update/delete',
            },
            id: {
              type: 'string',
              description: 'コンテキストID（update/deleteの場合必須）',
            },
            category: {
              type: 'string',
              description: 'カテゴリ（createの場合必須、read/updateではフィルタ/更新用）',
            },
            title: {
              type: 'string',
              description: 'タイトル（createの場合必須、updateでは更新用）',
            },
            description: {
              type: 'string',
              description: '説明（createの場合必須、updateでは更新用）',
            },
            priority: {
              type: 'number',
              description: '優先度（1-10、デフォルト5、updateでは更新用）',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'タグ配列（readではフィルタ用、updateでは更新用）',
            },
            minPriority: {
              type: 'number',
              description: '最小優先度（readでのフィルタ用）',
            },
            maxPriority: {
              type: 'number',
              description: '最大優先度（readでのフィルタ用）',
            },
            format: {
              type: 'string',
              enum: ['summary', 'full'],
              description: '表示形式（summary: 簡潔表示[デフォルト], full: 詳細JSON）',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'instructions_structure',
        description:
          '指示書Markdown ASTのCRUD操作と競合管理。' +
          'update時は自動マージまたは競合マーカー挿入。' +
          'detect-conflictsで競合検出、resolve-conflictで解決。',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['read', 'update', 'detect-conflicts', 'resolve-conflict'],
              description:
                'アクション: read(構造取得) / update(セクション更新) / ' +
                'detect-conflicts(競合検出) / resolve-conflict(競合解決)',
            },
            heading: {
              type: 'string',
              description: 'セクション見出し（update/resolve-conflictの場合必須）',
            },
            content: {
              type: 'string',
              description: 'セクション内容（updateの場合必須）',
            },
            resolution: {
              type: 'string',
              enum: ['use-head', 'use-mcp', 'manual'],
              description:
                '競合解決方法（resolve-conflictの場合必須）: ' +
                'use-head(外部変更採用) / use-mcp(Copilot変更採用) / manual(手動統合)',
            },
            manualContent: {
              type: 'string',
              description: '手動統合内容（resolution=manualの場合必須）',
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
        const result = await projectContext(args as any);
        return {
          content: [{ type: 'text', text: result }],
        };
      }
      case 'instructions_structure': {
        const result = await instructionsStructure(args as any);
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
