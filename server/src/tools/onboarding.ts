/**
 * onboarding.ts
 * 既存プロジェクトへの安全な導入ツール
 * 
 * 責務:
 * - 既存指示書の分析（analyze）
 * - オンボーディング状態の確認（status）
 * - マイグレーション提案（propose）※Phase B
 * - マイグレーション実行（migrate）※Phase C
 * - ロールバック（rollback）※Phase C
 */

import { 
  getOnboardingStatus, 
  saveOnboardingStatus, 
  OnboardingStatus,
  completeOnboarding,
  skipOnboarding
} from '../utils/onboardingStatusManager';
import { 
  analyzeInstructions, 
  AnalysisResult 
} from '../utils/instructionsAnalyzer';

/**
 * onboardingツールの引数
 */
interface OnboardingArgs {
  action: 'analyze' | 'status' | 'propose' | 'approve' | 'migrate' | 'rollback' | 'skip';
  // Phase B, C用のパラメータは後で追加
}

/**
 * onboardingツールのメイン関数
 */
export async function onboarding(args: OnboardingArgs): Promise<string> {
  switch (args.action) {
    case 'analyze':
      return await handleAnalyze();
    
    case 'status':
      return await handleStatus();
    
    case 'skip':
      return await handleSkip();
    
    case 'propose':
    case 'approve':
    case 'migrate':
    case 'rollback':
      return `未実装のアクション: ${args.action}\n\nPhase B, Cで実装予定です。`;
    
    default:
      return `不明なアクション: ${args.action}`;
  }
}

/**
 * analyzeアクション: 既存指示書を分析
 */
async function handleAnalyze(): Promise<string> {
  const analysis = await analyzeInstructions();
  const status = await getOnboardingStatus();
  
  // 状態を更新
  const newStatus: OnboardingStatus = {
    ...status,
    status: 'analyzed',
    pattern: analysis.pattern,
    analyzedAt: new Date().toISOString(),
    problems: analysis.problems,
    // 機能制限モードの判定
    restrictedMode: analysis.pattern === 'messy' || analysis.pattern === 'unstructured'
  };
  
  // 互換性のあるパターンの場合は自動的に完了状態にする
  if (analysis.pattern === 'clean' || analysis.pattern === 'structured') {
    newStatus.status = 'completed';
    newStatus.restrictedMode = false;
  }
  
  await saveOnboardingStatus(newStatus);
  
  // 結果を整形して返す
  return formatAnalysisResult(analysis);
}

/**
 * statusアクション: オンボーディング状態を確認
 */
async function handleStatus(): Promise<string> {
  const status = await getOnboardingStatus();
  return formatStatus(status);
}

/**
 * skipアクション: オンボーディングをスキップ（後で検討）
 */
async function handleSkip(): Promise<string> {
  await skipOnboarding();
  return '✅ オンボーディングをスキップしました。\n\n' +
         '通常モードで動作します。\n' +
         'いつでも再分析できます: onboarding({ action: "analyze" })';
}

/**
 * 分析結果を整形
 */
function formatAnalysisResult(analysis: AnalysisResult): string {
  let result = '📊 既存指示書の分析結果\n';
  result += '='.repeat(50) + '\n\n';
  
  switch (analysis.pattern) {
    case 'clean':
      result += '✅ **パターン: クリーン導入**\n\n';
      result += '指示書が存在しません。新規作成できます。\n\n';
      result += '【次のステップ】\n';
      result += 'そのまま利用を開始してください。\n';
      result += '- instructions_structure を使って指示書を作成・管理できます\n';
      result += '- change_context で動的な指示書生成が利用できます\n\n';
      result += '✓ 通常モードで動作します。';
      break;
      
    case 'structured':
      result += '✅ **パターン: 構造化済み**\n\n';
      result += `${analysis.structured!.sections.length}個のセクションを検出しました。\n\n`;
      result += '【セクション一覧】\n';
      analysis.structured!.sections.forEach((s, index) => {
        result += `${index + 1}. **${s.heading}**\n`;
        result += `   - ${s.lineCount}行（Line ${s.startLine}〜）\n`;
      });
      result += '\n✓ このMCPサーバと互換性があります。\n';
      result += '✓ 通常モードで動作します。\n\n';
      result += '【次のステップ】\n';
      result += 'そのまま利用できます。すべての機能が使用可能です。';
      break;
      
    case 'unstructured':
      result += '⚠️ **パターン: 非構造化**\n\n';
      result += `全${analysis.unstructured!.lineCount}行（${analysis.unstructured!.contentLength}文字）\n\n`;
      result += '【現在の問題】\n';
      result += 'セクション構造がなく、管理が困難です。\n\n';
      result += '【構造化のメリット】\n';
      result += '- ✅ セクション単位での更新・管理\n';
      result += '- ✅ 競合検出と自動解決\n';
      result += '- ✅ 履歴管理とロールバック\n';
      result += '- ✅ 動的な指示書生成（change_context）\n\n';
      result += '【提案するセクション】\n';
      analysis.unstructured!.suggestedSections.forEach((s, index) => {
        const conf = Math.round(s.confidence * 100);
        result += `${index + 1}. **${s.heading}** (信頼度: ${conf}%)\n`;
        // 内容のプレビュー（最初の2行）
        const preview = s.content.split('\n').slice(0, 2).join('\n');
        result += `   ${preview.substring(0, 60)}${preview.length > 60 ? '...' : ''}\n`;
      });
      result += '\n⚠️ **現在は機能制限モード**\n';
      result += '指示書の更新・削除・挿入は制限されています。\n\n';
      result += '【次のステップ】\n';
      result += '1. 提案を確認: onboarding({ action: "propose" }) ※Phase B実装予定\n';
      result += '2. または、手動で整理してから再分析\n';
      result += '3. スキップして読み取り専用で使用: onboarding({ action: "skip" })';
      break;
      
    case 'messy':
      result += '🔴 **パターン: 問題あり**\n\n';
      result += `${analysis.problems!.length}個の問題が検出されました。\n\n`;
      
      analysis.problems!.forEach((p, index) => {
        result += `**[問題${index + 1}] ${p.type === 'contradiction' ? '矛盾' : p.type === 'duplication' ? '重複' : '不明瞭'}**\n`;
        result += `${p.description}\n\n`;
        
        result += '該当箇所:\n';
        p.locations.slice(0, 3).forEach((loc) => {
          result += `  Line ${loc.line}: ${loc.text.substring(0, 70)}${loc.text.length > 70 ? '...' : ''}\n`;
        });
        if (p.locations.length > 3) {
          result += `  ... 他${p.locations.length - 3}箇所\n`;
        }
        result += '\n';
      });
      
      result += '⚠️ **自動処理できません**\n';
      result += '矛盾や重複があるため、自動マイグレーションは危険です。\n\n';
      result += '⚠️ **現在は機能制限モード**\n';
      result += '指示書の更新・削除・挿入は制限されています。\n\n';
      result += '【次のステップ】\n';
      result += '1. 上記の問題を手動で修正してください\n';
      result += '2. 修正後に再分析: onboarding({ action: "analyze" })\n';
      result += '3. または、スキップして読み取り専用で使用: onboarding({ action: "skip" })\n\n';
      result += '【修正のヒント】\n';
      result += '- 矛盾: どちらが最新の方針か確認し、古い方を削除\n';
      result += '- 重複: セクションを統合するか、片方を削除\n';
      result += '- 不明瞭: 明確な表現に書き換え';
      break;
  }
  
  return result;
}

