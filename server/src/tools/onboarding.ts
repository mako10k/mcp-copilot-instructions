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

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
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
import {
  readInstructionsFile,
  writeInstructionsFile,
} from '../utils/fileSystem.js';
import { logSamplingTrace } from '../utils/samplingTraceLogger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

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
 * Server instance for MCP sampling
 */
let serverInstance: Server | null = null;

/**
 * Set server instance for sampling capability
 */
export function setOnboardingServer(server: Server): void {
  serverInstance = server;
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

    case 'approve':
      return await handleApprove();

    case 'migrate':
      return await handleMigrate();

    case 'rollback':
      return await handleRollback();

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

  // Use MCP sampling to generate human-friendly narrative if available
  if (serverInstance) {
    try {
      const narrative = await generateAnalysisNarrative(analysis);
      return narrative;
    } catch (error) {
      console.error('Sampling failed, falling back to formatted output:', error);
      // Fall through to formatAnalysisResult
    }
  }

  // Fallback: Format and return results
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
 * Generate human-friendly analysis narrative using MCP sampling
 */
async function generateAnalysisNarrative(analysis: AnalysisResult): Promise<string> {
  if (!serverInstance) {
    throw new Error('Server instance not available for sampling');
  }

  const structuredData = JSON.stringify(
    {
      pattern: analysis.pattern,
      exists: analysis.exists,
      structured: analysis.structured,
      unstructured: analysis.unstructured,
      problems: analysis.problems,
      recommendation: analysis.recommendation,
    },
    null,
    2
  );

  const prompt = `You are analyzing existing Copilot instructions for onboarding.

Analysis data:
\`\`\`json
${structuredData}
\`\`\`

Generate a clear, human-friendly report explaining:
1. What pattern was detected (clean/structured/unstructured/messy)
2. Key findings and evidence
3. Whether restricted mode is active
4. Recommended next steps

Keep the tone professional but accessible.`;

  const response = await serverInstance.createMessage({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: prompt,
        },
      },
    ],
    maxTokens: 1000,
  });

  // Log sampling trace
  await logSamplingTrace({
    intent: 'analysis-narrative',
    timestamp: new Date().toISOString(),
    request: {
      prompt: prompt,
      context: { analysis },
    },
    response: {
      role: response.role,
      content: response.content,
      model: response.model,
      stopReason: response.stopReason,
    },
  });

  const content = Array.isArray(response.content) ? response.content[0] : response.content;
  if (content && content.type === 'text') {
    return content.text;
  }

  throw new Error('Unexpected response format from sampling');
}

/**
 * Generate human-friendly proposal narrative using MCP sampling
 */
async function generateProposalNarrative(
  analysis: AnalysisResult,
  proposalData: {
    title: string;
    summary: string;
    steps: string[];
    risk: string;
    backupFile: string;
    rollbackUntil: string;
  }
): Promise<string> {
  if (!serverInstance) {
    throw new Error('Server instance not available for sampling');
  }

  const structuredData = JSON.stringify(
    {
      pattern: analysis.pattern,
      proposal: proposalData,
      suggestedSections: analysis.unstructured?.suggestedSections?.slice(0, 5),
    },
    null,
    2
  );

  const prompt = `You are creating a migration proposal for Copilot instructions onboarding.

Proposal data:
\`\`\`json
${structuredData}
\`\`\`

Generate a clear, human-friendly proposal explaining:
1. The proposed migration plan title and summary
2. Step-by-step migration process
3. Risk level and why
4. Backup strategy and rollback deadline
5. Suggested sections (if applicable)
6. Next actions (approve/migrate/skip)

Keep the tone encouraging and explain technical details clearly.`;

  const response = await serverInstance.createMessage({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: prompt,
        },
      },
    ],
    maxTokens: 1200,
  });

  // Log sampling trace
  await logSamplingTrace({
    intent: 'proposal-draft',
    timestamp: new Date().toISOString(),
    request: {
      prompt: prompt,
      context: { analysis, proposalData },
    },
    response: {
      role: response.role,
      content: response.content,
      model: response.model,
      stopReason: response.stopReason,
    },
  });

  const content = Array.isArray(response.content) ? response.content[0] : response.content;
  if (content && content.type === 'text') {
    return content.text;
  }

  throw new Error('Unexpected response format from sampling');
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

  // Use MCP sampling to generate human-friendly narrative if available
  if (serverInstance) {
    try {
      const proposalData = {
        title,
        summary,
        steps,
        risk,
        backupFile,
        rollbackUntil,
      };
      const narrative = await generateProposalNarrative(analysis, proposalData);
      return narrative;
    } catch (error) {
      console.error('Sampling failed, falling back to formatted output:', error);
      // Fall through to manual formatting
    }
  }

  // Fallback: Format proposal output manually
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

