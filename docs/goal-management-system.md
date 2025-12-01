# Goal Management System Design

**Created**: December 1, 2025  
**Version**: 1.0.0

---

## 1. Overview

This document describes the **Goal Management System** for the MCP Copilot Instructions server. The system ensures that goals are never lost by maintaining them in the instruction database and dynamically filtering them based on the current context.

### 1.1 Purpose

**Problem**: During long development sessions, developers and AI assistants lose sight of the ultimate goal, getting distracted by sub-tasks and implementation details.

**Solution**: Maintain a hierarchical goal structure in `.copilot-instructions/goals/` and dynamically inject only relevant goals into the active instruction set based on current progress.

### 1.2 Key Features

1. **Hierarchical Goal Structure**: Main goal → Sub-goals → Tasks → Sub-tasks
2. **Context-Aware Filtering**: Show only current, previous, next, and ultimate goals
3. **Progress Tracking**: Mark completed goals and automatically advance focus
4. **Dynamic Instruction Generation**: Integrate with `change_context` to update visible goals

---

## 2. Goal Hierarchy Structure

### 2.1 Goal Levels

```
Main Goal (Ultimate Objective)
├── Sub-Goal 1
│   ├── Task 1.1
│   │   ├── Sub-Task 1.1.1
│   │   └── Sub-Task 1.1.2
│   └── Task 1.2
├── Sub-Goal 2 (Current Focus)
│   ├── Task 2.1 (Completed ✓)
│   ├── Task 2.2 (Current →)
│   │   ├── Sub-Task 2.2.1 (Completed ✓)
│   │   └── Sub-Task 2.2.2 (Current →)
│   └── Task 2.3
└── Sub-Goal 3
```

### 2.2 Goal Attributes

Each goal has the following metadata:

```typescript
interface Goal {
  id: string;                    // Unique identifier (e.g., "goal-001", "task-2.2.1")
  title: string;                 // Goal title
  description: string;           // Detailed description
  status: "not-started" | "in-progress" | "completed" | "blocked";
  parentId?: string;             // Parent goal ID (null for main goal)
  childIds: string[];            // Array of child goal IDs
  order: number;                 // Order within siblings
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  completedAt?: string;          // ISO 8601 timestamp
  notes?: string;                // Additional notes
  dependencies?: string[];       // IDs of goals that must be completed first
}
```

---

## 3. Storage Structure

### 3.1 File Organization

```
.copilot-instructions/
  └── goals/
      ├── main-goal.md           # Ultimate project goal
      ├── hierarchy.json         # Complete goal tree structure
      └── current-context.json   # Current focus and progress state
```

### 3.2 main-goal.md Example

```markdown
---
id: goal-main
status: in-progress
---

# Main Goal: Complete MCP Copilot Instructions Server

## Description
Build a fully functional MCP server that dynamically manages `.github/copilot-instructions.md` 
by filtering instructions based on development context, preventing attention dispersion 
while maintaining comprehensive project knowledge.

## Success Criteria
1. Dynamic instruction generation working with scoring algorithm
2. Git integration with commit hash tracking
3. Conflict detection and safe merging
4. Documentation complete with usage examples
5. Test coverage > 80%

## Ultimate Value
Enable AI assistants to maintain consistent, context-appropriate behavior throughout 
long development sessions without overwhelming token limits.
```

### 3.3 hierarchy.json Example

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-12-01T08:00:00Z",
  "goals": {
    "goal-main": {
      "id": "goal-main",
      "title": "Complete MCP Copilot Instructions Server",
      "description": "Build fully functional MCP server...",
      "status": "in-progress",
      "childIds": ["goal-phase1", "goal-phase2", "goal-phase3"],
      "order": 0,
      "createdAt": "2025-11-15T00:00:00Z",
      "updatedAt": "2025-12-01T08:00:00Z"
    },
    "goal-phase1": {
      "id": "goal-phase1",
      "title": "Phase 1: MVP - Basic CRUD Operations",
      "description": "Implement core tools and Git integration",
      "status": "completed",
      "parentId": "goal-main",
      "childIds": ["task-1.1", "task-1.2", "task-1.3"],
      "order": 1,
      "createdAt": "2025-11-15T00:00:00Z",
      "completedAt": "2025-11-25T00:00:00Z"
    },
    "goal-phase2": {
      "id": "goal-phase2",
      "title": "Phase 2: Dynamic Generation Engine",
      "description": "Implement context-aware instruction filtering",
      "status": "in-progress",
      "parentId": "goal-main",
      "childIds": ["task-2.1", "task-2.2", "task-2.3"],
      "order": 2,
      "createdAt": "2025-11-20T00:00:00Z",
      "updatedAt": "2025-12-01T08:00:00Z"
    },
    "task-2.2": {
      "id": "task-2.2",
      "title": "Implement change_context tool",
      "description": "Lightweight tool for updating development state",
      "status": "in-progress",
      "parentId": "goal-phase2",
      "childIds": ["subtask-2.2.1", "subtask-2.2.2"],
      "order": 2,
      "createdAt": "2025-11-28T00:00:00Z",
      "updatedAt": "2025-12-01T08:00:00Z"
    }
  }
}
```

### 3.4 current-context.json Example

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-12-01T08:00:00Z",
  "currentGoalId": "task-2.2",
  "currentPath": ["goal-main", "goal-phase2", "task-2.2"],
  "recentlyCompleted": ["task-2.1", "subtask-2.2.1"],
  "upcomingGoals": ["subtask-2.2.2", "task-2.3"],
  "blockedGoals": []
}
```

