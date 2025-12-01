/**
 * Goal Management Tool
 * 
 * MCP tool for hierarchical goal tracking and progress management.
 * 
 * Features:
 * - Create, read, update, delete goals
 * - Hierarchical structure (main → sub-goals → tasks → sub-tasks)
 * - Auto-advancement on completion
 * - Dynamic filtering for instruction display
 * - Cross-session persistence
 */

import { z } from 'zod';
import type { Goal, GoalManagementParams, GoalManagementResult } from '../types/goals.js';
import {
  isInitialized,
  readHierarchy,
  writeHierarchy,
  readCurrentContext,
  writeCurrentContext,
  createInitialHierarchy,
  createInitialContext,
  filterGoals
} from '../utils/goalStorage.js';
import {
  analyzeDependencies,
  calculatePriorities,
  reorderGoalsByDependencies
} from '../utils/dependencyGraph.js';

// Zod schema for parameter validation
const goalManagementSchema = z.object({
  action: z.enum(['create', 'read', 'update', 'delete', 'complete', 'advance', 'get-context', 'set-current', 'analyze-dependencies', 'calculate-priorities', 'reorder']),
  goalId: z.string().optional(),
  goal: z.object({
    title: z.string(),
    description: z.string(),
    parentId: z.string().optional(),
    order: z.number().optional(),
    dependencies: z.array(z.string()).optional(),
    notes: z.string().optional(),
    contributionWeight: z.number().optional(),
    estimatedEffort: z.number().optional(),
    manualPriority: z.number().optional()
  }).optional(),
  status: z.enum(['not-started', 'in-progress', 'completed', 'blocked']).optional(),
  filter: z.object({
    status: z.enum(['not-started', 'in-progress', 'completed', 'blocked']).optional(),
    parentId: z.string().optional(),
    includeChildren: z.boolean().optional()
  }).optional()
});

/**
 * Generate a unique goal ID
 */
function generateGoalId(parentId: string | null, order: number): string {
  if (parentId === null) {
    return 'goal-main';
  }
  
  // Extract parent level and number
  const match = parentId.match(/^goal-(\d+(?:\.\d+)*)$/);
  if (match) {
    return `goal-${match[1]}.${order}`;
  }
  
  return `goal-${order}`;
}

/**
 * Calculate path from root to goal
 */
function calculatePath(goalId: string, goals: Record<string, Goal>): string[] {
  const path: string[] = [];
  let currentId: string | null = goalId;
  
  while (currentId !== null) {
    path.unshift(currentId);
    currentId = goals[currentId]?.parentId ?? null;
  }
  
  return path;
}

/**
 * Get siblings of a goal
 */
function getSiblings(goal: Goal, goals: Record<string, Goal>): { previous: Goal | null; next: Goal | null } {
  if (goal.parentId === null) {
    return { previous: null, next: null };
  }
  
  const parent = goals[goal.parentId];
  if (!parent) {
    return { previous: null, next: null };
  }
  
  const siblings = parent.childIds
    .map(id => goals[id])
    .filter((g): g is Goal => g !== undefined)
    .sort((a, b) => a.order - b.order);
  
  const index = siblings.findIndex(g => g.id === goal.id);
  
  return {
    previous: index > 0 ? siblings[index - 1] : null,
    next: index < siblings.length - 1 ? siblings[index + 1] : null
  };
}

/**
 * Create a new goal
 */
