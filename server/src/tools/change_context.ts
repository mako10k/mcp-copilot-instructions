import * as fs from 'fs/promises';
import * as path from 'path';
import { DevelopmentContext, generateInstructions } from '../utils/generateInstructions';

interface ChangeContextArgs {
  action: 'update' | 'read' | 'reset';
  state?: Partial<DevelopmentContext>;
  autoRegenerate?: boolean;
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
  
  throw new Error(`Unknown action: ${action}`);
}
