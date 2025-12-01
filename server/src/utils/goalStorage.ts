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
    await fs.writeFile(HIERARCHY_FILE, JSON.stringify(hierarchy, null, 2), 'utf-8');
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
export async function writeCurrentContext(context: CurrentContext): Promise<void> {
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
export async function createInitialHierarchy(mainGoalTitle: string, mainGoalDescription: string): Promise<GoalHierarchy> {
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
    updatedAt: now
  };
  
  const hierarchy: GoalHierarchy = {
    version: '1.0.0',
    lastUpdated: now,
    rootId: 'goal-main',
    goals: {
      'goal-main': mainGoal
    }
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
export async function createInitialContext(currentGoalId: string): Promise<CurrentContext> {
  const context: CurrentContext = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    currentGoalId,
    currentPath: [currentGoalId],
    recentlyCompleted: [],
    upcomingGoals: [],
    blockedGoals: []
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