/**
 * オンボーディング状態を整形
 */
function formatStatus(status: OnboardingStatus): string {
  let result = '📋 オンボーディング状態\n';
  result += '='.repeat(50) + '\n\n';
  
  // ステータス表示
  const statusLabels: Record<string, string> = {
    'not_started': '未開始',
    'analyzed': '分析済み',
    'proposed': '提案済み',
    'approved': '承認済み',
    'completed': '完了',
    'rejected': '拒否',
    'skipped': 'スキップ'
  };
  
  result += `**ステータス**: ${statusLabels[status.status] || status.status}\n`;
  
  if (status.pattern) {
    const patternLabels: Record<string, string> = {
      'clean': 'クリーン（指示書なし）',
      'structured': '構造化済み',
      'unstructured': '非構造化',
      'messy': '問題あり'
    };
    result += `**パターン**: ${patternLabels[status.pattern] || status.pattern}\n`;
  }
  
  if (status.analyzedAt) {
    const date = new Date(status.analyzedAt);
    result += `**分析日時**: ${date.toLocaleString('ja-JP')}\n`;
  }
  
  result += `**機能制限モード**: ${status.restrictedMode ? '⚠️ ON' : '✅ OFF'}\n\n`;
  
  // 機能制限モードの詳細
  if (status.restrictedMode) {
    result += '【利用可能な機能】\n';
    result += '- ✅ guidance (ガイド表示)\n';
    result += '- ✅ instructions_structure: read (読み取りのみ)\n';
    result += '- ✅ instructions_structure: detect-conflicts (競合検出)\n';
    result += '- ✅ project_context (プロジェクト文脈管理)\n';
    result += '- ✅ feedback (フィードバック記録)\n';
    result += '- ✅ change_context: read/list-history/show-diff (状態確認のみ)\n\n';
    
    result += '【制限される機能】\n';
    result += '- ❌ instructions_structure: update/delete/insert\n';
    result += '- ❌ change_context: update/reset/rollback (指示書変更を伴う操作)\n\n';
    
    result += '【制限解除の方法】\n';
    if (status.pattern === 'unstructured') {
      result += '- マイグレーション提案を確認: onboarding({ action: "propose" }) ※Phase B実装予定\n';
      result += '- または、手動で整理してから再分析: onboarding({ action: "analyze" })\n';
      result += '- スキップして読み取り専用継続: onboarding({ action: "skip" })\n';
    } else if (status.pattern === 'messy') {
      result += '- 問題を手動で修正してから再分析: onboarding({ action: "analyze" })\n';
      result += '- スキップして読み取り専用継続: onboarding({ action: "skip" })\n';
    }
  } else {
    result += '✅ すべての機能が利用可能です。\n';
  }
  
  // ロールバック情報
  if (status.canRollback && status.backupPath && status.rollbackUntil) {
    result += '\n【ロールバック】\n';
    const rollbackDate = new Date(status.rollbackUntil);
    result += `期限: ${rollbackDate.toLocaleString('ja-JP')}\n`;
    result += `バックアップ: ${status.backupPath}\n`;
    result += 'ロールバック実行: onboarding({ action: "rollback" }) ※Phase C実装予定\n';
  }
  
  // 問題の概要
  if (status.problems && status.problems.length > 0) {
    result += '\n【検出された問題】\n';
    status.problems.forEach((p, index) => {
      result += `${index + 1}. ${p.description} (${p.locations.length}箇所)\n`;
    });
    result += '\n詳細: onboarding({ action: "analyze" })\n';
  }
  
  return result;
}
