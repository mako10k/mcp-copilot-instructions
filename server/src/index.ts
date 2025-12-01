import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { guidance } from './tools/guidance';
import { projectContext } from './tools/project_context';
import { instructionsStructure } from './tools/instructions_structure';
import { changeContext } from './tools/change_context';
import { feedback } from './tools/feedback';
import { onboarding } from './tools/onboarding';

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
        name: 'change_context',
        description:
          '開発の文脈・状態を変更し、それをトリガーに指示書を自動再生成。' +
          'phase/focus/priority/modeを設定すると、関連する指示だけが.github/copilot-instructions.mdに抽出される。',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['update', 'read', 'reset', 'rollback', 'list-history', 'show-diff', 'cleanup-history'],
              description: 
                'アクション: update(状態更新) / read(現在の状態取得) / reset(デフォルトに戻す) / ' +
                'rollback(履歴から復元) / list-history(履歴一覧) / show-diff(差分表示) / cleanup-history(古い履歴削除)',
            },
            state: {
              type: 'object',
              properties: {
                phase: {
                  type: 'string',
                  enum: ['development', 'refactoring', 'testing', 'debugging', 'documentation'],
                  description: '開発フェーズ',
                },
                focus: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '現在のフォーカス（例: ["API認証", "JWT"]）',
                },
                priority: {
                  type: 'string',
                  enum: ['high', 'medium', 'low'],
                  description: '現在のタスク優先度',
                },
                mode: {
                  type: 'string',
                  enum: ['normal', 'strict', 'experimental'],
                  description: '動作モード',
                },
              },
              description: '更新する状態（updateの場合に指定）',
            },
            autoRegenerate: {
              type: 'boolean',
              description: '自動的に指示書を再生成するか（デフォルト: true）',
            },
            timestamp: {
              type: ['string', 'number'],
              description: 'ロールバック先のタイムスタンプまたはインデックス（rollbackの場合、0=最新）',
            },
            limit: {
              type: 'number',
              description: '履歴の表示件数（list-historyの場合）',
            },
            from: {
              type: ['string', 'number'],
              description: '比較元のタイムスタンプまたはインデックス（show-diffの場合、デフォルト: 1）',
            },
            to: {
              type: ['string', 'number'],
              description: '比較先のタイムスタンプまたはインデックス（show-diffの場合、デフォルト: 0）',
            },
            daysToKeep: {
              type: 'number',
              description: '保持する日数（cleanup-historyの場合、デフォルト: 30）',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'instructions_structure',
        description:
          '指示書Markdown ASTの完全なCRUD操作と競合管理。' +
          'read(構造取得) / update(セクション更新) / delete(セクション削除) / insert(セクション挿入) / ' +
          'detect-conflicts(競合検出) / resolve-conflict(競合解決)。',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['read', 'update', 'delete', 'insert', 'detect-conflicts', 'resolve-conflict'],
              description:
                'アクション: read(構造取得) / update(セクション更新) / delete(セクション削除) / ' +
                'insert(セクション挿入) / detect-conflicts(競合検出) / resolve-conflict(競合解決)',
            },
            includeGitInfo: {
              type: 'boolean',
              description: 'Git情報を含めるか（readの場合のみ、デフォルト: false）',
            },
            heading: {
              type: 'string',
              description: 'セクション見出し（update/delete/insert/resolve-conflictの場合必須）',
            },
            content: {
              type: 'string',
              description: 'セクション内容（update/insertの場合必須）',
            },
            position: {
              type: 'string',
              enum: ['before', 'after', 'first', 'last'],
              description:
                '挿入位置（insertの場合必須）: ' +
                'before(アンカーの前) / after(アンカーの後) / first(先頭) / last(最後)',
            },
            anchor: {
              type: 'string',
              description: '基準となるセクションの見出し（position=before/afterの場合必須）',
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
      {
        name: 'onboarding',
        description:
          '既存プロジェクトへのMCPサーバ導入を支援。既存指示書の分析、' +
          'パターン検出（clean/structured/unstructured/messy）、マイグレーション提案、安全な適用。',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['analyze', 'status', 'skip', 'propose', 'approve', 'migrate', 'rollback'],
              description:
                'アクション: analyze(既存指示書の分析) / status(現在の状態確認) / skip(オンボーディングをスキップ) / ' +
                'propose(マイグレーション提案作成) / approve(提案を承認) / migrate(マイグレーション実行) / rollback(元に戻す)',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'feedback',
        description:
          '指示書に対する重要なフィードバックを記録。' +
          '人間開発者の明示的な指摘（criticalFeedback）または' +
          'LLMが自律的に重要と判断した内容（copilotEssential）をフラグ設定。',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['add', 'remove', 'list'],
              description: 'アクション: add(フラグ追加) / remove(フラグ削除) / list(一覧表示)',
            },
            filePath: {
              type: 'string',
              description: '対象ファイルの相対パス（例: "conventions/typescript.md"、add/removeの場合必須）',
            },
            flagType: {
              type: 'string',
              enum: ['criticalFeedback', 'copilotEssential'],
              description:
                'フラグタイプ（add/removeの場合必須）: ' +
                'criticalFeedback(人間の強い指摘) / copilotEssential(LLMの重要判断)',
            },
            reason: {
              type: 'string',
              description: 'フラグを設定する理由（addの場合推奨）',
            },
            filter: {
              type: 'string',
              enum: ['all', 'criticalFeedback', 'copilotEssential'],
              description: 'フィルタ（listの場合、デフォルト: all）',
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
      case 'change_context': {
        const result = await changeContext(args as any);
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
      case 'onboarding': {
        const result = await onboarding(args as any);
        return {
          content: [{ type: 'text', text: result }],
        };
      }
      case 'feedback': {
        const result = await feedback(args as any);
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
