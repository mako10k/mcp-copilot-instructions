---
category: patterns
tags: [testing, unit-test, jest]
priority: high
required: false
phases: [testing, development]
---

# Testing Patterns

## Unit Test Basics

```typescript
describe('calculateSum', () => {
  it('calculates sum of positive numbers', () => {
    expect(calculateSum(2, 3)).toBe(5);
  });

  it('calculates sum including negative numbers', () => {
    expect(calculateSum(-2, 3)).toBe(1);
  });
});
```

## Mocking

```typescript
const mockFn = jest.fn();
mockFn.mockReturnValue(42);
expect(mockFn()).toBe(42);
```

## Async Tests

```typescript
it('test async processing', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```
