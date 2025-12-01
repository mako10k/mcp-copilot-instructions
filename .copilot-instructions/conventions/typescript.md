---
category: conventions
tags:
  - typescript
  - coding-style
  - essential
priority: high
required: true
phases:
  - development
  - refactoring
  - testing
  - debugging
---

# TypeScript Coding Conventions

## Type Safety

- Specify explicit return types for all functions
- Minimize use of `any` type (only when unavoidable)
- Utilize `unknown` type to maintain type safety

## Naming Conventions

- **Variables/Functions**: camelCase (e.g., `getUserData`, `totalCount`)
- **Types/Interfaces**: PascalCase (e.g., `UserProfile`, `ApiResponse`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)

## File Structure

```typescript
// Import order
import { standardLibrary } from 'node:fs';
import { thirdParty } from 'express';
import { internalModule } from '../utils';

// Type definitions
interface MyType { }

// Constants
const CONSTANT = 'value';

// Functions
export function myFunction(): ReturnType { }
```
