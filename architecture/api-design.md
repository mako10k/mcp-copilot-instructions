---
category: architecture
tags: [api, rest, design]
priority: high
required: true
phases: [development]
---
# API Design Principles

## REST Essentials
- Resource-oriented endpoints.
- Use proper HTTP verbs: GET (read), POST (create), PUT (replace), PATCH (partial update), DELETE (remove).
- Return appropriate status codes (200, 201, 400, 404, 409, 422, 500).

## Endpoint Examples
```
GET    /api/users          # List users
GET    /api/users/:id      # Get user detail
POST   /api/users          # Create user
PUT    /api/users/:id      # Replace user
DELETE /api/users/:id      # Delete user
```

## Response Envelope Pattern
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { page?: number; total?: number };
}
```

## Versioning
- Prefer URL prefix: `/v1/...`.
- Avoid breaking changes in minor versions.

## Pagination
- Use `page` + `pageSize` or cursor-based where needed.
- Include `meta.total` when inexpensive.

## Errors
- Stable `error.code` values (e.g., `USER_NOT_FOUND`, `VALIDATION_FAILED`).
- Never leak internal stack traces.

## Security Basics
- Validate input (length, type, format) at boundary.
- Enforce auth before accessing protected resources.
- Rate limit sensitive endpoints.

## Consistency
- Singular vs plural: collections plural (`/users`), single resources singular (`/users/:id`).
- Use kebab-case or snake_case query params consistently.

## Time & Formats
- Timestamps: ISO 8601 UTC (`2025-12-02T02:15:00Z`).
- Avoid locale-dependent formats.

## Filtering & Sorting
- Filtering: explicit param names (`status=active&role=admin`).
- Sorting: `sort=createdAt:desc`.

## Deprecation Policy
- Mark deprecated fields in schema + doc.
- Provide sunset timeline.
