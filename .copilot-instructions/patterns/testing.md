---
category: patterns
tags: [testing, unit-test, jest]
priority: high
required: false
phases: [testing, development]
---

# テストパターン

## ユニットテストの基本

```typescript
describe('calculateSum', () => {
  it('正の数の合計を計算', () => {
    expect(calculateSum(2, 3)).toBe(5);
  });

  it('負の数を含む合計を計算', () => {
    expect(calculateSum(-2, 3)).toBe(1);
  });
});
```

## モック

```typescript
const mockFn = jest.fn();
mockFn.mockReturnValue(42);
expect(mockFn()).toBe(42);
```

## 非同期テスト

```typescript
it('非同期処理のテスト', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```
