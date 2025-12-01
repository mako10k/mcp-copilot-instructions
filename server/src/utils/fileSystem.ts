import * as fs from 'fs/promises';
import * as path from 'path';

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
 * .github/copilot-instructions.md に書き込む
 * @param content 指示書の内容
 */
export async function writeInstructionsFile(content: string): Promise<void> {
  // __dirnameから相対的にワークスペースルートを解決
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const filePath = path.join(workspaceRoot, '.github/copilot-instructions.md');
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}