async function createGoal(params: GoalManagementParams): Promise<GoalManagementResult> {
  if (!params.goal) {
    return {
      success: false,
      message: 'Goal data is required for create action',
      error: 'Missing goal parameter'
    };
  }
  
  const initialized = await isInitialized();
  
  // If not initialized, create main goal
  if (!initialized) {
    if (params.goal.parentId) {
      return {
        success: false,
        message: 'Please create the main goal first (without parentId)',
        error: 'Goals not initialized'
      };
    }
    
    const hierarchy = await createInitialHierarchy(params.goal.title, params.goal.description);
    const context = await createInitialContext('goal-main');
    const mainGoal = hierarchy.goals['goal-main'];
    
    return {
      success: true,
      message: 'Main goal created successfully',
      goal: mainGoal,
      currentContext: context
    };
  }
  
  // Add to existing hierarchy
  const hierarchy = await readHierarchy();
  if (!hierarchy) {
    return {
      success: false,
      message: 'Failed to read hierarchy',
      error: 'Hierarchy file missing'
    };
  }
  
  const parentId = params.goal.parentId ?? null;
  
  // Validate parent exists
  if (parentId !== null && !hierarchy.goals[parentId]) {
    return {
      success: false,
      message: `Parent goal ${parentId} not found`,
      error: 'Invalid parent ID'
    };
  }
  
  // Calculate order
  const order = params.goal.order ?? (parentId ? hierarchy.goals[parentId].childIds.length : 0);
  
  // Generate ID
  const goalId = generateGoalId(parentId, order);
  
  // Check if ID already exists
  if (hierarchy.goals[goalId]) {
    return {
      success: false,
      message: `Goal ${goalId} already exists`,
      error: 'Duplicate goal ID'
    };
  }
  
  // Create new goal
  const now = new Date().toISOString();
  const newGoal: Goal = {
    id: goalId,
    title: params.goal.title,
    description: params.goal.description,
    status: 'not-started',
    parentId,
    childIds: [],
    order,
    createdAt: now,
    updatedAt: now,
    dependencies: params.goal.dependencies,
    dependents: [],
    notes: params.goal.notes,
    contributionWeight: params.goal.contributionWeight,
    estimatedEffort: params.goal.estimatedEffort,
    manualPriority: params.goal.manualPriority
  };
  
  // Update reverse dependencies
  if (params.goal.dependencies) {
    params.goal.dependencies.forEach(depId => {
      const dep = hierarchy.goals[depId];
      if (dep) {
        if (!dep.dependents) dep.dependents = [];
        dep.dependents.push(goalId);
      }
    });
  }
  
  // Add to hierarchy
  hierarchy.goals[goalId] = newGoal;
  
  // Update parent's childIds
  if (parentId !== null) {
    hierarchy.goals[parentId].childIds.push(goalId);
    hierarchy.goals[parentId].updatedAt = now;
  }
  
  await writeHierarchy(hierarchy);
  
  return {
    success: true,
    message: `Goal ${goalId} created successfully`,
    goal: newGoal
  };
}

/**
 * Read goal(s)
 */
async function readGoal(params: GoalManagementParams): Promise<GoalManagementResult> {
  const hierarchy = await readHierarchy();
  if (!hierarchy) {
    return {
      success: false,
      message: 'Goals not initialized',
      error: 'Hierarchy file missing'
    };
  }
  
  // Read specific goal
  if (params.goalId) {
    const goal = hierarchy.goals[params.goalId];
    if (!goal) {
      return {
        success: false,
        message: `Goal ${params.goalId} not found`,
        error: 'Invalid goal ID'
      };
    }
    
    return {
      success: true,
      message: `Goal ${params.goalId} retrieved`,
      goal
    };
  }
  
  // Read with filter
  let filteredGoals = Object.values(hierarchy.goals);
  
  if (params.filter) {
    if (params.filter.status) {
      filteredGoals = filteredGoals.filter(g => g.status === params.filter!.status);
    }
    
    if (params.filter.parentId !== undefined) {
      filteredGoals = filteredGoals.filter(g => g.parentId === params.filter!.parentId);
    }
    
    if (params.filter.includeChildren) {
      const goalsWithChildren = new Set(filteredGoals.map(g => g.id));
      filteredGoals.forEach(g => {
        const addChildren = (goalId: string) => {
          const goal = hierarchy.goals[goalId];
          if (goal) {
            goalsWithChildren.add(goalId);
            goal.childIds.forEach(addChildren);
          }
        };
        g.childIds.forEach(addChildren);
      });
      filteredGoals = Array.from(goalsWithChildren).map(id => hierarchy.goals[id]);
    }
  }
  
  return {
    success: true,
    message: `Retrieved ${filteredGoals.length} goal(s)`,
    goals: filteredGoals
  };
}

/**
 * Update a goal
 */
