/**
 * Goal Dependency Graph Utilities
 * 
 * Handles dependency analysis, topological sorting, and priority calculation
 */

import type { Goal, GoalHierarchy, DependencyAnalysis, PriorityCalculation } from '../types/goals.js';

/**
 * Perform topological sort using Kahn's algorithm
 * Returns null if circular dependency detected
 */
function topologicalSort(goals: Record<string, Goal>): string[] | null {
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();
  const goalIds = Object.keys(goals);
  
  // Initialize
  goalIds.forEach(id => {
    inDegree.set(id, 0);
    adjList.set(id, []);
  });
  
  // Build adjacency list and calculate in-degrees
  goalIds.forEach(id => {
    const goal = goals[id];
    if (goal.dependencies) {
      goal.dependencies.forEach(depId => {
        if (goals[depId]) {
          adjList.get(depId)!.push(id);
          inDegree.set(id, (inDegree.get(id) || 0) + 1);
        }
      });
    }
  });
  
  // Queue for goals with no dependencies
  const queue: string[] = [];
  inDegree.forEach((degree, id) => {
    if (degree === 0) {
      queue.push(id);
    }
  });
  
  const sorted: string[] = [];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    
    // Reduce in-degree for dependents
    const dependents = adjList.get(current) || [];
    dependents.forEach(dependent => {
      const newDegree = (inDegree.get(dependent) || 0) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) {
        queue.push(dependent);
      }
    });
  }
  
  // If not all goals are sorted, there's a cycle
  if (sorted.length !== goalIds.length) {
    return null;
  }
  
  return sorted;
}

/**
 * Detect circular dependencies using DFS
 */
function detectCircularDependencies(goals: Record<string, Goal>): string[][] {
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycles: string[][] = [];
  
  function dfs(goalId: string, path: string[]): void {
    visited.add(goalId);
    recStack.add(goalId);
    path.push(goalId);
    
    const goal = goals[goalId];
    if (goal && goal.dependencies) {
      for (const depId of goal.dependencies) {
        if (!goals[depId]) continue;
        
        if (!visited.has(depId)) {
          dfs(depId, path);
        } else if (recStack.has(depId)) {
          // Found cycle
          const cycleStart = path.indexOf(depId);
          if (cycleStart !== -1) {
            cycles.push([...path.slice(cycleStart), depId]);
          }
        }
      }
    }
    
    path.pop();
    recStack.delete(goalId);
  }
  
  Object.keys(goals).forEach(id => {
    if (!visited.has(id)) {
      dfs(id, []);
    }
  });
  
  return cycles;
}

/**
 * Find goals with unmet dependencies
 */
function findBlockedGoals(goals: Record<string, Goal>): string[] {
  const blocked: string[] = [];
  
  Object.values(goals).forEach(goal => {
    if (goal.status === 'blocked') {
      blocked.push(goal.id);
      return;
    }
    
    if (goal.dependencies) {
      const hasUnmetDependency = goal.dependencies.some(depId => {
        const dep = goals[depId];
        return dep && dep.status !== 'completed';
      });
      
      if (hasUnmetDependency) {
        blocked.push(goal.id);
      }
    }
  });
  
  return blocked;
}

/**
 * Find goals ready to start (all dependencies met)
 */
function findReadyGoals(goals: Record<string, Goal>): string[] {
  const ready: string[] = [];
  
  Object.values(goals).forEach(goal => {
    if (goal.status === 'completed' || goal.status === 'in-progress') {
      return;
    }
    
    // Check if all dependencies are met
    let allDependenciesMet = true;
    if (goal.dependencies && goal.dependencies.length > 0) {
      allDependenciesMet = goal.dependencies.every(depId => {
        const dep = goals[depId];
        return dep && dep.status === 'completed';
      });
    }
    
    if (allDependenciesMet) {
      ready.push(goal.id);
    }
  });
  
  return ready;
}

/**
 * Analyze dependency graph
 */
export function analyzeDependencies(hierarchy: GoalHierarchy): DependencyAnalysis {
  const { goals } = hierarchy;
  
  // Topological sort
  const executionOrder = topologicalSort(goals) || [];
  
  // Detect cycles
  const circularDependencies = detectCircularDependencies(goals);
  
  // Find blocked and ready goals
  const blockedGoals = findBlockedGoals(goals);
  const readyGoals = findReadyGoals(goals);
  
  return {
    executionOrder,
    circularDependencies,
    blockedGoals,
    readyGoals
  };
}

/**
 * Calculate depth from root goal
 */
function calculateDepth(goalId: string, goals: Record<string, Goal>, rootId: string): number {
  if (goalId === rootId) return 0;
  
  const goal = goals[goalId];
  if (!goal || !goal.parentId) return 0;
  
  return 1 + calculateDepth(goal.parentId, goals, rootId);
}

/**
 * Calculate contribution to ultimate goal
 */
