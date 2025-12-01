import * as fs from 'fs/promises';
import * as path from 'path';
import { DevelopmentContext, generateInstructions } from '../utils/generateInstructions';
import { 
  listHistory, 
  getHistoryByTimestamp, 
  calculateDiff,
  cleanupOldHistory,
  HistoryEntry,
} from '../utils/historyManager';

interface ChangeContextArgs {
  action: 'update' | 'read' | 'reset' | 'rollback' | 'list-history' | 'show-diff' | 'cleanup-history';
  state?: Partial<DevelopmentContext>;
  autoRegenerate?: boolean;
  // rollback用
  timestamp?: string | number;  // ISO timestamp or index (0 = latest)
  // list-history用
  limit?: number;
  // show-diff用
  from?: string | number;
  to?: string | number;
  // cleanup-history用
  daysToKeep?: number;
}

/**
 * 現在のコンテキストを読み込む
 */
async function loadContext(): Promise<DevelopmentContext> {
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const contextPath = path.join(workspaceRoot, '.copilot-state/context.json');
  
  try {
    const content = await fs.readFile(contextPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    // デフォルト値
    return {
      phase: 'development',
      focus: [],
      priority: 'medium',
      mode: 'normal',
    };
  }
}

/**
 * コンテキストを保存
 */
async function saveContext(context: DevelopmentContext): Promise<void> {
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const contextPath = path.join(workspaceRoot, '.copilot-state/context.json');
  
  await fs.writeFile(contextPath, JSON.stringify(context, null, 2), 'utf-8');
}

/**
 * change_context ツール実装
 */
export async function changeContext(args: ChangeContextArgs): Promise<string> {
  const action = args.action;
  
  if (action === 'read') {
    const context = await loadContext();
    return JSON.stringify({
      success: true,
      context,
    }, null, 2);
  }
  
  if (action === 'reset') {
    const defaultContext: DevelopmentContext = {
      phase: 'development',
      focus: [],
      priority: 'medium',
      mode: 'normal',
    };
    await saveContext(defaultContext);
    
    return JSON.stringify({
      success: true,
      message: 'Context reset to default',
      context: defaultContext,
    }, null, 2);
  }
  
  if (action === 'update') {
    const currentContext = await loadContext();
    const newContext: DevelopmentContext = {
      ...currentContext,
      ...args.state,
    };
    
    await saveContext(newContext);
    
    // autoRegenerate がtrueの場合（デフォルト）、自動的に指示書を再生成
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
    
    return JSON.stringify({
      success: true,
      previousContext: currentContext,
      currentContext: newContext,
      regenerated,
    }, null, 2);
  }
  
  if (action === 'list-history') {
    const history = await listHistory(args.limit);
    return JSON.stringify({
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
    }, null, 2);
  }
  
  if (action === 'show-diff') {
    const fromTimestamp = args.from ?? 1;  // デフォルト: 1つ前
    const toTimestamp = args.to ?? 0;      // デフォルト: 最新
    
    const fromEntry = await getHistoryByTimestamp(fromTimestamp);
    const toEntry = await getHistoryByTimestamp(toTimestamp);
    
    if (!fromEntry || !toEntry) {
      return JSON.stringify({
        success: false,
        error: 'History entry not found',
      }, null, 2);
    }
    
    const diff = await calculateDiff(fromEntry, toEntry);
    
    return JSON.stringify({
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
    }, null, 2);
  }
  
  if (action === 'rollback') {
    const timestamp = args.timestamp ?? 0;
    const historyEntry = await getHistoryByTimestamp(timestamp);
    
    if (!historyEntry) {
      return JSON.stringify({
        success: false,
        error: 'History entry not found',
      }, null, 2);
    }
    
    // コンテキストを復元
    await saveContext(historyEntry.context);
    
    // .github/copilot-instructions.md を復元
    const workspaceRoot = path.resolve(__dirname, '../../../');
    const outputPath = path.join(workspaceRoot, '.github/copilot-instructions.md');
    await fs.writeFile(outputPath, historyEntry.generatedContent, 'utf-8');
    
    return JSON.stringify({
      success: true,
      message: 'Rolled back successfully',
      restoredContext: historyEntry.context,
      timestamp: historyEntry.timestamp,
      sectionsCount: historyEntry.sectionsCount,
    }, null, 2);
  }
  
  if (action === 'cleanup-history') {
    const daysToKeep = args.daysToKeep ?? 30;
    const deletedCount = await cleanupOldHistory(daysToKeep);
    
    return JSON.stringify({
      success: true,
      message: `Cleaned up ${deletedCount} old history entries`,
      deletedCount,
      daysToKeep,
    }, null, 2);
  }
  
  throw new Error(`Unknown action: ${action}`);
}
