import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';

interface FeedbackArgs {
  action: 'add' | 'remove' | 'list';
  // add/remove用
  filePath?: string;  // 相対パス（例: "conventions/typescript.md"）
  flagType?: 'criticalFeedback' | 'copilotEssential';
  reason?: string;  // フィードバックの理由
  // list用
  filter?: 'criticalFeedback' | 'copilotEssential' | 'all';
}

interface FeedbackEntry {
  filePath: string;
  category: string;
  criticalFeedback?: boolean;
  copilotEssential?: boolean;
  reason?: string;
}

/**
 * 指示ファイルのフロントマターを更新
 */
async function updateInstructionFrontmatter(
  filePath: string,
  flagType: 'criticalFeedback' | 'copilotEssential',
  value: boolean,
  reason?: string
): Promise<void> {
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const fullPath = path.join(workspaceRoot, '.copilot-instructions', filePath);
  
  // ファイルを読み込む
  const content = await fs.readFile(fullPath, 'utf-8');
  const parsed = matter(content);
  
  // フロントマターを更新
  if (value) {
    parsed.data[flagType] = true;
    if (reason) {
      parsed.data[`${flagType}Reason`] = reason;
    }
  } else {
    delete parsed.data[flagType];
    delete parsed.data[`${flagType}Reason`];
  }
  
  // ファイルに書き戻す
  const updated = matter.stringify(parsed.content, parsed.data);
  await fs.writeFile(fullPath, updated, 'utf-8');
}

/**
 * すべての指示ファイルをスキャンしてフィードバック情報を取得
 */
async function listFeedbacks(filter: 'criticalFeedback' | 'copilotEssential' | 'all'): Promise<FeedbackEntry[]> {
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const instructionsDir = path.join(workspaceRoot, '.copilot-instructions');
  
  const feedbacks: FeedbackEntry[] = [];
  
  async function scanDirectory(dir: string, relativePath: string = ''): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        await scanDirectory(fullPath, relPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const parsed = matter(content);
          
          const hasCritical = parsed.data.criticalFeedback === true;
          const hasEssential = parsed.data.copilotEssential === true;
          
          // フィルタリング
          if (filter === 'all' || 
              (filter === 'criticalFeedback' && hasCritical) ||
              (filter === 'copilotEssential' && hasEssential)) {
            
            if (hasCritical || hasEssential) {
              feedbacks.push({
                filePath: relPath,
                category: parsed.data.category || 'unknown',
                criticalFeedback: hasCritical,
                copilotEssential: hasEssential,
                reason: parsed.data.criticalFeedbackReason || parsed.data.copilotEssentialReason,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to read ${fullPath}:`, error);
        }
      }
    }
  }
  
  await scanDirectory(instructionsDir);
  return feedbacks;
}

/**
 * feedbackツール実装
 */
export async function feedback(args: FeedbackArgs): Promise<string> {
  const action = args.action;
  
  if (action === 'list') {
    const filter = args.filter || 'all';
    const feedbacks = await listFeedbacks(filter);
    
    return JSON.stringify({
      success: true,
      action: 'list',
      filter,
      count: feedbacks.length,
      feedbacks: feedbacks.map(f => ({
        filePath: f.filePath,
        category: f.category,
        flags: {
          criticalFeedback: f.criticalFeedback,
          copilotEssential: f.copilotEssential,
        },
        reason: f.reason,
      })),
    }, null, 2);
  }
  
  if (action === 'add') {
    if (!args.filePath || !args.flagType) {
      return JSON.stringify({
        success: false,
        error: 'filePath and flagType are required for add action',
      }, null, 2);
    }
    
    await updateInstructionFrontmatter(args.filePath, args.flagType, true, args.reason);
    
    return JSON.stringify({
      success: true,
      action: 'add',
      filePath: args.filePath,
      flagType: args.flagType,
      reason: args.reason,
      message: `Successfully added ${args.flagType} flag to ${args.filePath}`,
    }, null, 2);
  }
  
  if (action === 'remove') {
    if (!args.filePath || !args.flagType) {
      return JSON.stringify({
        success: false,
        error: 'filePath and flagType are required for remove action',
      }, null, 2);
    }
    
    await updateInstructionFrontmatter(args.filePath, args.flagType, false);
    
    return JSON.stringify({
      success: true,
      action: 'remove',
      filePath: args.filePath,
      flagType: args.flagType,
      message: `Successfully removed ${args.flagType} flag from ${args.filePath}`,
    }, null, 2);
  }
  
  throw new Error(`Unknown action: ${action}`);
}
