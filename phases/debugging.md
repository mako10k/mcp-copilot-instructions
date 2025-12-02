---
category: phases
tags: [debugging, troubleshooting, problem-solving]
priority: medium
required: false
phases: [debugging]
---
# Debugging Phase Guidance

## Debugging Phase Overview

The debugging phase focuses on identifying, isolating, and resolving defects in the codebase. Effective debugging requires a systematic approach, good tooling, and proper logging practices.

### When to Enter Debugging Phase:
- Bug reports from users or QA
- Test failures that need investigation
- Production incidents requiring root cause analysis
- Performance issues or unexpected behavior
- Integration problems with external systems

## Debugging Methodology

### 1. Reproduce the Issue
**Goal**: Create a reliable way to trigger the bug.

**Steps**:
1. Gather information from bug report:
   - Steps to reproduce
   - Expected vs. actual behavior
   - Environment (OS, browser, Node version)
   - Error messages or stack traces
   - Screenshots or logs

2. Create minimal reproduction:
   ```typescript
   // Example: Minimal test case to reproduce bug
   describe('Bug #123: User creation fails with special characters', () => {
     it('should create user with email containing plus sign', async () => {
       const user = await createUser({ email: 'user+test@example.com' });
       expect(user.id).toBeDefined();
     });
   });
   ```

3. Verify reproduction in controlled environment
4. Document reproduction steps for future reference

### 2. Isolate the Problem
**Goal**: Narrow down the root cause to a specific component or function.

**Techniques**:
- **Binary search**: Comment out half the code, test, repeat
- **Divide and conquer**: Test each layer (UI, API, database) independently
- **Add logging**: Insert strategic console.log or debug statements
- **Use debugger**: Set breakpoints and step through code
- **Check recent changes**: Review git history for related commits

**Isolation Checklist**:
- [ ] Identified the layer where bug occurs (frontend/backend/database)
- [ ] Narrowed down to specific file or module
- [ ] Confirmed input data causing the issue
- [ ] Ruled out environment-specific factors

### 3. Understand the Root Cause
**Goal**: Determine why the bug occurs, not just where.

**Questions to Ask**:
- What assumption is violated?
- What edge case wasn't handled?
- What state is unexpected?
- What race condition exists?
- What null/undefined isn't checked?

**Root Cause Analysis Example**:
```typescript
// Bug: User creation fails silently
async function createUser(data: UserInput): Promise<User> {
  const user = await db.users.create(data);
  sendWelcomeEmail(user.email); // ❌ If email fails, user is created but no feedback
  return user;
}

// Root Cause: Error swallowed by missing await
// Fix: Handle email failure properly
async function createUser(data: UserInput): Promise<User> {
  const user = await db.users.create(data);
  try {
    await sendWelcomeEmail(user.email);
  } catch (error) {
    logger.warn('Welcome email failed', { userId: user.id, error });
    // User still created, but email failure is logged
  }
  return user;
}
```

### 4. Develop a Fix
**Goal**: Resolve the bug without introducing regressions.

**Best Practices**:
- Write a failing test that reproduces the bug
- Implement the fix to make the test pass
- Verify existing tests still pass
- Check for similar bugs in related code
- Consider adding validation to prevent similar issues

**Fix Validation**:
- [ ] Test passes with the fix
- [ ] All existing tests still pass
- [ ] Manual testing confirms fix
- [ ] No new warnings or errors introduced
- [ ] Performance not negatively impacted

### 5. Verify and Document
**Goal**: Ensure fix is complete and knowledge is captured.

**Verification**:
- Test in multiple environments (dev, staging, production)
- Verify with original bug reporter if possible
- Check edge cases and boundary conditions
- Monitor logs and metrics after deployment

**Documentation**:
- Update bug report with root cause and fix
- Add code comments explaining non-obvious fixes
- Update tests to cover the bug scenario
- Consider adding to FAQ or known issues if user-facing

## Logging Practices for Debugging

### Logging Levels
Use appropriate log levels for different situations:
```typescript
import { logger } from './logger';

// DEBUG: Detailed diagnostic information
logger.debug('User query params', { page, limit, sort });

// INFO: General informational messages
logger.info('User created successfully', { userId: user.id });

// WARN: Potentially harmful situations
logger.warn('Rate limit approaching', { userId, requestCount });

// ERROR: Error events that might still allow the app to continue
logger.error('Failed to send email', { userId, error: error.message });

// FATAL: Very severe error events that might cause the app to abort
logger.fatal('Database connection lost', { error });
```

