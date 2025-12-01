/**
 * metaInstructionTemplate.ts
 * Meta-instruction section generation logic
 *
 * Responsibilities:
 * - Generate meta-instructions based on development state
 * - Provide tool usage guide templates
 */

import { DevelopmentContext } from './generateInstructions.js';

/**
 * Generate meta-instruction section
 *
 * @returns Meta-instruction Markdown string
 */
export function generateMetaInstruction(): string {
  const sections: string[] = [];

  // Header
  sections.push('## meta: Tool Usage Guide');
  sections.push('');
  sections.push(
    'This MCP server handles external storage and dynamic generation of instructions. Use the following tools appropriately.',
  );
  sections.push('');

  // Development State Management
  sections.push('### Development State Management');
  sections.push('');
  sections.push(
    'When development phase or work focus changes, always update the state with `change_context` tool.',
  );
  sections.push('');
  sections.push('**When to Use**:');
  sections.push(
    '- Phase transitions (development→testing, testing→debugging, etc.)',
  );
  sections.push(
    '- Work focus changes (API implementation→authentication, etc.)',
  );
  sections.push('');
  sections.push(
    '**Effect**: After state change, this instruction file is automatically regenerated with prioritized instructions for the current phase.',
  );
  sections.push('');

  // Development Rule Registration
  sections.push('### Development Rule Registration');
  sections.push('');
  sections.push(
    'When receiving new conventions, rules, or constraints from users, always persist them to `project_context` instead of applying temporarily.',
  );
  sections.push('');
  sections.push('**Pre-registration Check**:');
  sections.push('1. Search existing rules (`project_context read`)');
  sections.push('2. Check for contradictions');
  sections.push('3. If contradictions exist, ask user for confirmation');
  sections.push('');
  sections.push(
    '**Important**: Once registered, rules are referenced in all subsequent sessions. Always register to prevent loss.',
  );
  sections.push('');

  // Self-awareness of Instructions
  sections.push('### Self-awareness of Instructions');
  sections.push('');
  sections.push(
    '`instructions_structure` tool modifies **this instruction file itself**. When using, explicitly state:',
  );
  sections.push('');
  sections.push('**Cautions**:');
  sections.push(
    '- Explicitly state changes when executing update/delete/insert',
  );
  sections.push('- Warn that "this instruction file will be modified"');
  sections.push(
    '- Conflict detection (`detect-conflicts`) activates automatically if external changes exist',
  );
  sections.push('');

  // Consistency Check with Existing Rules
  sections.push('### Consistency Check with Existing Rules');
  sections.push('');
  sections.push(
    'When receiving new instructions, always check for contradictions with existing `project_context`.',
  );
  sections.push('');
  sections.push('**Check Procedure**:');
  sections.push('1. Search related categories (`project_context read`)');
  sections.push('2. If contradictions detected, present options to user');
  sections.push('3. Follow user choice to update or maintain existing rules');
  sections.push('');

  // Onboarding for Existing Projects
  sections.push('### Onboarding for Existing Projects');
  sections.push('');
  sections.push(
    'On first run, or if existing `copilot-instructions.md` exists, analyze with `onboarding` tool.',
  );
  sections.push('');
  sections.push('**Behavior**:');
  sections.push('- If compatible: Automatically operates in normal mode');
  sections.push('- If incompatible: Operates in restricted mode (read-only)');
  sections.push('- After reviewing migration proposal, execute with approval');

  return sections.join('\n');
}

/**
 * Generate additional messages based on development state
 *
 * @param context Development state
 * @returns Additional messages (may be empty)
 */
export function generateContextSpecificGuidance(
  context: DevelopmentContext,
): string {
  const messages: string[] = [];

  // Phase-specific additional guidance
  switch (context.phase) {
    case 'development':
      messages.push('');
      messages.push('---');
      messages.push('');
      messages.push('**Current: Development Phase**');
      messages.push(
        '- Register new conventions to `project_context` immediately',
      );
      messages.push('- Prioritize referencing coding conventions');
      break;
    case 'testing':
      messages.push('');
      messages.push('---');
      messages.push('');
      messages.push('**Current: Testing Phase**');
      messages.push('- Prioritize referencing test conventions');
      messages.push('- Check coverage goals');
      break;
    case 'debugging':
      messages.push('');
      messages.push('---');
      messages.push('');
      messages.push('**Current: Debugging Phase**');
      messages.push('- Prioritize checking existing `project_context`');
      messages.push('- Record root cause of issues');
      break;
    case 'refactoring':
      messages.push('');
      messages.push('---');
      messages.push('');
      messages.push('**Current: Refactoring Phase**');
      messages.push('- Prioritize referencing code quality conventions');
      messages.push('- Record change history with `change_context`');
      break;
    case 'documentation':
      messages.push('');
      messages.push('---');
      messages.push('');
      messages.push('**Current: Documentation Phase**');
      messages.push('- Prioritize referencing documentation conventions');
      messages.push('- Register important descriptions to `project_context`');
      break;
  }

  // Focus-specific additional guidance
  if (context.focus && context.focus.length > 0) {
    const focusGuidance: string[] = [];

    for (const item of context.focus) {
      const lowerItem = item.toLowerCase();

      if (lowerItem.includes('api')) {
        focusGuidance.push(
          '- **API-related**: Check API conventions in `project_context`',
        );
      }
      if (lowerItem.includes('認証') || lowerItem.includes('auth')) {
        focusGuidance.push(
          '- **Authentication-related**: Prioritize security conventions',
        );
      }
      if (lowerItem.includes('データベース') || lowerItem.includes('db')) {
        focusGuidance.push(
          '- **Database-related**: Check schema design conventions',
        );
      }
      if (lowerItem.includes('テスト') || lowerItem.includes('test')) {
        focusGuidance.push(
          '- **Testing-related**: Check test patterns and coverage criteria',
        );
      }
      if (
        lowerItem.includes('パフォーマンス') ||
        lowerItem.includes('performance')
      ) {
        focusGuidance.push(
          '- **Performance-related**: Reference optimization guidelines',
        );
      }
    }

    if (focusGuidance.length > 0) {
      messages.push('');
      messages.push('**Current Focus**:');
      messages.push(...focusGuidance);
    }
  }

  return messages.join('\n');
}

/**
 * Generate complete meta-instruction section (base + state-specific)
 *
 * @param context Development state
 * @returns Complete meta-instruction Markdown string
 */
export function generateFullMetaInstruction(
  context: DevelopmentContext,
): string {
  const baseInstruction = generateMetaInstruction();
  const contextSpecificGuidance = generateContextSpecificGuidance(context);

  if (contextSpecificGuidance) {
    return `${baseInstruction}\n${contextSpecificGuidance}`;
  }

  return baseInstruction;
}
