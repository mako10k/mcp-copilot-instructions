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

# Error Handling Patterns

## Proper Use of Try-Catch

```typescript
async function fetchData(): Promise<Data> {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('API Error:', error.message);
      throw new CustomError('Failed to fetch data', error);
    }
    throw error;
  }
}
```

## Custom Error Classes

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
