/**
 * onboarding.ts
 * Safe onboarding tool for existing projects
 *
 * Responsibilities:
 * - Analyze existing instructions (analyze)
 * - Check onboarding status (status)
 * - Migration proposal (propose) ※Phase B
 * - Execute migration (migrate) ※Phase C
 * - Rollback (rollback) ※Phase C
 */

import {
  getOnboardingStatus,
  saveOnboardingStatus,
  OnboardingStatus,
  skipOnboarding,
} from '../utils/onboardingStatusManager.js';
import {
  analyzeInstructions,
  AnalysisResult,
} from '../utils/instructionsAnalyzer.js';

/**
 * Arguments for onboarding tool
 */
interface OnboardingArgs {
  action:
    | 'analyze'
    | 'status'
    | 'propose'
    | 'approve'
    | 'migrate'
    | 'rollback'
    | 'skip';
  // Parameters for Phase B and C will be added later
}

/**
 * Main function for onboarding tool
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
      return await handlePropose();

    case 'propose':
    case 'approve':
    case 'migrate':
    case 'rollback':
      return `Unimplemented action: ${args.action}\n\nPlanned for implementation in Phase B and C.`;

    default:
      return `Unknown action: ${args.action}`;
  }
}

/**
 * analyze action: Analyze existing instructions
 */
async function handleAnalyze(): Promise<string> {
  const analysis = await analyzeInstructions();
  const status = await getOnboardingStatus();

  // Update status
  const newStatus: OnboardingStatus = {
    ...status,
    status: 'analyzed',
    pattern: analysis.pattern,
    analyzedAt: new Date().toISOString(),
    problems: analysis.problems,
    // Determine restricted mode
    restrictedMode:
      analysis.pattern === 'messy' || analysis.pattern === 'unstructured',
  };

  // Automatically set to completed for compatible patterns
  if (analysis.pattern === 'clean' || analysis.pattern === 'structured') {
    newStatus.status = 'completed';
    newStatus.restrictedMode = false;
  }

  await saveOnboardingStatus(newStatus);

  // Format and return results
  return formatAnalysisResult(analysis);
}

/**
 * status action: Check onboarding status
 */
async function handleStatus(): Promise<string> {
  const status = await getOnboardingStatus();
  return formatStatus(status);
}

/**
 * skip action: Skip onboarding (decide later)
 */
async function handleSkip(): Promise<string> {
  await skipOnboarding();
  return (
    '✅ Onboarding skipped.\n\n' +
    'Will operate in normal mode.\n' +
    'You can re-analyze anytime: onboarding({ action: "analyze" })'
  );
}

/**
 * Format analysis results
 */
function formatAnalysisResult(analysis: AnalysisResult): string {
  let result = '📊 Analysis Results of Existing Instructions\n';
  result += '='.repeat(50) + '\n\n';

  switch (analysis.pattern) {
    case 'clean':
      result += '✅ **Pattern: Clean Installation**\n\n';
      result += 'No instruction file exists. You can create a new one.\n\n';
      result += '[Next Steps]\n';
      result += 'You can start using it right away.\n';
      result +=
        '- Use instructions_structure to create and manage instructions\n';
      result += '- Use change_context for dynamic instruction generation\n\n';
      result += '✓ Operates in normal mode.';
      break;

    case 'structured':
      result += '✅ **Pattern: Structured**\n\n';
      result += `Detected ${analysis.structured!.sections.length} section(s).\n\n`;
      result += '[Section List]\n';
      analysis.structured!.sections.forEach((s, index) => {
        result += `${index + 1}. **${s.heading}**\n`;
        result += `   - ${s.lineCount} lines (from Line ${s.startLine})\n`;
      });
      result += '\n✓ Compatible with this MCP server.\n';
      result += '✓ Operates in normal mode.\n\n';
      result += '[Next Steps]\n';
      result += 'Ready to use. All features are available.';
      break;

    case 'unstructured':
      result += '⚠️ **Pattern: Unstructured**\n\n';
      result += `Total ${analysis.unstructured!.lineCount} lines (${analysis.unstructured!.contentLength} characters)\n\n`;
      result += '[Current Issues]\n';
      result += 'No section structure, difficult to manage.\n\n';
      result += '[Benefits of Structuring]\n';
      result += '- ✅ Section-based updates and management\n';
      result += '- ✅ Conflict detection and auto-resolution\n';
      result += '- ✅ History management and rollback\n';
      result += '- ✅ Dynamic instruction generation (change_context)\n\n';
      result += '[Suggested Sections]\n';
      analysis.unstructured!.suggestedSections.forEach((s, index) => {
        const conf = Math.round(s.confidence * 100);
        result += `${index + 1}. **${s.heading}** (confidence: ${conf}%)\n`;
        // Content preview (first 2 lines)
        const preview = s.content.split('\n').slice(0, 2).join('\n');
        result += `   ${preview.substring(0, 60)}${preview.length > 60 ? '...' : ''}\n`;
      });
      result += '\n⚠️ **Currently in restricted mode**\n';
      result +=
        'Instruction updates, deletions, and insertions are restricted.\n\n';
      result += '[Next Steps]\n';
      result +=
        '1. Review proposal: onboarding({ action: "propose" }) ※Planned for Phase B\n';
      result += '2. Or manually organize and re-analyze\n';
      result +=
        '3. Skip and use in read-only mode: onboarding({ action: "skip" })';
      break;

    case 'messy':
      result += '🔴 **Pattern: Problematic**\n\n';
      result += `Detected ${analysis.problems!.length} issue(s).\n\n`;

      analysis.problems!.forEach((p, index) => {
        result += `**[Issue ${index + 1}] ${p.type === 'contradiction' ? 'Contradiction' : p.type === 'duplication' ? 'Duplication' : 'Ambiguity'}**\n`;
        result += `${p.description}\n\n`;

        result += 'Locations:\n';
        p.locations.slice(0, 3).forEach((loc) => {
          result += `  Line ${loc.line}: ${loc.text.substring(0, 70)}${loc.text.length > 70 ? '...' : ''}\n`;
        });
        if (p.locations.length > 3) {
          result += `  ... and ${p.locations.length - 3} more location(s)\n`;
        }
        result += '\n';
      });

      result += '⚠️ **Cannot be processed automatically**\n';
      result +=
        'Automatic migration is dangerous due to contradictions or duplications.\n\n';
      result += '⚠️ **Currently in restricted mode**\n';
      result +=
        'Instruction updates, deletions, and insertions are restricted.\n\n';
      result += '[Next Steps]\n';
      result += '1. Manually fix the above issues\n';
      result +=
        '2. Re-analyze after fixing: onboarding({ action: "analyze" })\n';
      result +=
        '3. Or skip and use in read-only mode: onboarding({ action: "skip" })\n\n';
      result += '[Fixing Tips]\n';
      result +=
        '- Contradiction: Confirm which is the latest policy and remove the old one\n';
      result += '- Duplication: Consolidate sections or remove one\n';
      result += '- Ambiguity: Rewrite with clear expressions';
      break;
  }

  return result;
}

