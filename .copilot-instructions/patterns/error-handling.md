---
category: patterns
tags:
  - error
  - exception
  - handling
priority: high
required: false
phases:
  - development
  - debugging
---

# エラーハンドリングパターン

## Try-Catch の適切な使用

```typescript
async function fetchData(): Promise<Data> {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('API Error:', error.message);
      throw new CustomError('データ取得失敗', error);
    }
    throw error;
  }
}
```

## カスタムエラークラス

```typescript
class CustomError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'CustomError';
  }
}
```
