import * as fs from 'fs/promises';
import * as path from 'path';
import { getWorkspaceRoot } from './pathUtils.js';

export interface ProjectContext {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * プロジェクト文脈を保存するJSONファイルのパス
 */
function getContextsFilePath(): string {
  const workspaceRoot = getWorkspaceRoot(import.meta.url);
  return path.join(workspaceRoot, '.copilot-context/contexts.json');
}

/**
 * 保存されたプロジェクト文脈を読み込む
 * @returns プロジェクト文脈の配列、ファイルが存在しない場合は空配列
 */
export async function loadContexts(): Promise<ProjectContext[]> {
  const filePath = getContextsFilePath();
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * プロジェクト文脈をJSONファイルに保存
 * @param contexts 保存するプロジェクト文脈の配列
 */
export async function saveContexts(contexts: ProjectContext[]): Promise<void> {
  const filePath = getContextsFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(contexts, null, 2), 'utf-8');
}

/**
 * 新しいプロジェクト文脈を作成
 * @param data 文脈データ（idとタイムスタンプは自動生成）
 * @returns 作成された文脈
 */
export function createContext(
  data: Omit<ProjectContext, 'id' | 'createdAt' | 'updatedAt'>,
): ProjectContext {
  const now = new Date().toISOString();
  return {
    id: `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * プロジェクト文脈を更新
 * @param id 更新する文脈のID
 * @param updates 更新するフィールド
 * @returns 更新に成功した場合true、文脈が見つからない場合false
 */
export async function updateContext(
  id: string,
  updates: Partial<Omit<ProjectContext, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<boolean> {
  const contexts = await loadContexts();
  const index = contexts.findIndex((ctx) => ctx.id === id);

  if (index === -1) {
    return false;
  }

  contexts[index] = {
    ...contexts[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveContexts(contexts);
  return true;
}

/**
 * プロジェクト文脈を削除
 * @param id 削除する文脈のID
 * @returns 削除に成功した場合true、文脈が見つからない場合false
 */
export async function deleteContext(id: string): Promise<boolean> {
  const contexts = await loadContexts();
  const index = contexts.findIndex((ctx) => ctx.id === id);

  if (index === -1) {
    return false;
  }

  contexts.splice(index, 1);
  await saveContexts(contexts);
  return true;
}

/**
 * プロジェクト文脈をフィルタリング
 * @param filters フィルタ条件
 * @returns フィルタリングされた文脈の配列
 */
export async function filterContexts(filters: {
  category?: string;
  tags?: string[];
  minPriority?: number;
  maxPriority?: number;
}): Promise<ProjectContext[]> {
  const contexts = await loadContexts();

  return contexts.filter((ctx) => {
    if (filters.category && ctx.category !== filters.category) {
      return false;
    }

    if (filters.tags && filters.tags.length > 0) {
      const hasTag = filters.tags.some((tag) => ctx.tags.includes(tag));
      if (!hasTag) {
        return false;
      }
    }

    if (
      filters.minPriority !== undefined &&
      ctx.priority < filters.minPriority
    ) {
      return false;
    }

    if (
      filters.maxPriority !== undefined &&
      ctx.priority > filters.maxPriority
    ) {
      return false;
    }

    return true;
  });
}
