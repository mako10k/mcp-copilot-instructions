#!/usr/bin/env node
/**
 * Main test driver for MCP Copilot Instructions Server
 *
 * Usage:
 *   npm test                    # Run all tests
 *   npm test -- unit            # Run only unit tests
 *   npm test -- integration     # Run only integration tests
 *   npm test -- list            # List all available tests
 *   npm test -- <test-name>     # Run specific test
 */

import { runner } from './helpers/test-runner.js';
import { testProjectContextCRUD } from './integration/project-context.test.js';
import { testFeedback } from './integration/feedback.test.js';
import { testChangeContext } from './integration/change-context.test.js';

// Register all test suites
runner.register({
  name: 'project-context-crud',
  description:
    'Test project context CRUD operations (create, read, update, delete)',
  category: 'integration',
  run: testProjectContextCRUD,
});

runner.register({
  name: 'feedback',
  description:
    'Test feedback flag management (criticalFeedback, copilotEssential)',
  category: 'integration',
  run: testFeedback,
});

runner.register({
  name: 'change-context',
  description: 'Test context switching and instruction generation',
  category: 'integration',
  run: testChangeContext,
});

// Parse command line arguments
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // No arguments: run all tests
    await runner.runAll();
    process.exit(runner.totalFailed > 0 ? 1 : 0);
  }

  const command = args[0];

  switch (command) {
    case 'list':
      runner.listSuites();
      break;

    case 'unit':
      await runner.runByCategory('unit');
      process.exit(runner.totalFailed > 0 ? 1 : 0);
      break;

    case 'integration':
      await runner.runByCategory('integration');
      process.exit(runner.totalFailed > 0 ? 1 : 0);
      break;

    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;

    default: {
      // Try to run specific test by name
      const result = await runner.runByName(command);
      if (result === null) {
        console.error(`\nUnknown test: ${command}`);
        console.log('\nRun "npm test -- list" to see available tests');
        process.exit(1);
      }
      process.exit(result.passed ? 0 : 1);
    }
  }
}

function printHelp() {
  console.log(`
MCP Copilot Instructions Server - Test Runner

Usage:
  npm test                      Run all tests
  npm test -- unit              Run only unit tests
  npm test -- integration       Run only integration tests
  npm test -- list              List all available tests
  npm test -- <test-name>       Run specific test by name
  npm test -- help              Show this help message

Examples:
  npm test -- project-context-crud
  npm test -- feedback
  npm test -- change-context

Test Categories:
  unit         - Fast, isolated unit tests
  integration  - Integration tests with file system and tools
`);
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
