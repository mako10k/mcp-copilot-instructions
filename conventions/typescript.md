---
category: conventions
tags: [typescript, typing, style]
priority: high
required: true
phases: [development, refactoring]
---
# TypeScript Coding Conventions

## Type Safety
- Declare explicit return types for all functions.
- Avoid `any`; use it only when no safer alternative exists.
- Prefer `unknown` over `any` for externally sourced data.
- Narrow types with type guards before usage.

## Naming Rules
- Variables / Functions: `camelCase` (e.g., `getUserData`, `totalCount`).
- Types / Interfaces / Classes: `PascalCase` (e.g., `UserProfile`, `ApiResponse`).
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`).
- Booleans: prefix with `is`, `has`, `should` (e.g., `isActive`).

## File Structure Pattern
```typescript
// Import Order
import { readFileSync } from 'node:fs';         // Node/Std
import express from 'express';                  // 3rd party
import { calculateHash } from '../utils/hash';  // Internal

// Types
interface UserProfile { /* ... */ }

// Constants
const MAX_RETRY_COUNT = 3;

// Functions
export function fetchUser(id: string): Promise<UserProfile> { /* ... */ }
```

## Error Handling Guidelines
- Wrap external I/O in try/catch.
- Throw domain-specific error classes instead of generic Error.
- → See `patterns/error-handling.md` for detailed implementation patterns.

## Code Style Essentials
- Use single quotes, except JSON.
- Prefer `const`; use `let` only when reassignment is required.
- Avoid implicit `any` by enabling `noImplicitAny`.

## Imports
- Use absolute paths only if project config supports `baseUrl` or `paths`.
- Remove unused imports before commit.

## Optional / Nullables
- Use `undefined` for optional params, `null` only for tri-state semantics.
- Avoid nested optional chains; extract and guard early.

## Async
- Always return `Promise<T>` explicitly for async functions.
- Do not mix callbacks with promises in new code.

## Testing Notes
- Export pure functions for ease of testing.
- Avoid hidden side effects in module scope.
- → See `patterns/testing.md` for comprehensive testing strategies.
