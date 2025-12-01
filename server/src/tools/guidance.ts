import { readInstructionsFile } from '../utils/fileSystem';

export async function guidance({ action }: { action: string }) {
  switch (action) {
    case 'overview':
      return 'MCPサーバはCopilot指示書の外部記憶・編集・分析を担うMVPです。';
    case 'getting-started':
      return 'src/index.tsでguidance, project_context, instructions_structureをCLIで呼び出せます。';
    case 'current-state': {
      const content = await readInstructionsFile();
      if (!content) {
        return '指示書が未初期化です。.github/copilot-instructions.md を作成してください。';
      }
      const lines = content.split('\n');
      const preview = lines.slice(0, 10).join('\n');
      const totalLines = lines.length;
      return `指示書が存在します（全${totalLines}行）\n\n[先頭10行プレビュー]\n${preview}\n\n...`;
    }
    default:
      return `Unknown action: ${action}`;
  }
}