### Structured Logging
Log with context for easier filtering and analysis:
```typescript
// ❌ Bad: Unstructured string
console.log('User 123 created order 456');

// ✅ Good: Structured with context
logger.info('Order created', {
  userId: 123,
  orderId: 456,
  amount: 99.99,
  timestamp: new Date().toISOString()
});
```

### Sensitive Data Handling
Never log sensitive information:
```typescript
// ❌ Bad: Logging password
logger.info('User login', { email, password });

// ✅ Good: Omit sensitive fields
logger.info('User login', { email, timestamp });

// ✅ Better: Use redaction helper
const safeLog = redactSensitiveFields(userData, ['password', 'ssn', 'creditCard']);
logger.info('User data processed', safeLog);
```

### Correlation IDs
Use request IDs to trace logs across distributed systems:
```typescript
import { randomUUID } from 'crypto';

// Add to request context
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
});

// Include in all logs
logger.info('Processing request', { requestId: req.id, path: req.path });
```

### Debug Logging in Production
Enable debug logging temporarily without redeploying:
```typescript
// Use environment variable or feature flag
const logLevel = process.env.LOG_LEVEL || 'info';
logger.setLevel(logLevel);

// Or enable per-user for debugging
if (user.email === 'admin@example.com' || isDebugEnabled(user.id)) {
  logger.setLevel('debug');
}
```

## Debugging Tools and Techniques

### VS Code Debugger
Configure launch.json for Node.js debugging:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current File",
      "program": "${file}",
      "skipFiles": ["<node_internals>/**"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Process",
      "port": 9229
    }
  ]
}
```

**Breakpoint Best Practices**:
- Set conditional breakpoints for specific scenarios: `userId === '123'`
- Use logpoints instead of console.log (non-intrusive)
- Set breakpoints in exception handling to catch errors
- Use hit count breakpoints for loops

### Chrome DevTools
For frontend debugging:
- **Sources Panel**: Set breakpoints, step through code
- **Network Panel**: Inspect API requests and responses
- **Console Panel**: Execute code in context, inspect variables
- **Performance Panel**: Profile runtime performance
- **Memory Panel**: Detect memory leaks

### Command-Line Debugging
```bash
# Start Node.js with inspector
node --inspect server.js

# Start with break on first line
node --inspect-brk server.js

# Connect Chrome DevTools to Node process
# Navigate to chrome://inspect
```

### Debugging Tests
```typescript
// Run single test in debug mode
it.only('should debug this test', () => {
  debugger; // Execution pauses here when debugging
  const result = complexFunction();
  expect(result).toBe(expected);
});
```

```bash
# Run Jest with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Run with increased timeout for step-through debugging
jest --testTimeout=999999
```

### Remote Debugging
For production issues:
```typescript
// Use remote logging service (e.g., Sentry, LogRocket)
import * as Sentry from '@sentry/node';

Sentry.init({ dsn: process.env.SENTRY_DSN });

// Capture exceptions with context
try {
  processOrder(order);
} catch (error) {
  Sentry.captureException(error, {
    extra: { orderId: order.id, userId: order.userId }
  });
  throw error;
}
```

## Common Debugging Scenarios

### Debugging Async Issues
```typescript
// Problem: Unhandled promise rejection
function fetchUser(id: string) {
  return fetch(`/api/users/${id}`).then(res => res.json());
  // ❌ Missing error handling
}

// Solution: Add proper error handling
async function fetchUser(id: string): Promise<User> {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    logger.error('Failed to fetch user', { id, error });
    throw new DomainError('USER_FETCH_FAILED', error);
  }
}
```

### Debugging Race Conditions
```typescript
// Problem: Race condition in concurrent updates
let counter = 0;

async function incrementCounter() {
  const current = counter;
  await someAsyncOperation();
  counter = current + 1; // ❌ Multiple calls can overwrite each other
}

// Solution: Use atomic operations or locking
import { AsyncLock } from 'async-lock';
const lock = new AsyncLock();