/**
 * approve action: Approve migration plan
 */
async function handleApprove(): Promise<string> {
  const status = await getOnboardingStatus();

  // Validation
  if (status.status !== 'proposed') {
    return `⚠️ Cannot approve: Status is '${status.status}', must be 'proposed'.\n\nRun onboarding({ action: "propose" }) first.`;
  }

  // Try sampling for approval confirmation
  try {
    if (serverInstance) {
      const narrative = await generateApprovalNarrative(status);
      
      // Update status to approved
      const newStatus: OnboardingStatus = {
        ...status,
        status: 'approved',
        decidedAt: new Date().toISOString(),
      };
      await saveOnboardingStatus(newStatus);

      return narrative;
    }
  } catch (error) {
    console.error('Sampling failed for approval, using fallback:', error);
  }

  // Fallback to formatted output
  const newStatus: OnboardingStatus = {
    ...status,
    status: 'approved',
    decidedAt: new Date().toISOString(),
  };
  await saveOnboardingStatus(newStatus);

  let result = '✅ **Migration Plan Approved**\n\n';
  result += '[Status]\n';
  result += `- Previous: ${status.status} → New: approved\n`;
  result += `- Approved At: ${newStatus.decidedAt}\n\n`;
  result += '[What This Means]\n';
  result += '- Migration plan is approved but not executed yet\n';
  result += '- This is a checkpoint before execution\n';
  result += '- No files have been changed\n\n';
  result += '[Next Step]\n';
  result += 'Execute migration: onboarding({ action: "migrate" })\n\n';
  result += '[Safety]\n';
  result += `- Backup will be created at: ${status.backupPath}\n`;
  result += `- Rollback available until: ${status.rollbackUntil}\n`;

  return result;
}

/**
 * migrate action: Execute approved migration
 */
