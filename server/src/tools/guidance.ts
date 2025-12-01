export async function guidance({ action }: { action: string }) {
  switch (action) {
    case 'overview':
      return 'MCPサーバはCopilot指示書の外部記憶・編集・分析を担うMVPです。';
    case 'getting-started':
      return 'src/index.tsでguidance, project_context, instructions_structureをCLIで呼び出せます。';
    case 'current-state':
      return 'MVP: guidance, project_context, instructions_structureの雛形が実装済み。';
    default:
      return `Unknown action: ${action}`;
  }
}