/**
 * propose action: Generate migration proposal based on analysis
 * - Does NOT modify files
 * - Updates onboarding status to 'proposed' with rollback info
 */
async function handlePropose(): Promise<string> {
  const analysis = await analyzeInstructions();
  const status = await getOnboardingStatus();

  // Prepare proposal depending on pattern
  let title = '';
  let summary = '';
  let steps: string[] = [];
  let risk = 'low';

  const now = new Date();
  const backupDir = '.copilot-state/backup';
  const backupFile = `${backupDir}/copilot-instructions.md.bak-${now.toISOString().replace(/[:.]/g, '-')}`;
  const rollbackUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // +7 days
    .toISOString();

  switch (analysis.pattern) {
    case 'clean':
      title = 'Initial Setup Proposal';
      summary = '既存の指示書は存在しません。初期構成を作成します。';
      steps = [
        '1. .github/copilot-instructions.md を新規作成',
        '2. 必須メタセクションとガイドを挿入 (tools, conventions)',
        '3. 以降 change_context により動的生成を有効化',
      ];
      risk = 'low';
      break;

    case 'structured':
      title = 'No Migration Needed';
      summary = `既存の指示書は構造化されています (sections: ${analysis.structured!.sections.length}). そのまま利用可能です。`;
      steps = [
        '1. 変更なし。既存ファイルを尊重して利用',
        '2. 必要に応じて instructions_structure でセクション編集',
        '3. change_context でセクション抽出・生成を活用',
      ];
      risk = 'low';
      break;

    case 'unstructured':
      title = 'Structuring Proposal';
      summary = '非構造化の指示書を、提案セクションに基づき安全に構造化します。';
      steps = [
        '1. 現在の .github/copilot-instructions.md をバックアップ',
        '2. 提案セクション（見出し + 本文）で新しい構造化ファイルを生成 (乾式: diff表示のみ)',
        '3. セクションごとの差分を確認 (show-diff)',
        '4. ユーザー承認後に上書き (migrate)',
      ];
      risk = 'medium';
      break;

    case 'messy':
      title = 'Manual Fix Required';
      summary = `問題のある箇所が検出されました (${analysis.problems!.length}件)。自動移行は推奨されません。`; 
      steps = [
        '1. 矛盾・重複・曖昧表現を手動で修正',
        '2. 修正後に onboarding({ action: "analyze" }) を再実行',
        '3. 互換性が確認できたら propose → migrate を検討',
      ];
      risk = 'high';
      break;
  }

  // Update onboarding status to proposed (non-destructive)
  const newStatus: OnboardingStatus = {
    ...status,
    status: 'proposed',
    restrictedMode: analysis.pattern !== 'clean' && analysis.pattern !== 'structured',
    backupPath: backupFile,
    canRollback: true,
    rollbackUntil,
  };

  await saveOnboardingStatus(newStatus);

  // Format proposal output
  let output = '📝 Migration Proposal\n';
  output += '='.repeat(50) + '\n\n';
  output += `**Title**: ${title}\n`;
  output += `**Summary**: ${summary}\n`;
  output += `**Risk**: ${risk}\n`;
  output += `**Pattern**: ${analysis.pattern}\n\n`;

  // Include suggested sections for unstructured
  if (analysis.pattern === 'unstructured' && analysis.unstructured) {
    output += '[Suggested Sections]\n';
    analysis.unstructured.suggestedSections.slice(0, 8).forEach((s, i) => {
      const conf = Math.round(s.confidence * 100);
      output += `${i + 1}. ${s.heading} (confidence: ${conf}%)\n`;
    });
    output += '\n';
  }

  output += '[Steps]\n';
  steps.forEach((s) => (output += `${s}\n`));

  output += '\n[Rollback]\n';
  output += `Backup (planned): ${backupFile}\n`;
  output += `Deadline: ${rollbackUntil}\n`;

  output += '\n[Next]\n';
  output += '- Approve: onboarding({ action: "approve" }) ※未実装\n';
  output += '- Migrate: onboarding({ action: "migrate" }) ※未実装\n';
  output += '- Or skip: onboarding({ action: "skip" })\n';

  return output;
}

