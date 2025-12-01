import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * ファイルの状態を表すインターフェース
 */
export interface FileState {
  path: string;
  hash: string; // SHA-256ハッシュ値
  timestamp: number; // ファイルの最終更新時刻（ミリ秒）
}

/**
 * 競合情報を表すインターフェース
 */
export interface ConflictInfo {
  message: string;
  expectedHash: string;
  currentHash: string;
  filePath: string;
}

/**
 * 文字列のSHA-256ハッシュを計算
 */
function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * .github/copilot-instructions.md を読み込む
 * @returns 指示書の内容、存在しない場合はnull
 */
export async function readInstructionsFile(): Promise<string | null> {
  // __dirnameから相対的にワークスペースルートを解決
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const filePath = path.join(workspaceRoot, '.github/copilot-instructions.md');
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * ファイルを状態情報付きで読み込む
 * @param filePath ファイルのパス
 * @returns ファイル内容と状態情報
 */
export async function readWithState(
  filePath: string
): Promise<{ content: string; state: FileState }> {
  const content = await fs.readFile(filePath, 'utf-8');
  const stats = await fs.stat(filePath);
  const hash = calculateHash(content);

  return {
    content,
    state: {
      path: filePath,
      hash,
      timestamp: stats.mtimeMs,
    },
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
 * 競合チェック付きでファイルに書き込む
 * @param filePath ファイルのパス
 * @param content 書き込む内容
 * @param expectedState 期待されるファイル状態
 * @returns 成功時はsuccess: true、競合時はsuccess: falseとconflict情報
 */
export async function writeWithConflictCheck(
  filePath: string,
  content: string,
  expectedState: FileState
): Promise<{ success: boolean; conflict?: ConflictInfo }> {
  try {
    // 現在のファイル状態を取得
    const current = await readWithState(filePath);

    // ハッシュ値を比較して外部変更を検知
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