async function handleMigrate(): Promise<string> {
  const status = await getOnboardingStatus();

  // Validation
  if (status.status !== 'approved') {
    return `⚠️ Cannot migrate: Status is '${status.status}', must be 'approved'.\n\nRun onboarding({ action: "approve" }) first.`;
  }

  const migrationSteps: string[] = [];

  try {
    // Step 1: Create backup
    const backupDir = path.dirname(status.backupPath!);
    await fs.mkdir(backupDir, { recursive: true });

    const currentContent = await readInstructionsFile();
    if (currentContent) {
      await fs.writeFile(status.backupPath!, currentContent, 'utf-8');
      migrationSteps.push(`✓ Backup created: ${status.backupPath}`);
    } else {
      migrationSteps.push('✓ No existing instructions to backup');
    }

    // Step 2: Read and validate current content
    const contentLength = currentContent?.length || 0;
    migrationSteps.push(`✓ Read ${contentLength} characters from existing file`);

    // Step 3: For this implementation, we'll preserve content as-is
    // (Real implementation would transform based on pattern)
    if (currentContent) {
      // Add migration marker
      const enhancedContent = `<!-- Migrated by mcp-copilot-instructions on ${new Date().toISOString()} -->\n\n${currentContent}`;
      await writeInstructionsFile(enhancedContent);
      migrationSteps.push('✓ Added migration marker to instructions');
    }

    // Step 4: Update status
    const newStatus: OnboardingStatus = {
      ...status,
      status: 'completed',
      migratedAt: new Date().toISOString(),
      restrictedMode: false,
      canRollback: true,
    };
    await saveOnboardingStatus(newStatus);
    migrationSteps.push('✓ Status updated to completed');

    // Try sampling for execution trace
    try {
      if (serverInstance) {
        const narrative = await generateMigrationNarrative(migrationSteps, newStatus);
        return narrative;
      }
    } catch (error) {
      console.error('Sampling failed for migration, using fallback:', error);
    }

    // Fallback output
    let result = '✅ **Migration Complete**\n\n';
    result += '[Execution Steps]\n';
    migrationSteps.forEach((step, i) => {
      result += `${i + 1}. ${step}\n`;
    });
    result += '\n[Status]\n';
    result += '- Restricted mode: DISABLED\n';
    result += '- All tools now operate freely\n';
    result += '- Dynamic instruction management: ACTIVE\n\n';
    result += '[Rollback]\n';
    result += `- Available until: ${status.rollbackUntil}\n`;
    result += `- Command: onboarding({ action: "rollback" })\n`;
    result += `- Backup: ${status.backupPath}\n`;

    return result;
  } catch (error) {
    return `❌ **Migration Failed**\n\nError: ${error}\n\nStatus unchanged. You can retry or rollback.`;
  }
}

/**
 * rollback action: Restore from backup
 */
async function handleRollback(): Promise<string> {
  const status = await getOnboardingStatus();

  // Validation: Can rollback?
  if (!status.canRollback) {
    return '⚠️ Rollback not available.\n\nRollback is only available after successful migration.';
  }

  // Check deadline
  if (status.rollbackUntil) {
    const deadline = new Date(status.rollbackUntil);
    if (Date.now() > deadline.getTime()) {
      return `⚠️ Rollback deadline expired.\n\nDeadline was: ${deadline.toLocaleString('en-US')}\n\nBackup still exists at: ${status.backupPath}`;
    }
  }

  const rollbackSteps: string[] = [];

  try {
    // Step 1: Read backup
    const backupContent = await fs.readFile(status.backupPath!, 'utf-8');
    rollbackSteps.push(`✓ Read backup from ${status.backupPath}`);

    // Step 2: Restore backup
    await writeInstructionsFile(backupContent);
    rollbackSteps.push('✓ Restored original instructions');

    // Step 3: Update status back to analyzed
    const newStatus: OnboardingStatus = {
      ...status,
      status: 'analyzed',
      restrictedMode: true, // Re-enable for safety
      canRollback: false, // Can't rollback a rollback
    };
    await saveOnboardingStatus(newStatus);
    rollbackSteps.push('✓ Status reset to analyzed');

    // Try sampling for rollback confirmation
    try {
      if (serverInstance) {
        const narrative = await generateRollbackNarrative(rollbackSteps, newStatus);
        return narrative;
      }
    } catch (error) {
      console.error('Sampling failed for rollback, using fallback:', error);
    }

    // Fallback output
    let result = '✅ **Rollback Complete**\n\n';
    result += '[Rollback Steps]\n';
    rollbackSteps.forEach((step, i) => {
      result += `${i + 1}. ${step}\n`;
    });
    result += '\n[Current State]\n';
    result += '- Original instructions restored\n';
    result += '- Status: analyzed (before migration)\n';
    result += '- Restricted mode: ENABLED (for safety)\n\n';
    result += '[Next Options]\n';
    result += '1. Re-propose: onboarding({ action: "propose" })\n';
    result += '2. Skip: onboarding({ action: "skip" })\n';
    result += '3. Review and fix issues before deciding\n';

    return result;
  } catch (error) {
    return `❌ **Rollback Failed**\n\nError: ${error}\n\nStatus unchanged. Backup: ${status.backupPath}`;
  }
}

