import * as fs from 'fs/promises';
import * as path from 'path';
import { DevelopmentContext } from './generateInstructions.js';

/**
 * History entry
 */
export interface HistoryEntry {
  timestamp: string;  // ISO 8601 format
  context: DevelopmentContext;
  generatedHash: string;
  sectionsCount: number;
  filePath: string;  // 履歴ファイルのパス
}

/**
 * History detail information
 */
export interface HistoryDetail extends HistoryEntry {
  generatedContent: string;  // Actually generated content
}

/**
 * Get history directory path
 */
function getHistoryDir(): string {
  const workspaceRoot = path.resolve(__dirname, '../../../');
  return path.join(workspaceRoot, '.copilot-state/history');
}

/**
 * Record history
 */
export async function recordHistory(
  context: DevelopmentContext,
  generatedHash: string,
  sectionsCount: number,
  generatedContent: string
): Promise<HistoryEntry> {
  const historyDir = getHistoryDir();
  
  // Create directory if it doesn't exist
  await fs.mkdir(historyDir, { recursive: true });
  
  const timestamp = new Date().toISOString();
  const filename = `${timestamp.replace(/[:.]/g, '-')}-${generatedHash.substring(0, 8)}.json`;
  const filePath = path.join(historyDir, filename);
  
  const entry: HistoryDetail = {
    timestamp,
    context,
    generatedHash,
    sectionsCount,
    filePath,
    generatedContent,
  };
  
  await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
  
  return {
    timestamp,
    context,
    generatedHash,
    sectionsCount,
    filePath,
  };
}

/**
 * Get history list (newest first)
 */
export async function listHistory(limit?: number): Promise<HistoryEntry[]> {
  const historyDir = getHistoryDir();
  
  try {
    const files = await fs.readdir(historyDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    // Sort newest first
    jsonFiles.sort().reverse();
    
    const entries: HistoryEntry[] = [];
    const maxFiles = limit ? Math.min(limit, jsonFiles.length) : jsonFiles.length;
    
    for (let i = 0; i < maxFiles; i++) {
      const filePath = path.join(historyDir, jsonFiles[i]);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const detail: HistoryDetail = JSON.parse(content);
        
        // 詳細情報を除外してサマリーのみ返す
        entries.push({
          timestamp: detail.timestamp,
          context: detail.context,
          generatedHash: detail.generatedHash,
          sectionsCount: detail.sectionsCount,
          filePath: detail.filePath,
        });
      } catch (error) {
        console.error(`Failed to read history file ${filePath}:`, error);
      }
    }
    
    return entries;
  } catch (error) {
    // ディレクトリが存在しない場合は空配列を返す
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * 特定の履歴エントリを取得
 */
export async function getHistoryDetail(filePath: string): Promise<HistoryDetail> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * タイムスタンプまたはインデックスから履歴を取得
 */
export async function getHistoryByTimestamp(timestampOrIndex: string | number): Promise<HistoryDetail | null> {
  const history = await listHistory();
  
  if (history.length === 0) {
    return null;
  }
  
  let entry: HistoryEntry | undefined;
  
  if (typeof timestampOrIndex === 'number') {
    // インデックス指定（0 = 最新）
    entry = history[timestampOrIndex];
  } else {
    // タイムスタンプ指定（前方一致）
    entry = history.find(h => h.timestamp.startsWith(timestampOrIndex));
  }
  
  if (!entry) {
    return null;
  }
  
  return await getHistoryDetail(entry.filePath);
}

/**
 * 2つの履歴エントリの差分を計算
 */
export async function calculateDiff(
  entry1: HistoryDetail,
  entry2: HistoryDetail
): Promise<{
  contextChanges: Partial<DevelopmentContext>;
  sectionsCountDiff: number;
  contentDiff: string;
}> {
  // コンテキストの変更を抽出
  const contextChanges: Partial<DevelopmentContext> = {};
  const keys = ['phase', 'focus', 'priority', 'mode'] as const;
  
  for (const key of keys) {
    if (JSON.stringify(entry1.context[key]) !== JSON.stringify(entry2.context[key])) {
      contextChanges[key] = entry2.context[key] as any;
    }
  }
  
  // セクション数の差分
  const sectionsCountDiff = entry2.sectionsCount - entry1.sectionsCount;
  
  // 簡易的な差分（実際の行単位diffは複雑なので、ハッシュ比較のみ）
  const contentDiff = entry1.generatedHash === entry2.generatedHash
    ? 'No changes'
    : `Content changed (${entry1.generatedHash.substring(0, 8)} → ${entry2.generatedHash.substring(0, 8)})`;
  
  return {
    contextChanges,
    sectionsCountDiff,
    contentDiff,
  };
}

/**
 * 古い履歴を削除（30日以上前）
 */
export async function cleanupOldHistory(daysToKeep: number = 30): Promise<number> {
  const historyDir = getHistoryDir();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  try {
    const files = await fs.readdir(historyDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    let deletedCount = 0;
    
    for (const file of jsonFiles) {
      const filePath = path.join(historyDir, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const detail: HistoryDetail = JSON.parse(content);
        const entryDate = new Date(detail.timestamp);
        
        if (entryDate < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      } catch (error) {
        console.error(`Failed to process ${filePath}:`, error);
      }
    }
    
    return deletedCount;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 0;
    }
    throw error;
  }
}
