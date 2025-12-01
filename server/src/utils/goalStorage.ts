/**
 * Goal Storage Utilities
 *
 * Handles reading and writing goal data to .copilot-instructions/goals/
 */

import fs from 'fs/promises';
import path from 'path';
import type { Goal, GoalHierarchy, CurrentContext } from '../types/goals.js';

const GOALS_DIR = path.join(process.cwd(), '../.copilot-instructions/goals');
const HIERARCHY_FILE = path.join(GOALS_DIR, 'hierarchy.json');
const CONTEXT_FILE = path.join(GOALS_DIR, 'current-context.json');
const MAIN_GOAL_FILE = path.join(GOALS_DIR, 'main-goal.md');

/**
 * Initialize goals directory structure
 */
export async function initializeGoalsDirectory(): Promise<void> {
  try {
    await fs.mkdir(GOALS_DIR, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create goals directory: ${error}`);
  }
}

/**
 * Read goal hierarchy from hierarchy.json
 */
export async function readHierarchy(): Promise<GoalHierarchy | null> {
  try {
    const content = await fs.readFile(HIERARCHY_FILE, 'utf-8');
    return JSON.parse(content) as GoalHierarchy;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // File doesn't exist yet
    }
    throw new Error(`Failed to read hierarchy: ${error}`);
  }
}

/**
 * Write goal hierarchy to hierarchy.json
 */
export async function writeHierarchy(hierarchy: GoalHierarchy): Promise<void> {
  try {
    await initializeGoalsDirectory();
    hierarchy.lastUpdated = new Date().toISOString();
    await fs.writeFile(
      HIERARCHY_FILE,
      JSON.stringify(hierarchy, null, 2),
      'utf-8',
    );
  } catch (error) {
    throw new Error(`Failed to write hierarchy: ${error}`);
  }
}

/**
 * Read current context from current-context.json
 */
export async function readCurrentContext(): Promise<CurrentContext | null> {
  try {
    const content = await fs.readFile(CONTEXT_FILE, 'utf-8');
    return JSON.parse(content) as CurrentContext;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // File doesn't exist yet
    }
    throw new Error(`Failed to read current context: ${error}`);
  }
}

/**
 * Write current context to current-context.json
 */
export async function writeCurrentContext(
  context: CurrentContext,
): Promise<void> {
  try {
    await initializeGoalsDirectory();
    context.lastUpdated = new Date().toISOString();
    await fs.writeFile(CONTEXT_FILE, JSON.stringify(context, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write current context: ${error}`);
  }
}

/**
 * Read main goal from main-goal.md
 */
export async function readMainGoal(): Promise<string | null> {
  try {
    return await fs.readFile(MAIN_GOAL_FILE, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // File doesn't exist yet
    }
    throw new Error(`Failed to read main goal: ${error}`);
  }
}

/**
 * Write main goal to main-goal.md
 */
