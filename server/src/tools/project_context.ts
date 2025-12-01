export async function projectContext({ action }: { action: string }) {
  switch (action) {
    case 'create':
      return 'プロジェクト文脈を新規作成（MVP: 疑似応答）';
    case 'read':
      return 'プロジェクト文脈一覧（MVP: 疑似応答）';
    default:
      return `Unknown action: ${action}`;
  }
}