---

## 4. Dynamic Goal Filtering

### 4.1 Filtering Algorithm

When generating `.github/copilot-instructions.md`, include only:

1. **Ultimate Goal** (1 item): Main project objective
2. **Current Goal Path** (2-4 items): Full path from main to current
3. **Sibling Context** (2 items): Previous and next sibling goals
4. **Child Context** (2-3 items): Current goal's children if any
5. **Recently Completed** (1-2 items): Last completed goals for continuity

**Total**: Maximum 10-12 goal items displayed at once

### 4.2 Filtering Rules

```typescript
function filterGoals(hierarchy: GoalHierarchy, context: CurrentContext): FilteredGoals {
  const filtered: FilteredGoals = {
    ultimate: hierarchy.goals[hierarchy.rootId],
    currentPath: [],
    siblings: { previous: null, next: null },
    children: [],
    recentlyCompleted: []
  };
  
  // 1. Build current path
  let goalId = context.currentGoalId;
  while (goalId) {
    const goal = hierarchy.goals[goalId];
    filtered.currentPath.unshift(goal);
    goalId = goal.parentId;
  }
  
  // 2. Get siblings
  const current = hierarchy.goals[context.currentGoalId];
  if (current.parentId) {
    const parent = hierarchy.goals[current.parentId];
    const siblingIds = parent.childIds;
    const currentIndex = siblingIds.indexOf(context.currentGoalId);
    
    if (currentIndex > 0) {
      filtered.siblings.previous = hierarchy.goals[siblingIds[currentIndex - 1]];
    }
    if (currentIndex < siblingIds.length - 1) {
      filtered.siblings.next = hierarchy.goals[siblingIds[currentIndex + 1]];
    }
  }
  
  // 3. Get current goal's children
  filtered.children = current.childIds
    .map(id => hierarchy.goals[id])
    .filter(g => g.status !== 'completed')
    .slice(0, 3);
  
  // 4. Get recently completed
  filtered.recentlyCompleted = context.recentlyCompleted
    .map(id => hierarchy.goals[id])
    .slice(0, 2);
  
  return filtered;
}
```

### 4.3 Generated Instruction Example

```markdown
## Current Goals

### 🎯 Ultimate Goal
**Complete MCP Copilot Instructions Server**  
Build a fully functional MCP server that dynamically manages instructions.

### 📍 Current Path
Main Goal → Phase 2: Dynamic Generation Engine → **Implement change_context tool**

### ⬅️ Previous Goal (Completed ✓)
Implement generate_instructions tool

### ➡️ Next Goal
Implement scoring algorithm

### 🔽 Sub-Tasks
1. Design change_context API parameters
2. **Implement state management** ← Current
3. Add auto-regeneration trigger

### ✅ Recently Completed
- Design .copilot-instructions/ structure
- Create initial templates
```

---

## 5. MCP Tool Integration

### 5.1 New Tool: `goal_management`

```typescript
server.tool("goal_management", {
  action: z.enum([
    "create",      // Create new goal
    "read",        // Read goal(s)
    "update",      // Update goal status/details
    "delete",      // Delete goal
    "complete",    // Mark goal as completed (auto-advances)
    "advance",     // Manually advance to next goal
    "get-context", // Get current filtered goals
    "set-current"  // Set current focus goal
  ]),
  goalId: z.string().optional(),
  goal: z.object({
    title: z.string(),
    description: z.string(),
    parentId: z.string().optional(),
    order: z.number().optional(),
    dependencies: z.array(z.string()).optional()
  }).optional(),
  status: z.enum(["not-started", "in-progress", "completed", "blocked"]).optional()
}, async (params) => {
  // Implementation
});
```

### 5.2 Integration with change_context

When `change_context` is called, automatically update goal context:

```typescript
// In change_context implementation
async function changeContext(state: ContextState) {
  // 1. Update context state
  await updateContextState(state);
  
  // 2. Update current goal if phase changed
  if (state.phase) {
    const phaseGoal = findGoalByPhase(state.phase);
    if (phaseGoal) {
      await goalManagement({
        action: "set-current",
        goalId: phaseGoal.id
      });
    }
  }
  
  // 3. Regenerate instructions (includes filtered goals)
  if (state.autoRegenerate !== false) {
    await generateInstructions({ action: "generate" });
  }
}
```

### 5.3 Integration with generate_instructions

Include filtered goals in generated instructions:

