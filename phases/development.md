---
category: phases
tags: [development, workflow]
priority: high
required: true
phases: [development]
---
# Development Phase Guidance

## Flow
1. Requirements Clarification – Confirm scope, acceptance criteria.
2. Design – Interfaces, data models, edge cases.
3. Implementation – Prefer TDD for critical logic.
4. Testing – Unit + integration coverage.
5. Documentation – Update README / inline JSDoc for public APIs.

## Implementation Notes
- Commit frequently with focused diffs.
- Maintain type safety; avoid implicit `any`.
- Ensure proper error boundaries.
- Keep functions small and composable.

## JSDoc Example
```typescript
/**
 * Calculate total price including tax.
 * @param base Base price before tax
 * @param taxRate Percentage (e.g. 0.1 for 10%)
 */
export function calcTotal(base: number, taxRate: number): number {
  return base + base * taxRate;
}
```

## Quality Gates
- No ESLint errors.
- All tests green.
- Types compile with `strict` settings.

## Performance Considerations
- Avoid premature optimization; measure first.
- Use caching layers for expensive pure computations if needed.
