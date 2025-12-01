export async function instructionsStructure({ action }: { action: string }) {
  switch (action) {
    case 'read':
      return '指示書Markdown ASTを取得（MVP: 疑似応答）';
    case 'update':
      return '指示書Markdown ASTを更新（MVP: 疑似応答）';
    default:
      return `Unknown action: ${action}`;
  }
}