async function incrementCounter() {
  await lock.acquire('counter', async () => {
    const current = counter;
    await someAsyncOperation();
    counter = current + 1; // ✅ Protected by lock
  });
}
```

### Debugging Memory Leaks
```typescript
// Use heap snapshots to find leaks
import v8 from 'v8';
import fs from 'fs';

function takeHeapSnapshot(filename: string) {
  const snapshot = v8.writeHeapSnapshot();
  fs.renameSync(snapshot, filename);
  console.log(`Heap snapshot written to ${filename}`);
}

// Take snapshots at different points
takeHeapSnapshot('before.heapsnapshot');
// ... run code that might leak
takeHeapSnapshot('after.heapsnapshot');
// Compare snapshots in Chrome DevTools Memory panel
```

### Debugging Performance Issues
```typescript
import { performance } from 'perf_hooks';

// Measure function execution time
function measurePerformance<T>(fn: () => T, label: string): T {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  console.log(`${label} took ${duration.toFixed(2)}ms`);
  return result;
}

// Use performance marks for complex flows
performance.mark('start-user-fetch');
await fetchUser(id);
performance.mark('end-user-fetch');
performance.measure('user-fetch', 'start-user-fetch', 'end-user-fetch');
```

## Reproduction Steps Documentation

When filing or investigating bugs, always document reproduction steps:

### Bug Report Template
```markdown
## Bug Description
Brief summary of the issue.

## Steps to Reproduce
1. Navigate to /users page
2. Click "Add New User" button
3. Fill in email: user+test@example.com
4. Click "Submit"

## Expected Behavior
User should be created successfully.

## Actual Behavior
Error: "Invalid email format"

## Environment
- OS: macOS 14.2
- Browser: Chrome 120
- Node.js: v20.10.0
- App version: v1.2.3

## Additional Context
- Bug only occurs with emails containing + sign
- Works fine with standard emails
- Error appears in console: [screenshot attached]

## Logs
```
[2025-12-02T10:30:45] ERROR: Email validation failed
  userId: undefined
  email: user+test@example.com
  validator: emailRegex
```

## Regression Testing
After fixing a bug, add regression tests:
```typescript
describe('Bug #123 Regression Tests', () => {
  it('should accept emails with plus sign', async () => {
    const user = await createUser({ email: 'user+test@example.com' });
    expect(user.email).toBe('user+test@example.com');
  });

  it('should accept emails with dots', async () => {
    const user = await createUser({ email: 'first.last@example.com' });
    expect(user.email).toBe('first.last@example.com');
  });
});
```

## Prevention Strategies

### Code Review Checklist
- [ ] Error handling for all I/O operations
- [ ] Input validation for all user inputs
- [ ] Null/undefined checks for optional values
- [ ] Proper async/await usage (no missing awaits)
- [ ] Type safety maintained (no implicit any)
- [ ] Edge cases considered and tested

### Static Analysis
Use tools to catch bugs before runtime:
```bash
# TypeScript strict mode
npx tsc --strict

# ESLint with recommended rules
npx eslint src/ --ext .ts

# Type coverage check
npx type-coverage --at-least 90
```

### Defensive Programming
```typescript
// Validate inputs early
function calculateDiscount(price: number, discountPercent: number): number {
  if (price < 0) throw new Error('Price cannot be negative');
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('Discount must be between 0 and 100');
  }
  return price * (discountPercent / 100);
}

// Use type guards
function isValidUser(user: unknown): user is User {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    'email' in user
  );
}
```

## Quality Gates for Debugging Phase

Before closing a bug:
- [ ] Root cause identified and documented
- [ ] Fix implemented with test coverage
- [ ] All tests pass (including new regression tests)
- [ ] Code reviewed by another developer
- [ ] Verified in staging/pre-production environment
- [ ] Deployment plan prepared (if production hotfix)
- [ ] Post-deployment monitoring plan in place
- [ ] Knowledge base or FAQ updated if applicable

## Summary

Effective debugging requires a systematic approach: reproduce reliably, isolate methodically, understand deeply, fix carefully, and verify thoroughly. Invest in good logging, use appropriate tools, and always add regression tests to prevent bug recurrence.

→ See `patterns/error-handling.md` for error handling patterns that make debugging easier.
→ See `phases/testing.md` for testing strategies to catch bugs early.
→ See `conventions/typescript.md` for coding practices that prevent common bugs.
