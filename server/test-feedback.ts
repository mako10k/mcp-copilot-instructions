import { feedback } from './src/tools/feedback';

async function main() {
  console.log('=== Testing feedback tool ===\n');

  // Test 1: Check initial state (no flags)
  console.log('Test 1: Check initial state (list flagged instructions)');
  const listResult1 = await feedback({ action: 'list' });
  console.log(listResult1);
  console.log('\n---\n');

  // Test 2: Add criticalFeedback flag
  console.log('Test 2: Add criticalFeedback flag to TypeScript conventions');
  const addResult1 = await feedback({
    action: 'add',
    filePath: 'conventions/typescript.md',
    flagType: 'criticalFeedback',
    reason: 'To emphasize importance of type safety',
  });
  console.log(addResult1);
  console.log('\n---\n');

  // Test 3: Add copilotEssential flag
  console.log('Test 3: Add copilotEssential flag to error handling pattern');
  const addResult2 = await feedback({
    action: 'add',
    filePath: 'patterns/error-handling.md',
    flagType: 'copilotEssential',
    reason: 'Error handling is always important',
  });
  console.log(addResult2);
  console.log('\n---\n');

  // Test 4: List flagged instructions
  console.log('Test 4: List flagged instructions');
  const listResult2 = await feedback({ action: 'list' });
  console.log(listResult2);
  console.log('\n---\n');

  // Test 5: Filter criticalFeedback only
  console.log('Test 5: Filter criticalFeedback only');
  const listResult3 = await feedback({
    action: 'list',
    filter: 'criticalFeedback',
  });
  console.log(listResult3);
  console.log('\n---\n');

  // Test 6: Filter copilotEssential only
  console.log('Test 6: Filter copilotEssential only');
  const listResult4 = await feedback({
    action: 'list',
    filter: 'copilotEssential',
  });
  console.log(listResult4);
  console.log('\n---\n');

  // Test 7: Remove flag
  console.log('Test 7: Remove criticalFeedback flag from TypeScript conventions');
  const removeResult = await feedback({
    action: 'remove',
    filePath: 'conventions/typescript.md',
    flagType: 'criticalFeedback',
  });
  console.log(removeResult);
  console.log('\n---\n');

  // Test 8: Check state after deletion
  console.log('Test 8: Check state after deletion');
  const listResult5 = await feedback({ action: 'list' });
  console.log(listResult5);
  console.log('\n---\n');

  // Test 9: Remove another flag (cleanup)
  console.log('Test 9: Remove copilotEssential flag from error handling (cleanup)');
  const removeResult2 = await feedback({
    action: 'remove',
    filePath: 'patterns/error-handling.md',
    flagType: 'copilotEssential',
  });
  console.log(removeResult2);
  console.log('\n---\n');

  // Test 10: Check final state
  console.log('Test 10: Check final state (all cleared)');
  const listResult6 = await feedback({ action: 'list' });
  console.log(listResult6);
  console.log('\n---\n');

  // Test 11: Soft limit test (criticalFeedback)
  console.log('Test 11: Soft limit test - add 2 criticalFeedback flags');
  await feedback({
    action: 'add',
    filePath: 'conventions/typescript.md',
    flagType: 'criticalFeedback',
    reason: 'Test 1',
  });
  await feedback({
    action: 'add',
    filePath: 'patterns/error-handling.md',
    flagType: 'criticalFeedback',
    reason: 'Test 2',
  });
  const listResult7 = await feedback({ action: 'list' });
  console.log(listResult7);
  console.log('\n---\n');

  // Test 12: Check soft limit warning
  console.log('Test 12: Add 3rd item to display soft limit warning');
  const addResult3 = await feedback({
    action: 'add',
    filePath: 'architecture/api-design.md',
    flagType: 'criticalFeedback',
    reason: 'Test 3 (soft limit reached)',
  });
  console.log(addResult3);
  console.log('\n---\n');

  // Test 13: Check hard limit error
  console.log('Test 13: Add 4th item to trigger hard limit error');
  const addResult4 = await feedback({
    action: 'add',
    filePath: 'patterns/testing.md',
    flagType: 'criticalFeedback',
    reason: 'Test 4 (hard limit exceeded)',
  });
  console.log(addResult4);
  console.log('\n---\n');

  // Test 14: Cleanup
  console.log('Test 14: Cleanup test data');
  await feedback({
    action: 'remove',
    filePath: 'conventions/typescript.md',
    flagType: 'criticalFeedback',
  });
  await feedback({
    action: 'remove',
    filePath: 'patterns/error-handling.md',
    flagType: 'criticalFeedback',
  });
  await feedback({
    action: 'remove',
    filePath: 'architecture/api-design.md',
    flagType: 'criticalFeedback',
  });
  const listResult8 = await feedback({ action: 'list' });
  console.log(listResult8);
  console.log('\n---\n');

  console.log('All tests completed successfully.');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
