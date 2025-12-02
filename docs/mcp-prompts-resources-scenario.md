# MCP Prompts and Resources Integration Scenario

## Overview

This document outlines advanced integration scenarios using MCP Prompts and Resources capabilities to enhance the copilot-instructions server functionality.

## Background

The Model Context Protocol (MCP) provides two powerful features beyond tools:

1. **Prompts** - Pre-defined prompt templates that clients can discover and use
2. **Resources** - Content that can be read by clients (files, data, etc.)

## Use Cases for copilot-instructions

### 1. Prompts: Instruction Generation Templates

**Goal**: Provide pre-defined prompt templates for common instruction authoring tasks.

#### Scenario A: "Create New Convention"
```typescript
{
  name: "create-convention",
  description: "Generate a new coding convention document",
  arguments: [
    {
      name: "language",
      description: "Programming language (e.g., TypeScript, Python, Go)",
      required: true
    },
    {
      name: "focus",
      description: "Convention focus area (e.g., naming, error-handling, testing)",
      required: true
    }
  ]
}
```

**Expected Output**: A structured markdown file with YAML frontmatter following the project's convention template.

#### Scenario B: "Analyze Instruction Conflicts"
```typescript
{
  name: "analyze-conflicts",
  description: "Detect contradictions or overlaps between instruction files",
  arguments: [
    {
      name: "category",
      description: "Category to analyze (conventions, patterns, etc.)",
      required: false
    }
  ]
}
```

**Expected Output**: A report highlighting conflicting rules with suggestions for resolution.

#### Scenario C: "Generate Phase Instructions"
```typescript
{
  name: "generate-phase-instructions",
  description: "Create phase-specific instruction subset",
  arguments: [
    {
      name: "phase",
      description: "Development phase (development, testing, debugging, documentation)",
      required: true
    },
    {
      name: "focus",
      description: "Optional focus areas as comma-separated list",
      required: false
    }
  ]
}
```

**Expected Output**: A filtered instruction file containing only relevant sections for the specified phase.

### 2. Resources: Dynamic Instruction Content

**Goal**: Expose instruction files and context as readable resources that clients can access.

#### Resource A: Active Instructions
```typescript
{
  uri: "instructions://active",
  name: "Active Instructions",
  description: "Currently active instructions based on context (phase, focus, priority)",
  mimeType: "text/markdown"
}
```

**Content**: Dynamically generated `.github/copilot-instructions.md` content based on current context state.

#### Resource B: Goal Hierarchy
```typescript
{
  uri: "instructions://goals/hierarchy",
  name: "Goal Dependency Graph",
  description: "Current goal hierarchy with dependencies and progress",
  mimeType: "application/json"
}
```

**Content**: JSON representation of the goal graph with completion status and priority calculations.

#### Resource C: Instruction Categories
```typescript
{
  uri: "instructions://category/{category}",
  name: "Category Instructions",
  description: "All instruction files in a specific category",
  mimeType: "text/markdown"
}
```

**Content**: Aggregated content from all files in the specified category (conventions/, patterns/, etc.).

#### Resource D: Context History
```typescript
{
  uri: "instructions://context/history",
  name: "Context Change History",
  description: "Timeline of context changes with diffs",
  mimeType: "application/json"
}
```

**Content**: Historical record of context changes (phase, focus, priority changes) with timestamps.

## Implementation Benefits

### For Prompts

1. **Discoverability**: Clients can list available prompts without documentation
2. **Type Safety**: Arguments are validated by the MCP client
3. **Reusability**: Common tasks become one-click operations
4. **Consistency**: Standardized outputs across all instruction authoring tasks

### For Resources

1. **Live Updates**: Clients see real-time instruction state without polling
2. **Efficient Transfer**: Only changed resources need to be re-fetched
3. **Client-Side Processing**: Clients can process instruction content locally
4. **Debugging**: Easy inspection of current instruction state

## Technical Architecture

### Prompt Implementation Pattern

```typescript
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "create-convention",
        description: "Generate a new coding convention document",
        arguments: [
          { name: "language", description: "Programming language", required: true },
          { name: "focus", description: "Convention focus area", required: true }
        ]
      },
      // ... more prompts
    ]
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case "create-convention":
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: generateConventionPrompt(args)
            }
          }
        ]
      };
    // ... handle other prompts
  }
});
```

### Resource Implementation Pattern

```typescript
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "instructions://active",
        name: "Active Instructions",
        description: "Currently active instructions",
        mimeType: "text/markdown"
      },
      // ... more resources
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  if (uri === "instructions://active") {
    const content = await generateActiveInstructions();
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: content
        }
      ]
    };
  }
  // ... handle other resources
});
```

## Integration with Existing Features

### 1. Prompt + Onboarding
- **Prompt**: "migrate-instructions" 
- **Flow**: Analyze → Propose → Generate migration prompt with specific fixes
- **Benefit**: AI-assisted migration instead of manual fixes

### 2. Resource + Goal Management
- **Resource**: "instructions://goals/current"
- **Flow**: Client reads current goal → AI suggests next steps → Updates via tool
- **Benefit**: Seamless goal-driven development workflow

### 3. Prompt + Context Management
- **Prompt**: "optimize-context"
- **Flow**: Analyze current phase/focus → Suggest optimal context configuration
- **Benefit**: Automatic context tuning based on project patterns

## Client Experience

### Claude Desktop Example

```typescript
// List available prompts
> MCP: List Prompts (copilot-instructions)
→ create-convention
→ analyze-conflicts  
→ generate-phase-instructions
→ migrate-instructions
→ optimize-context

// Use a prompt
> MCP: Get Prompt "create-convention"
  language: "TypeScript"
  focus: "error-handling"
→ [Prompt loaded with generated template]

// Access resources
> MCP: List Resources (copilot-instructions)
→ instructions://active
→ instructions://goals/hierarchy
→ instructions://context/history

// Read a resource
> MCP: Read Resource "instructions://active"
→ [Shows current active instructions markdown]
```

## Priority Implementation Order

### Phase 1: Essential Prompts
1. `create-convention` - Most common task
2. `generate-phase-instructions` - Core feature enhancement
3. `analyze-conflicts` - Quality assurance

### Phase 2: Core Resources
1. `instructions://active` - Most useful for clients
2. `instructions://goals/current` - Goal management integration
3. `instructions://category/{category}` - Exploration support

### Phase 3: Advanced Features
1. `optimize-context` prompt
2. `instructions://context/history` resource
3. `migrate-instructions` prompt with onboarding integration

## Success Metrics

- **Discoverability**: % of users who discover prompts vs. documentation
- **Efficiency**: Time saved on common instruction tasks
- **Adoption**: Number of prompt invocations per user session
- **Resource Access**: Frequency of resource reads vs. tool calls

## Open Questions

1. **Caching Strategy**: How should clients cache resources? Should we implement ETag support?
2. **Subscription Pattern**: Should we support resource subscriptions for live updates?
3. **Prompt Composition**: Can prompts chain together for complex workflows?
4. **Access Control**: Do we need per-resource/per-prompt permission controls?

## Next Steps

1. Implement Phase 1 prompts in a feature branch
2. Add Phase 2 resources with caching support
3. Create integration tests for prompt/resource interactions
4. Update documentation with client usage examples
5. Gather feedback from early adopters

## References

- [MCP Prompts Specification](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/prompts/)
- [MCP Resources Specification](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/resources/)
- [Example Implementation: everything.ts](https://github.com/modelcontextprotocol/servers/blob/main/src/everything/index.ts)
