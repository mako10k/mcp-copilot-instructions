import { readInstructionsFile } from '../utils/fileSystem';
import { getOnboardingStatus } from '../utils/onboardingStatusManager';

export async function guidance({ action }: { action: string }) {
  switch (action) {
    case 'overview':
      return 'MCPサーバはCopilot指示書の外部記憶・編集・分析を担うMVPです。';
    case 'getting-started':
      return 'src/index.tsでguidance, project_context, instructions_structureをCLIで呼び出せます。';
    case 'current-state': {
      // 指示書の状態
      const content = await readInstructionsFile();
      let instructionsStatus: string;
      if (!content) {
        instructionsStatus = '指示書が未初期化です。.github/copilot-instructions.md を作成してください。';
      } else {
        const lines = content.split('\n');
        const preview = lines.slice(0, 10).join('\n');
        const totalLines = lines.length;
        instructionsStatus = `指示書が存在します（全${totalLines}行）\n\n[先頭10行プレビュー]\n${preview}\n\n...`;
      }
      
      // オンボーディング状態
      const onboardingStatus = await getOnboardingStatus();
      let onboardingInfo = '\n\n【オンボーディング状態】\n';
      
      if (onboardingStatus.status === 'not_started') {
        onboardingInfo += '⚠️  未実施: 既存プロジェクトへの導入分析が必要です。\n\n';
        onboardingInfo += '【推奨アクション】\n';
        onboardingInfo += 'onboarding({ action: "analyze" }) を実行して、既存の指示書を分析してください。\n';
        onboardingInfo += '新規プロジェクトの場合は、onboarding({ action: "skip" }) でスキップできます。';
      } else {
        const statusLabels = {
          analyzed: '分析済み',
          proposed: '提案作成済み',
          approved: '承認済み',
          completed: '完了',
          rejected: '却下',
          skipped: 'スキップ済み',
        };
        const statusLabel = statusLabels[onboardingStatus.status as keyof typeof statusLabels] || onboardingStatus.status;
        
        onboardingInfo += `状態: ${statusLabel}\n`;
        if (onboardingStatus.pattern) {
          const patternLabels = {
            clean: '✓ クリーン（新規作成）',
            structured: '✓ 構造化済み（互換性あり）',
            unstructured: '⚠️  非構造化（マイグレーション推奨）',
            messy: '❌ 問題あり（手動修正必要）',
          };
          onboardingInfo += `パターン: ${patternLabels[onboardingStatus.pattern]}\n`;
        }
        
        if (onboardingStatus.restrictedMode) {
          onboardingInfo += '\n🔒 機能制限モード: 一部の書き込み操作が制限されています。\n';
          onboardingInfo += '【制限される機能】\n';
          onboardingInfo += '- instructions_structure: update/delete/insert/resolve-conflict\n';
          onboardingInfo += '- change_context: update/reset/rollback\n\n';
          onboardingInfo += '【利用可能な機能】\n';
          onboardingInfo += '- guidance, project_context, feedback（すべての操作）\n';
          onboardingInfo += '- instructions_structure: read/detect-conflicts（読み取り専用）\n';
          onboardingInfo += '- change_context: read/list-history/show-diff（読み取り専用）\n\n';
          onboardingInfo += '【制限解除】\n';
          onboardingInfo += 'onboarding({ action: "status" }) で詳細を確認してください。';
        } else {
          onboardingInfo += '✓ 通常モード: すべての機能が利用可能です。';
        }
        
        if (onboardingStatus.analyzedAt) {
          onboardingInfo += `\n\n分析日時: ${onboardingStatus.analyzedAt}`;
        }
      }
      
      return instructionsStatus + onboardingInfo;
    }
    default:
      return `Unknown action: ${action}`;
  }
}