```typescript
async function generateInstructions() {
  // 1. Get current goal context
  const goalContext = await goalManagement({
    action: "get-context"
  });
  
  // 2. Select relevant instruction sections
  const sections = await filterInstructions(context);
  
  // 3. Prepend goal context section
  const goalSection = formatGoalSection(goalContext);
  
  // 4. Write to .github/copilot-instructions.md
  const content = [
    generateMetadata(),
    goalSection,           // ← Goals always at the top
    ...sections
  ].join('\n\n');
  
  await fs.writeFile('.github/copilot-instructions.md', content);
}
```

---

## 6. Usage Scenarios

### 6.1 Scenario: Starting New Development Phase

```typescript
// User: "Let's start implementing Phase 2"

// Copilot executes:
await goalManagement({
  action: "advance",
  goalId: "goal-phase2"
});

// Result:
// - Current context updated to Phase 2
// - Instructions regenerated with Phase 2 goals visible
// - Phase 1 completion recorded
```

### 6.2 Scenario: Completing a Task

```typescript
// User: "I've finished implementing change_context"

// Copilot executes:
await goalManagement({
  action: "complete",
  goalId: "task-2.2"
});

// Result:
// - task-2.2 marked as completed
// - Current focus auto-advances to task-2.3
// - Instructions updated to show task-2.3 as current
// - task-2.2 moves to "recently completed" section
```

### 6.3 Scenario: Creating Sub-Goal During Development

```typescript
// User: "We need to add input validation before continuing"

// Copilot executes:
await goalManagement({
  action: "create",
  goal: {
    title: "Add input validation to change_context",
    description: "Validate all parameters before state update",
    parentId: "task-2.2",  // Current task
    order: 2.5  // Insert between existing sub-tasks
  }
});

// Result:
// - New sub-goal created and inserted in hierarchy
// - Instructions updated to show new sub-goal
// - Current focus automatically set to new sub-goal
```

---

## 7. Implementation Priority

### Phase 1: Core Goal Management ✅ Next Implementation
1. Create `goal_management` tool with basic CRUD
2. Implement hierarchy.json management
3. Implement current-context.json tracking
4. Add goal filtering algorithm

### Phase 2: Integration
1. Integrate with `change_context`
2. Integrate with `generate_instructions`
3. Add goal section formatting
4. Test with real development workflow

### Phase 3: Advanced Features
1. Goal dependency tracking
2. Automatic goal advancement based on file changes
3. Goal achievement metrics
4. Goal history and analytics

---

## 8. Benefits

### 8.1 For Developers

- **Never lose sight of the ultimate goal** during deep implementation work
- **Clear progress visibility** - see what's done and what's next
- **Better task decomposition** - hierarchical structure encourages breaking down work
- **Reduced cognitive load** - system remembers the big picture

### 8.2 For AI Assistants

- **Consistent context** across chat sessions
- **Goal-oriented suggestions** aligned with current objectives
- **Automatic progress tracking** without manual reminders
- **Better decision-making** - always aware of ultimate objective

---

## 9. Example: Goal Management in Action

### Initial State
```
Main Goal: Complete MCP Server
├── Phase 1: MVP ✓ (Completed)
├── Phase 2: Dynamic Generation (Current →)
│   ├── Task 2.1: Design structure ✓
│   ├── Task 2.2: Implement change_context (Current →)
│   │   ├── Subtask 2.2.1: Design API ✓
│   │   └── Subtask 2.2.2: Implement (Current →)
│   └── Task 2.3: Implement scoring
└── Phase 3: Advanced Features
```

### Generated Instruction Section
```markdown
## 🎯 Current Goals

**Ultimate Objective**: Complete MCP Copilot Instructions Server

**Current Focus**: Implement change_context → Implement state management logic

**Progress Path**:
- ✅ Phase 1: MVP (Completed)
- 🔄 Phase 2: Dynamic Generation (In Progress)
  - ✅ Task 2.1: Design structure
  - 🔄 Task 2.2: Implement change_context
    - ✅ Design API parameters
    - **→ Implement state management** ← You are here
  - ⏭️ Task 2.3: Implement scoring algorithm

**Recently Completed**: Design API parameters, Design structure

**Next Up**: Add auto-regeneration trigger, Implement scoring algorithm
```

---

## 10. Success Metrics

- **Goal Visibility**: Current goals always present in instructions
- **Focus Maintenance**: No deviation from current goal path
- **Completion Rate**: Increase in task completion speed
- **Context Switching**: Reduced time to resume after breaks

---

## Summary

The Goal Management System ensures that development always stays aligned with the ultimate objective by:

1. **Maintaining hierarchical goal structure** in `.copilot-instructions/goals/`
2. **Dynamically filtering goals** to show only relevant context (max 10-12 items)
3. **Integrating with change_context** for automatic updates
4. **Including goals in generated instructions** at the top of every session

This system prevents the common problem of "getting lost in the weeds" during long development sessions, keeping both human developers and AI assistants focused on what matters.

**Next Step**: Implement Phase 1 (Core Goal Management)
