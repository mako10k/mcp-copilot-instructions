---
category: tools
tags: [mcp, server, instructions]
priority: high
required: true
phases: [development, refactoring, testing]
---
# MCP Instructions Server Usage Guide

## Concept
The server minimizes attention dispersion by dynamically surfacing only context-relevant instruction subsets.

## Core Tools
- `change_context` – Update phase/focus for dynamic regeneration.
- `project_context` – Persist new rules for future sessions.
- `instructions_structure` – Modify this instruction corpus (insert/update/delete).
- `onboarding` – Analyze, propose migration, migrate, rollback.

## Phase Values
- `development`, `refactoring`, `testing`, `debugging`, `documentation`.

## Dynamic Generation Cycle
1. `change_context` invoked
2. Scoring of relevance
3. Assembly of required + top related sections
4. Focused consumption by LLM

## Required Sections
- This usage guide
- TypeScript coding conventions

## Example
```typescript
change_context({
  action: 'update',
  state: { phase: 'development', focus: ['API', 'JWT'], priority: 'high' }
});
```

## Persistence Rules
- Register new constraints immediately in `project_context`.
- Validate against existing entries before insertion.
