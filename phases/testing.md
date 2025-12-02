---
category: phases
tags: [testing, qa, quality-assurance]
priority: high
required: false
phases: [testing]
---
# Testing Phase Guidance

## Testing Phase vs. Unit Testing Patterns

This document describes the **testing phase workflow** – when and how to plan, execute, and evaluate comprehensive test coverage across a project. For specific unit testing implementation patterns (mocking, assertions, async testing), see `patterns/testing.md`.

## Testing Phase Overview

The testing phase focuses on validating that the system works as intended across all levels: unit, integration, end-to-end, and non-functional requirements (performance, security, accessibility).

### Testing Phase Triggers:
- Feature implementation complete
- Before release candidates
- After major refactoring efforts
- Regular scheduled QA cycles
- Post-bug fix verification

## Test Planning

### Define Test Scope
1. **Identify what to test**:
   - New features and their integration points
   - Regression-prone areas
   - Critical business logic paths
   - API contracts and error handling
   - Edge cases and boundary conditions

2. **Determine test levels**:
   - **Unit tests**: Individual functions and classes (see `patterns/testing.md`)
   - **Integration tests**: Component interactions, database queries, external APIs
   - **End-to-end tests**: Full user workflows from UI to backend
   - **Non-functional tests**: Performance, load, security, accessibility

3. **Set coverage goals**:
   - **Critical paths**: 90%+ line coverage
   - **Business logic**: 80%+ line coverage
   - **Utilities**: 70%+ line coverage
   - **Integration points**: All major flows covered
   - **Error paths**: All error scenarios exercised

### Create Test Plan Document
Document the following:
```markdown
# Test Plan: [Feature Name]

## Scope
- Components under test
- Out of scope items
- Dependencies and prerequisites

## Test Levels
- [ ] Unit tests (target: 85% coverage)
- [ ] Integration tests (API + DB)
- [ ] E2E tests (3 critical user flows)
- [ ] Performance tests (load + stress)

## Test Cases
| ID | Description | Type | Priority |
|----|-------------|------|----------|
| TC-001 | User registration happy path | E2E | High |
| TC-002 | Invalid email validation | Unit | High |
...

## Success Criteria
- All tests pass
- Coverage goals met
- No critical bugs found
- Performance within SLA
```

## Integration Testing Strategy

### Database Integration Tests
Test queries, transactions, and data integrity:
```typescript
describe('UserRepository Integration', () => {
  let db: Database;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await db.close();
  });

  afterEach(async () => {
    await db.query('TRUNCATE TABLE users CASCADE');
  });

  it('should create user and return with ID', async () => {
    const user = await userRepo.create({ email: 'test@example.com' });
    expect(user.id).toBeDefined();
    
    const found = await userRepo.findById(user.id);
    expect(found?.email).toBe('test@example.com');
  });
});
```

### API Integration Tests
Test HTTP endpoints with real requests:
```typescript
import request from 'supertest';
import { app } from '../app';

describe('POST /api/users', () => {
  it('should create user and return 201', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'user@example.com', name: 'John' })
      .expect(201);

    expect(response.body).toMatchObject({
      email: 'user@example.com',
      name: 'John'
    });
  });

  it('should return 400 for invalid email', async () => {
    await request(app)
      .post('/api/users')
      .send({ email: 'invalid', name: 'John' })
      .expect(400);
  });
});
```

### External Service Integration Tests
Use test doubles or contract testing:
```typescript
// Using MSW (Mock Service Worker) for HTTP mocking
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('https://api.payment.com/charge', (req, res, ctx) => {
    return res(ctx.json({ transactionId: 'test-123', status: 'success' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('should process payment successfully', async () => {
  const result = await paymentService.charge({ amount: 1000 });
  expect(result.status).toBe('success');
});
```

## End-to-End Testing Strategy

### Critical User Flows
Identify and test the most important user journeys:
1. User registration and login
2. Core feature usage (e.g., create order, submit form)
3. Error recovery (e.g., failed payment retry)
4. Account management (e.g., password reset)

### E2E Testing Tools
- **Playwright**: Modern, reliable, cross-browser
- **Cypress**: Developer-friendly, good DX
- **Selenium**: Legacy but comprehensive

### E2E Test Example (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test('should register new user successfully', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('.welcome-message')).toContainText('Welcome');
  });

  test('should show error for existing email', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error-message')).toContainText('Email already registered');
  });
});
```

## Coverage Goals and Measurement

### Coverage Types
- **Line Coverage**: Percentage of code lines executed
- **Branch Coverage**: Percentage of decision branches taken
- **Function Coverage**: Percentage of functions called
- **Statement Coverage**: Percentage of statements executed

### Setting Realistic Goals
```json
// package.json or jest.config.js
{
  "coverageThreshold": {
    "global": {
      "branches": 70,
      "functions": 75,
      "lines": 80,
      "statements": 80
    },
    "./src/core/": {
      "branches": 90,
      "functions": 95,
      "lines": 95,
      "statements": 95
    }
  }
}
```

### Measuring Coverage
```bash
# Run tests with coverage
npm test -- --coverage