/**
 * Format onboarding status
 */
function formatStatus(status: OnboardingStatus): string {
  let result = '📋 Onboarding Status\n';
  result += '='.repeat(50) + '\n\n';

  // Status display
  const statusLabels: Record<string, string> = {
    not_started: 'Not Started',
    analyzed: 'Analyzed',
    proposed: 'Proposed',
    approved: 'Approved',
    completed: 'Completed',
    rejected: 'Rejected',
    skipped: 'Skipped',
  };

  result += `**Status**: ${statusLabels[status.status] || status.status}\n`;

  if (status.pattern) {
    const patternLabels: Record<string, string> = {
      clean: 'Clean (no instructions)',
      structured: 'Structured',
      unstructured: 'Unstructured',
      messy: 'Problematic',
    };
    result += `**Pattern**: ${patternLabels[status.pattern] || status.pattern}\n`;
  }

  if (status.analyzedAt) {
    const date = new Date(status.analyzedAt);
    result += `**Analyzed At**: ${date.toLocaleString('en-US')}\n`;
  }

  result += `**Restricted Mode**: ${status.restrictedMode ? '⚠️ ON' : '✅ OFF'}\n\n`;

  // Restricted mode details
  if (status.restrictedMode) {
    result += '[Available Features]\n';
    result += '- ✅ guidance (display guide)\n';
    result += '- ✅ instructions_structure: read (read-only)\n';
    result +=
      '- ✅ instructions_structure: detect-conflicts (conflict detection)\n';
    result += '- ✅ project_context (project context management)\n';
    result += '- ✅ feedback (feedback recording)\n';
    result +=
      '- ✅ change_context: read/list-history/show-diff (status check only)\n\n';

    result += '[Restricted Features]\n';
    result += '- ❌ instructions_structure: update/delete/insert\n';
    result +=
      '- ❌ change_context: update/reset/rollback (operations that modify instructions)\n\n';

    result += '[How to Lift Restrictions]\n';
    if (status.pattern === 'unstructured') {
      result +=
        '- Review migration proposal: onboarding({ action: "propose" }) ※Planned for Phase B\n';
      result +=
        '- Or manually organize and re-analyze: onboarding({ action: "analyze" })\n';
      result +=
        '- Skip and continue in read-only mode: onboarding({ action: "skip" })\n';
    } else if (status.pattern === 'messy') {
      result +=
        '- Manually fix issues and re-analyze: onboarding({ action: "analyze" })\n';
      result +=
        '- Skip and continue in read-only mode: onboarding({ action: "skip" })\n';
    }
  } else {
    result += '✅ All features are available.\n';
  }

  // Rollback information
  if (status.canRollback && status.backupPath && status.rollbackUntil) {
    result += '\n[Rollback]\n';
    const rollbackDate = new Date(status.rollbackUntil);
    result += `Deadline: ${rollbackDate.toLocaleString('en-US')}\n`;
    result += `Backup: ${status.backupPath}\n`;
    result +=
      'Execute rollback: onboarding({ action: "rollback" }) ※Planned for Phase C\n';
  }

  // Problem summary
  if (status.problems && status.problems.length > 0) {
    result += '\n[Detected Issues]\n';
    status.problems.forEach((p, index) => {
      result += `${index + 1}. ${p.description} (${p.locations.length} location(s))\n`;
    });
    result += '\nDetails: onboarding({ action: "analyze" })\n';
  }

  return result;
}