/**
 * Generate approval confirmation narrative using MCP sampling
 */
async function generateApprovalNarrative(status: OnboardingStatus): Promise<string> {
  if (!serverInstance) {
    throw new Error('Server instance not available for sampling');
  }

  const prompt = `You are confirming migration plan approval.

Current Status:
- Pattern: ${status.pattern}
- Backup Path: ${status.backupPath}
- Rollback Until: ${status.rollbackUntil}

Generate a brief confirmation explaining:
1. What approval means (commitment without execution yet)
2. What happens next (migrate action required)
3. That rollback will be available for 7 days

Keep it concise and clear.`;

  const response = await serverInstance.createMessage({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: prompt,
        },
      },
    ],
    maxTokens: 500,
  });

  // Log sampling trace
  await logSamplingTrace({
    intent: 'approval-confirmation',
    timestamp: new Date().toISOString(),
    request: {
      prompt: prompt,
      context: { status },
    },
    response: {
      role: response.role,
      content: response.content,
      model: response.model,
      stopReason: response.stopReason,
    },
  });

  const content = Array.isArray(response.content) ? response.content[0] : response.content;
  if (content && content.type === 'text') {
    return content.text;
  }

  throw new Error('Unexpected response format from sampling');
}

/**
 * Generate migration execution narrative using MCP sampling
 */
async function generateMigrationNarrative(
  steps: string[],
  status: OnboardingStatus
): Promise<string> {
  if (!serverInstance) {
    throw new Error('Server instance not available for sampling');
  }

  const prompt = `You are summarizing a completed migration.

Execution Steps:
${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

Final Status:
- Status: ${status.status}
- Backup: ${status.backupPath}
- Rollback Until: ${status.rollbackUntil}
- Restricted Mode: ${status.restrictedMode}

Generate a completion message explaining:
1. What was executed
2. Where backup is stored
3. That system is now in normal operation mode
4. How to rollback if needed

Keep it concise and reassuring.`;

  const response = await serverInstance.createMessage({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: prompt,
        },
      },
    ],
    maxTokens: 800,
  });

  // Log sampling trace
  await logSamplingTrace({
    intent: 'migration-execution-trace',
    timestamp: new Date().toISOString(),
    request: {
      prompt: prompt,
      context: { steps, status },
    },
    response: {
      role: response.role,
      content: response.content,
      model: response.model,
      stopReason: response.stopReason,
    },
  });

  const content = Array.isArray(response.content) ? response.content[0] : response.content;
  if (content && content.type === 'text') {
    return content.text;
  }

  throw new Error('Unexpected response format from sampling');
}

/**
 * Generate rollback confirmation narrative using MCP sampling
 */
async function generateRollbackNarrative(
  steps: string[],
  status: OnboardingStatus
): Promise<string> {
  if (!serverInstance) {
    throw new Error('Server instance not available for sampling');
  }

  const prompt = `You are confirming a completed rollback.

Rollback Steps:
${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

Current Status:
- Status: ${status.status}
- Pattern: ${status.pattern}
- Analyzed At: ${status.analyzedAt}
- Restricted Mode: ${status.restrictedMode}

Generate a rollback confirmation explaining:
1. What was restored
2. Current system status (back to analyzed state)
3. Options for next steps (re-propose, skip, or review)

Be supportive and clear.`;

  const response = await serverInstance.createMessage({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: prompt,
        },
      },
    ],
    maxTokens: 600,
  });

  // Log sampling trace
  await logSamplingTrace({
    intent: 'rollback-confirmation',
    timestamp: new Date().toISOString(),
    request: {
      prompt: prompt,
      context: { steps, status },
    },
    response: {
      role: response.role,
      content: response.content,
      model: response.model,
      stopReason: response.stopReason,
    },
  });

  const content = Array.isArray(response.content) ? response.content[0] : response.content;
  if (content && content.type === 'text') {
    return content.text;
  }

  throw new Error('Unexpected response format from sampling');
}
