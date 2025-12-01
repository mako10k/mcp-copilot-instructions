/**
 * onboardingStatusManager.ts
 * オンボーディング状態の管理
 * 
 * 責務:
 * - オンボーディング状態の読み書き
 * - 機能制限モードの判定
 * - オンボーディング完了の判定
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const STATUS_DIR = '.copilot-state';
const STATUS_FILE = path.join(STATUS_DIR, 'onboarding.json');

/**
 * オンボーディング状態
 */
export interface OnboardingStatus {
  version: string;                        // スキーマバージョン
  status: 'not_started'                   // 未開始
        | 'analyzed'                      // 分析済み
        | 'proposed'                      // 提案済み
        | 'approved'                      // 承認済み
        | 'completed'                     // 完了
        | 'rejected'                      // 拒否
        | 'skipped';                      // スキップ
  
  pattern?: 'clean'                       // 指示書なし
          | 'structured'                  // 構造化済み（互換）
          | 'unstructured'                // 非構造化
          | 'messy';                      // めちゃくちゃ
  
  analyzedAt?: string;                    // 分析日時（ISO 8601）
  decidedAt?: string;                     // ユーザー判断日時
  migratedAt?: string;                    // マイグレーション実行日時
  
  problems?: Array<{                      // 検出された問題
    type: 'contradiction' | 'duplication' | 'unclear';
    description: string;
    locations: Array<{ line: number; text: string }>;
  }>;
  
  backupPath?: string;                    // バックアップファイルパス
  canRollback: boolean;                   // ロールバック可否
  rollbackUntil?: string;                 // ロールバック期限
  
  restrictedMode: boolean;                // 機能制限モード
}

/**
 * 初期状態を返す
 */
function getInitialStatus(): OnboardingStatus {
  return {
    version: '1.0.0',
    status: 'not_started',
    canRollback: false,
    restrictedMode: false
  };
}

/**
 * オンボーディング状態を取得
 * ファイルが存在しない場合は初期状態を返す
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  try {
    const content = await fs.readFile(STATUS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // ファイルが存在しない場合は初期状態
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return getInitialStatus();
    }
    throw error;
  }
}

/**
 * オンボーディング状態を保存
 */
export async function saveOnboardingStatus(status: OnboardingStatus): Promise<void> {
  // ディレクトリが存在しない場合は作成
  await fs.mkdir(STATUS_DIR, { recursive: true });
  
  // 状態を保存
  await fs.writeFile(
    STATUS_FILE, 
    JSON.stringify(status, null, 2), 
    'utf-8'
  );
}

/**
 * 機能制限モードかどうか
 * 
 * 制限モードになる条件:
 * - status が 'analyzed' で pattern が 'unstructured' または 'messy'
 * - status が 'proposed' でまだ承認されていない
 * - status が 'rejected'
 * 
 * 制限モードでない条件:
 * - status が 'not_started' (初回状態)
 * - status が 'completed' または 'skipped'
 * - pattern が 'clean' または 'structured'
 */
export async function isRestrictedMode(): Promise<boolean> {
  const status = await getOnboardingStatus();
  return status.restrictedMode;
}

/**
 * オンボーディング完了済みかどうか
 * 
 * 完了条件:
 * - status が 'completed' (マイグレーション完了)
 * - status が 'skipped' (ユーザーがスキップを選択)
 * - pattern が 'clean' または 'structured' で status が 'analyzed' (互換性あり)
 */
export async function isOnboardingCompleted(): Promise<boolean> {
  const status = await getOnboardingStatus();
  
  // 明示的な完了状態
  if (status.status === 'completed' || status.status === 'skipped') {
    return true;
  }
  
  // 互換性のあるパターンの場合は分析済みで完了とみなす
  if (status.status === 'analyzed' && 
      (status.pattern === 'clean' || status.pattern === 'structured')) {
    return true;
  }
  
  return false;
}

/**
 * オンボーディングをスキップ（通常モードへ移行）
 * ユーザーが「後で」を選択した場合などに使用
 */
export async function skipOnboarding(): Promise<void> {
  const status = await getOnboardingStatus();
  
  const newStatus: OnboardingStatus = {
    ...status,
    status: 'skipped',
    decidedAt: new Date().toISOString(),
    restrictedMode: false
  };
  
  await saveOnboardingStatus(newStatus);
}

/**
 * オンボーディングを完了状態にする
 * マイグレーション成功時または互換性確認時に使用
 */
export async function completeOnboarding(): Promise<void> {
  const status = await getOnboardingStatus();
  
  const newStatus: OnboardingStatus = {
    ...status,
    status: 'completed',
    decidedAt: new Date().toISOString(),
    restrictedMode: false
  };
  
  await saveOnboardingStatus(newStatus);
}
