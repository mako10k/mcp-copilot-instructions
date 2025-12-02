import * as fs from 'fs/promises';
import * as path from 'path';
import { getWorkspaceRoot } from '../utils/pathUtils.js';
import {
  DevelopmentContext,
  generateInstructions,
} from '../utils/generateInstructions.js';
import {
  listHistory,
  getHistoryByTimestamp,
  calculateDiff,
  cleanupOldHistory,
} from '../utils/historyManager.js';
import { isRestrictedMode } from '../utils/onboardingStatusManager.js';

interface ChangeContextArgs {
  action:
    | 'update'
    | 'read'
    | 'reset'
    | 'rollback'
    | 'list-history'
    | 'show-diff'
    | 'cleanup-history';
  state?: Partial<DevelopmentContext>;
  autoRegenerate?: boolean;
  // For rollback
  timestamp?: string | number; // ISO timestamp or index (0 = latest)
  // For list-history
  limit?: number;
  // For show-diff
  from?: string | number;
  to?: string | number;
  // For cleanup-history
  daysToKeep?: number;
}

/**
 * Load current context
 */
async function loadContext(): Promise<DevelopmentContext> {
  const workspaceRoot = getWorkspaceRoot(import.meta.url);
  const contextPath = path.join(workspaceRoot, '.copilot-state/context.json');

  try {
    const content = await fs.readFile(contextPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Default values
    return {
      phase: 'development',
      focus: [],
      priority: 'medium',
      mode: 'normal',
    };
  }
}

/**
 * Save context
 */
async function saveContext(context: DevelopmentContext): Promise<void> {
  const workspaceRoot = getWorkspaceRoot(import.meta.url);
  const contextPath = path.join(workspaceRoot, '.copilot-state/context.json');

  // Ensure directory exists
  await fs.mkdir(path.dirname(contextPath), { recursive: true });
  await fs.writeFile(contextPath, JSON.stringify(context, null, 2), 'utf-8');
}

/**
 * change_context tool implementation
 */
export async function changeContext(args: ChangeContextArgs): Promise<string> {
  const action = args.action;

  // Check for restricted mode (allow read, list-history, show-diff, cleanup-history)
  const readOnlyActions = [
    'read',
    'list-history',
    'show-diff',
    'cleanup-history',
  ];
  if (!readOnlyActions.includes(action)) {
    const restricted = await isRestrictedMode();
    if (restricted) {
      return JSON.stringify(
        {
          success: false,
          error:
            '❌ Restricted Mode: This action is not available.\n\n' +
            'Existing .github/copilot-instructions.md detected.\n' +
            'Please complete onboarding first to prevent unintended overwrites.\n\n' +
            '[Check Compatibility]\n' +
            'onboarding({ action: "analyze" })\n\n' +
            '[View Current Status]\n' +
            'onboarding({ action: "status" })\n\n' +
            '[Skip Onboarding (use at your own risk)]\n' +
            'onboarding({ action: "skip" })',
        },
        null,
        2,
      );
    }
  }

  if (action === 'read') {
    const context = await loadContext();
    return JSON.stringify(
      {
        success: true,
        context,
      },
      null,
      2,
    );
  }

  if (action === 'reset') {
    const defaultContext: DevelopmentContext = {
      phase: 'development',
      focus: [],
      priority: 'medium',
      mode: 'normal',
    };
    await saveContext(defaultContext);

    return JSON.stringify(
      {
        success: true,
        message: 'Context reset to default',
        context: defaultContext,
      },
      null,
      2,
    );
  }

  if (action === 'update') {
    const currentContext = await loadContext();
    const newContext: DevelopmentContext = {
      ...currentContext,
      ...args.state,
    };

    await saveContext(newContext);

    // If autoRegenerate is true (default), automatically regenerate instructions
    const autoRegenerate = args.autoRegenerate !== false;
    let regenerated;

    if (autoRegenerate) {
      try {
        regenerated = await generateInstructions(newContext);
      } catch (error) {
        console.error('Failed to regenerate instructions:', error);
        regenerated = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return JSON.stringify(
      {
        success: true,
        previousContext: currentContext,
        currentContext: newContext,
        regenerated,
      },
      null,
      2,
    );
  }

  if (action === 'list-history') {
    const history = await listHistory(args.limit);
    return JSON.stringify(
      {
        success: true,
        count: history.length,
        history: history.map((entry, index) => ({
          index,
          timestamp: entry.timestamp,
          phase: entry.context.phase,
          focus: entry.context.focus,
          sectionsCount: entry.sectionsCount,
          hash: entry.generatedHash.substring(0, 8),
        })),
      },
      null,
      2,
    );
  }

  if (action === 'show-diff') {
    const fromTimestamp = args.from ?? 1; // Default: previous one
    const toTimestamp = args.to ?? 0; // Default: latest

    const fromEntry = await getHistoryByTimestamp(fromTimestamp);
    const toEntry = await getHistoryByTimestamp(toTimestamp);

    if (!fromEntry || !toEntry) {
      return JSON.stringify(
        {
          success: false,
          error: 'History entry not found',
        },
        null,
        2,
      );
    }

    const diff = await calculateDiff(fromEntry, toEntry);

    return JSON.stringify(
      {
        success: true,
        from: {
          timestamp: fromEntry.timestamp,
          context: fromEntry.context,
          sectionsCount: fromEntry.sectionsCount,
        },
        to: {
          timestamp: toEntry.timestamp,
          context: toEntry.context,
          sectionsCount: toEntry.sectionsCount,
        },
        diff,
      },
      null,
      2,
    );
  }

  if (action === 'rollback') {
    const timestamp = args.timestamp ?? 0;
    const historyEntry = await getHistoryByTimestamp(timestamp);

    if (!historyEntry) {
      return JSON.stringify(
        {
          success: false,
          error: 'History entry not found',
        },
        null,
        2,
      );
    }

    // Restore context
    await saveContext(historyEntry.context);

    // Restore .github/copilot-instructions.md
    const workspaceRoot = getWorkspaceRoot(import.meta.url);
    const outputPath = path.join(
      workspaceRoot,
      '.github/copilot-instructions.md',
    );
    await fs.writeFile(outputPath, historyEntry.generatedContent, 'utf-8');

    return JSON.stringify(
      {
        success: true,
        message: 'Rolled back successfully',
        restoredContext: historyEntry.context,
        timestamp: historyEntry.timestamp,
        sectionsCount: historyEntry.sectionsCount,
      },
      null,
      2,
    );
  }

  if (action === 'cleanup-history') {
    const daysToKeep = args.daysToKeep ?? 30;
    const deletedCount = await cleanupOldHistory(daysToKeep);

    return JSON.stringify(
      {
        success: true,
        message: `Cleaned up ${deletedCount} old history entries`,
        deletedCount,
        daysToKeep,
      },
      null,
      2,
    );
  }

  throw new Error(`Unknown action: ${action}`);
}