async function updateGoal(params: GoalManagementParams): Promise<GoalManagementResult> {
  if (!params.goalId) {
    return {
      success: false,
      message: 'goalId is required for update action',
      error: 'Missing goalId parameter'
    };
  }
  
  const hierarchy = await readHierarchy();
  if (!hierarchy) {
    return {
      success: false,
      message: 'Goals not initialized',
      error: 'Hierarchy file missing'
    };
  }
  
  const goal = hierarchy.goals[params.goalId];
  if (!goal) {
    return {
      success: false,
      message: `Goal ${params.goalId} not found`,
      error: 'Invalid goal ID'
    };
  }
  
  // Update fields
  const now = new Date().toISOString();
  
  if (params.goal) {
    if (params.goal.title) goal.title = params.goal.title;
    if (params.goal.description) goal.description = params.goal.description;
    if (params.goal.notes !== undefined) goal.notes = params.goal.notes;
    if (params.goal.dependencies !== undefined) goal.dependencies = params.goal.dependencies;
  }
  
  if (params.status) {
    goal.status = params.status;
    if (params.status === 'completed') {
      goal.completedAt = now;
    }
  }
  
  goal.updatedAt = now;
  
  await writeHierarchy(hierarchy);
  
  return {
    success: true,
    message: `Goal ${params.goalId} updated successfully`,
    goal
  };
}

/**
 * Update current context (path, recent, upcoming, blocked)
 */
async function updateCurrentContext(goalId: string): Promise<void> {
  const hierarchy = await readHierarchy();
  if (!hierarchy) return;
  
  const context = await readCurrentContext();
  if (!context) return;
  
  // Update current goal
  context.currentGoalId = goalId;
  
  // Recalculate path
  context.currentPath = calculatePath(goalId, hierarchy.goals);
  
  // Update upcoming goals (next siblings and children)
  const currentGoal = hierarchy.goals[goalId];
  if (currentGoal) {
    const siblings = getSiblings(currentGoal, hierarchy.goals);
    context.upcomingGoals = [];
    
    if (siblings.next) {
      context.upcomingGoals.push(siblings.next.id);
    }
    
    // Add not-started children
    currentGoal.childIds.forEach(childId => {
      const child = hierarchy.goals[childId];
      if (child && child.status === 'not-started') {
        context.upcomingGoals.push(childId);
      }
    });
  }
  
  // Update blocked goals
  context.blockedGoals = Object.values(hierarchy.goals)
    .filter(g => g.status === 'blocked')
    .map(g => g.id);
  
  await writeCurrentContext(context);
}

/**
 * Find next goal to advance to
 */
function findNextGoal(currentGoal: Goal, goals: Record<string, Goal>): Goal | null {
  // 1. First not-started child
  for (const childId of currentGoal.childIds) {
    const child = goals[childId];
    if (child && child.status === 'not-started') {
      return child;
    }
  }
  
  // 2. First in-progress child
  for (const childId of currentGoal.childIds) {
    const child = goals[childId];
    if (child && child.status === 'in-progress') {
      return child;
    }
  }
  
  // 3. Next sibling
  const siblings = getSiblings(currentGoal, goals);
  if (siblings.next && siblings.next.status !== 'completed') {
    return siblings.next;
  }
  
  // 4. Move up to parent and try its next sibling
  if (currentGoal.parentId) {
    const parent = goals[currentGoal.parentId];
    if (parent) {
      const parentSiblings = getSiblings(parent, goals);
      if (parentSiblings.next && parentSiblings.next.status !== 'completed') {
        return parentSiblings.next;
      }
    }
  }
  
  return null;
}

/**
 * Complete a goal and auto-advance
 */
async function completeGoal(params: GoalManagementParams): Promise<GoalManagementResult> {
  if (!params.goalId) {
    return {
      success: false,
      message: 'goalId is required for complete action',
      error: 'Missing goalId parameter'
    };
  }
  
  const hierarchy = await readHierarchy();
  if (!hierarchy) {
    return {
      success: false,
      message: 'Goals not initialized',
      error: 'Hierarchy file missing'
    };
  }
  
  const goal = hierarchy.goals[params.goalId];
  if (!goal) {
    return {
      success: false,
      message: `Goal ${params.goalId} not found`,
      error: 'Invalid goal ID'
    };
  }
  
  if (goal.status === 'completed') {
    return {
      success: false,
      message: `Goal ${params.goalId} already completed`,
      error: 'Already completed'
    };
  }
  
  // Mark as completed
  const now = new Date().toISOString();
  goal.status = 'completed';
  goal.completedAt = now;
  goal.updatedAt = now;
  
  await writeHierarchy(hierarchy);
  
  // Update context - add to recently completed
  const context = await readCurrentContext();
  if (context) {
    context.recentlyCompleted.unshift(params.goalId);
    context.recentlyCompleted = context.recentlyCompleted.slice(0, 5); // Keep max 5
    
    // Auto-advance if this was current goal
    if (context.currentGoalId === params.goalId) {
      const nextGoal = findNextGoal(goal, hierarchy.goals);
      if (nextGoal) {
        context.currentGoalId = nextGoal.id;
        context.currentPath = calculatePath(nextGoal.id, hierarchy.goals);
        
        // Start the next goal if it's not-started
        if (nextGoal.status === 'not-started') {
          nextGoal.status = 'in-progress';
          nextGoal.updatedAt = now;
          await writeHierarchy(hierarchy);
        }
      }
    }
    
    await writeCurrentContext(context);
  }
  
  return {
    success: true,
    message: `Goal ${params.goalId} completed and advanced to next goal`,
    goal,
    currentContext: context ?? undefined
  };
}

