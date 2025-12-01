/**
 * Integration test for feedback tool
 */

import { feedback } from '../../src/tools/feedback.js';
import { createLogger } from '../helpers/test-logger.js';

export async function testFeedback(): Promise<void> {
  const logger = createLogger('Feedback Tool');
  logger.start();

  try {
    // Step 1: Check initial state
    logger.step(1, 'Check initial state (list flagged instructions)');
    try {
      const listResult1 = await feedback({ action: 'list' });
      logger.info(listResult1);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.info(
          'Skipping feedback test: .copilot-instructions directory not found',
        );
        logger.success('Test skipped (no test data available)');
        logger.end();
        return;
      }
      throw error;
    }

    // Step 2: Add criticalFeedback flag
    logger.step(2, 'Add criticalFeedback flag to TypeScript conventions');
    const addResult1 = await feedback({
      action: 'add',
      filePath: 'conventions/typescript.md',
      flagType: 'criticalFeedback',
      reason: 'To emphasize importance of type safety',
    });
    logger.info(addResult1);

    // Step 3: Add copilotEssential flag
    logger.step(3, 'Add copilotEssential flag to error handling pattern');
    const addResult2 = await feedback({
      action: 'add',
      filePath: 'patterns/error-handling.md',
      flagType: 'copilotEssential',
      reason: 'Error handling is always important',
    });
    logger.info(addResult2);

    // Step 4: List all flagged instructions
    logger.step(4, 'List all flagged instructions');
    const listResult2 = await feedback({ action: 'list' });
    logger.info(listResult2);

    // Step 5: Filter criticalFeedback only
    logger.step(5, 'Filter criticalFeedback only');
    const listResult3 = await feedback({
      action: 'list',
      filter: 'criticalFeedback',
    });
    logger.info(listResult3);

    // Step 6: Filter copilotEssential only
    logger.step(6, 'Filter copilotEssential only');
    const listResult4 = await feedback({
      action: 'list',
      filter: 'copilotEssential',
    });
    logger.info(listResult4);

    // Step 7: Remove criticalFeedback flag
    logger.step(7, 'Remove criticalFeedback flag');
    const removeResult1 = await feedback({
      action: 'remove',
      filePath: 'conventions/typescript.md',
      flagType: 'criticalFeedback',
    });
    logger.info(removeResult1);

    // Step 8: Verify removal
    logger.step(8, 'Verify removal by listing again');
    const listResult5 = await feedback({ action: 'list' });
    logger.info(listResult5);

    logger.success('All feedback operations completed successfully');
  } catch (error) {
    logger.error(`Test failed: ${error}`);
    throw error;
  } finally {
    logger.end();
  }
}
