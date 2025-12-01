/**
 * Goal Management System - Type Definitions
 * 
 * Defines the data structures for hierarchical goal tracking and management.
 * Goals are stored in .copilot-instructions/goals/ and dynamically filtered
 * to show only relevant context in generated instructions.
 */

/**
 * Goal status types
 */
export type GoalStatus = 'not-started' | 'in-progress' | 'completed' | 'blocked';

/**
 * Individual goal with metadata
 */
export interface Goal {
  /** Unique identifier (e.g., "goal-main", "task-2.1") */
  id: string;
  
  /** Goal title */
  title: string;
  
  /** Detailed description */
  description: string;
  
  /** Current status */
  status: GoalStatus;
  
  /** Parent goal ID (null for main goal) */
  parentId: string | null;
  
  /** Array of child goal IDs */
  childIds: string[];
  
  /** Order within siblings (auto-calculated from dependencies) */
  order: number;
  
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
  
  /** Completion timestamp (ISO 8601, only if completed) */
  completedAt?: string;
  
  /** Additional notes */
  notes?: string;
  
  /** IDs of goals that must be completed first (dependency graph) */
  dependencies?: string[];
  
  /** Goals that depend on this goal (reverse dependencies) */
  dependents?: string[];
  
  /** Calculated priority based on contribution to parent (0-100) */
  calculatedPriority?: number;
  
  /** Manual priority override (0-100) */
  manualPriority?: number;
  
  /** Contribution weight to parent goal (0-1, default 1) */
  contributionWeight?: number;
  
  /** Estimated effort (in hours) */
  estimatedEffort?: number;
  
  /** Actual effort spent (in hours) */
  actualEffort?: number;
}

/**
 * Complete goal hierarchy
 */
export interface GoalHierarchy {
  /** Schema version */
  version: string;
  
  /** Last update timestamp */
  lastUpdated: string;
  
  /** Root goal ID */
  rootId: string;
  
  /** All goals indexed by ID */
  goals: Record<string, Goal>;
}

/**
 * Current context tracking
 */
export interface CurrentContext {
  /** Schema version */
  version: string;
  
  /** Last update timestamp */
  lastUpdated: string;
  
  /** Current focus goal ID */
  currentGoalId: string;
  
  /** Full path from root to current (array of goal IDs) */
  currentPath: string[];
  
  /** Recently completed goal IDs (max 5, most recent first) */
  recentlyCompleted: string[];
  
  /** IDs of upcoming goals (next siblings and children) */
  upcomingGoals: string[];
  
  /** IDs of blocked goals */
  blockedGoals: string[];
}

/**
 * Filtered goals for display in instructions
 */
export interface FilteredGoals {
  /** Ultimate goal (main project objective) */
  ultimate: Goal;
  
  /** Current path from main to current goal */
  currentPath: Goal[];
  
  /** Sibling context */
  siblings: {
    previous: Goal | null;
    next: Goal | null;
  };
  
  /** Current goal's children (if any) */
  children: Goal[];
  
  /** Recently completed goals */
  recentlyCompleted: Goal[];
}

/**
 * Dependency graph analysis result
 */
export interface DependencyAnalysis {
  /** Topologically sorted goal IDs (safe execution order) */
  executionOrder: string[];
  
  /** Detected circular dependencies */
  circularDependencies: string[][];
  
  /** Goals with unmet dependencies */
  blockedGoals: string[];
  
  /** Goals ready to start (no unmet dependencies) */
  readyGoals: string[];
}

/**
 * Priority calculation result
 */
export interface PriorityCalculation {
  /** Goal ID */
  goalId: string;
  
  /** Calculated priority (0-100) */
  priority: number;
  
  /** Contribution to ultimate goal (0-1) */
  contributionToUltimate: number;
  
  /** Depth from ultimate goal */
  depth: number;
  
  /** Number of dependent goals */
  dependentCount: number;
  
  /** Critical path indicator */
  onCriticalPath: boolean;
}

/**
 * Goal management tool parameters
 */
export interface GoalManagementParams {
  action: 'create' | 'read' | 'update' | 'delete' | 'complete' | 'advance' | 'get-context' | 'set-current' | 'analyze-dependencies' | 'calculate-priorities' | 'reorder';
  
  /** Goal ID (for read, update, delete, complete, set-current) */
  goalId?: string;
  
  /** Goal data (for create, update) */
  goal?: {
    title: string;
    description: string;
    parentId?: string;
    order?: number;
    dependencies?: string[];
    notes?: string;
    contributionWeight?: number;
    estimatedEffort?: number;
    manualPriority?: number;
  };
  
  /** New status (for update) */
  status?: GoalStatus;
  
  /** Filter criteria (for read) */
  filter?: {
    status?: GoalStatus;
    parentId?: string;
    includeChildren?: boolean;
  };
}

/**
 * Goal management tool result
 */
export interface GoalManagementResult {
  success: boolean;
  message: string;
  
  /** Single goal (for create, read with ID, set-current) */
  goal?: Goal;
  
  /** Multiple goals (for read with filter) */
  goals?: Goal[];
  
  /** Filtered goals (for get-context) */
  filteredGoals?: FilteredGoals;
  
  /** Current context (for complete, advance, set-current) */
  currentContext?: CurrentContext;
  
  /** Dependency analysis (for analyze-dependencies) */
  dependencyAnalysis?: DependencyAnalysis;
  
  /** Priority calculations (for calculate-priorities) */
  priorityCalculations?: PriorityCalculation[];
  
  /** Error details if failed */
  error?: string;
}

/**
 * Goal section formatting options
 */
export interface GoalSectionFormat {
  /** Include emoji indicators */
  includeEmoji: boolean;
  
  /** Maximum depth to display */
  maxDepth: number;
  
  /** Show completion percentages */
  showProgress: boolean;
  
  /** Compact or detailed format */
  format: 'compact' | 'detailed';
}
