---
category: patterns
tags: [errors, exceptions]
priority: high
required: false
phases: [development, refactoring]
---
# Error Handling Patterns

## Core Principles
- Fail fast on invalid input.
- Preserve original error via `cause` when wrapping.
- Provide user-safe messages; log detailed diagnostics separately.

## Custom Error Class
```typescript
export class DomainError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
```

## Try/Catch Usage
```typescript
async function fetchData(): Promise<Data> {
  try {
    const res = await api.get('/data');
    return res.data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw new DomainError('Failed to fetch data', 'DATA_FETCH_FAILED', err);
    }
    throw err;
  }
}
```

## Classification
- Validation: `VALIDATION_FAILED`
- Auth: `UNAUTHORIZED`, `FORBIDDEN`
- Not Found: `RESOURCE_NOT_FOUND`
- Conflict: `RESOURCE_CONFLICT`
- Rate Limit: `RATE_LIMITED`
- Unexpected: `INTERNAL_ERROR`

## Logging Strategy
- Include correlation/request ID.
- Avoid logging secrets (tokens, passwords).
- Redact PII where applicable.

## Retries
- Only retry idempotent operations.
- Use exponential backoff + jitter.

## Graceful Degradation
- Provide fallback defaults when safe.
- Communicate partial failure clearly.
