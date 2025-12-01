import * as fs from 'fs/promises';
import * as path from 'path';

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
  const workspaceRoot = path.resolve(__dirname, '../../../');
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
  data: Omit<ProjectContext, 'id' | 'createdAt' | 'updatedAt'>
): ProjectContext {
  const now = new Date().toISOString();
  return {
    id: `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
}
