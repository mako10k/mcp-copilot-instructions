import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * ロック情報
 */
interface LockInfo {
  sessionId: string;
  acquiredAt: number;
  pid: number;
}

const LOCK_FILE = '.copilot-state/.lock';
const LOCK_TIMEOUT_MS = 5000; // 5秒
const RETRY_INTERVAL_MS = 100; // 100ms

/**
 * ロックファイルのパスを取得
 */
function getLockFilePath(): string {
  const workspaceRoot = path.resolve(__dirname, '../../../');
  return path.join(workspaceRoot, LOCK_FILE);
}

/**
 * セッションIDを生成（プロセスID + タイムスタンプ）
 */
function generateSessionId(): string {
  return `${process.pid}-${Date.now()}`;
}

/**
 * ロックを取得
 * @param timeoutMs タイムアウト時間（ミリ秒）
 * @returns 成功時はsessionId、失敗時はnull
 */
export async function acquireLock(timeoutMs: number = LOCK_TIMEOUT_MS): Promise<string | null> {
  const sessionId = generateSessionId();
  const lockPath = getLockFilePath();
  const startTime = Date.now();
  
  // ディレクトリが存在しない場合は作成
  await fs.mkdir(path.dirname(lockPath), { recursive: true });
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      // ロックファイルが存在するか確認
      const exists = await fs.access(lockPath).then(() => true).catch(() => false);
      
      if (!exists) {
        // ロックファイルが無い場合は作成して取得成功
        const lockInfo: LockInfo = {
          sessionId,
          acquiredAt: Date.now(),
          pid: process.pid,
        };
        await fs.writeFile(lockPath, JSON.stringify(lockInfo, null, 2), { flag: 'wx' });
        return sessionId;
      }
      
      // ロックファイルが存在する場合、古いロックかチェック
      const content = await fs.readFile(lockPath, 'utf-8');
      const lockInfo: LockInfo = JSON.parse(content);
      
      // タイムアウト時間を超えた古いロックは削除
      if (Date.now() - lockInfo.acquiredAt > LOCK_TIMEOUT_MS * 2) {
        console.warn(`Stale lock detected (session: ${lockInfo.sessionId}, age: ${Date.now() - lockInfo.acquiredAt}ms). Removing...`);
        await fs.unlink(lockPath);
        continue; // 再試行
      }
      
      // ロックが取得できないので少し待つ
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS));
      
    } catch (error: any) {
      // EEXIST: ファイル作成の競合（他のプロセスが先に作成）→ 再試行
      if (error.code === 'EEXIST') {
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS));
        continue;
      }
      
      // その他のエラーは再スロー
      throw error;
    }
  }
  
  // タイムアウト
  return null;
}

/**
 * ロックを解放
 * @param sessionId 取得時に返されたセッションID
 */
export async function releaseLock(sessionId: string): Promise<void> {
  const lockPath = getLockFilePath();
  
  try {
    // ロックファイルの内容を確認
    const content = await fs.readFile(lockPath, 'utf-8');
    const lockInfo: LockInfo = JSON.parse(content);
    
    // 自分のセッションIDと一致する場合のみ削除
    if (lockInfo.sessionId === sessionId) {
      await fs.unlink(lockPath);
    } else {
      console.warn(`Lock session mismatch. Expected: ${sessionId}, Found: ${lockInfo.sessionId}`);
    }
  } catch (error: any) {
    // ファイルが既に無い場合は無視
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * ロックを取得して処理を実行し、自動的に解放
 * @param fn 実行する非同期関数
 * @param timeoutMs タイムアウト時間（ミリ秒）
 */
export async function withLock<T>(
  fn: () => Promise<T>,
  timeoutMs: number = LOCK_TIMEOUT_MS
): Promise<T> {
  const sessionId = await acquireLock(timeoutMs);
  
  if (!sessionId) {
    throw new Error('Failed to acquire lock: timeout');
  }
  
  try {
    return await fn();
  } finally {
    await releaseLock(sessionId);
  }
}

/**
 * 現在のロック状態を取得（デバッグ用）
 */
export async function getLockStatus(): Promise<LockInfo | null> {
  const lockPath = getLockFilePath();
  
  try {
    const content = await fs.readFile(lockPath, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null; // ロックされていない
    }
    throw error;
  }
}