/**
 * Manually advance to specific goal
 */
async function advanceGoal(params: GoalManagementParams): Promise<GoalManagementResult> {
  if (!params.goalId) {
    return {
      success: false,
      message: 'goalId is required for advance action',
      error: 'Missing goalId parameter'
    };
  }
  
  const hierarchy = await readHierarchy();
  if (!hierarchy) {
    return {
      success: false,
      message: 'Goals not initialized',
      error: 'Hierarchy file missing'
    };
  }
  
  const goal = hierarchy.goals[params.goalId];
  if (!goal) {
    return {
      success: false,
      message: `Goal ${params.goalId} not found`,
      error: 'Invalid goal ID'
    };
  }
  
  // Set as current
  await updateCurrentContext(params.goalId);
  
  // Start if not-started
  if (goal.status === 'not-started') {
    goal.status = 'in-progress';
    goal.updatedAt = new Date().toISOString();
    await writeHierarchy(hierarchy);
  }
  
  const context = await readCurrentContext();
  
  return {
    success: true,
    message: `Advanced to goal ${params.goalId}`,
    goal,
    currentContext: context ?? undefined
  };
}

/**
 * Set current goal (alias for advance)
 */
async function setCurrentGoal(params: GoalManagementParams): Promise<GoalManagementResult> {
  return await advanceGoal(params);
}

/**
 * Get filtered context for display
 */
async function getContext(): Promise<GoalManagementResult> {
  const initialized = await isInitialized();
  if (!initialized) {
    return {
      success: false,
      message: 'Goals not initialized',
      error: 'Hierarchy file missing'
    };
  }
  
  const filteredGoals = await filterGoals();
  if (!filteredGoals) {
    return {
      success: false,
      message: 'Failed to filter goals',
      error: 'Invalid hierarchy or context'
    };
  }
  
  const context = await readCurrentContext();
  
  return {
    success: true,
    message: 'Context retrieved successfully',
    filteredGoals,
    currentContext: context ?? undefined
  };
}

/**
 * Delete a goal
 */
async function deleteGoal(params: GoalManagementParams): Promise<GoalManagementResult> {
  if (!params.goalId) {
    return {
      success: false,
      message: 'goalId is required for delete action',
      error: 'Missing goalId parameter'
    };
  }
  
  if (params.goalId === 'goal-main') {
    return {
      success: false,
      message: 'Cannot delete main goal',
      error: 'Protected goal'
    };
  }
  
  const hierarchy = await readHierarchy();
  if (!hierarchy) {
    return {
      success: false,
      message: 'Goals not initialized',
      error: 'Hierarchy file missing'
    };
  }
  
  const goal = hierarchy.goals[params.goalId];
  if (!goal) {
    return {
      success: false,
      message: `Goal ${params.goalId} not found`,
      error: 'Invalid goal ID'
    };
  }
  
  // Cannot delete if has children
  if (goal.childIds.length > 0) {
    return {
      success: false,
      message: `Cannot delete goal ${params.goalId} with ${goal.childIds.length} children`,
      error: 'Goal has children'
    };
  }
  
  // Remove from parent's childIds
  if (goal.parentId) {
    const parent = hierarchy.goals[goal.parentId];
    if (parent) {
      parent.childIds = parent.childIds.filter(id => id !== params.goalId);
      parent.updatedAt = new Date().toISOString();
    }
  }
  
  // Remove from hierarchy
  delete hierarchy.goals[params.goalId];
  
  await writeHierarchy(hierarchy);
  
  return {
    success: true,
    message: `Goal ${params.goalId} deleted successfully`
  };
}

/**
 * Analyze dependencies
 */
