---
category: conventions
tags: [git, workflow, branching]
priority: medium
required: false
phases: [development, refactoring, testing]
---
# Git Workflow

## Branch Strategy
- `main`: Production-ready branch.
- `feature/<name>`: New feature development.
- `fix/<name>`: Bug fixes.
- `refactor/<name>`: Structural/code quality improvements.
- `experiment/<name>`: Throwaway exploratory work.

## Commit Message Format
```
<type>: <subject>

<body>
```
**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation change
- `refactor`: Internal code change without behavior impact
- `test`: Adding or modifying tests
- `chore`: Build or tooling changes

## Writing Good Commits
- Subject: Imperative mood ("Add", not "Added").
- Keep subject ≤ 72 chars.
- Body: Explain *why* and any side effects.
- Separate logical changes into different commits.

## Pull Requests
- Reference related issues (`Closes #123`).
- Provide summary, rationale, and verification steps.
- Keep diff focused; avoid unrelated formatting noise.

## Review Checklist
- Code style matches conventions.
- No obvious performance regressions.
- Test coverage for new logic.
- Security-sensitive code reviewed carefully.

## Tagging & Releases
- Use semver: `MAJOR.MINOR.PATCH`.
- Annotated tags: `git tag -a v1.2.3 -m "Release v1.2.3"`.
- Keep CHANGELOG updated before tagging.