# Generate HTML report
npm test -- --coverage --coverageReporters=html

# Check coverage against thresholds
npm test -- --coverage --coverageThreshold='{"global":{"lines":80}}'
```

### Coverage Analysis
- **High coverage (>90%)**: Good confidence, but doesn't guarantee bug-free
- **Medium coverage (70-90%)**: Acceptable for most projects
- **Low coverage (<70%)**: Increase testing effort, prioritize critical paths
- **100% coverage**: Often impractical and may lead to brittle tests

## Non-Functional Testing

### Performance Testing
Test system behavior under load:
```typescript
import { performance } from 'perf_hooks';

describe('Performance Tests', () => {
  it('should handle 1000 requests within 5 seconds', async () => {
    const start = performance.now();
    
    const promises = Array.from({ length: 1000 }, (_, i) =>
      fetchUser(i)
    );
    
    await Promise.all(promises);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5000);
  });
});
```

### Load Testing
Use tools like k6, Artillery, or JMeter:
```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 100, // 100 virtual users
  duration: '30s',
};

export default function() {
  let response = http.get('https://api.example.com/users');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

### Security Testing
- **Input validation**: Test SQL injection, XSS, command injection
- **Authentication**: Test unauthorized access, session management
- **Authorization**: Test role-based access control
- **Sensitive data**: Ensure no secrets in logs, responses

### Accessibility Testing
- **Automated tools**: axe-core, Pa11y, Lighthouse
- **Manual testing**: Screen reader navigation, keyboard-only navigation
- **WCAG compliance**: Level AA minimum for most applications

## Test Execution Workflow

### Pre-Execution Checklist
- [ ] All code merged and up-to-date
- [ ] Test environment configured correctly
- [ ] Test data prepared and seeded
- [ ] External dependencies available (or mocked)
- [ ] CI/CD pipeline green

### Execution Steps
1. **Run unit tests** (fastest, run on every commit)
2. **Run integration tests** (slower, run on every push)
3. **Run E2E tests** (slowest, run on pull requests)
4. **Run performance tests** (scheduled, or on release candidates)
5. **Manual exploratory testing** (ad-hoc, for UX validation)

### Post-Execution Analysis
- Review test results and logs
- Triage failures (flaky test vs. real bug)
- File bug reports for genuine issues
- Update test cases based on findings
- Document any workarounds or known issues

## Test Maintenance

### Dealing with Flaky Tests
- **Identify**: Track test failure rates over time
- **Isolate**: Run flaky tests multiple times to reproduce
- **Fix**: Add proper waits, improve test isolation, remove race conditions
- **Quarantine**: Temporarily disable if blocking CI, but prioritize fixing

### Refactoring Tests
- Keep tests DRY (extract common setup into helper functions)
- Use test fixtures for consistent test data
- Avoid over-mocking (test real behavior when possible)
- Keep tests focused (one assertion per test when practical)

### Test Documentation
- Use descriptive test names (`it('should return 404 when user not found')`)
- Add comments for complex test setups
- Document test data requirements
- Maintain a test glossary for domain-specific terms

## Quality Gates

Before marking testing phase complete:
- [ ] All automated tests pass (unit + integration + E2E)
- [ ] Coverage thresholds met
- [ ] No critical or high-priority bugs open
- [ ] Performance benchmarks within acceptable range
- [ ] Security scan completed (no high-severity issues)
- [ ] Accessibility audit passed (WCAG AA)
- [ ] Manual smoke testing completed
- [ ] Test results documented and reviewed

## Tools and Resources

### Testing Frameworks
- **Jest**: Unit and integration testing for JavaScript/TypeScript
- **Vitest**: Fast Vite-native alternative to Jest
- **Mocha + Chai**: Flexible testing framework with assertion library

### Mocking Libraries
- **MSW**: Mock Service Worker for API mocking
- **Sinon**: Standalone test spies, stubs, and mocks
- **testcontainers**: Dockerized test dependencies (DB, Redis, etc.)

### E2E Testing
- **Playwright**: Cross-browser automation
- **Cypress**: Developer-friendly E2E testing
- **Puppeteer**: Headless Chrome automation

### Coverage Tools
- **Istanbul/nyc**: JavaScript code coverage
- **Codecov**: Coverage reporting and tracking
- **Coveralls**: Coverage history and pull request integration

### Performance Testing
- **k6**: Modern load testing tool
- **Artillery**: Load and functional testing
- **Lighthouse**: Web performance auditing

## Summary

The testing phase is critical for ensuring software quality before release. Plan comprehensively, execute systematically, and maintain tests as a first-class part of your codebase. Combine automated testing at multiple levels with manual exploratory testing for best results.

→ See `patterns/testing.md` for specific unit testing implementation patterns.
→ See `phases/development.md` for integrating testing into the development workflow.
→ See `patterns/error-handling.md` for testing error scenarios.
