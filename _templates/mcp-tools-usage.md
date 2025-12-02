---
category: templates
tags: [templates, bootstrap]
priority: low
required: false
phases: [development]
---
# MCP Tools Usage Template

## Project Customization Checklist
- Architecture patterns (`architecture/`)
- Common implementation patterns (`patterns/`)
- Team coding conventions (`conventions/`)
- Phase-specific guidance (`phases/`)

## Recommended Frontmatter
```yaml
---
category: patterns
tags: [error, handling]
priority: medium
required: false
phases: [development, refactoring]
---
```

## File Classification
| Category     | Purpose                             |
|--------------|-------------------------------------|
| architecture | High-level system & API design      |
| patterns     | Reusable implementation approaches  |
| conventions  | Style & naming rules                |
| phases       | Lifecycle-stage specific guidance   |
| tools        | Operational usage docs              |
| templates    | Boilerplate starting points         |

## Authoring Tips
- Keep each file focused on one concern.
- Prefer concise bullet lists over paragraphs.
- Use code blocks for non-trivial examples.
- Tag files for filtering accuracy.
