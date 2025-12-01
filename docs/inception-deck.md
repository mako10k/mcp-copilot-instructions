# Inception Deck - mcp-copilot-instructions

**Created**: December 1, 2025  
**Project**: Solving LLM Attention Dispersion Problem

---

## 1. Why Are We Here? (Why)

### Core Problem
As development progresses, `.github/copilot-instructions.md` becomes increasingly detailed.  
→ Instructions become massive  
→ LLM attention disperses  
→ **"Instructions truly needed for current flow/state" get neglected**

### Empirical Evidence
- Project start: Simple instructions → Copilot focused and effective
- After weeks: Instructions 10x detailed → Copilot response becomes sluggish
- After month: Instructions bloated → Important conventions ignored

### Goal
**Balance "rich project-wide knowledge" with "optimal information provision to LLM"**

---

## 2. Elevator Pitch (What)

An MCP server for GitHub Copilot users that  
**solves the LLM attention dispersion problem**.

This product **dynamically generates only contextually necessary instructions** from a **huge instruction database**,  
resolving the traditional "instruction bloat → reduced effectiveness" problem.

Unlike existing static `.github/copilot-instructions.md`,  
it **auto-extracts "instructions needed now" from current ToDos, development phase, and edited files**.

---

## 3. Package Design

```
┌─────────────────────────────────────────────┐
│  .copilot-instructions/ (Instruction DB)    │
│  ├─ architecture/                           │
│  ├─ patterns/                               │
│  ├─ conventions/                            │
│  └─ phases/                                 │
│     (Git-managed, branch strategy, review)  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  MCP Server (Context Recognition Engine)    │
│  ├─ Understand current status from ToDos    │
│  ├─ Link state with Git commit hashes       │
│  ├─ Extract relevant instructions by score  │
│  └─ Conflict detection & merge              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  .github/copilot-instructions.md (Dynamic)  │
│  "Only instructions needed for current flow"│
│  Token efficiency optimized, focused attention│
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  GitHub Copilot (LLM)                       │
│  High-quality suggestions with focused attention│
└─────────────────────────────────────────────┘
```

---

## 4. NOT List

### ❌ What We Don't Do
1. **Complete LLM Replacement**: Supplementary tool for Copilot, not an independent AI agent
2. **Automatic Code Generation**: Leave code generation to Copilot, focus on "instruction optimization"
3. **Real-time Monitoring**: No constant file watching, only explicit updates via MCP tools
4. **Cloud Integration**: Everything runs locally (privacy/security)
5. **Complex AI Analysis**: Simple scoring algorithm is sufficient

### ✅ What We Do
1. **Context-based Dynamic Filtering**: Extract relevant instructions from ToDos/phase/file paths
2. **Git Integration**: Link with commit hashes, manage change history
3. **Conflict Detection**: Detect external changes and safe merging
4. **Simple API**: Unified CRUD via action parameter
5. **Local-only**: Execute all processing locally

---

## 5. Technical Choices

### Core Technologies
- **TypeScript**: Type safety and VS Code integration
- **MCP (Model Context Protocol)**: Standard communication protocol with LLM
- **unified/remark**: Markdown AST manipulation
- **Git CLI**: Commit hash retrieval, state management

### Storage
- **File-based**: `.copilot-instructions/` directory (Git-manageable)
- **JSON**: `.copilot-context/contexts.json` (structured data)
- **Markdown**: Actual instructions (human-readable)

### Design Patterns
- **Strategy Pattern**: Different filtering strategies per context
- **Observer Pattern**: Git state change detection
- **Command Pattern**: Unified CRUD operations

---

## 6. What Keeps Us Up at Night

### Major Risk: Attention Dispersion Problem Recurrence
**Concern**: Even with dynamic generation, weak filtering results in too many instructions

**Countermeasures**:
1. Enforce upper limit with `maxSections` parameter
2. Adjustable scoring threshold
3. Token count visualization (preview feature)

### Risk: Git Management Complexity
**Concern**: Branch switching causes instruction confusion

**Countermeasures**:
1. Clarify "which state" via commit hash linkage
2. Manage branch-specific instructions in `.copilot-instructions/branches/`
3. Works without Git (degraded mode)

### Risk: Excessive Automation
**Concern**: LLM arbitrarily rewrites instructions, losing control

**Countermeasures**:
1. **Two-step flow: preview→apply** (confirmation required)
2. Record all changes in Git history
3. Implement rollback functionality

---

## 7. Solution Overview

### Phase 1: MVP ✅ Completed
- Basic CRUD operations
- Git integration (commit hash, status, diff)
- Conflict detection and marker insertion

### Phase 2: Dynamic Generation Engine 🚧 Next Step
```typescript
// Usage example
generate_instructions({
  action: "preview",
  context: {
    currentTodos: ["API authentication", "JWT validation"],
    activePhase: "development"
  }
})
// → Extract only relevant instructions
// → Display token count
// → Apply after confirmation
```

### Phase 3: Advanced Features
- Integration with ToDo management tools
- Branch strategy coordination
- Effectiveness measurement (instruction validity analysis)

---

## 8. Risk List

| Risk | Impact | Countermeasure |
|------|--------|----------------|
| Weak filtering | High | Enforce maxSections, preview feature |
| Git management complexity | Medium | Commit hash linkage, degraded mode |
| Excessive automation | Medium | Two-step flow, rollback |
| ToDo management complexity | Low | Defer external tool integration, works with manual settings |
| Performance degradation | Low | Caching, async processing |

---

## 9. Timeline

- **Phase 1 (MVP)**: ✅ Completed (2 weeks)
- **Phase 2 (Dynamic Generation)**: 🚧 In progress (1-2 weeks estimated)
- **Phase 3 (Advanced Features)**: Not started (2-3 weeks estimated)

---

## 10. Trade-off Slider

```
Simplicity      ████████░░  (8/10) ← Prioritized
Feature Rich    ██████░░░░  (6/10)
Performance     ███████░░░  (7/10)
Flexibility     ████████░░  (8/10) ← Prioritized
Perfection      ██████░░░░  (6/10)
```

**Priorities**:
1. **Simplicity**: Understandable mechanism over complex features
2. **Flexibility**: Support various development styles
3. **Performance**: Instant operation
4. **Feature Rich**: Minimal necessary feature set
5. **Perfection**: 80% quality is sufficient (avoid perfectionism)

---

## Summary

This project addresses **the fundamental problem of "attention dispersion due to instruction bloat"** with a clear solution: **"maintain large structure while filtering by context."**

With Git integration, change history, review, and rollback are possible, integrating into practical development workflows.

The next step is implementing Phase 2 (Dynamic Generation Engine).
