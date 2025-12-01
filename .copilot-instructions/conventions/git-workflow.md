---
category: conventions
tags: [git, workflow, branching]
priority: medium
required: false
phases: [development, refactoring]
---

# Git Workflow

## Branching Strategy

- `main`: Production environment
- `feature/xxx`: New feature development
- `fix/xxx`: Bug fixes
- `refactor/xxx`: Refactoring

## Commit Messages

```
<type>: <subject>

<body>
```

### Type
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Refactoring
- `test`: Add tests
