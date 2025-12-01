---
category: tools
tags: [mcp, tools, essential]
priority: high
required: true
phases: [development, refactoring, testing, debugging, documentation]
---

# MCP Copilot Instructions Server Usage Guide

## Basic Concept

This MCP server **solves the LLM attention dispersion problem** by **dynamically extracting only the instructions needed right now** from a huge instruction database.

## Main Tools

### `change_context` - Change Development Context

When you change the current development phase or focus, optimal instructions are automatically generated.

```typescript
// Usage example: Transition to development phase
change_context({
  action: "update",
  state: {
    phase: "development",
    focus: ["API Authentication", "JWT"],
    priority: "high"
  }
})
```

### Available Phases

- `development`: New feature development
- `refactoring`: Code refactoring
- `testing`: Test creation and modification
- `debugging`: Bug fixing
- `documentation`: Documentation creation

## How Dynamic Instruction Generation Works

1. **Execute change_context**: Set development context
2. **Automatic Scoring**: Calculate related instructions from current phase/focus
3. **Generate Instructions**: Extract required instructions + related instructions (max 10 sections)
4. **LLM Focuses**: Concentrate attention on only necessary instructions

## Required Instructions (Always Included)

- This usage guide (tools/mcp-server-usage.md)
- TypeScript conventions (conventions/typescript.md)