export async function writeMainGoal(content: string): Promise<void> {
  try {
    await initializeGoalsDirectory();
    await fs.writeFile(MAIN_GOAL_FILE, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write main goal: ${error}`);
  }
}

/**
 * Create initial goal hierarchy with main goal
 */
export async function createInitialHierarchy(
  mainGoalTitle: string,
  mainGoalDescription: string,
): Promise<GoalHierarchy> {
  const now = new Date().toISOString();

  const mainGoal: Goal = {
    id: 'goal-main',
    title: mainGoalTitle,
    description: mainGoalDescription,
    status: 'in-progress',
    parentId: null,
    childIds: [],
    order: 0,
    createdAt: now,
    updatedAt: now,
  };

  const hierarchy: GoalHierarchy = {
    version: '1.0.0',
    lastUpdated: now,
    rootId: 'goal-main',
    goals: {
      'goal-main': mainGoal,
    },
  };

  await writeHierarchy(hierarchy);

  // Create main-goal.md
  const mainGoalContent = `---
id: goal-main
status: in-progress
created: ${now}
---

# ${mainGoalTitle}

## Description

${mainGoalDescription}

## Success Criteria

(To be defined)

## Notes

(Add notes here)
`;

  await writeMainGoal(mainGoalContent);

  return hierarchy;
}

/**
 * Create initial current context
 */
export async function createInitialContext(
  currentGoalId: string,
): Promise<CurrentContext> {
  const context: CurrentContext = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    currentGoalId,
    currentPath: [currentGoalId],
    recentlyCompleted: [],
    upcomingGoals: [],
    blockedGoals: [],
  };

  await writeCurrentContext(context);
  return context;
}

/**
 * Check if goals are initialized
 */
export async function isInitialized(): Promise<boolean> {
  try {
    await fs.access(HIERARCHY_FILE);
    await fs.access(CONTEXT_FILE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Filter goals for display in instructions (max 10-12 items)
 */
export async function filterGoals(): Promise<
  import('../types/goals.js').FilteredGoals | null
> {
  const hierarchy = await readHierarchy();
  const context = await readCurrentContext();

  if (!hierarchy || !context) {
    return null;
  }

  const { goals } = hierarchy;
  const currentGoal = goals[context.currentGoalId];

  if (!currentGoal) {
    return null;
  }

  // 1. Ultimate goal (main)
  const ultimate = goals[hierarchy.rootId];

  // 2. Current path from main to current
  const currentPath = context.currentPath
    .map((id) => goals[id])
    .filter((g): g is import('../types/goals.js').Goal => g !== undefined);

  // 3. Siblings
  let previous: import('../types/goals.js').Goal | null = null;
  let next: import('../types/goals.js').Goal | null = null;

  if (currentGoal.parentId) {
    const parent = goals[currentGoal.parentId];
    if (parent) {
      const siblings = parent.childIds
        .map((id) => goals[id])
        .filter((g): g is import('../types/goals.js').Goal => g !== undefined)
        .sort((a, b) => a.order - b.order);

      const index = siblings.findIndex((g) => g.id === currentGoal.id);
      previous = index > 0 ? siblings[index - 1] : null;
      next = index < siblings.length - 1 ? siblings[index + 1] : null;
    }
  }

  // 4. Current goal's children
  const children = currentGoal.childIds
    .map((id) => goals[id])
    .filter((g): g is import('../types/goals.js').Goal => g !== undefined)
    .sort((a, b) => a.order - b.order);

  // 5. Recently completed
  const recentlyCompleted = context.recentlyCompleted
    .map((id) => goals[id])
    .filter((g): g is import('../types/goals.js').Goal => g !== undefined)
    .slice(0, 5);

  return {
    ultimate,
    currentPath,
    siblings: { previous, next },
    children,
    recentlyCompleted,
  };
}

/**
 * Format filtered goals as markdown section
 */
export async function formatGoalsSection(): Promise<string> {
  const filtered = await filterGoals();

  if (!filtered) {
    return '## 🎯 Current Goals\n\n_No goals set. Use goal_management tool to create your first goal._\n';
  }

  const lines: string[] = [];
  lines.push('## 🎯 Current Goals\n');

  // Ultimate goal
  lines.push(`### Ultimate Objective`);
  lines.push(`**${filtered.ultimate.title}** (${filtered.ultimate.status})`);
  lines.push(`${filtered.ultimate.description}\n`);

  // Current path
  if (filtered.currentPath.length > 1) {
    lines.push(`### Current Path`);
    filtered.currentPath.forEach((goal, index) => {
      const indent = '  '.repeat(index);
      const icon =
        goal.status === 'completed'
          ? '✅'
          : goal.status === 'in-progress'
            ? '🔄'
            : goal.status === 'blocked'
              ? '🚫'
              : '⏸️';
      lines.push(`${indent}${icon} ${goal.title}`);
    });
    lines.push('');
  }

  // Current focus (last in path)
  const currentGoal = filtered.currentPath[filtered.currentPath.length - 1];
  lines.push(`### 🎯 Current Focus`);
  lines.push(`**${currentGoal.title}** (${currentGoal.status})`);
  lines.push(`${currentGoal.description}\n`);

  // Siblings context
  if (filtered.siblings.previous || filtered.siblings.next) {
    lines.push(`### Context`);
    if (filtered.siblings.previous) {
      lines.push(
        `- ⬅️ Previous: ${filtered.siblings.previous.title} (${filtered.siblings.previous.status})`,
      );
    }
    if (filtered.siblings.next) {
      lines.push(
        `- ➡️ Next: ${filtered.siblings.next.title} (${filtered.siblings.next.status})`,
      );
    }
    lines.push('');
  }

  // Children (next steps)
  if (filtered.children.length > 0) {
    lines.push(`### Next Steps`);
    filtered.children.forEach((child) => {
      const icon =
        child.status === 'completed'
          ? '✅'
          : child.status === 'in-progress'
            ? '🔄'
            : child.status === 'blocked'
              ? '🚫'
              : '⏸️';
      lines.push(`- ${icon} ${child.title} (${child.status})`);
    });
    lines.push('');
  }

  // Recently completed
  if (filtered.recentlyCompleted.length > 0) {
    lines.push(`### Recently Completed`);
    filtered.recentlyCompleted.forEach((goal) => {
      lines.push(`- ✅ ${goal.title}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}
