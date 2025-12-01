---
category: architecture
tags:
  - api
  - rest
  - design
priority: high
required: false
phases:
  - development
---

# API Design Principles

## RESTful Design

- Resource-oriented URL design
- Proper HTTP method usage (GET/POST/PUT/DELETE)
- Correct use of status codes

## Endpoint Design

```
GET    /api/users       # List users
GET    /api/users/:id   # Get user details
POST   /api/users       # Create user
PUT    /api/users/:id   # Update user
DELETE /api/users/:id   # Delete user
```

## Response Format

```typescript
{
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```
