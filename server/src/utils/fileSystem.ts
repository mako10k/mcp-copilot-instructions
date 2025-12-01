import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Git command availability state
 * undefined: not checked, true: available, false: unavailable
 */
let gitAvailable: boolean | undefined = undefined;

/**
 * Check if Git command is available
 * Validates on first call and caches result
 */
async function checkGitAvailable(): Promise<boolean> {
  if (gitAvailable !== undefined) {
    return gitAvailable;
  }

  try {
    await execAsync('git --version');
    gitAvailable = true;
    console.log('[fileSystem] Git command available');
  } catch {
    gitAvailable = false;
    console.warn('[fileSystem] Git command not found. Operating in degraded mode.');
  }

  return gitAvailable;
}

/**
 * File state interface
 */
export interface FileState {
  path: string;
  hash: string; // SHA-256 hash value
  timestamp: number; // File last modified time (milliseconds)
  isGitManaged?: boolean; // Whether under Git management
  gitCommit?: string; // Current commit hash if under Git management
  gitStatus?: string; // File status if under Git management (modified, untracked, etc.)
}

/**
 * Conflict information interface
 */
export interface ConflictInfo {
  message: string;
  expectedHash: string;
  currentHash: string;
  filePath: string;
}

/**
 * Calculate SHA-256 hash value
 */
export function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Check if file is under Git management
 * @param filePath File path
 * @returns true if under Git management
 */
export async function checkGitManaged(filePath: string): Promise<boolean> {
  // Return false if Git command is unavailable
  if (!(await checkGitAvailable())) {
    return false;
  }

  try {
    const dir = path.dirname(filePath);
    // git rev-parse --is-inside-work-tree でGitリポジトリ内かチェック
    await execAsync('git rev-parse --is-inside-work-tree', { cwd: dir });
    return true;
  } catch {
    return false;
  }
}

/**
 * Git管理下のファイルの現在のコミットハッシュを取得
 * @param filePath ファイルのパス
 * @returns コミットハッシュ、取得できない場合undefined
 */
export async function getGitCommit(filePath: string): Promise<string | undefined> {
  // Git コマンドが利用不可の場合は undefined を返す
  if (!(await checkGitAvailable())) {
    return undefined;
  }

  try {
    const dir = path.dirname(filePath);
    const { stdout } = await execAsync('git rev-parse HEAD', { cwd: dir });
    return stdout.trim();
  } catch {
    return undefined;
  }
}

/**
 * Git管理下のファイルのステータスを取得
 * @param filePath ファイルのパス
 * @returns ステータス文字列 (modified, untracked, unmodified等)、取得できない場合はundefined
 */
export async function getGitStatus(filePath: string): Promise<string | undefined> {
  // Git コマンドが利用不可の場合は undefined を返す
  if (!(await checkGitAvailable())) {
    return undefined;
  }

  try {
    const dir = path.dirname(filePath);
    const fileName = path.basename(filePath);
    const { stdout } = await execAsync(`git status --porcelain "${fileName}"`, { cwd: dir });
    
    if (!stdout.trim()) {
      return 'unmodified';
    }
    
    const statusCode = stdout.substring(0, 2).trim();
    if (statusCode === 'M' || statusCode.includes('M')) {
      return 'modified';
    } else if (statusCode === '??') {
      return 'untracked';
    } else if (statusCode === 'A') {
      return 'added';
    } else if (statusCode === 'D') {
      return 'deleted';
    }
    return statusCode || 'unknown';
  } catch {
    return undefined;
  }
}

/**
 * Git管理下のファイルのdiffを取得
 * @param filePath ファイルのパス
 * @returns diff内容、取得できない場合undefined
 */
export async function getGitDiff(filePath: string): Promise<string | undefined> {
  // Git コマンドが利用不可の場合は undefined を返す
  if (!(await checkGitAvailable())) {
    return undefined;
  }

  try {
    const dir = path.dirname(filePath);
    const fileName = path.basename(filePath);
    const { stdout } = await execAsync(`git diff "${fileName}"`, { cwd: dir });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Read .github/copilot-instructions.md
 * @returns Instructions content, null if doesn't exist
 */
export async function readInstructionsFile(): Promise<string | null> {
  // Resolve workspace root relative to __dirname
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const filePath = path.join(workspaceRoot, '.github/copilot-instructions.md');
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Read file with state information
 * @param filePath File path
 * @param includeGitInfo Whether to include Git info (default: true)
 * @returns File content and state information
 */
export async function readWithState(
  filePath: string,
  includeGitInfo: boolean = true
): Promise<{ content: string; state: FileState }> {
  const content = await fs.readFile(filePath, 'utf-8');
  const stats = await fs.stat(filePath);
  const hash = calculateHash(content);

  const state: FileState = {
    path: filePath,
    hash,
    timestamp: stats.mtimeMs,
  };

  // Git情報を含める場合
  if (includeGitInfo) {
    const isGitManaged = await checkGitManaged(filePath);
    state.isGitManaged = isGitManaged;
    
    if (isGitManaged) {
      state.gitCommit = await getGitCommit(filePath);
      state.gitStatus = await getGitStatus(filePath);
    }
  }

  return {
    content,
    state,
  };
}

/**
 * .github/copilot-instructions.md を状態情報付きで読み込む
 * @returns ファイル内容と状態情報、存在しない場合はnull
 */
export async function readInstructionsFileWithState(): Promise<{
  content: string;
  state: FileState;
} | null> {
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const filePath = path.join(workspaceRoot, '.github/copilot-instructions.md');
  
  try {
    return await readWithState(filePath);
  } catch {
    return null;
  }
}

/**
 * Write to file with conflict check
 * @param filePath File path
 * @param content Content to write
 * @param expectedState Expected file state
 * @returns success: true on success, success: false with conflict info on conflict
 */
export async function writeWithConflictCheck(
  filePath: string,
  content: string,
  expectedState: FileState
): Promise<{ success: boolean; conflict?: ConflictInfo }> {
  try {
    // Get current file state
    const current = await readWithState(filePath);

    // Detect external changes by comparing hash values
    if (current.state.hash !== expectedState.hash) {
      return {
        success: false,
        conflict: {
          message: '外部変更が検知されました。ファイルが別のプロセスまたは人間開発者によって変更されています。',
          expectedHash: expectedState.hash,
          currentHash: current.state.hash,
          filePath: filePath,
        },
      };
    }

    // 競合なし、書き込み実行
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    // ファイルが存在しない場合など、エラーをそのままスロー
    throw error;
  }
}

/**
 * .github/copilot-instructions.md に書き込む（従来の関数、後方互換性のため残す）
 * @param content 指示書の内容
 */
export async function writeInstructionsFile(content: string): Promise<void> {
  // __dirnameから相対的にワークスペースルートを解決
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const filePath = path.join(workspaceRoot, '.github/copilot-instructions.md');
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * .github/copilot-instructions.md に競合チェック付きで書き込む
 * @param content 書き込む内容
 * @param expectedState 期待されるファイル状態
 * @returns 成功時はsuccess: true、競合時はsuccess: falseとconflict情報
 */
export async function writeInstructionsFileWithConflictCheck(
  content: string,
  expectedState: FileState
): Promise<{ success: boolean; conflict?: ConflictInfo }> {
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const filePath = path.join(workspaceRoot, '.github/copilot-instructions.md');
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  return writeWithConflictCheck(filePath, content, expectedState);
}