function calculateContributionToUltimate(
  goalId: string,
  goals: Record<string, Goal>,
  rootId: string,
  memo: Map<string, number> = new Map()
): number {
  if (goalId === rootId) return 1.0;
  
  if (memo.has(goalId)) {
    return memo.get(goalId)!;
  }
  
  const goal = goals[goalId];
  if (!goal || !goal.parentId) return 0;
  
  const weight = goal.contributionWeight ?? 1.0;
  const parent = goals[goal.parentId];
  
  if (!parent) return 0;
  
  // Calculate parent's child count for normalization
  const siblingCount = parent.childIds.length || 1;
  const normalizedWeight = weight / siblingCount;
  
  const parentContribution = calculateContributionToUltimate(goal.parentId, goals, rootId, memo);
  const contribution = normalizedWeight * parentContribution;
  
  memo.set(goalId, contribution);
  return contribution;
}

/**
 * Count dependent goals (goals that depend on this goal)
 */
function countDependents(goalId: string, goals: Record<string, Goal>): number {
  let count = 0;
  
  Object.values(goals).forEach(goal => {
    if (goal.dependencies && goal.dependencies.includes(goalId)) {
      count++;
    }
  });
  
  return count;
}

/**
 * Check if goal is on critical path
 * A goal is on critical path if its delay would delay the ultimate goal
 */
function isOnCriticalPath(
  goalId: string,
  goals: Record<string, Goal>,
  rootId: string
): boolean {
  // Build reverse dependency graph
  const dependents = new Map<string, string[]>();
  Object.values(goals).forEach(goal => {
    if (goal.dependencies) {
      goal.dependencies.forEach(depId => {
        if (!dependents.has(depId)) {
          dependents.set(depId, []);
        }
        dependents.get(depId)!.push(goal.id);
      });
    }
  });
  
  // Check if there's a path from this goal to root through dependencies
  const visited = new Set<string>();
  
  function hasPathToRoot(currentId: string): boolean {
    if (currentId === rootId) return true;
    if (visited.has(currentId)) return false;
    
    visited.add(currentId);
    
    const deps = dependents.get(currentId) || [];
    return deps.some(depId => hasPathToRoot(depId));
  }
  
  return hasPathToRoot(goalId);
}

/**
 * Calculate priorities for all goals
 */
export function calculatePriorities(hierarchy: GoalHierarchy): PriorityCalculation[] {
  const { goals, rootId } = hierarchy;
  const calculations: PriorityCalculation[] = [];
  
  Object.values(goals).forEach(goal => {
    const depth = calculateDepth(goal.id, goals, rootId);
    const contributionToUltimate = calculateContributionToUltimate(goal.id, goals, rootId);
    const dependentCount = countDependents(goal.id, goals);
    const onCriticalPath = isOnCriticalPath(goal.id, goals, rootId);
    
    // Calculate priority (0-100)
    // Factors:
    // - Contribution to ultimate: 40 points
    // - Dependent count: 20 points (max)
    // - Critical path: 20 points
    // - Manual priority override: 20 points
    // - Inverse depth (shorter path = higher priority): 10 points (max)
    
    let priority = 0;
    
    // Contribution factor (0-40)
    priority += contributionToUltimate * 40;
    
    // Dependent factor (0-20, capped at 10 dependents)
    priority += Math.min(dependentCount / 10, 1) * 20;
    
    // Critical path bonus (0-20)
    if (onCriticalPath) {
      priority += 20;
    }
    
    // Manual priority override (0-20)
    if (goal.manualPriority !== undefined) {
      priority += (goal.manualPriority / 100) * 20;
    }
    
    // Depth factor (0-10, max depth 10)
    const maxDepth = 10;
    priority += Math.max(0, (maxDepth - depth) / maxDepth) * 10;
    
    // Apply manual priority if set (overrides calculated)
    if (goal.manualPriority !== undefined) {
      priority = goal.manualPriority;
    }
    
    calculations.push({
      goalId: goal.id,
      priority: Math.round(priority),
      contributionToUltimate,
      depth,
      dependentCount,
      onCriticalPath
    });
  });
  
  return calculations.sort((a, b) => b.priority - a.priority);
}

/**
 * Auto-reorder goals based on dependencies
 */
export function reorderGoalsByDependencies(hierarchy: GoalHierarchy): void {
  const analysis = analyzeDependencies(hierarchy);
  
  if (analysis.circularDependencies.length > 0) {
    throw new Error(`Cannot reorder: circular dependencies detected`);
  }
  
  // Update order based on execution order
  const orderMap = new Map<string, number>();
  analysis.executionOrder.forEach((goalId, index) => {
    orderMap.set(goalId, index);
  });
  
  Object.values(hierarchy.goals).forEach(goal => {
    const newOrder = orderMap.get(goal.id);
    if (newOrder !== undefined) {
      goal.order = newOrder;
    }
  });
}
