---
category: patterns
tags: [testing, unit, integration]
priority: medium
required: false
phases: [development, testing]
---
# Testing Patterns

## Unit Test Basics
```typescript
describe('calculateSum', () => {
  it('adds positive numbers', () => {
    expect(calculateSum(2, 3)).toBe(5);
  });

  it('handles negative numbers', () => {
    expect(calculateSum(-2, 3)).toBe(1);
  });
});
```

## Mocking
```typescript
const mockFn = jest.fn().mockReturnValue(42);
expect(mockFn()).toBe(42);
```

## Async Testing
```typescript
it('fetches remote data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```

## Test Structure
- Arrange: set up inputs and dependencies.
- Act: execute the unit under test.
- Assert: verify outcomes.

## Principles
- Deterministic: no reliance on real time or network unless isolated.
- Minimal mocks: only mock boundary systems.
- Fast feedback: keep unit tests sub-second.

## Coverage Guidance
- Focus on complex logic paths first.
- Avoid chasing 100% blindly; target meaningful risk reduction.

## Integration Tests
- Exercise module boundaries & persistence layer.
- Use ephemeral test DB or in-memory substitutes.

## Snapshot Tests
- Use sparingly; verify stable, intentional structures.

## Test Data
- Prefer builders/factories over large inline objects.
