/**
 * MCP Prompts Implementation
 * Provides pre-defined prompt templates for instruction authoring tasks
 */

export interface PromptArgument {
  name: string;
  description: string;
  required?: boolean;
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: PromptArgument[];
}

/**
 * Get all available prompts
 */
export function getAvailablePrompts(): PromptDefinition[] {
  return [
    {
      name: 'create-convention',
      description: 'Generate a new coding convention document with proper structure and frontmatter',
      arguments: [
        {
          name: 'language',
          description: 'Programming language (e.g., TypeScript, Python, Go, Rust)',
          required: true,
        },
        {
          name: 'focus',
          description: 'Convention focus area (e.g., naming, error-handling, testing, formatting)',
          required: true,
        },
      ],
    },
    {
      name: 'generate-phase-instructions',
      description: 'Create phase-specific instruction subset from existing instructions',
      arguments: [
        {
          name: 'phase',
          description: 'Development phase: development, refactoring, testing, debugging, or documentation',
          required: true,
        },
        {
          name: 'focus',
          description: 'Optional focus areas as comma-separated list (e.g., "API,JWT,authentication")',
          required: false,
        },
      ],
    },
    {
      name: 'analyze-conflicts',
      description: 'Detect contradictions or overlaps between instruction files',
      arguments: [
        {
          name: 'category',
          description: 'Category to analyze: conventions, patterns, architecture, phases, tools, or "all"',
          required: false,
        },
      ],
    },
  ];
}

/**
 * Generate prompt content for a given prompt name and arguments
 */
export async function getPromptContent(
  name: string,
  args?: Record<string, string>
): Promise<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }[]> {
  switch (name) {
    case 'create-convention':
      return generateCreateConventionPrompt(args);
    case 'generate-phase-instructions':
      return generatePhaseInstructionsPrompt(args);
    case 'analyze-conflicts':
      return generateAnalyzeConflictsPrompt(args);
    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}

/**
 * Generate "create-convention" prompt
 */
function generateCreateConventionPrompt(
  args?: Record<string, string>
): { role: 'user'; content: { type: 'text'; text: string } }[] {
  const language = args?.language || 'TypeScript';
  const focus = args?.focus || 'general';

  const prompt = `Create a new coding convention document for ${language} focusing on ${focus}.

Requirements:
1. Include YAML frontmatter with:
   - category: conventions
   - tags: [${language.toLowerCase()}, ${focus.toLowerCase()}]
   - priority: high
   - required: true
   - phases: [development, refactoring]

2. Structure the document with:
   - Clear title and purpose statement
   - Specific rules with examples
   - Anti-patterns to avoid
   - Best practices and rationale

3. Use this format:
   \`\`\`markdown
   ---
   category: conventions
   tags: [${language.toLowerCase()}, ${focus.toLowerCase()}]
   priority: high
   required: true
   phases: [development, refactoring]
   ---

   # ${language} ${focus.charAt(0).toUpperCase() + focus.slice(1)} Conventions

   ## Purpose
   [Brief explanation of why these conventions matter]

   ## Rules

   ### Rule 1: [Name]
   **Do:**
   \`\`\`${language.toLowerCase()}
   // Good example
   \`\`\`

   **Don't:**
   \`\`\`${language.toLowerCase()}
   // Bad example
   \`\`\`

   **Rationale:** [Why this rule exists]

   [Continue with more rules...]
   \`\`\`

4. Save the file to: \`conventions/${language.toLowerCase()}-${focus.toLowerCase()}.md\`

Please generate the complete convention document following this template.`;

  return [
    {
      role: 'user',
      content: {
        type: 'text',
        text: prompt,
      },
    },
  ];
}

/**
 * Generate "generate-phase-instructions" prompt
 */
function generatePhaseInstructionsPrompt(
  args?: Record<string, string>
): { role: 'user'; content: { type: 'text'; text: string } }[] {
  const phase = args?.phase || 'development';
  const focus = args?.focus || '';

  const focusClause = focus ? ` with focus on: ${focus}` : '';

  const prompt = `Generate phase-specific instructions for the "${phase}" phase${focusClause}.

Task:
1. Read all instruction files from the workspace categories (conventions/, patterns/, architecture/, etc.)
2. Filter instructions that are relevant to the "${phase}" phase by checking:
   - YAML frontmatter "phases" array
   - Content mentioning "${phase}" activities
   ${focus ? `- Tags or content related to: ${focus}` : ''}
3. Aggregate the filtered content into a single markdown document
4. Preserve the hierarchical structure (category → file → sections)

Output Format:
\`\`\`markdown
# Instructions for ${phase.charAt(0).toUpperCase() + phase.slice(1)} Phase
${focus ? `**Focus**: ${focus}\n` : ''}
**Generated**: [timestamp]

## Conventions
[Relevant convention sections...]

## Patterns
[Relevant pattern sections...]

## Architecture
[Relevant architecture sections...]

## Tools
[Relevant tool guidance...]

---
*Auto-generated from workspace instructions*
\`\`\`

Requirements:
- Only include instructions with "${phase}" in their frontmatter "phases" array
- Maintain original formatting and code examples
- Add source file references for traceability
${focus ? `- Prioritize content matching focus areas: ${focus}` : ''}

Please analyze the workspace and generate the filtered instruction document.`;

  return [
    {
      role: 'user',
      content: {
        type: 'text',
        text: prompt,
      },
    },
  ];
}

/**
 * Generate "analyze-conflicts" prompt
 */
function generateAnalyzeConflictsPrompt(
  args?: Record<string, string>
): { role: 'user'; content: { type: 'text'; text: string } }[] {
  const category = args?.category || 'all';

  const scopeClause =
    category === 'all'
      ? 'all instruction categories (conventions/, patterns/, architecture/, phases/, tools/)'
      : `the "${category}/" category`;

  const prompt = `Analyze instruction files in ${scopeClause} for conflicts, contradictions, and overlaps.

Analysis Tasks:

1. **Contradictions**
   - Find rules that directly contradict each other
   - Example: File A says "always use async/await", File B says "prefer callbacks"

2. **Overlaps**
   - Identify duplicate or redundant content across files
   - Note when the same rule is stated differently in multiple places

3. **Inconsistencies**
   - Detect inconsistent terminology (e.g., "function" vs "method" used interchangeably)
   - Find examples that violate stated rules

4. **Missing Coverage**
   - Identify topics mentioned but not fully documented
   - Find references to non-existent instruction files

Output Format:
\`\`\`markdown
# Instruction Conflict Analysis
**Scope**: ${category === 'all' ? 'All Categories' : category}
**Date**: [timestamp]

## Summary
- Total files analyzed: [N]
- Conflicts found: [N]
- Overlaps found: [N]
- Recommendations: [N]

## Critical Issues

### Contradiction: [Brief Title]
**Location**: 
- File 1: \`path/to/file1.md\` (lines X-Y)
- File 2: \`path/to/file2.md\` (lines A-B)

**Conflict**:
- File 1 states: "[quote]"
- File 2 states: "[quote]"

**Recommendation**: [How to resolve]

---

[Continue with more issues...]

## Moderate Issues

[List overlaps and inconsistencies...]

## Suggestions

[General improvement recommendations...]
\`\`\`

Please perform a thorough analysis of ${scopeClause} and generate the conflict report.`;

  return [
    {
      role: 'user',
      content: {
        type: 'text',
        text: prompt,
      },
    },
  ];
}
