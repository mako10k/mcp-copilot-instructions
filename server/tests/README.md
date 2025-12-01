# Test Framework

This directory contains the test suite for the MCP Copilot Instructions Server.

## Structure

```
tests/
├── index.ts                 # Main test driver
├── helpers/                 # Test utilities
│   ├── test-logger.ts      # Logging utilities
│   ├── test-runner.ts      # Test runner framework
│   └── test-setup.ts       # Common setup/teardown
├── unit/                    # Unit tests (fast, isolated)
├── integration/             # Integration tests
│   ├── project-context.test.ts
│   ├── feedback.test.ts
│   └── change-context.test.ts
└── archived/                # Old test files (for reference)
```

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm test -- unit

# Run only integration tests
npm test -- integration

# Run specific test by name
npm test -- project-context-crud
npm test -- feedback
npm test -- change-context

# List all available tests
npm test -- list
```

## Writing Tests

### Basic Test Structure

```typescript
import { createLogger } from '../helpers/test-logger.js';

export async function testMyFeature(): Promise<void> {
  const logger = createLogger('My Feature Test');
  logger.start();

  try {
    logger.step(1, 'Description of step 1');
    // Test code here
    logger.success('Step completed');

    logger.step(2, 'Description of step 2');
    // More test code
    logger.info('Some information');

  } catch (error) {
    logger.error(`Test failed: ${error}`);
    throw error;
  } finally {
    logger.end();
  }
}
```

### Register Test in index.ts

```typescript
import { runner } from './helpers/test-runner.js';
import { testMyFeature } from './integration/my-feature.test.js';

runner.register({
  name: 'my-feature',
  description: 'Test description',
  category: 'integration', // or 'unit'
  run: testMyFeature,
});
```

## Test Helpers

### TestLogger

Provides structured logging for tests:
- `logger.start()` - Start test
- `logger.step(n, desc)` - Mark test step
- `logger.success(msg)` - Log success
- `logger.error(msg)` - Log error
- `logger.info(msg)` - Log info
- `logger.end()` - End test

### TestContext

Provides workspace paths:
```typescript
import { createTestContext } from '../helpers/test-setup.js';

const ctx = await createTestContext();
// ctx.workspaceRoot
// ctx.instructionsDir
// ctx.stateDir
// ctx.instructionsPath
```

## Known Issues

- ESM `__dirname` compatibility: Some source files still use `__dirname` which doesn't work in ESM. 
  These need to be refactored to use `import.meta.url` and `fileURLToPath()`.
- See `src/utils/pathUtils.ts` for helper functions.

## TODO

- [ ] Refactor all `__dirname` usage in src/ to use pathUtils
- [ ] Add more unit tests for individual utilities
- [ ] Add test coverage reporting
- [ ] Add CI/CD integration
