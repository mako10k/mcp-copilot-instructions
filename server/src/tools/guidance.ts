import { readInstructionsFile } from '../utils/fileSystem.js';
import { getOnboardingStatus } from '../utils/onboardingStatusManager.js';

export async function guidance({ action }: { action: string }) {
  switch (action) {
    case 'overview':
      return 'MCP server handles external storage, editing, and analysis of Copilot instructions as MVP.';
    case 'getting-started':
      return 'You can call guidance, project_context, instructions_structure from CLI in src/index.ts.';
    case 'current-state': {
      // Instructions status
      const content = await readInstructionsFile();
      let instructionsStatus: string;
      if (!content) {
        instructionsStatus =
          'Instructions not initialized. Please create .github/copilot-instructions.md.';
      } else {
        const lines = content.split('\n');
        const preview = lines.slice(0, 10).join('\n');
        const totalLines = lines.length;
        instructionsStatus = `Instructions exist (${totalLines} lines total)\n\n[First 10 lines preview]\n${preview}\n\n...`;
      }

      // Onboarding status
      const onboardingStatus = await getOnboardingStatus();
      let onboardingInfo = '\n\n【Onboarding Status】\n';

      if (onboardingStatus.status === 'not_started') {
        onboardingInfo +=
          '⚠️  Not started: Analysis for existing project introduction is required.\n\n';
        onboardingInfo += '【Recommended Action】\n';
        onboardingInfo +=
          'Run onboarding({ action: "analyze" }) to analyze existing instructions.\n';
        onboardingInfo +=
          'For new projects, you can skip with onboarding({ action: "skip" }).';
      } else {
        const statusLabels = {
          analyzed: 'Analyzed',
          proposed: 'Proposal Created',
          approved: 'Approved',
          completed: 'Completed',
          rejected: 'Rejected',
          skipped: 'Skipped',
        };
        const statusLabel =
          statusLabels[onboardingStatus.status as keyof typeof statusLabels] ||
          onboardingStatus.status;

        onboardingInfo += `Status: ${statusLabel}\n`;
        if (onboardingStatus.pattern) {
          const patternLabels = {
            clean: '✓ Clean (new creation)',
            structured: '✓ Structured (compatible)',
            unstructured: '⚠️  Unstructured (migration recommended)',
            messy: '❌ Problems detected (manual fix required)',
          };
          onboardingInfo += `Pattern: ${patternLabels[onboardingStatus.pattern]}\n`;
        }

        if (onboardingStatus.restrictedMode) {
          onboardingInfo +=
            '\n🔒 Restricted Mode: Some write operations are restricted.\n';
          onboardingInfo +=
            '\n⚠️  IMPORTANT: Restricted mode protects your existing .github/copilot-instructions.md\n';
          onboardingInfo +=
            'from being overwritten. Instructions have NOT been migrated to .copilot-instructions/\n';
          onboardingInfo +=
            'directory structure yet. Using change_context now would DESTROY your original content.\n\n';
          onboardingInfo += '【Why Restricted】\n';
          onboardingInfo +=
            '- change_context OVERWRITES .github/copilot-instructions.md with generated content\n';
          onboardingInfo +=
            '- Your instructions are still in monolithic format (not migrated)\n';
          onboardingInfo +=
            '- Migration to .copilot-instructions/ structure required first\n\n';
          onboardingInfo += '【Restricted Features】\n';
          onboardingInfo +=
            '- instructions_structure: update/delete/insert/resolve-conflict\n';
          onboardingInfo +=
            '- change_context: update/reset/rollback (would overwrite!)\n\n';
          onboardingInfo += '【Available Features】\n';
          onboardingInfo +=
            '- guidance, project_context, feedback (all operations)\n';
          onboardingInfo +=
            '- instructions_structure: read/detect-conflicts (read-only)\n';
          onboardingInfo +=
            '- change_context: read/list-history/show-diff (read-only)\n\n';
          onboardingInfo += '【Unlock Restrictions】\n';
          onboardingInfo +=
            'Check details with onboarding({ action: "status" }).';
        } else {
          onboardingInfo += '✓ Normal Mode: All features are available.';
        }

        if (onboardingStatus.analyzedAt) {
          onboardingInfo += `\n\nAnalysis date: ${onboardingStatus.analyzedAt}`;
        }
      }

      return instructionsStatus + onboardingInfo;
    }
    default:
      return `Unknown action: ${action}`;
  }
}
