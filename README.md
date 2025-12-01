# mcp-copilot-instructions

**Solving LLM Attention Dispersion Problem with "Context-Dependent Dynamic Instruction Generation"**

## Challenge
Adding extensive instructions → Massive growth → LLM attention dispersion → Important instructions become ineffective

## Solution
```
Huge instruction database (.copilot-instructions/, Git managed)
    ↓ Context recognition engine (MCP server)
    ↓ Understand current state/flow from ToDo management
    ↓ Extract only relevant instructions
.github/copilot-instructions.md (dynamically generated)
    ↓ Narrowed down to only necessary instructions for current context
LLM (Focused attention)
```

## Purpose
- **Prevent attention dispersion from instruction bloat**: Retain overall project knowledge while providing LLM with only instructions needed for "current flow"
- **Context-dependent dynamic generation**: Automatically extract appropriate instructions for current phase from ToDo and task state
- **Git-managed change history**: Manage entire instruction database with Git, utilize branching strategy, review, and rollback

## Important: Terminology Definition

In this project, careful attention is required regarding who "user" refers to:

- **Copilot (LLM)**: **Primary user** of MCP tools. Calls tools itself to manage context.
- **Human Developer**: Actual developer using Copilot. Gives instructions to Copilot and makes final decisions.

Unless specifically noted, "user" refers to **Copilot (LLM) itself**.

## Main Documentation
- Design: `docs/mcp-server-design.md`
- Operations: `docs/operation-scenarios.md`
- Research: `research/copilot-instructions-research.md`
- Instructions: `.github/copilot-instructions.md`

## Operations Policy (Excerpt)
- Regular review: At least once a week, immediate reflection for important changes
- Change retention: Reflect decisions made in conversations into instructions and context
- Conflict management: Explicitly invalidate old rules and prioritize new rules

## Key Features (Phase 2 Complete)
- ✅ **Goal Management System**: Hierarchical goal tracking with auto-advancement, never lose sight of objectives
- ✅ **Conflict Detection**: External change detection with safe resolution
- ✅ **History Management**: Rollback capability with 30-day retention
- ✅ **Dynamic Generation**: Context-aware instruction filtering
- ✅ **Feedback System**: Critical feedback tracking with hard/soft limits

## Available MCP Tools
1. **guidance**: Usage guide and current status
2. **project_context**: CRUD operations for project context
3. **instructions_structure**: Markdown AST operations with conflict management
4. **change_context**: Development context switching with auto-regeneration
5. **feedback**: Critical feedback tracking
6. **onboarding**: Migration support for existing projects
7. **goal_management**: Hierarchical goal tracking and progress management (NEW)

## Next Development Steps
- Integration testing and CI/CD setup
- Performance optimization for large instruction sets
- Enhanced analytics for instruction effectiveness
