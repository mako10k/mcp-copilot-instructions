# Copilot Instructions (Meta Overview)

<!-- Migrated to structured format -->
<!-- Context: phase=development, focus=API, JWT -->
<!-- Regenerated: 2025-12-02T00:00:00.000Z -->

## Purpose
This root file now serves only as an index and meta overview. Detailed guidance has been moved into categorized Markdown files with frontmatter for dynamic loading.

## Categories
- Conventions: `conventions/typescript.md`, `conventions/git-workflow.md`
- Architecture: `architecture/api-design.md`
- Patterns: `patterns/error-handling.md`, `patterns/testing.md`
- Phases: `phases/development.md`
- Tools: `tools/mcp-server-usage.md`
- Templates: `_templates/mcp-tools-usage.md`

## Core Tools
| Tool | Purpose |
|------|---------|
| `change_context` | Switch active phase/focus |
| `project_context` | Persist new rules |
| `instructions_structure` | Modify instruction corpus |
| `onboarding` | Analyze / propose / migrate / rollback |

## Required Sections
The system always includes:
- TypeScript Coding Conventions (`conventions/typescript.md`)
- MCP Instructions Server Usage Guide (`tools/mcp-server-usage.md`)

## Migration Notes
Original inline content (Japanese mixed sections) has been extracted and translated for consistency. Each file now includes frontmatter enabling selective loading.

## Next Steps
- Add new rules via creating categorized file with frontmatter.
- Update context using `change_context` when phase/focus shifts.
- Run onboarding `analyze` to validate after significant additions.

## Frontmatter Template
```yaml
---
category: conventions
tags: [typescript, style]
priority: high
required: true
phases: [development, refactoring]
---
```

## Rollback
A backup of the previous monolithic file was created during migration. Use onboarding rollback if needed within retention window.

---

