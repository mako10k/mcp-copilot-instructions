import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';

interface ScoringRules {
  limits: {
    priorityFlags: {
      criticalFeedback: { softLimit: number; hardLimit: number };
      copilotEssential: { softLimit: number; hardLimit: number };
    };
  };
}

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
 * Update instruction file frontmatter
 */
async function updateInstructionFrontmatter(
  filePath: string,
  flagType: 'criticalFeedback' | 'copilotEssential',
  value: boolean,
  reason?: string
): Promise<void> {
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const fullPath = path.join(workspaceRoot, '.copilot-instructions', filePath);
  
  // Read file
  const content = await fs.readFile(fullPath, 'utf-8');
  const parsed = matter(content);
  
  // Update frontmatter
  if (value) {
    parsed.data[flagType] = true;
    if (reason) {
      parsed.data[`${flagType}Reason`] = reason;
    }
  } else {
    delete parsed.data[flagType];
    delete parsed.data[`${flagType}Reason`];
  }
  
  // Write back to file
  const updated = matter.stringify(parsed.content, parsed.data);
  await fs.writeFile(fullPath, updated, 'utf-8');
}

/**
 * Load scoring rules
 */
async function loadScoringRules(): Promise<ScoringRules> {
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const rulesPath = path.join(workspaceRoot, '.copilot-state/scoring-rules.json');
  const content = await fs.readFile(rulesPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Scan all instruction files and retrieve feedback information
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
          
          // Filtering
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
 * feedback tool implementation
 */
export async function feedback(args: FeedbackArgs): Promise<string> {
  const action = args.action;
  
  if (action === 'list') {
    const filter = args.filter || 'all';
    const feedbacks = await listFeedbacks(filter);
    const rules = await loadScoringRules();
    
    // Calculate statistics
    const criticalCount = feedbacks.filter(f => f.criticalFeedback).length;
    const essentialCount = feedbacks.filter(f => f.copilotEssential).length;
    
    const criticalLimit = rules.limits.priorityFlags.criticalFeedback;
    const essentialLimit = rules.limits.priorityFlags.copilotEssential;
    
    const warnings: string[] = [];
    if (criticalCount >= criticalLimit.softLimit) {
      const status = criticalCount >= criticalLimit.hardLimit ? '❌ ハードリミット到達' : '⚠️ ソフトリミット到達';
      warnings.push(`criticalFeedback: ${criticalCount}/${criticalLimit.hardLimit} ${status}`);
    }
    if (essentialCount >= essentialLimit.softLimit) {
      const status = essentialCount >= essentialLimit.hardLimit ? '❌ ハードリミット到達' : '⚠️ ソフトリミット到達';
      warnings.push(`copilotEssential: ${essentialCount}/${essentialLimit.hardLimit} ${status}`);
    }
    
    return JSON.stringify({
      success: true,
      action: 'list',
      filter,
      count: feedbacks.length,
      summary: {
        criticalFeedback: {
          count: criticalCount,
          softLimit: criticalLimit.softLimit,
          hardLimit: criticalLimit.hardLimit,
          status: criticalCount >= criticalLimit.hardLimit ? 'error' : criticalCount >= criticalLimit.softLimit ? 'warning' : 'ok',
        },
        copilotEssential: {
          count: essentialCount,
          softLimit: essentialLimit.softLimit,
          hardLimit: essentialLimit.hardLimit,
          status: essentialCount >= essentialLimit.hardLimit ? 'error' : essentialCount >= essentialLimit.softLimit ? 'warning' : 'ok',
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      },
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
    
    // Check current flag count
    const currentFeedbacks = await listFeedbacks(args.flagType);
    const currentCount = currentFeedbacks.length;
    const rules = await loadScoringRules();
    const limits = rules.limits.priorityFlags[args.flagType];
    
    // Hard limit check
    if (currentCount >= limits.hardLimit) {
      const existingList = currentFeedbacks.map(f => 
        `  - ${f.filePath}${f.reason ? ` (${f.reason})` : ''}`
      ).join('\n');
      
      return JSON.stringify({
        success: false,
        error: 'HARD_LIMIT_REACHED',
        message: `❌ ハードリミット到達: ${args.flagType}は最大${limits.hardLimit}個までです。`,
        currentCount,
        hardLimit: limits.hardLimit,
        existingFlags: currentFeedbacks.map(f => ({
          filePath: f.filePath,
          reason: f.reason,
        })),
        suggestion: `既存のフラグを削除してから追加してください。\n\n現在の${args.flagType}フラグ付き指示:\n${existingList}`,
      }, null, 2);
    }
    
    // Soft limit warning
    let warning: string | undefined;
    if (currentCount >= limits.softLimit) {
      const existingList = currentFeedbacks.map(f => 
        `  - ${f.filePath}${f.reason ? ` (${f.reason})` : ''}`
      ).join('\n');
      
      warning = `⚠️ ソフトリミット到達: ${args.flagType}は現在${currentCount}個です（推奨: ${limits.softLimit}個まで）。\n` +
                `次回追加時にハードリミット(${limits.hardLimit}個)に達します。\n\n` +
                `現在の${args.flagType}フラグ付き指示:\n${existingList}\n\n` +
                `推奨アクション:\n` +
                `  - 既存の優先フラグを見直して、本当に必要か検討してください\n` +
                `  - 優先度の低いものを削除してから追加してください\n` +
                `  - または、統合できる内容がないか確認してください`;
    }
    
    await updateInstructionFrontmatter(args.filePath, args.flagType, true, args.reason);
    
    return JSON.stringify({
      success: true,
      action: 'add',
      filePath: args.filePath,
      flagType: args.flagType,
      reason: args.reason,
      message: `Successfully added ${args.flagType} flag to ${args.filePath}`,
      currentCount: currentCount + 1,
      softLimit: limits.softLimit,
      hardLimit: limits.hardLimit,
      warning,
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