async function analyzeDependenciesAction(): Promise<GoalManagementResult> {
  const hierarchy = await readHierarchy();
  if (!hierarchy) {
    return {
      success: false,
      message: 'Goals not initialized',
      error: 'Hierarchy file missing'
    };
  }
  
  try {
    const analysis = analyzeDependencies(hierarchy);
    
    let message = `Dependency analysis complete:\n`;
    message += `- Execution order: ${analysis.executionOrder.length} goals\n`;
    message += `- Circular dependencies: ${analysis.circularDependencies.length}\n`;
    message += `- Blocked goals: ${analysis.blockedGoals.length}\n`;
    message += `- Ready goals: ${analysis.readyGoals.length}`;
    
    if (analysis.circularDependencies.length > 0) {
      message += `\n\n⚠️ Warning: Circular dependencies detected:\n`;
      analysis.circularDependencies.forEach((cycle, i) => {
        message += `  ${i + 1}. ${cycle.join(' → ')}\n`;
      });
    }
    
    return {
      success: true,
      message,
      dependencyAnalysis: analysis
    };
  } catch (error) {
    return {
      success: false,
      message: 'Dependency analysis failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Calculate priorities
 */
async function calculatePrioritiesAction(): Promise<GoalManagementResult> {
  const hierarchy = await readHierarchy();
  if (!hierarchy) {
    return {
      success: false,
      message: 'Goals not initialized',
      error: 'Hierarchy file missing'
    };
  }
  
  try {
    const priorities = calculatePriorities(hierarchy);
    
    // Update goals with calculated priorities
    priorities.forEach(calc => {
      const goal = hierarchy.goals[calc.goalId];
      if (goal) {
        goal.calculatedPriority = calc.priority;
      }
    });
    
    await writeHierarchy(hierarchy);
    
    let message = `Priority calculation complete:\n`;
    message += `Top 5 priorities:\n`;
    priorities.slice(0, 5).forEach((calc, i) => {
      const goal = hierarchy.goals[calc.goalId];
      message += `  ${i + 1}. ${goal.title} (${calc.priority} points)\n`;
      message += `     - Contribution: ${(calc.contributionToUltimate * 100).toFixed(1)}%\n`;
      message += `     - Dependents: ${calc.dependentCount}\n`;
      message += `     - Critical path: ${calc.onCriticalPath ? 'Yes' : 'No'}\n`;
    });
    
    return {
      success: true,
      message,
      priorityCalculations: priorities
    };
  } catch (error) {
    return {
      success: false,
      message: 'Priority calculation failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Reorder goals based on dependencies
 */
async function reorderAction(): Promise<GoalManagementResult> {
  const hierarchy = await readHierarchy();
  if (!hierarchy) {
    return {
      success: false,
      message: 'Goals not initialized',
      error: 'Hierarchy file missing'
    };
  }
  
  try {
    reorderGoalsByDependencies(hierarchy);
    await writeHierarchy(hierarchy);
    
    return {
      success: true,
      message: 'Goals reordered based on dependency graph'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Reorder failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Main tool handler
 */
export async function handleGoalManagement(params: unknown): Promise<GoalManagementResult> {
  try {
    const validated = goalManagementSchema.parse(params);
    
    switch (validated.action) {
      case 'create':
        return await createGoal(validated);
      
      case 'read':
        return await readGoal(validated);
      
      case 'update':
        return await updateGoal(validated);
      
      case 'delete':
        return await deleteGoal(validated);
      
      case 'get-context':
        return await getContext();
      
      case 'complete':
        return await completeGoal(validated);
      
      case 'advance':
        return await advanceGoal(validated);
      
      case 'set-current':
        return await setCurrentGoal(validated);
      
      case 'analyze-dependencies':
        return await analyzeDependenciesAction();
      
      case 'calculate-priorities':
        return await calculatePrioritiesAction();
      
      case 'reorder':
        return await reorderAction();
      
      default:
        return {
          success: false,
          message: `Unknown action: ${validated.action}`,
          error: 'Invalid action'
        };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Invalid parameters',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export const goalManagementTool = {
  name: 'goal_management',
  description: 'Manage hierarchical goals and track progress. Supports create, read, update, delete, complete, advance, get-context, set-current, analyze-dependencies, calculate-priorities, and reorder actions. Includes dependency graph analysis and automatic priority calculation.',
  inputSchema: goalManagementSchema
};
