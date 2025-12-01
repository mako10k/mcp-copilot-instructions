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
import type { Goal, GoalStatus, GoalManagementParams, GoalManagementResult } from '../types/goals.js';
import {
  isInitialized,
  readHierarchy,
  writeHierarchy,
  readCurrentContext,
  writeCurrentContext,
  createInitialHierarchy,
  createInitialContext
} from '../utils/goalStorage.js';

// Zod schema for parameter validation
const goalManagementSchema = z.object({
  action: z.enum(['create', 'read', 'update', 'delete', 'complete', 'advance', 'get-context', 'set-current']),
  goalId: z.string().optional(),
  goal: z.object({
    title: z.string(),
    description: z.string(),
    parentId: z.string().optional(),
    order: z.number().optional(),
    dependencies: z.array(z.string()).optional(),
    notes: z.string().optional()
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
    notes: params.goal.notes
  };
  
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
      
      // TODO: Implement remaining actions in Step 4
      case 'complete':
      case 'advance':
      case 'get-context':
      case 'set-current':
        return {
          success: false,
          message: `Action ${validated.action} not yet implemented`,
          error: 'Not implemented'
        };
      
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
  description: 'Manage hierarchical goals and track progress. Supports create, read, update, delete, complete, advance, get-context, and set-current actions.',
  inputSchema: goalManagementSchema
};
