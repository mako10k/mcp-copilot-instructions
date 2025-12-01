---
category: _templates
tags: [template, mcp, setup]
priority: high
required: false
phases: [development]
---

# MCP Tools Usage Template

This file is the basic template for using this MCP server in projects.

## Project-Specific Configuration

Customize the following categories according to project characteristics:

- `architecture/`: Project architecture patterns
- `patterns/`: Commonly used implementation patterns
- `conventions/`: Team-specific coding conventions
- `phases/`: Project-specific development phases

## Frontmatter Configuration

Add the following frontmatter to each Markdown file:

```yaml
---
category: CategoryName
tags: [Tag1, Tag2]
priority: high | medium | low
required: true | false  # true to always include
phases: [development, refactoring, ...]
---
```
