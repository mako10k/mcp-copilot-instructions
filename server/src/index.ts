#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { guidance } from './tools/guidance.js';
import { projectContext } from './tools/project_context.js';
import { instructionsStructure } from './tools/instructions_structure.js';
import { changeContext } from './tools/change_context.js';
import { feedback } from './tools/feedback.js';
import { onboarding, setOnboardingServer } from './tools/onboarding.js';
import { handleGoalManagement } from './tools/goal_management.js';

const server = new Server(
  {
    name: 'copilot-instructions',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Pass server instance to onboarding for MCP sampling capability
setOnboardingServer(server);

// Publish tool list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'guidance',
        description: 'Returns MCP server usage guide and current status',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['overview', 'getting-started', 'current-state'],
              description: 'Action: overview/getting-started/current-state',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'project_context',
        description: 'CRUD operations for project context',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['create', 'read', 'update', 'delete'],
              description: 'Action: create/read/update/delete',
            },
            id: {
              type: 'string',
              description: 'Context ID (required for update/delete)',
            },
            category: {
              type: 'string',
              description:
                'Category (required for create, for filtering/update in read/update)',
            },
            title: {
              type: 'string',
              description: 'Title (required for create, for update in update)',
            },
            description: {
              type: 'string',
              description:
                'Description (required for create, for update in update)',
            },
            priority: {
              type: 'number',
              description: 'Priority (1-10, default: 5, for update in update)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Tags array (for filtering in read, for update in update)',
            },
            minPriority: {
              type: 'number',
              description: 'Minimum priority (for filtering in read)',
            },
            maxPriority: {
              type: 'number',
              description: 'Maximum priority (for filtering in read)',
            },
            format: {
              type: 'string',
              enum: ['summary', 'full'],
              description:
                'Display format (summary: concise display [default], full: detailed JSON)',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'change_context',
        description:
          'Change development context/state to trigger automatic instructions regeneration. ' +
          'Setting phase/focus/priority/mode extracts only relevant instructions to .github/copilot-instructions.md.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: [
                'update',
                'read',
                'reset',
                'rollback',
                'list-history',
                'show-diff',
                'cleanup-history',
              ],
              description:
                'Action: update(update state) / read(get current state) / reset(reset to default) / ' +
                'rollback(restore from history) / list-history(list history) / show-diff(show diff) / cleanup-history(cleanup old history)',
            },
            state: {
              type: 'object',
              properties: {
                phase: {
                  type: 'string',
                  enum: [
                    'development',
                    'refactoring',
                    'testing',
                    'debugging',
                    'documentation',
                  ],
                  description: 'Development phase',
                },
                focus: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Current focus (e.g. ["API authentication", "JWT"])',
                },
                priority: {
                  type: 'string',
                  enum: ['high', 'medium', 'low'],
                  description: 'Current task priority',
                },
                mode: {
                  type: 'string',
                  enum: ['normal', 'strict', 'experimental'],
                  description: 'Operation mode',
                },
              },
              description: 'State to update (specify when action is update)',
            },
            autoRegenerate: {
              type: 'boolean',
              description:
                'Whether to automatically regenerate instructions (default: true)',
            },
            timestamp: {
              type: ['string', 'number'],
              description:
                'Timestamp or index to rollback to (for rollback, 0=latest)',
            },
            limit: {
              type: 'number',
              description:
                'Number of history entries to display (for list-history)',
            },
            from: {
              type: ['string', 'number'],
              description:
                'Source timestamp or index for comparison (for show-diff, default: 1)',
            },
            to: {
              type: ['string', 'number'],
              description:
                'Target timestamp or index for comparison (for show-diff, default: 0)',
            },
            daysToKeep: {
              type: 'number',
              description:
                'Number of days to keep (for cleanup-history, default: 30)',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'instructions_structure',
        description:
          'Complete CRUD operations and conflict management for instructions Markdown AST. ' +
          'read(get structure) / update(update section) / delete(delete section) / insert(insert section) / ' +
          'detect-conflicts(detect conflicts) / resolve-conflict(resolve conflict).',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: [
                'read',
                'update',
                'delete',
                'insert',
                'detect-conflicts',
                'resolve-conflict',
              ],
              description:
                'Action: read(get structure) / update(update section) / delete(delete section) / ' +
                'insert(insert section) / detect-conflicts(detect conflicts) / resolve-conflict(resolve conflict)',
            },
            includeGitInfo: {
              type: 'boolean',
              description:
                'Whether to include Git information (for read only, default: false)',
            },
            heading: {
              type: 'string',
              description:
                'Section heading (required for update/delete/insert/resolve-conflict)',
            },
            content: {
              type: 'string',
              description: 'Section content (required for update/insert)',
            },
            position: {
              type: 'string',
              enum: ['before', 'after', 'first', 'last'],
              description:
                'Insertion position (required for insert): ' +
                'before(before anchor) / after(after anchor) / first(at beginning) / last(at end)',
            },
            anchor: {
              type: 'string',
              description:
                'Reference section heading (required when position=before/after)',
            },
            resolution: {
              type: 'string',
              enum: ['use-head', 'use-mcp', 'manual'],
              description:
                'Conflict resolution method (required for resolve-conflict): ' +
                'use-head(use external changes) / use-mcp(use Copilot changes) / manual(manual merge)',
            },
            manualContent: {
              type: 'string',
              description:
                'Manual merge content (required when resolution=manual)',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'onboarding',
        description:
          'Support MCP server introduction to existing projects. Analyze existing instructions, ' +
          'detect patterns (clean/structured/unstructured/messy), propose migration, safe application.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: [
                'analyze',
                'status',
                'skip',
                'propose',
                'approve',
                'migrate',
                'rollback',
              ],
              description:
                'Action: analyze(analyze existing instructions) / status(check current status) / skip(skip onboarding) / ' +
                'propose(create migration proposal) / approve(approve proposal) / migrate(execute migration) / rollback(rollback)',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'feedback',
        description:
          'Record important feedback on instructions. ' +
          'Flag explicit feedback from human developers (criticalFeedback) or ' +
          'content LLM autonomously judges as important (copilotEssential).',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['add', 'remove', 'list'],
              description:
                'Action: add(add flag) / remove(remove flag) / list(list flags)',
            },
            filePath: {
              type: 'string',
              description:
                'Relative path to target file (e.g. "conventions/typescript.md", required for add/remove)',
            },
            flagType: {
              type: 'string',
              enum: ['criticalFeedback', 'copilotEssential'],
              description:
                'Flag type (required for add/remove): ' +
                'criticalFeedback(strong human feedback) / copilotEssential(LLM importance judgment)',
            },
            reason: {
              type: 'string',
              description: 'Reason for setting the flag (recommended for add)',
            },
            filter: {
              type: 'string',
              enum: ['all', 'criticalFeedback', 'copilotEssential'],
              description: 'Filter (for list, default: all)',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'goal_management',
        description:
          'Manage hierarchical goals with dependency graph analysis and automatic priority calculation. ' +
          'Create goals with dependencies, analyze execution order, calculate priorities based on contribution.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: [
                'create',
                'read',
                'update',
                'delete',
                'complete',
                'advance',
                'get-context',
                'set-current',
                'analyze-dependencies',
                'calculate-priorities',
                'reorder',
              ],
              description:
                'Action: create(create goal) / read(read goal) / update(update goal) / delete(delete goal) / ' +
                'complete(complete goal and auto-advance) / advance(manually advance to goal) / ' +
                'get-context(get filtered goals) / set-current(set current goal) / ' +
                'analyze-dependencies(analyze dependency graph) / calculate-priorities(calculate priorities) / reorder(reorder by dependencies)',
            },
            goalId: {
              type: 'string',
              description:
                'Goal ID (required for read/update/delete/complete/advance/set-current)',
            },
            goal: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Goal title',
                },
                description: {
                  type: 'string',
                  description: 'Goal description',
                },
                parentId: {
                  type: 'string',
                  description: 'Parent goal ID (omit for main goal)',
                },
                order: {
                  type: 'number',
                  description: 'Order within siblings (optional)',
                },
                dependencies: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Goal IDs that must be completed first (creates dependency edges)',
                },
                notes: {
                  type: 'string',
                  description: 'Additional notes',
                },
                contributionWeight: {
                  type: 'number',
                  description:
                    'Contribution weight to parent goal (0-1, default 1)',
                },
                estimatedEffort: {
                  type: 'number',
                  description: 'Estimated effort in hours',
                },
                manualPriority: {
                  type: 'number',
                  description: 'Manual priority override (0-100)',
                },
              },
              required: ['title', 'description'],
              description:
                'Goal data (required for create, optional for update)',
            },
            status: {
              type: 'string',
              enum: ['not-started', 'in-progress', 'completed', 'blocked'],
              description: 'New status (for update)',
            },
            filter: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['not-started', 'in-progress', 'completed', 'blocked'],
                  description: 'Filter by status',
                },
                parentId: {
                  type: 'string',
                  description: 'Filter by parent ID',
                },
                includeChildren: {
                  type: 'boolean',
                  description: 'Include all children recursively',
                },
              },
              description: 'Filter criteria (for read)',
            },
          },
          required: ['action'],
        },
      },
    ],
  };
});

// Handle tool invocation
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
      case 'goal_management': {
        const result = await handleGoalManagement(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
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

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Copilot Instructions Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
